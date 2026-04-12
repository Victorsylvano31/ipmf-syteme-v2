from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Tache, CommentaireTache, DemandeReport, SousTache, LigneDevis

User = get_user_model()

class LigneDevisSerializer(serializers.ModelSerializer):
    total_estime = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_reel = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, allow_null=True)
    ecart = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True, allow_null=True)
    cree_par_name = serializers.CharField(source='cree_par.get_full_name', read_only=True)

    class Meta:
        model = LigneDevis
        fields = [
            'id', 'tache', 'article', 'quantite', 'unite',
            'prix_estime', 'prix_reel', 'total_estime', 'total_reel', 'ecart',
            'cree_par', 'cree_par_name', 'date_creation'
        ]
        read_only_fields = ('cree_par', 'date_creation', 'total_estime', 'total_reel', 'ecart')

class SousTacheSerializer(serializers.ModelSerializer):
    assigne_a_name = serializers.CharField(source='assigne_a.get_full_name', read_only=True)

    class Meta:
        model = SousTache
        fields = ['id', 'tache', 'titre', 'est_terminee', 'assigne_a', 'assigne_a_name', 'date_creation', 'date_fin']
        read_only_fields = ('date_creation', 'date_fin')

class TacheSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle Tache.
    Gère la conversion entre le modèle Django et les données JSON pour l'API.
    Inclut des champs calculés et des permissions utilisateur.
    """
    
    # Champs read-only calculés pour affichage
    createur_name = serializers.CharField(source='createur.get_full_name', read_only=True)
    agents_assignes_names = serializers.SerializerMethodField()
    agent_principal_name = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    priorite_display = serializers.CharField(source='get_priorite_display', read_only=True)
    
    # Propriétés calculées du modèle
    jours_restants = serializers.IntegerField(read_only=True)  # Nombre de jours jusqu'à l'échéance
    est_en_retard = serializers.BooleanField(read_only=True)  # True si la tâche est en retard
    pourcentage_avancement = serializers.IntegerField(read_only=True)  # % d'avancement basé sur le statut
    
    # Permissions utilisateur (calculées dynamiquement selon l'utilisateur connecté)
    peut_demarrer = serializers.SerializerMethodField()  # L'utilisateur peut-il démarrer cette tâche?
    peut_terminer = serializers.SerializerMethodField()  # L'utilisateur peut-il terminer cette tâche?
    peut_valider = serializers.SerializerMethodField()  # L'utilisateur peut-il valider cette tâche?
    peut_annuler = serializers.SerializerMethodField()  # L'utilisateur peut-il annuler cette tâche?
    
    # Autres champs calculés
    valide_par_name = serializers.CharField(source='valide_par.get_full_name', read_only=True)  # Nom du validateur
    piece_jointe_name = serializers.CharField(source='get_piece_jointe_name', read_only=True)  # Nom du fichier joint
    messages = serializers.SerializerMethodField()  # Liste des commentaires
    pending_report = serializers.SerializerMethodField() # Demande de report en attente
    budget_restant = serializers.SerializerMethodField() # Budget restant calculé
    sous_taches = SousTacheSerializer(many=True, read_only=True) # Liste des sous-tâches
    lignes_devis = LigneDevisSerializer(many=True, read_only=True) # Bon de commande
    
    class Meta:
        model = Tache
        fields = [
            'id', 'numero', 'titre', 'description', 'date_creation', 'date_debut', 'date_echeance',
            'priorite', 'priorite_display', 'statut', 'statut_display', 'createur', 'createur_name',
            'agents_assignes', 'agents_assignes_names', 'agent_principal', 'agent_principal_name',
            'budget_alloue', 'resultat', 'piece_jointe_resultat', 'piece_jointe_name',
            'date_debut_reelle', 'date_fin_reelle', 'commentaire_validation', 'valide_par', 'valide_par_name',
            'date_validation', 'jours_restants', 'est_en_retard', 'pourcentage_avancement',
            'peut_demarrer', 'peut_terminer', 'peut_valider', 'peut_annuler',
            'messages', 'pending_report', 'budget_restant', 'sous_taches', 'lignes_devis'
        ]
        read_only_fields = (
            'numero', 'createur', 'date_creation', 'jours_restants', 'est_en_retard', 
            'pourcentage_avancement', 'valide_par', 'date_validation', 'pending_report', 'budget_restant',
            'agent_principal_name'
        )

    def get_budget_restant(self, obj):
        """Calcule le budget restant sur la tâche"""
        if not obj.budget_alloue:
            return None
        from django.db.models import Sum
        total_engague = obj.depenses.exclude(statut__in=['rejetee', 'annulee']).aggregate(total=Sum('montant'))['total'] or 0
        return float(obj.budget_alloue - total_engague)

    def get_pending_report(self, obj):
        """Retourne la demande de report en attente s'il y en a une."""
        pending = obj.demandes_report.filter(statut='en_attente').first()
        if pending:
            return DemandeReportSerializer(pending).data
        return None
    
    def get_agent_principal_name(self, obj):
        """Retourne le nom de l'agent principal (défini ou déduit)."""
        principal = obj._get_agent_principal()
        if principal:
            return principal.get_full_name()
        return None

    def get_agents_assignes_names(self, obj):
        """Retourne la liste des noms complets des agents assignés."""
        return [user.get_full_name() for user in obj.agents_assignes.all()]

    def validate_date_echeance(self, value):
        """
        Validation de la date d'échéance.
        Vérifie que la date n'est pas dans le passé (avec tolérance pour le drag & drop).
        """
        from django.utils import timezone
        # On compare avec la date/heure actuelle
        if value < timezone.now():
            # Tolérance activée: on accepte les dates légèrement passées pour faciliter le drag & drop
            # Si vous voulez bloquer strictement, décommenter la ligne suivante:
            # raise serializers.ValidationError("La date d'échéance ne peut pas être dans le passé")
            pass 
        return value
    
    def get_peut_demarrer(self, obj):
        """Vérifie si l'utilisateur connecté peut démarrer cette tâche (doit être l'agent assigné + statut 'creee')."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.peut_demarrer(request.user)
        return False
    
    def get_peut_terminer(self, obj):
        """Vérifie si l'utilisateur connecté peut terminer cette tâche (doit être l'agent assigné + statut 'en_cours')."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.peut_terminer(request.user)
        return False
    
    def get_peut_valider(self, obj):
        """Vérifie si l'utilisateur connecté peut valider cette tâche (admin/dg/créateur + statut 'terminee')."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.peut_valider(request.user)
        return False
    
    def get_peut_annuler(self, obj):
        """Vérifie si l'utilisateur connecté peut annuler cette tâche (admin/dg/créateur)."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.peut_annuler(request.user)
        return False
    
    def create(self, validated_data):
        """
        Crée une nouvelle tâche en définissant automatiquement le créateur comme l'utilisateur connecté.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['createur'] = request.user  # Auto-attribution du créateur
        return super().create(validated_data)

    def get_messages(self, obj):
        """
        Récupère tous les commentaires associés à cette tâche, triés par date de création.
        """
        commentaires = obj.commentaires.all().order_by('date_creation')
        return CommentaireTacheSerializer(commentaires, many=True, context=self.context).data
    
class CommentaireTacheSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source='auteur.get_full_name', read_only=True)
    author_role = serializers.CharField(source='auteur.role', read_only=True)
    author_role_display = serializers.CharField(source='auteur.get_role_display', read_only=True)
    author_photo = serializers.SerializerMethodField()
    text = serializers.CharField(source='message', read_only=True)
    attachment = serializers.FileField(source='piece_jointe', read_only=True)
    
    class Meta:
        model = CommentaireTache
        fields = [
            'id', 'tache', 'auteur', 'author', 'author_role', 
            'author_role_display', 'author_photo', 'text', 'message', 'attachment', 'date_creation'
        ]
        read_only_fields = ('auteur', 'date_creation')

    def get_author_photo(self, obj):
        try:
            if obj.auteur.profile.photo:
                return obj.auteur.profile.photo.url
        except:
            pass
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['auteur'] = request.user
        return super().create(validated_data)

class TacheActionSerializer(serializers.Serializer):
    commentaire = serializers.CharField(required=False, allow_blank=True)
    resultat = serializers.CharField(required=False, allow_blank=True)
    attachment = serializers.FileField(required=False, allow_null=True)
    
    def validate_commentaire(self, value):
        if len(value) > 1000:
            raise serializers.ValidationError("Le commentaire ne peut pas dépasser 1000 caractères")
        return value
    
    def validate_resultat(self, value):
        if len(value) > 5000:
            raise serializers.ValidationError("Le résultat ne peut pas dépasser 5000 caractères")
        return value

class DemandeReportSerializer(serializers.ModelSerializer):
    demandeur_name = serializers.CharField(source='demandeur.get_full_name', read_only=True)
    repondu_par_name = serializers.CharField(source='repondu_par.get_full_name', read_only=True)
    tache_titre = serializers.CharField(source='tache.titre', read_only=True)
    tache_numero = serializers.CharField(source='tache.numero', read_only=True)
    
    class Meta:
        model = DemandeReport
        fields = [
            'id', 'tache', 'tache_titre', 'tache_numero', 
            'demandeur', 'demandeur_name', 'date_demandee', 'motif', 'pj_justificatif', 
            'statut', 'date_reponse', 'repondu_par', 'repondu_par_name', 'commentaire_reponse', 
            'date_creation'
        ]
        read_only_fields = ('demandeur', 'statut', 'date_reponse', 'repondu_par', 'commentaire_reponse', 'date_creation')

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['demandeur'] = request.user
        return super().create(validated_data)