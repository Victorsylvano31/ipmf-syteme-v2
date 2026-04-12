from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser, UserProfile

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'username', 'email', 'first_name', 'last_name', 'role', 
        'departement', 'is_active', 'date_created', 'last_login'
    ]
    list_filter = [
        'role', 'is_active', 'is_staff', 'is_superuser', 
        'departement', 'date_created'
    ]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'telephone']
    ordering = ['-date_created']
    readonly_fields = ['date_created', 'date_updated', 'last_login']
    
    fieldsets = (
        (None, {
            'fields': ('username', 'password')
        }),
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'telephone')
        }),
        ('Informations professionnelles', {
            'fields': ('role', 'departement', 'date_embauche')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Dates importantes', {
            'fields': ('last_login', 'date_created', 'date_updated')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'is_active', 'is_staff')}
        ),
    )
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        is_superuser = request.user.is_superuser
        
        if not is_superuser:
            if 'is_superuser' in form.base_fields:
                form.base_fields['is_superuser'].disabled = True
            if 'is_staff' in form.base_fields:
                form.base_fields['is_staff'].disabled = True
        
        return form


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'theme_preference', 'language', 'notifications_active', 
        'date_created', 'date_updated'
    ]
    list_filter = ['theme_preference', 'language', 'notifications_active', 'date_created']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['date_created', 'date_updated', 'photo_preview', 'signature_preview']
    
    fieldsets = (
        (None, {
            'fields': ('user',)
        }),
        ('Préférences', {
            'fields': ('theme_preference', 'language', 'notifications_active')
        }),
        ('Fichiers', {
            'fields': ('photo', 'photo_preview', 'signature', 'signature_preview')
        }),
        ('Dates', {
            'fields': ('date_created', 'date_updated')
        }),
    )
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="100" height="100" style="object-fit: cover;" />', obj.photo.url)
        return "Aucune photo"
    photo_preview.short_description = "Aperçu photo"
    
    def signature_preview(self, obj):
        if obj.signature:
            return format_html('<img src="{}" width="200" height="80" style="object-fit: contain;" />', obj.signature.url)
        return "Aucune signature"
    signature_preview.short_description = "Aperçu signature"