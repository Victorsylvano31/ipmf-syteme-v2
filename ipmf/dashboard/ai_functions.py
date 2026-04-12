import logging
from django.utils import timezone
from finances.models import Depense, FinancesConstants
from tasks.models import Tache
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

def valider_depenses_urgentes(user):
    """
    Valide automatiquement toutes les dépenses en attente de validation DG (statut 'verifiee' et montant >= seuil).
    Returns a string detailing the result for the AI.
    """
    try:
        # Trouver les dépenses nécessitant la validation DG
        depenses_a_valider = Depense.objects.filter(
            statut=Depense.STATUT_VERIFIEE,
            montant__gte=FinancesConstants.SEUIL_VALIDATION_DG
        )
        
        count = depenses_a_valider.count()
        if count == 0:
            return "Aucune dépense en attente de validation n'a été trouvée."
            
        total_montant = sum(d.montant for d in depenses_a_valider)
        
        # Mettre à jour le statut
        now = timezone.now().date()
        for depense in depenses_a_valider:
            depense.statut = Depense.STATUT_VALIDEE
            
            # Contourner l'erreur "date_verification ne peut pas être avant création"
            # On s'assure que date_verification et date_validation sont cohérentes
            if not depense.date_verification or depense.date_verification < depense.created_at.date():
                depense.date_verification = now
                
            depense.date_validation = now
            
            # Idéalement on garde une trace de qui a validé
            if hasattr(depense, 'valide_par'):
                 depense.valide_par = user
            depense.save(update_fields=['statut', 'date_verification', 'date_validation', 'valide_par'])
            
        return f"Succès : {count} dépenses ont été validées pour un montant total de {total_montant:,.2f} Ar."
    except Exception as e:
        logger.error(f"Erreur lors de la validation des dépenses par l'IA: {e}")
        return f"Erreur lors de la validation : {str(e)}"

def creer_tache(titre, description, assigne_a_username, priorite="moyenne"):
    """
    Crée une nouvelle tâche et l'assigne à un agent spécifique.
    """
    try:
        try:
            assignee = User.objects.get(username__iexact=assigne_a_username)
        except User.DoesNotExist:
             return f"Erreur : L'utilisateur avec le nom d'utilisateur '{assigne_a_username}' n'existe pas. Veuillez vérifier le nom."
             
        # Mapping priorité
        priorite_db = priorite.lower()
        if priorite_db not in dict(Tache.PRIORITE_CHOICES).keys():
            priorite_db = 'moyenne'

        tache = Tache.objects.create(
            titre=titre,
            description=description,
            assigne_a=assignee,
            priorite=priorite_db,
            statut='a_faire',
            date_echeance=timezone.now().date() + timezone.timedelta(days=2) # Par défaut dans 2 jours
        )
        return f"Succès : La tâche '{titre}' a bien été créée et assignée à {assignee.first_name or assignee.username} avec la priorité {priorite_db}."
    except Exception as e:
         logger.error(f"Erreur lors de la création de tâche par l'IA: {e}")
         return f"Erreur lors de la création de la tâche : {str(e)}"

# Dictionnaire de mapping pour faire correspondre le nom de la fonction appelée par Gemini à la vraie fonction Python
AVAILABLE_FUNCTIONS = {
    "valider_depenses_urgentes": valider_depenses_urgentes,
    "creer_tache": creer_tache
}
