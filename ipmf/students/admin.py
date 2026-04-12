"""
Module Étudiants - Configuration de l'interface d'administration Django
"""

from django.contrib import admin
from .models import Formation, Etudiant, PaiementFrais


@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ['nom', 'duree_mois', 'frais_defaut', 'nombre_tranches_defaut', 'is_active']
    list_filter = ['is_active']
    search_fields = ['nom']


class PaiementFraisInline(admin.TabularInline):
    model = PaiementFrais
    extra = 0
    fields = ['numero_tranche', 'montant_prevu', 'montant_paye', 'date_echeance', 'date_paiement', 'statut', 'mode_paiement', 'reference']
    readonly_fields = ['numero_tranche']


@admin.register(Etudiant)
class EtudiantAdmin(admin.ModelAdmin):
    list_display = ['numero_inscription', 'nom', 'prenom', 'formation', 'annee_scolaire', 'statut', 'montant_total_frais']
    list_filter = ['statut', 'formation', 'annee_scolaire', 'sexe']
    search_fields = ['nom', 'prenom', 'numero_inscription', 'cin', 'telephone']
    readonly_fields = ['numero_inscription', 'created_at', 'updated_at', 'created_by']
    inlines = [PaiementFraisInline]

    fieldsets = (
        ("Identité", {
            'fields': ('numero_inscription', 'nom', 'prenom', 'date_naissance', 'lieu_naissance', 'sexe', 'cin', 'photo')
        }),
        ("Contact", {
            'fields': ('adresse', 'telephone', 'email')
        }),
        ("Scolarité", {
            'fields': ('formation', 'annee_scolaire', 'date_inscription', 'montant_total_frais', 'nombre_tranches', 'statut')
        }),
        ("Notes", {
            'fields': ('observations',)
        }),
        ("Métadonnées", {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(PaiementFrais)
class PaiementFraisAdmin(admin.ModelAdmin):
    list_display = ['etudiant', 'numero_tranche', 'montant_prevu', 'montant_paye', 'date_echeance', 'date_paiement', 'statut']
    list_filter = ['statut', 'mode_paiement']
    search_fields = ['etudiant__nom', 'etudiant__prenom', 'etudiant__numero_inscription', 'reference']
    readonly_fields = ['created_at', 'updated_at']
