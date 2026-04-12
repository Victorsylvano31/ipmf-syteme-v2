from django.contrib import admin
from .models import Tache, CommentaireTache

@admin.register(Tache)
class TacheAdmin(admin.ModelAdmin):
    list_display = ('numero', 'titre', 'createur', 'get_agents', 'statut', 'priorite', 'date_echeance', 'est_en_retard')
    list_filter = ('statut', 'priorite', 'date_creation', 'date_echeance', 'createur', 'agents_assignes')
    search_fields = ('numero', 'titre', 'description', 'resultat')
    readonly_fields = ('numero', 'date_creation', 'jours_restants', 'est_en_retard', 'pourcentage_avancement')
    date_hierarchy = 'date_creation'
    list_per_page = 25
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('numero', 'titre', 'description', 'date_echeance', 'priorite')
        }),
        ('Assignation', {
            'fields': ('createur', 'agents_assignes')
        }),
        ('Budget et résultats', {
            'fields': ('budget_alloue', 'resultat', 'piece_jointe_resultat')
        }),
        ('Statut et suivi', {
            'fields': ('statut', 'date_debut_reelle', 'date_fin_reelle', 'commentaire_validation', 'valide_par', 'date_validation')
        }),
        ('Informations calculées', {
            'fields': ('jours_restants', 'est_en_retard', 'pourcentage_avancement')
        }),
    )
    
    def est_en_retard(self, obj):
        return obj.est_en_retard
    est_en_retard.boolean = True
    est_en_retard.short_description = 'En retard'

    def get_agents(self, obj):
        return ", ".join([u.username for u in obj.agents_assignes.all()])
    get_agents.short_description = 'Agents assignés'

    filter_horizontal = ('agents_assignes',)

@admin.register(CommentaireTache)
class CommentaireTacheAdmin(admin.ModelAdmin):
    list_display = ('tache', 'auteur', 'date_creation', 'message_preview')
    list_filter = ('date_creation', 'auteur')
    search_fields = ('tache__numero', 'auteur__username', 'message')
    readonly_fields = ('date_creation',)
    
    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'