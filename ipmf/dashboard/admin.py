from django.contrib import admin
from .models import DashboardPreferences, Alert, WidgetConfig, DashboardView
from django.utils import timezone

@admin.register(DashboardPreferences)
class DashboardPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'default_view', 'refresh_interval', 'updated_at')
    list_filter = ('default_view', 'refresh_interval')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('updated_at',)
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Préférences d\'affichage', {
            'fields': ('default_view', 'refresh_interval')
        }),
        ('Configuration', {
            'fields': ('layout_config', 'favorite_widgets')
        }),
        ('Métadonnées', {
            'fields': ('updated_at',)
        }),
    )

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('titre', 'type_alerte', 'niveau', 'destinataire', 'lue', 'date_creation')
    list_filter = ('type_alerte', 'niveau', 'lue', 'date_creation')
    search_fields = ('titre', 'message', 'destinataire__username')
    readonly_fields = ('date_creation', 'date_lecture')
    list_per_page = 50
    
    fieldsets = (
        ('Contenu de l\'alerte', {
            'fields': ('type_alerte', 'niveau', 'titre', 'message')
        }),
        ('Destinataire et statut', {
            'fields': ('destinataire', 'lue', 'date_lecture')
        }),
        ('Liens et contexte', {
            'fields': ('lien_objet', 'donnees_contexte')
        }),
        ('Métadonnées', {
            'fields': ('date_creation',)
        }),
    )
    
    actions = ['marquer_comme_lues', 'marquer_comme_non_lues']
    
    def marquer_comme_lues(self, request, queryset):
        updated = queryset.update(lue=True, date_lecture=timezone.now())
        self.message_user(request, f'{updated} alerte(s) marquée(s) comme lue(s)')
    marquer_comme_lues.short_description = "Marquer les alertes sélectionnées comme lues"
    
    def marquer_comme_non_lues(self, request, queryset):
        updated = queryset.update(lue=False, date_lecture=None)
        self.message_user(request, f'{updated} alerte(s) marquée(s) comme non lue(s)')
    marquer_comme_non_lues.short_description = "Marquer les alertes sélectionnées comme non lues"

@admin.register(WidgetConfig)
class WidgetConfigAdmin(admin.ModelAdmin):
    list_display = ('user', 'widget_type', 'position_x', 'position_y', 'is_visible')
    list_filter = ('widget_type', 'is_visible')
    search_fields = ('user__username', 'widget_type')
    list_editable = ('position_x', 'position_y', 'is_visible')
    
    fieldsets = (
        ('Utilisateur et type', {
            'fields': ('user', 'widget_type')
        }),
        ('Position et dimensions', {
            'fields': ('position_x', 'position_y', 'width', 'height')
        }),
        ('Configuration', {
            'fields': ('config', 'is_visible')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DashboardView)
class DashboardViewAdmin(admin.ModelAdmin):
    list_display = ('nom', 'user', 'est_public', 'est_defaut', 'created_at')
    list_filter = ('est_public', 'est_defaut', 'created_at')
    search_fields = ('nom', 'user__username', 'description')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('user', 'nom', 'description')
        }),
        ('Visibilité', {
            'fields': ('est_public', 'est_defaut')
        }),
        ('Configuration', {
            'fields': ('configuration',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')