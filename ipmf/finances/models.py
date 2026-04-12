"""
Modèles financiers - Gestion des flux monétaires
Version 2.0 - Production Ready
"""

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP
import os
from typing import Optional, Tuple, Dict, List
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

# Validators personnalisés (version corrigée)
from .validators import (
    validate_positive_amount,
    validate_future_date,
    validate_file_size,
    validate_entree_montant,
    validate_file_extension
)

User = get_user_model()

# ============================================================================
# CONSTANTES GLOBALES
# ============================================================================

class FinancesConstants:
    """Constantes centralisées pour éviter les magic strings"""
    
    # Rôles utilisateurs
    ROLE_ADMIN = 'admin'
    ROLE_CAISSE = 'caisse'
    ROLE_COMPTABLE = 'comptable'
    ROLE_DG = 'dg'
    
    # Seuils métier
    SEUIL_VALIDATION_DG = Decimal('500000.00')  # 500 000 Ar
    SEUIL_CONFIRMATION_CAISSE = Decimal('100000.00')  # 100 000 Ar
    MONTANT_MIN_ENTREE = Decimal('1000.00')      # 1 000 Ar
    MONTANT_MAX_ENTREE = Decimal('1000000000.00')  # 1 milliard Ar
    
    # Délais métier
    DELAI_RETARD_DEPENSE = 7  # jours
    DELAI_ALERTE_DEPENSE = 3  # jours


# ============================================================================
# MIXINS & CLASSES ABSTRAITES
# ============================================================================

class TimestampMixin(models.Model):
    """Mixin pour ajouter les timestamps de création et modification"""
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    
    class Meta:
        abstract = True


class SequenceCounter(models.Model):
    """
    Modèle centralisé pour la génération de séquences uniques.
    Garantit l'atomité sur n'importe quel SGBD (PostgreSQL, SQLite, MySQL).
    """
    name = models.CharField(max_length=50, unique=True, verbose_name="Nom de la séquence")
    last_value = models.PositiveIntegerField(default=0, verbose_name="Dernière valeur")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Compteur de séquence"
        db_table = 'ipmf_sequences'

    def __str__(self):
        return f"{self.name}: {self.last_value}"

    @classmethod
    @transaction.atomic
    def get_next_value(cls, sequence_name: str) -> int:
        """
        Incrémente et retourne la prochaine valeur de manière atomique.
        Utilise SELECT FOR UPDATE pour verrouiller la ligne.
        """
        counter, created = cls.objects.select_for_update().get_or_create(
            name=sequence_name
        )
        counter.last_value += 1
        counter.save()
        return counter.last_value


class NumeroAutoMixin:
    """
    Mixin pour génération atomique de numéros uniques.
    Compatible PostgreSQL, SQLite et MySQL via SequenceCounter.
    """
    
    prefix: str = None  # Doit être défini
    
    @classmethod
    def _get_annee_reference(cls, obj) -> int:
        """Détermine l'année de référence"""
        try:
            if hasattr(obj, 'date_entree') and obj.date_entree:
                return obj.date_entree.year
            if hasattr(obj, 'created_at') and obj.created_at:
                return obj.created_at.year
        except AttributeError:
            pass
        return timezone.now().year

    def assign_numero_if_missing(self):
        """Assigne un numéro unique de manière atomique"""
        if not self.numero:
            annee = self._get_annee_reference(self)
            seq_name = f"{self.prefix}-{annee}"
            
            # Utilise le compteur global atomique
            next_val = SequenceCounter.get_next_value(seq_name)
            
            self.numero = f"{self.prefix}-{annee}-{next_val:03d}"


class PieceJustificativeMixin:
    """Mixin pour la gestion des pièces justificatives"""
    
    ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
    MAX_FILE_SIZE_MB = 5
    
    def get_piece_filename(self) -> str:
        """Retourne le nom du fichier sans le chemin"""
        if self.piece_justificative:
            return os.path.basename(self.piece_justificative.name)
        return ""
    
    def get_piece_justificative_name(self) -> str:
        """Alias pour le serializer"""
        return self.get_piece_filename()
    
    def has_valid_piece(self) -> bool:
        """Vérifie si la pièce existe et est valide"""
        if not self.piece_justificative:
            return False
        
        # Vérifier l'extension
        filename = self.piece_justificative.name.lower()
        if not any(filename.endswith(ext) for ext in self.ALLOWED_EXTENSIONS):
            return False
        
        # Vérifier la taille (si le fichier est déjà uploadé)
        try:
            if self.piece_justificative.size > self.MAX_FILE_SIZE_MB * 1024 * 1024:
                return False
        except (ValueError, OSError):
            # Le fichier n'existe pas encore ou erreur d'accès
            return False
        
        return True
    
    def get_piece_download_url(self) -> Optional[str]:
        """Retourne l'URL de téléchargement si disponible"""
        if self.piece_justificative and self.has_valid_piece():
            return self.piece_justificative.url
        return None





# ============================================================================
# MODÈLE ENTREE_ARGENT
# ============================================================================

class EntreeArgentQuerySet(models.QuerySet):
    """QuerySet personnalisé pour les entrées d'argent"""
    
    def pour_utilisateur(self, user):
        """Filtre les entrées selon les permissions de l'utilisateur"""
        if user.is_superuser:
            return self.all()
        
        role = getattr(user, 'role', '')
        
        if role in [FinancesConstants.ROLE_DG, FinancesConstants.ROLE_COMPTABLE, FinancesConstants.ROLE_CAISSE]:
            return self.all()
        else:
            return self.filter(created_by=user)
    
    def pour_periode(self, date_debut, date_fin=None):
        """Filtre les entrées pour une période donnée"""
        queryset = self.filter(date_entree__gte=date_debut)
        
        if date_fin:
            queryset = queryset.filter(date_entree__lte=date_fin)
        
        return queryset
    
    def total_montant(self):
        """Retourne le montant total des entrées"""
        return self.aggregate(total=models.Sum('montant'))['total'] or Decimal('0.00')
    
    def par_statut(self):
        """Regroupe les entrées par statut"""
        return self.values('statut').annotate(
            total=models.Sum('montant'),
            count=models.Count('id')
        ).order_by('statut')


class EntreeArgent(NumeroAutoMixin, PieceJustificativeMixin, 
                   TimestampMixin, models.Model):
    """
    Entrée d'argent dans le système.
    Représente une recette ou un encaissement.
    """
    
    # ============ CONSTANTES DE STATUT ============
    STATUT_EN_ATTENTE = 'en_attente'
    STATUT_CONFIRMEE = 'confirmee'
    STATUT_ANNULEE = 'annulee'
    
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente'),
        (STATUT_CONFIRMEE, 'Confirmée'),
        (STATUT_ANNULEE, 'Annulée'),
    ]
    
    STATUT_TRANSITIONS = {
        STATUT_EN_ATTENTE: [STATUT_CONFIRMEE, STATUT_ANNULEE],
        STATUT_CONFIRMEE: [STATUT_ANNULEE],  # Peut être annulée même après confirmation
        STATUT_ANNULEE: [],  # Statut terminal
    }
    
    # ============ CONSTANTES DE MODE DE PAIEMENT ============
    MODE_ESPECES = 'especes'
    MODE_VIREMENT = 'virement'
    MODE_CHEQUE = 'cheque'
    MODE_CARTE = 'carte'
    MODE_MOBILE = 'mobile'
    
    MODE_PAIEMENT_CHOICES = [
        (MODE_ESPECES, 'Espèces'),
        (MODE_VIREMENT, 'Virement bancaire'),
        (MODE_CHEQUE, 'Chèque'),
        (MODE_CARTE, 'Carte bancaire'),
        (MODE_MOBILE, 'Paiement mobile'),
    ]
    
    # ============ CHAMPS DU MODÈLE ============
    numero = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name="Numéro",
        db_index=True,
        help_text="Numéro unique généré automatiquement"
    )
    
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_positive_amount, validate_entree_montant],
        verbose_name="Montant",
        help_text=f"Montant en Ariary (entre {FinancesConstants.MONTANT_MIN_ENTREE:,} et {FinancesConstants.MONTANT_MAX_ENTREE:,} Ar)"
    )
    
    motif = models.CharField(
        max_length=200,
        verbose_name="Motif",
        help_text="Description de l'entrée d'argent"
    )
    
    mode_paiement = models.CharField(
        max_length=20,
        choices=MODE_PAIEMENT_CHOICES,
        verbose_name="Mode de paiement"
    )
    
    date_entree = models.DateField(
        verbose_name="Date d'entrée",
        default=timezone.now,
        db_index=True
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='entrees_crees',
        verbose_name="Créé par",
        db_index=True
    )
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default=STATUT_EN_ATTENTE,
        verbose_name="Statut",
        db_index=True
    )
    
    piece_justificative = models.FileField(
        upload_to='entrees/pieces_justificatives/%Y/%m/',
        null=True,
        blank=True,
        validators=[validate_file_size, validate_file_extension],
        verbose_name="Pièce justificative",
        help_text="Fichier PDF, JPG, PNG ou DOC (max 5MB)"
    )
    
    commentaire = models.TextField(
        blank=True,
        verbose_name="Commentaire",
        help_text="Informations complémentaires"
    )
    
    historique = models.TextField(
        blank=True,
        verbose_name="Historique",
        help_text="Journal des modifications"
    )
    
    # ============ MÉTADONNÉES ============
    objects = EntreeArgentQuerySet.as_manager()
    
    class Meta:
        verbose_name = "Entrée d'argent"
        verbose_name_plural = "Entrées d'argent"
        ordering = ['-date_entree', '-created_at']
        db_table = 'finances_entree_argent'
        
        permissions = [
            ("can_confirm_entree", "Peut confirmer une entrée d'argent"),
            ("can_cancel_entree", "Peut annuler une entrée d'argent"),
            ("can_view_all_entrees", "Peut voir toutes les entrées"),
            ("can_export_entrees", "Peut exporter les entrées"),
        ]
        
        indexes = [
            models.Index(fields=['date_entree', 'statut']),
            models.Index(fields=['created_by', 'statut']),
            models.Index(fields=['montant']),
            models.Index(fields=['mode_paiement']),
        ]
        
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant__gte=FinancesConstants.MONTANT_MIN_ENTREE),
                name="montant_min_entree"
            ),
            models.CheckConstraint(
                check=models.Q(statut__in=['en_attente', 'confirmee', 'annulee']),
                name="statut_entree_valide"
            ),
        ]
    
    # ============ INITIALISATION ============
    prefix = 'ENT'
    
    # ============ MÉTHODES MAGIQUES ============
    def __str__(self) -> str:
        """Représentation textuelle"""
        return f"{self.numero} - {self.montant} Ar - {self.motif[:50]}"
    
    def __repr__(self) -> str:
        """Représentation pour le debug"""
        return f"<EntreeArgent {self.numero} ({self.statut})>"
    
    # ============ SAVE & CLEAN ============
    def save(self, *args, **kwargs):
        """Surcharge de save() avec validation complète"""
        is_new = self._state.adding
        
        # Génération du numéro pour les nouvelles entrées
        if is_new and not self.numero:
            self.assign_numero_if_missing()
        
        # Validation complète avant sauvegarde
        self.full_clean()
        
        # Mise à jour de updated_at (géré par TimestampMixin)
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validation métier complète"""
        super().clean()
        
        errors = {}
        
        # Validation: date d'entrée (prise en compte de la timezone locale)
        today = timezone.localtime().date()
        if self.date_entree > today:
            errors['date_entree'] = f"La date d'entrée ({self.date_entree}) ne peut pas être dans le futur (Aujourd'hui: {today})"
        
        # Validation: commentaire obligatoire pour annulation
        if self.statut == self.STATUT_ANNULEE and not self.commentaire.strip():
            errors['commentaire'] = "Un commentaire est requis pour annuler une entrée"
        
        if errors:
            raise ValidationError(errors)
    
    # ============ LOGIQUE MÉTIER (STATES) ============
    @property
    def est_confirmable(self) -> bool:
        """Vérifie si l'entrée peut être confirmée"""
        return self.statut == self.STATUT_EN_ATTENTE
    
    @property
    def est_annulable(self) -> bool:
        """Vérifie si l'entrée peut être annulée"""
        return self.statut in [self.STATUT_EN_ATTENTE, self.STATUT_CONFIRMEE]

    # ============ MÉTHODES DE PERMISSION ============
    def user_can_confirm(self, user) -> bool:
        """Vérifie si l'utilisateur peut confirmer cette entrée"""
        if user.is_superuser:
            return True
        
        role = getattr(user, 'role', '')
        
        if role in [FinancesConstants.ROLE_ADMIN, FinancesConstants.ROLE_DG]:
            return True
            
        if role == FinancesConstants.ROLE_COMPTABLE:
            return True
            
        if role == FinancesConstants.ROLE_CAISSE:
            # Le caissier ne peut confirmer que s'il s'agit d'un petit montant
            return self.montant < FinancesConstants.SEUIL_CONFIRMATION_CAISSE
            
        return False
    
    def user_can_cancel(self, user) -> bool:
        """Vérifie si l'utilisateur peut annuler cette entrée"""
        if user.is_superuser:
            return True
        
        role = getattr(user, 'role', '')
        
        # Admin et DG peuvent toujours annuler
        if role in [FinancesConstants.ROLE_ADMIN, FinancesConstants.ROLE_DG]:
            return True
        
        # Le créateur peut annuler ses propres entrées
        if user == self.created_by:
            return True
        
        # Caisse ne peut annuler que ses propres entrées
        if role == FinancesConstants.ROLE_CAISSE and user == self.created_by:
            return True
        
        return False
    
    def user_can_view(self, user) -> bool:
        """Vérifie si l'utilisateur peut voir cette entrée"""
        if user.is_superuser:
            return True
        
        role = getattr(user, 'role', '')
        
        # DG et comptable voient tout
        if role in [FinancesConstants.ROLE_DG, FinancesConstants.ROLE_COMPTABLE]:
            return True
        
        # Caisse voit ses propres entrées et celles en attente
        if role == FinancesConstants.ROLE_CAISSE:
            return user == self.created_by or self.statut == self.STATUT_EN_ATTENTE
        
        # Autres utilisateurs ne voient que leurs entrées
        return user == self.created_by

    def can_be_confirmed_by(self, user) -> bool:
        """Alias pour le serializer"""
        return self.user_can_confirm(user)

    def can_be_cancelled_by(self, user) -> bool:
        """Alias pour le serializer"""
        return self.user_can_cancel(user)
    
    
    # ============ MÉTHODES D'URL ============
    def get_absolute_url(self):
        """URL pour le détail de l'entrée"""
        from django.urls import reverse
        return reverse('entreeargent-detail', kwargs={'pk': self.pk})
    
    def get_admin_url(self):
        """URL pour l'admin Django"""
        from django.urls import reverse
        return reverse('admin:finances_entreeargent_change', args=[self.id])


# ============================================================================
# MODÈLE DEPENSE
# ============================================================================

class DepenseQuerySet(models.QuerySet):
    """QuerySet personnalisé pour les dépenses"""
    
    def pour_utilisateur(self, user):
        """Filtre les dépenses selon les permissions"""
        if user.is_superuser:
            return self.all()
        
        role = getattr(user, 'role', '')
        
        if role == FinancesConstants.ROLE_DG:
            return self.all()
        elif role == FinancesConstants.ROLE_COMPTABLE:
            return self.filter(
                models.Q(created_by=user) |
                models.Q(statut=Depense.STATUT_PAYEE)
            )
        elif role == FinancesConstants.ROLE_CAISSE:
            return self.filter(
                models.Q(created_by=user) |
                models.Q(statut__in=[Depense.STATUT_VALIDEE, Depense.STATUT_PAYEE])
            )
        else:
            return self.filter(created_by=user)
    
    def en_retard(self):
        """Dépenses en attente depuis plus de 7 jours"""
        date_limite = timezone.now() - timedelta(days=FinancesConstants.DELAI_RETARD_DEPENSE)
        return self.filter(
            statut=Depense.STATUT_EN_ATTENTE,
            created_at__lt=date_limite
        )
    
    def necessitant_validation_dg(self):
        """Dépenses nécessitant validation DG"""
        return self.filter(
            montant__gte=FinancesConstants.SEUIL_VALIDATION_DG,
            statut=Depense.STATUT_VERIFIEE
        )
    
    def par_categorie(self):
        """Regroupe les dépenses par catégorie"""
        return self.values('categorie').annotate(
            total=models.Sum('montant'),
            count=models.Count('id')
        ).order_by('categorie')
    
    def total_montant(self):
        """Montant total des dépenses"""
        return self.aggregate(total=models.Sum('montant'))['total'] or Decimal('0.00')


class Depense(NumeroAutoMixin, PieceJustificativeMixin, 
              TimestampMixin, models.Model):
    """
    Dépense avec workflow de validation multi-niveaux.
    """
    
    # ============ CONSTANTES DE STATUT ============
    STATUT_EN_ATTENTE = 'en_attente'
    STATUT_VERIFIEE = 'verifiee'
    STATUT_VALIDEE = 'validee'
    STATUT_PAYEE = 'payee'
    STATUT_REJETEE = 'rejetee'
    
    STATUT_CHOICES = [
        (STATUT_EN_ATTENTE, 'En attente'),
        (STATUT_VERIFIEE, 'Vérifiée'),
        (STATUT_VALIDEE, 'Validée'),
        (STATUT_PAYEE, 'Payée'),
        (STATUT_REJETEE, 'Rejetée'),
    ]
    
    STATUT_TRANSITIONS = {
        STATUT_EN_ATTENTE: [STATUT_VERIFIEE, STATUT_VALIDEE, STATUT_REJETEE],
        STATUT_VERIFIEE: [STATUT_VALIDEE, STATUT_REJETEE],
        STATUT_VALIDEE: [STATUT_PAYEE, STATUT_REJETEE],
        STATUT_PAYEE: [],  # Terminal
        STATUT_REJETEE: [STATUT_EN_ATTENTE],  # Peut être resoumise
    }
    
    # ============ CONSTANTES DE CATÉGORIE ============
    CATEGORIE_FONCTIONNEMENT = 'fonctionnement'
    CATEGORIE_INVESTISSEMENT = 'investissement'
    CATEGORIE_PERSONNEL = 'personnel'
    CATEGORIE_FORMATION = 'formation'
    CATEGORIE_MISSION = 'mission'
    CATEGORIE_AUTRE = 'autre'
    
    CATEGORIE_CHOICES = [
        (CATEGORIE_FONCTIONNEMENT, 'Fonctionnement'),
        (CATEGORIE_INVESTISSEMENT, 'Investissement'),
        (CATEGORIE_PERSONNEL, 'Personnel'),
        (CATEGORIE_FORMATION, 'Formation'),
        (CATEGORIE_MISSION, 'Mission'),
        (CATEGORIE_AUTRE, 'Autre'),
    ]
    
    # ============ CHAMPS DE BASE ============
    numero = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name="Numéro",
        db_index=True
    )
    
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_positive_amount],
        verbose_name="Montant total",
        help_text="Montant calculé automatiquement (quantité × prix unitaire)"
    )
    
    motif = models.CharField(
        max_length=200,
        verbose_name="Motif",
        help_text="Description de la dépense"
    )
    
    categorie = models.CharField(
        max_length=20,
        choices=CATEGORIE_CHOICES,
        default=CATEGORIE_FONCTIONNEMENT,
        verbose_name="Catégorie"
    )
    
    quantite = models.PositiveIntegerField(
        default=1,
        verbose_name="Quantité",
        help_text="Nombre d'unités"
    )
    
    prix_unitaire = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Prix unitaire"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='depenses_crees',
        verbose_name="Créé par",
        db_index=True
    )
    
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default=STATUT_EN_ATTENTE,
        verbose_name="Statut",
        db_index=True
    )
    
    piece_justificative = models.FileField(
        upload_to='depenses/pieces_justificatives/%Y/%m/',
        null=True,
        blank=True,
        validators=[validate_file_size, validate_file_extension],
        verbose_name="Pièce justificative",
        help_text="Justificatif de la dépense (max 5MB)"
    )
    
    commentaire = models.TextField(
        blank=True,
        verbose_name="Commentaire",
        help_text="Informations complémentaires"
    )
    
    historique = models.TextField(
        blank=True,
        verbose_name="Historique",
        help_text="Journal des modifications"
    )
    
    # ============ LIENS & TRAÇABILITÉ ============
    tache = models.ForeignKey(
        'tasks.Tache', 
        on_delete=models.PROTECT, 
        related_name='depenses', 
        null=True, 
        blank=True, 
        verbose_name="Mission liée"
    )

    approved_by_system = models.BooleanField(
        default=False, 
        help_text="Auto-approuvé via règles métier", 
        verbose_name="Auto-approbation système"
    )

    # ============ WORKFLOW DE VALIDATION ============
    verifie_par = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='depenses_verifiees',
        null=True,
        blank=True,
        verbose_name="Vérifié par"
    )
    
    valide_par_comptable = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='depenses_validees_comptable',
        null=True,
        blank=True,
        verbose_name="Validé par (comptable)"
    )
    
    valide_par_dg = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='depenses_validees_dg',
        null=True,
        blank=True,
        verbose_name="Validé par (DG)"
    )
    
    date_verification = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de vérification"
    )
    
    date_validation_comptable = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date validation comptable"
    )
    
    date_validation_dg = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date validation DG"
    )
    
    date_paiement = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de paiement"
    )
    
    commentaire_validation = models.TextField(
        blank=True,
        verbose_name="Commentaire de validation"
    )
    
    # ============ MÉTADONNÉES ============
    objects = DepenseQuerySet.as_manager()
    
    class Meta:
        verbose_name = "Dépense"
        verbose_name_plural = "Dépenses"
        ordering = ['-created_at']
        db_table = 'finances_depense'
        
        permissions = [
            ("can_verify_depense", "Peut vérifier une dépense"),
            ("can_validate_depense", "Peut valider une dépense"),
            ("can_pay_depense", "Peut payer une dépense"),
            ("can_reject_depense", "Peut rejeter une dépense"),
            ("can_approve_mission_expenses", "Peut auto-valider via mission"),
        ]
        
        indexes = [
            models.Index(fields=['statut', 'categorie']),
            models.Index(fields=['created_by', 'statut']),
            models.Index(fields=['montant']),
            models.Index(fields=['created_at']),
            models.Index(fields=['verifie_par']),
        ]
        
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant__gt=0),
                name="montant_depense_positif"
            ),
            models.CheckConstraint(
                check=models.Q(quantite__gt=0),
                name="quantite_positive"
            ),
            models.CheckConstraint(
                check=models.Q(prix_unitaire__gt=0),
                name="prix_unitaire_positif"
            ),
            models.CheckConstraint(
                check=models.Q(statut__in=[
                    'en_attente', 'verifiee', 
                    'validee', 'payee', 'rejetee'
                ]),
                name="statut_depense_valide"
            ),
        ]
    
    # ============ INITIALISATION ============
    prefix = 'DEP'
    
    # ============ MÉTHODES MAGIQUES ============
    def __str__(self) -> str:
        return f"{self.numero} - {self.montant} Ar - {self.motif[:50]}"
    
    def __repr__(self) -> str:
        return f"<Depense {self.numero} ({self.statut})>"
    
    # ============ SAVE & CLEAN ============
    def save(self, *args, **kwargs):
        """Surcharge avec calcul automatique du montant"""
        is_new = self._state.adding
        
        # Calculer le montant avant validation
        self._calculer_montant()
        
        # Générer le numéro pour les nouvelles dépenses
        if is_new and not self.numero:
            self.assign_numero_if_missing()
        
        # Validation complète
        self.full_clean()
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validation métier des dépenses"""
        super().clean()
        
        errors = {}
        
        # Note: Le montant est calculé automatiquement dans save() avant clean()
        # donc pas besoin de le valider ici
        
        # Validation: workflow cohérent (Le DG peut bypasser le comptable)
        if self.valide_par_dg and not self.valide_par_comptable and self.valide_par_dg.role != FinancesConstants.ROLE_DG:
            errors['valide_par_dg'] = "Doit d'abord être validé par le comptable"
        
        if self.date_validation_dg and not self.valide_par_dg:
            errors['date_validation_dg'] = "Le validateur DG doit être défini"
        
        # Validation: dates cohérentes
        if (self.date_verification and self.created_at and 
            self.date_verification < self.created_at):
            errors['date_verification'] = "Ne peut pas être avant la création"
        
        if errors:
            raise ValidationError(errors)
    
    def _calculer_montant(self):
        """Calcule automatiquement le montant total"""
        if self.quantite and self.prix_unitaire:
            self.montant = self.quantite * self.prix_unitaire

    # ============ LOGIQUE MÉTIER (STATES) ============
    @property
    def necessite_validation_dg(self) -> bool:
        """Vérifie si la dépense nécessite validation DG"""
        if not self.tache:
            return True
        return self.montant >= FinancesConstants.SEUIL_VALIDATION_DG
    
    @property
    def delai_attente(self) -> int:
        """Délai d'attente en jours pour les dépenses en attente"""
        if self.statut == self.STATUT_EN_ATTENTE:
            delta = timezone.now() - self.created_at
            return delta.days
        return 0
    
    @property
    def est_en_retard(self) -> bool:
        """Vérifie si la dépense est en retard"""
        return (
            self.statut == self.STATUT_EN_ATTENTE and
            self.delai_attente > FinancesConstants.DELAI_RETARD_DEPENSE
        )
    
    @property
    def est_en_alerte(self) -> bool:
        """Vérifie si la dépense approche du retard"""
        return (
            self.statut == self.STATUT_EN_ATTENTE and
            FinancesConstants.DELAI_ALERTE_DEPENSE <= self.delai_attente <= FinancesConstants.DELAI_RETARD_DEPENSE
        )

    # ============ MÉTHODES DE PERMISSION ============
    def user_can_verify(self, user) -> bool:
        """Vérifie si l'utilisateur peut vérifier cette dépense"""
        if user.is_superuser:
            return True
        
        if not self.tache:
            return False # Le comptable ne fait rien sur les dépenses hors mission
            
        role = getattr(user, 'role', '')
        return role in [FinancesConstants.ROLE_ADMIN, FinancesConstants.ROLE_COMPTABLE]
    
    def user_can_validate(self, user) -> bool:
        """Vérifie si l'utilisateur peut valider cette dépense"""
        if user.is_superuser:
            return True
        
        role = getattr(user, 'role', '')
        
        if role == FinancesConstants.ROLE_DG:
            if not self.tache:
                return self.statut in [self.STATUT_EN_ATTENTE, self.STATUT_VERIFIEE]
            # Pour les missions, le DG peut maintenant bypasser la vérification
            # si c'est une grosse dépense ou s'il décide d'intervenir
            return self.statut in [self.STATUT_EN_ATTENTE, self.STATUT_VERIFIEE]
        
        if role == FinancesConstants.ROLE_COMPTABLE:
            if not self.tache:
                return False # Bypass comptable pour hors mission
            return not self.necessite_validation_dg and self.statut == self.STATUT_EN_ATTENTE
        
        return False
    
    def user_can_pay(self, user) -> bool:
        """Vérifie si l'utilisateur peut payer cette dépense"""
        if user.is_superuser:
            return True
        
        role = getattr(user, 'role', '')
        return (
            role in [FinancesConstants.ROLE_ADMIN, FinancesConstants.ROLE_CAISSE, FinancesConstants.ROLE_DG] and
            self.statut == self.STATUT_VALIDEE
        )

    def can_be_verified_by(self, user) -> bool:
        """Alias pour le serializer"""
        return self.user_can_verify(user)

    def can_be_validated_by(self, user) -> bool:
        """Alias pour le serializer"""
        return self.user_can_validate(user)

    def can_be_paid_by(self, user) -> bool:
        """Alias pour le serializer"""
        return self.user_can_pay(user)

    def can_be_rejected_by(self, user) -> bool:
        """Alias pour le serializer"""
        return self.user_can_reject(user)
    
    def user_can_reject(self, user) -> bool:
        """Vérifie si l'utilisateur peut rejeter cette dépense"""
        if user.is_superuser:
            return True
        
        role = getattr(user, 'role', '')
        
        if not self.tache:
            if role not in [FinancesConstants.ROLE_ADMIN, FinancesConstants.ROLE_DG]:
                return False
        else:
            if role not in [FinancesConstants.ROLE_ADMIN, FinancesConstants.ROLE_COMPTABLE, FinancesConstants.ROLE_DG]:
                return False
        
        return self.statut in [self.STATUT_EN_ATTENTE, self.STATUT_VERIFIEE]
    
    # ============ MÉTHODES DE WORKFLOW ============

    
    # ============ MÉTHODES D'URL ============
    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('depense-detail', kwargs={'pk': self.pk})
    
    def get_admin_url(self):
        from django.urls import reverse
        return reverse('admin:finances_depense_change', args=[self.id])
    



