from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, ExportHistory, LoginHistory, SystemHealthLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp_format', 'action_type_display', 'module_display', 
        'niveau_badge', 'utilisateur_link', 'objet_display', 'message_preview'
    )
    list_filter = ('action_type', 'module', 'niveau', 'timestamp', 'utilisateur')
    search_fields = ('message', 'objet_repr', 'utilisateur__username', 'ip_address')
    readonly_fields = (
        'timestamp', 'action_type', 'module', 'niveau', 'utilisateur', 'ip_address',
        'objet_type', 'objet_id', 'objet_repr', 'message', 'anciennes_valeurs',
        'nouvelles_valeurs', 'differences', 'url', 'method', 'status_code', 'duration'
    )
    date_hierarchy = 'timestamp'
    list_per_page = 50
    actions = ['supprimer_anciens_logs']
    
    fieldsets = (
        ('Action et Module', {
            'fields': ('action_type', 'module', 'niveau', 'timestamp')
        }),
        ('Utilisateur et Contexte', {
            'fields': ('utilisateur', 'ip_address', 'user_agent', 'session_key')
        }),
        ('Objet Concerné', {
            'fields': ('objet_type', 'objet_id', 'objet_repr')
        }),
        ('Détails de l\'Action', {
            'fields': ('message', 'anciennes_valeurs', 'nouvelles_valeurs', 'differences')
        }),
        ('Métadonnées HTTP', {
            'fields': ('url', 'method', 'status_code', 'duration')
        }),
    )
    
    def timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M")
    timestamp_format.short_description = 'Date/Heure'
    
    def action_type_display(self, obj):
        return obj.get_action_type_display()
    action_type_display.short_description = 'Action'
    
    def module_display(self, obj):
        return obj.get_module_display()
    module_display.short_description = 'Module'
    
    def niveau_badge(self, obj):
        couleurs = {
            'info': 'blue',
            'warning': 'orange',
            'error': 'red',
            'critical': 'darkred'
        }
        couleur = couleurs.get(obj.niveau, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">{}</span>',
            couleur, obj.get_niveau_display()
        )
    niveau_badge.short_description = 'Niveau'
    niveau_badge.admin_order_field = 'niveau'
    
    def utilisateur_link(self, obj):
        if obj.utilisateur:
            return format_html(
                '<a href="/admin/users/customuser/{}/change/">{}</a>',
                obj.utilisateur.id, obj.utilisateur.get_full_name() or obj.utilisateur.username
            )
        return "System"
    utilisateur_link.short_description = 'Utilisateur'
    utilisateur_link.admin_order_field = 'utilisateur'
    
    def objet_display(self, obj):
        if obj.objet_type and obj.objet_id:
            return f"{obj.objet_type} ({obj.objet_id})"
        return "-"
    objet_display.short_description = 'Objet'
    
    def message_preview(self, obj):
        return obj.message[:80] + '...' if len(obj.message) > 80 else obj.message
    message_preview.short_description = 'Message'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('utilisateur')
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def supprimer_anciens_logs(self, request, queryset):
        """Action pour supprimer les logs anciens"""
        jours = 90  # Par défaut, 90 jours
        date_limite = timezone.now() - timedelta(days=jours)
        
        logs_supprimes = queryset.filter(timestamp__lt=date_limite).count()
        queryset.filter(timestamp__lt=date_limite).delete()
        
        self.message_user(
            request, 
            f'{logs_supprimes} logs anciens (avant {date_limite.strftime("%d/%m/%Y")}) ont été supprimés.'
        )
    supprimer_anciens_logs.short_description = "Supprimer les logs de plus de 90 jours"

@admin.register(ExportHistory)
class ExportHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp_format', 'utilisateur_link', 'format_display', 'module_display',
        'nombre_lignes', 'taille_format', 'fichier_link', 'ip_address'
    )
    list_filter = ('format', 'module', 'timestamp', 'utilisateur')
    search_fields = ('utilisateur__username', 'fichier', 'ip_address')
    readonly_fields = ('timestamp', 'taille_fichier')
    date_hierarchy = 'timestamp'
    list_per_page = 30
    
    def timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M")
    timestamp_format.short_description = 'Date/Heure'
    
    def utilisateur_link(self, obj):
        if obj.utilisateur:
            return format_html(
                '<a href="/admin/users/customuser/{}/change/">{}</a>',
                obj.utilisateur.id, obj.utilisateur.get_full_name() or obj.utilisateur.username
            )
        return "System"
    utilisateur_link.short_description = 'Utilisateur'
    
    def format_display(self, obj):
        return obj.get_format_display()
    format_display.short_description = 'Format'
    
    def module_display(self, obj):
        return obj.get_module_display()
    module_display.short_description = 'Module'
    
    def taille_format(self, obj):
        return obj.get_taille_format()
    taille_format.short_description = 'Taille'
    
    def fichier_link(self, obj):
        if obj.fichier:
            return format_html(
                '<a href="{}" download>Télécharger</a>',
                obj.fichier.url
            )
        return "Non disponible"
    fichier_link.short_description = 'Fichier'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('utilisateur')

@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp_format', 'utilisateur_link', 'ip_address', 'statut_badge', 
        'raison_echec', 'user_agent_preview'
    )
    list_filter = ('reussi', 'timestamp', 'utilisateur')
    search_fields = ('utilisateur__username', 'ip_address', 'user_agent')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
    list_per_page = 50
    
    def timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M")
    timestamp_format.short_description = 'Date/Heure'
    
    def utilisateur_link(self, obj):
        if obj.utilisateur:
            return format_html(
                '<a href="/admin/users/customuser/{}/change/">{}</a>',
                obj.utilisateur.id, obj.utilisateur.get_full_name() or obj.utilisateur.username
            )
        return format_html('<span style="color: red;">{}</span>', 'Inconnu')
    utilisateur_link.short_description = 'Utilisateur'
    
    def statut_badge(self, obj):
        if obj.reussi:
            return format_html(
                '<span style="background-color: green; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">✓ Réussi</span>'
            )
        else:
            return format_html(
                '<span style="background-color: red; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">✗ Échec</span>'
            )
    statut_badge.short_description = 'Statut'
    
    def user_agent_preview(self, obj):
        return obj.user_agent[:50] + '...' if len(obj.user_agent) > 50 else obj.user_agent
    user_agent_preview.short_description = 'User Agent'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('utilisateur')

@admin.register(SystemHealthLog)
class SystemHealthLogAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp_format', 'type_check_display', 'niveau_badge', 
        'composant', 'message_preview', 'duree_execution_format'
    )
    list_filter = ('type_check', 'niveau', 'timestamp')
    search_fields = ('composant', 'message')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
    list_per_page = 30
    
    def timestamp_format(self, obj):
        return obj.timestamp.strftime("%d/%m/%Y %H:%M")
    timestamp_format.short_description = 'Date/Heure'
    
    def type_check_display(self, obj):
        return obj.get_type_check_display()
    type_check_display.short_description = 'Type'
    
    def niveau_badge(self, obj):
        couleurs = {
            'info': 'blue',
            'warning': 'orange', 
            'error': 'red',
            'critical': 'darkred'
        }
        couleur = couleurs.get(obj.niveau, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">{}</span>',
            couleur, obj.get_niveau_display()
        )
    niveau_badge.short_description = 'Niveau'
    
    def message_preview(self, obj):
        return obj.message[:80] + '...' if len(obj.message) > 80 else obj.message
    message_preview.short_description = 'Message'
    
    def duree_execution_format(self, obj):
        if obj.duree_execution:
            return f"{obj.duree_execution:.2f} ms"
        return "-"
    duree_execution_format.short_description = 'Durée'