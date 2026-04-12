from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import DashboardPreferences, Alert, WidgetConfig, DashboardView

User = get_user_model()

class DashboardPreferencesSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = DashboardPreferences
        fields = '__all__'
        read_only_fields = ('user', 'updated_at')

class AlertSerializer(serializers.ModelSerializer):
    type_alerte_display = serializers.CharField(source='get_type_alerte_display', read_only=True)
    niveau_display = serializers.CharField(source='get_niveau_display', read_only=True)
    destinataire_name = serializers.CharField(source='destinataire.get_full_name', read_only=True)
    delai_creation = serializers.SerializerMethodField()
    
    class Meta:
        model = Alert
        fields = [
            'id', 'type_alerte', 'type_alerte_display', 'niveau', 'niveau_display',
            'titre', 'message', 'destinataire', 'destinataire_name', 'lue',
            'date_creation', 'date_lecture', 'delai_creation', 'lien_objet', 'donnees_contexte'
        ]
        read_only_fields = ('date_creation', 'date_lecture')
    
    def get_delai_creation(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        return timesince(obj.date_creation, timezone.now())

class WidgetConfigSerializer(serializers.ModelSerializer):
    widget_type_display = serializers.CharField(source='get_widget_type_display', read_only=True)
    
    class Meta:
        model = WidgetConfig
        fields = [
            'id', 'user', 'widget_type', 'widget_type_display', 'position_x', 'position_y',
            'width', 'height', 'config', 'is_visible', 'created_at', 'updated_at'
        ]
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def validate_width(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("La largeur doit être entre 1 et 12")
        return value
    
    def validate_height(self, value):
        if value < 1 or value > 8:
            raise serializers.ValidationError("La hauteur doit être entre 1 et 8")
        return value

class DashboardViewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = DashboardView
        fields = [
            'id', 'user', 'user_name', 'nom', 'description', 'configuration',
            'est_public', 'est_defaut', 'created_at', 'updated_at'
        ]
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def validate(self, data):
        if data.get('est_defaut') and not self.instance:
            # Vérifier qu'il n'y a pas déjà une vue par défaut
            user = self.context['request'].user
            if DashboardView.objects.filter(user=user, est_defaut=True).exists():
                raise serializers.ValidationError("Une vue par défaut existe déjà")
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class AlertActionSerializer(serializers.Serializer):
    alerte_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="Liste des IDs d'alertes à marquer comme lues"
    )

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du dashboard"""
    periode = serializers.DictField()
    finances = serializers.DictField()
    taches = serializers.DictField()
    alertes = serializers.DictField()
    indicateurs = serializers.ListField()