from django.contrib import admin
from django.utils.html import format_html
from .models import EntreeArgent, Depense

@admin.register(EntreeArgent)
class EntreeArgentAdmin(admin.ModelAdmin):
    list_display = (
        'numero', 'montant_format', 'motif', 'mode_paiement_display', 
        'date_entree', 'statut_badge', 'created_by_display'
    )
    list_filter = ('statut', 'mode_paiement', 'date_entree', 'created_by')
    search_fields = ('numero', 'motif', 'commentaire', 'created_by__username')
    readonly_fields = ('numero', 'created_by', 'created_at', 'montant_format')
    date_hierarchy = 'date_entree'
    list_per_page = 25
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('numero', 'montant', 'motif', 'mode_paiement', 'date_entree')
        }),
        ('Statut et validation', {
            'fields': ('statut', 'created_by', 'created_at')
        }),
        ('Documents', {
            'fields': ('piece_justificative', 'commentaire')
        }),
    )
    
    def montant_format(self, obj):
        return f"{obj.montant:,.0f} Ar".replace(",", " ")
    montant_format.short_description = 'Montant'
    
    def mode_paiement_display(self, obj):
        return obj.get_mode_paiement_display()
    mode_paiement_display.short_description = 'Mode paiement'
    
    def statut_badge(self, obj):
        couleurs = {
            'en_attente': 'orange',
            'confirmee': 'green', 
            'annulee': 'red'
        }
        couleur = couleurs.get(obj.statut, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">{}</span>',
            couleur, obj.get_statut_display()
        )
    statut_badge.short_description = 'Statut'
    
    def created_by_display(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"
    created_by_display.short_description = 'Créé par'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une nouvelle création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Depense)
class DepenseAdmin(admin.ModelAdmin):
    list_display = (
        'numero', 'montant_format', 'motif', 'categorie_display', 
        'statut_badge', 'created_by_display', 'created_at_format'
    )
    list_filter = ('statut', 'categorie', 'created_at', 'created_by')
    search_fields = ('numero', 'motif', 'commentaire', 'created_by__username')
    readonly_fields = ('numero', 'montant', 'created_by', 'created_at', 'montant_format')
    date_hierarchy = 'created_at'
    list_per_page = 25
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('numero', 'montant', 'motif', 'categorie', 'quantite', 'prix_unitaire')
        }),
        ('Workflow de validation', {
            'fields': (
                'statut', 'created_by', 'created_at',
                'valide_par_comptable', 'date_validation_comptable',
                'valide_par_dg', 'date_validation_dg',
                'commentaire_validation'
            )
        }),
        ('Documents', {
            'fields': ('piece_justificative', 'commentaire')
        }),
    )
    
    def montant_format(self, obj):
        return f"{obj.montant:,.0f} Ar".replace(",", " ")
    montant_format.short_description = 'Montant'
    
    def categorie_display(self, obj):
        return obj.get_categorie_display()
    categorie_display.short_description = 'Catégorie'
    
    def statut_badge(self, obj):
        couleurs = {
            'en_attente': 'orange',
            'verifiee': 'blue',
            'validee': 'green',
            'payee': 'darkgreen',
            'rejetee': 'red'
        }
        couleur = couleurs.get(obj.statut, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">{}</span>',
            couleur, obj.get_statut_display()
        )
    statut_badge.short_description = 'Statut'
    
    def created_by_display(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"
    created_by_display.short_description = 'Créé par'
    
    def created_at_format(self, obj):
        return obj.created_at.strftime("%d/%m/%Y")
    created_at_format.short_description = 'Date création'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Si c'est une nouvelle création
            obj.created_by = request.user
        super().save_model(request, obj, form, change)