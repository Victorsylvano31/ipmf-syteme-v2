from rest_framework import serializers
from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'type', 'titre', 'description', 'statut', 'auteur', 'auteur_nom', 'created_at']
        read_only_fields = ['id', 'statut', 'auteur', 'created_at']

    def get_auteur_nom(self, obj):
        return obj.auteur.get_full_name() or obj.auteur.username

class FeedbackAdminSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'type', 'titre', 'description', 'statut', 'auteur', 'auteur_nom', 'created_at']
        read_only_fields = ['id', 'type', 'titre', 'description', 'auteur', 'created_at']

    def get_auteur_nom(self, obj):
        return obj.auteur.get_full_name() or obj.auteur.username
