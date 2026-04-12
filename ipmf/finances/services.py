from django.contrib.auth import get_user_model
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import EntreeArgent, Depense, FinancesConstants
from audit.models import AuditLog
from notifications.services import NotificationService

class FinanceService:
    """
    Couche de service pour la gestion financière.
    Centralise la logique métier, les transactions et l'audit.
    """

    @staticmethod
    def _log_audit(action, message, user, obj, details=None):
        """Helper pour créer une entrée d'audit"""
        AuditLog.objects.create(
            action_type=action,
            module='finances',
            message=message,
            utilisateur=user,
            objet_type=obj.__class__.__name__,
            objet_id=str(obj.pk),
            objet_repr=str(obj),
            differences=details or {},
            niveau='info'
        )

    # =========================================================================
    # GESTION DES ENTRÉES D'ARGENT
    # =========================================================================

    @classmethod
    @transaction.atomic
    def confirm_entree(cls, entree: EntreeArgent, user):
        """Confirme une entrée d'argent"""
        if not entree.user_can_confirm(user):
            raise ValidationError("Permission refusée pour confirmer cette entrée.")
        
        if not entree.est_confirmable:
            raise ValidationError("Cette entrée ne peut plus être confirmée.")

        ancienne_valeur = entree.statut
        entree.statut = EntreeArgent.STATUT_CONFIRMEE
        entree.save()

        cls._log_audit(
            action='validation',
            message=f"Entrée {entree.numero} confirmée par {user.username}",
            user=user,
            obj=entree,
            details={
                'Statut': {'old': ancienne_valeur, 'new': entree.statut},
                'Montant': {'old': '', 'new': f"{float(entree.montant):,.0f} Ar"},
                'Motif': {'old': '', 'new': entree.motif},
                'Mode Paiement': {'old': '', 'new': entree.get_mode_paiement_display()}
            }
        )
        return entree

    @classmethod
    @transaction.atomic
    def cancel_entree(cls, entree: EntreeArgent, user, comment: str):
        """Annule une entrée d'argent"""
        if not entree.user_can_cancel(user):
            raise ValidationError("Permission refusée pour annuler cette entrée.")
            
        if not comment:
            raise ValidationError("Un commentaire est requis pour l'annulation.")

        ancienne_valeur = entree.statut
        entree.statut = EntreeArgent.STATUT_ANNULEE
        entree.commentaire += f"\n[Annulation {timezone.now().strftime('%Y-%m-%d')}] {comment}"
        entree.save()

        cls._log_audit(
            action='rejet',
            message=f"Entrée {entree.numero} annulée par {user.username}",
            user=user,
            obj=entree,
            details={
                'Statut': {'old': ancienne_valeur, 'new': entree.statut},
                'Raison Annulation': {'old': '', 'new': comment},
                'Montant': {'old': '', 'new': f"{float(entree.montant):,.0f} Ar"}
            }
        )
        return entree

    # =========================================================================
    # GESTION DES DÉPENSES
    # =========================================================================

    @classmethod
    @transaction.atomic
    def process_auto_approval(cls, depense: Depense, user) -> Depense:
        """Tente d'auto-approuver une dépense si elle est éligible"""
        
        # Vérification Auto-Approval Mission
        if depense.tache:
            tache = depense.tache
            
            # Conditions d'auto-approbation
            # a) Tâche active et User assigné
            if tache.statut in ['en_cours', 'validee'] and tache.agents_assignes.filter(id=user.id).exists():
                
                # b) Budget check
                # Calcul montant total engagé sur la tâche (incluant la nouvelle dépense)
                total_engague = tache.depenses.exclude(statut__in=['rejetee', 'annulee']).aggregate(total=models.Sum('montant'))['total'] or 0
                
                if tache.budget_alloue and total_engague <= tache.budget_alloue:
                    # AUTO APPROVAL
                    depense.statut = Depense.STATUT_VALIDEE
                    depense.approved_by_system = True
                    depense.date_validation_comptable = timezone.now()
                    depense.commentaire_validation = f"[AUTO] Validé via Budget Mission {tache.numero}"
                    depense.save()
                    
                    cls._log_audit(
                        action='auto_validation',
                        message=f"Dépense {depense.numero} auto-validée via Mission {tache.numero}",
                        user=user,
                        obj=depense,
                        details={
                            'Statut': {'old': 'Nouvelle', 'new': depense.statut},
                            'Montant Validé': {'old': '0 Ar', 'new': f"{float(depense.montant):,.0f} Ar"},
                            'Mission Associée': {'old': '', 'new': tache.numero}
                        }
                    )

        return depense

    @classmethod
    @transaction.atomic
    def process_dg_direct_validation(cls, depense: Depense, user) -> Depense:
        """
        Validation automatique pour les dépenses créées par le DG.
        Passe directement au statut 'validée' (prêt pour paiement).
        """
        # Vérification double sécurité
        if user.role != 'dg':
            return depense

        # Mise à jour des statuts
        depense.statut = Depense.STATUT_VALIDEE
        depense.approved_by_system = True
        
        # Le DG est à la fois vérificateur et validateur
        now = timezone.now()
        depense.verifie_par = user
        depense.date_verification = now
        depense.valide_par_dg = user
        depense.date_validation_dg = now
        
        # On remplit aussi la validation comptable pour la cohérence des données
        # (Considéré comme auto-validé administrativement)
        depense.valide_par_comptable = user 
        depense.date_validation_comptable = now
        
        depense.commentaire_validation = "[AUTO-DG] Validé directement par le Directeur Général"
        depense.save()

        cls._log_audit(
            action='auto_validation_dg',
            message=f"Dépense {depense.numero} validée directement par le DG {user.username}",
            user=user,
            obj=depense,
            details={
                'Statut': {'old': 'Nouvelle', 'new': depense.statut},
                'Montant Direct': {'old': '', 'new': f"{float(depense.montant):,.0f} Ar"},
                'Motif': {'old': '', 'new': depense.motif}
            }
        )
        
        return depense

    @classmethod
    @transaction.atomic
    def verify_depense(cls, depense: Depense, user, comment: str = ""):
        """Vérification comptable d'une dépense"""
        if not depense.user_can_verify(user):
            raise ValidationError("Permission refusée pour vérifier cette dépense.")
        
        # Security: Prevent self-verification
        if depense.created_by == user and getattr(user, 'role', '') != FinancesConstants.ROLE_DG:
            raise ValidationError("Vous ne pouvez pas vérifier votre propre dépense.")
        
        if depense.statut != Depense.STATUT_EN_ATTENTE:
            raise ValidationError("Cette dépense n'est pas en attente.")

        ancienne_valeur = depense.statut
        depense.statut = Depense.STATUT_VERIFIEE
        depense.verifie_par = user
        depense.date_verification = timezone.now()
        
        # IMPORTANT: Pour les dépenses >500k qui nécessitent validation DG,
        # on enregistre aussi le comptable comme validateur
        # Cela permet au DG de valider ensuite (sinon model.clean() rejette)
        depense.valide_par_comptable = user
        depense.date_validation_comptable = timezone.now()
        
        if comment:
            depense.commentaire_validation = comment
        depense.save()

        cls._log_audit(
            action='validation',
            message=f"Dépense {depense.numero} vérifiée par {user.username}",
            user=user,
            obj=depense,
            details={
                'Statut': {'old': ancienne_valeur, 'new': depense.statut},
                'Montant Vérifié': {'old': '', 'new': f"{float(depense.montant):,.0f} Ar"},
                'Commentaire': {'old': '', 'new': comment or 'Aucun'}
            }
        )
        # Notifier le DG si nécessaire
        if depense.montant >= FinancesConstants.SEUIL_VALIDATION_DG:
            User = get_user_model()
            dgs = User.objects.filter(role=FinancesConstants.ROLE_DG)
            for dg in dgs:
                NotificationService.notify_expense_validation_needed(depense, dg)
        
        return depense


    @classmethod
    @transaction.atomic
    def validate_depense(cls, depense: Depense, user, comment: str = ""):
        """Validation finale (DG ou Comptable selon montant)"""
        # Security: Prevent self-validation
        if depense.created_by == user and getattr(user, 'role', '') != FinancesConstants.ROLE_DG:
            raise ValidationError("Vous ne pouvez pas valider votre propre dépense.")

        if not depense.user_can_validate(user):
            raise ValidationError("Permission refusée pour valider cette dépense.")

        # Logique spécifique selon le montant (et non juste le rôle qui peut être permissif)
        needs_dg = depense.necessite_validation_dg
        
        if needs_dg:
            # Cas DG ou Admin seulement
            if user.role not in [FinancesConstants.ROLE_DG, FinancesConstants.ROLE_ADMIN]:
                 raise ValidationError("Validation DG requise pour ce montant.")
            
            if not depense.tache:
                # Hors mission : DG valide depuis EN_ATTENTE
                if depense.statut not in [Depense.STATUT_EN_ATTENTE, Depense.STATUT_VERIFIEE]:
                    raise ValidationError("Statut invalide pour validation DG (hors mission).")
            else:
                # En mission : Le comptable doit normalement vérifier d'abord
                # SAUF si c'est le DG qui valide directement (Shortcut)
                if depense.statut != Depense.STATUT_VERIFIEE and user.role != FinancesConstants.ROLE_DG:
                    raise ValidationError("La dépense doit d'abord être vérifiée par le comptable.")
                
            depense.valide_par_dg = user
            depense.date_validation_dg = timezone.now()
            
            # Si le DG valide alors que le comptable n'a pas encore vérifié,
            # on marque le DG comme validateur administratif aussi pour la cohérence
            if not depense.valide_par_comptable:
                depense.valide_par_comptable = user
                depense.date_validation_comptable = timezone.now()
        
        else:
            # Cas < 500k : Comptable, DG ou Admin
            # On accepte EN_ATTENTE (direct) ou VERIFIEE (si déjà vérifiée)
            if depense.statut not in [Depense.STATUT_EN_ATTENTE, Depense.STATUT_VERIFIEE]:
                 raise ValidationError("Statut invalide pour validation.")
            
            depense.valide_par_comptable = user
            depense.date_validation_comptable = timezone.now()

        ancienne_valeur = depense.statut
        depense.statut = Depense.STATUT_VALIDEE
        if comment:
            depense.commentaire_validation = comment
        depense.save()

        cls._log_audit(
            action='validation',
            message=f"Dépense {depense.numero} validée par {user.username}",
            user=user,
            obj=depense,
            details={
                'Statut': {'old': ancienne_valeur, 'new': depense.statut},
                'Montant Validé': {'old': '', 'new': f"{float(depense.montant):,.0f} Ar"},
                'Commentaire': {'old': '', 'new': comment or 'Aucun'}
            }
        )
        return depense


    @classmethod
    @transaction.atomic
    def pay_depense(cls, depense: Depense, user, comment: str = ""):
        """Paiement de la dépense"""
        # Security: Prevent self-payment
        if depense.created_by == user and getattr(user, 'role', '') != FinancesConstants.ROLE_DG:
            raise ValidationError("Vous ne pouvez pas payer votre propre dépense.")

        if not depense.user_can_pay(user):
            raise ValidationError("Permission refusée pour payer cette dépense.")
        
        if depense.statut != Depense.STATUT_VALIDEE:
            raise ValidationError("La dépense doit être validée avant paiement.")

        ancienne_valeur = depense.statut
        depense.statut = Depense.STATUT_PAYEE
        depense.date_paiement = timezone.now()
        if comment:
            depense.commentaire_validation = comment
        depense.save()

        cls._log_audit(
            action='payment', # Action custom, mappée sur 'validation' ou 'update' dans AuditLog si 'payment' non existant, mais 'validation' est ok
            message=f"Dépense {depense.numero} payée par {user.username}",
            user=user,
            obj=depense,
            details={
                'Statut': {'old': ancienne_valeur, 'new': depense.statut},
                'Montant Payé': {'old': '', 'new': f"{float(depense.montant):,.0f} Ar"},
                'Date Paiement': {'old': '', 'new': timezone.now().strftime('%Y-%m-%d %H:%M:%S')},
                'Commentaire': {'old': '', 'new': comment or 'Aucun'}
            }
        )
        return depense


    @classmethod
    @transaction.atomic
    def reject_depense(cls, depense: Depense, user, comment: str):
        """Rejet d'une dépense"""
        if not depense.user_can_reject(user):
            raise ValidationError("Permission refusée pour rejeter cette dépense.")
        
        if not comment:
            raise ValidationError("Un commentaire est requis pour le rejet.")

        ancienne_valeur = depense.statut
        depense.statut = Depense.STATUT_REJETEE
        depense.commentaire_validation = comment
        
        # Reset validations
        depense.verifie_par = None
        depense.date_verification = None
        depense.valide_par_comptable = None
        depense.date_validation_comptable = None
        depense.valide_par_dg = None
        depense.date_validation_dg = None
        
        depense.save()

        cls._log_audit(
            action='rejet',
            message=f"Dépense {depense.numero} rejetée par {user.username}",
            user=user,
            obj=depense,
            details={
                'Statut': {'old': ancienne_valeur, 'new': depense.statut},
                'Raison Rejet': {'old': '', 'new': comment},
                'Montant Impacté': {'old': '', 'new': f"{float(depense.montant):,.0f} Ar"}
            }
        )
        return depense
    
    @classmethod
    @transaction.atomic
    def approve_and_pay_depense(cls, depense: Depense, user, comment: str = ""):
        """Shortcut : Valide et Paye une dépense en une seule opération (DG/Admin only)"""
        # 1. Validation de sécurité
        if user.role not in [FinancesConstants.ROLE_DG, FinancesConstants.ROLE_ADMIN]:
            raise ValidationError("Seul le DG ou l'Administrateur peut utiliser ce raccourci.")
        
        # 2. Étape de validation
        cls.validate_depense(depense, user, comment)
        
        # 3. Étape de paiement
        cls.pay_depense(depense, user, comment)
        
        cls._log_audit(
            action='validation',
            message=f"Dépense {depense.numero} validée et payée directement par {user.username}",
            user=user,
            obj=depense
        )
        return depense

