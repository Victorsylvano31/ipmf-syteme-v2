from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AuditLog, ExportHistory, LoginHistory, SystemHealthLog

User = get_user_model()

class AuditLogSerializer(serializers.ModelSerializer):
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    niveau_display = serializers.CharField(source='get_niveau_display', read_only=True)
    utilisateur_name = serializers.CharField(source='utilisateur.get_full_name', read_only=True)
    utilisateur_role = serializers.CharField(source='utilisateur.role', read_only=True)
    differences_text = serializers.CharField(source='get_differences_text', read_only=True)
    timestamp_format = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'action_type', 'action_type_display', 'module', 'module_display',
            'niveau', 'niveau_display', 'timestamp', 'timestamp_format',
            'utilisateur', 'utilisateur_name', 'utilisateur_role', 'ip_address',
            'objet_type', 'objet_id', 'objet_repr', 'message',
            'anciennes_valeurs', 'nouvelles_valeurs', 'differences', 'differences_text',
            'url', 'method', 'status_code', 'duration', 'user_agent', 'session_key'
        ]
        read_only_fields = fields
    
    def get_timestamp_format(self, obj):
        """Retourne le timestamp formaté"""
        return obj.timestamp.strftime("%d/%m/%Y %H:%M:%S")

class ExportHistorySerializer(serializers.ModelSerializer):
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    utilisateur_name = serializers.CharField(source='utilisateur.get_full_name', read_only=True)
    timestamp_format = serializers.SerializerMethodField()
    taille_format = serializers.CharField(source='get_taille_format', read_only=True)
    fichier_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ExportHistory
        fields = [
            'id', 'utilisateur', 'utilisateur_name', 'timestamp', 'timestamp_format',
            'format', 'format_display', 'module', 'module_display', 'fichier', 'fichier_url',
            'parametres', 'nombre_lignes', 'taille_fichier', 'taille_format', 'ip_address'
        ]
        read_only_fields = fields
    
    def get_timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M:%S")
    
    def get_fichier_url(self, obj):
        if obj.fichier:
            return obj.fichier.url
        return None

class LoginHistorySerializer(serializers.ModelSerializer):
    utilisateur_name = serializers.CharField(source='utilisateur.get_full_name', read_only=True)
    utilisateur_role = serializers.CharField(source='utilisateur.role', read_only=True)
    timestamp_format = serializers.SerializerMethodField()
    
    class Meta:
        model = LoginHistory
        fields = [
            'id', 'utilisateur', 'utilisateur_name', 'utilisateur_role',
            'timestamp', 'timestamp_format', 'ip_address', 'user_agent',
            'reussi', 'raison_echec', 'session_key'
        ]
        read_only_fields = fields
    
    def get_timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M:%S")

class SystemHealthLogSerializer(serializers.ModelSerializer):
    type_check_display = serializers.CharField(source='get_type_check_display', read_only=True)
    niveau_display = serializers.CharField(source='get_niveau_display', read_only=True)
    timestamp_format = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemHealthLog
        fields = [
            'id', 'timestamp', 'timestamp_format', 'type_check', 'type_check_display',
            'niveau', 'niveau_display', 'composant', 'message', 'metriques',
            'duree_execution'
        ]
        read_only_fields = fields
    
    def get_timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M:%S")

class AuditStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques d'audit"""
    periode = serializers.DictField()
    actions_par_type = serializers.ListField()
    actions_par_module = serializers.ListField()
    actions_par_utilisateur = serializers.ListField()
    activite_recente = serializers.ListField()
    total_actions = serializers.IntegerField()
    actions_aujourdhui = serializers.IntegerField()

class AuditFilterSerializer(serializers.Serializer):
    """Serializer pour les filtres d'audit"""
    date_debut = serializers.DateField(required=False)
    date_fin = serializers.DateField(required=False)
    utilisateur = serializers.IntegerField(required=False)
    module = serializers.CharField(required=False)
    action_type = serializers.CharField(required=False)
    niveau = serializers.CharField(required=False)
    
    def validate(self, data):
        """Validation des dates"""
        date_debut = data.get('date_debut')
        date_fin = data.get('date_fin')
        
        if date_debut and date_fin and date_debut > date_fin:
            raise serializers.ValidationError({
                'date_fin': 'La date de fin doit être postérieure à la date de début'
            })
        
        return data