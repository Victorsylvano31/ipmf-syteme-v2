from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

User = get_user_model()

class Notification(models.Model):
    """
    Modèle de notification pour les utilisateurs
    """
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succes'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
        ('task', 'Tache'),
        ('finance', 'Finance'),
    ]
    
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name="Destinataire"
    )
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    type = models.CharField(
        max_length=20, 
        choices=TYPE_CHOICES, 
        default='info', 
        verbose_name="Type"
    )
    link = models.CharField(
        max_length=255, 
        blank=True, 
        verbose_name="Lien",
        help_text="Lien vers la ressource concernée (ex: /taches/123)"
    )
    is_read = models.BooleanField(default=False, verbose_name="Lu")
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Basse'),
            ('medium', 'Moyenne'),
            ('high', 'Haute'),
            ('critical', 'Critique'),
        ],
        default='medium',
        verbose_name="Priorité"
    )
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Métadonnées")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de lecture")
    
    # Support pour liens génériques (Generic Foreign Key)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.username}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
