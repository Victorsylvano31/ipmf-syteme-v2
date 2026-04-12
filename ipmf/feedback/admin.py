from django.contrib import admin
from .models import Feedback

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('type', 'titre', 'auteur', 'statut', 'created_at')
    list_filter = ('type', 'statut', 'created_at')
    search_fields = ('titre', 'description', 'auteur__username')
    readonly_fields = ('created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.auteur = request.user
        super().save_model(request, obj, form, change)
