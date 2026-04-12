from django.db import models
from django.conf import settings

class Feedback(models.Model):
    TYPE_CHOICES = [
        ('bug', 'Bug'),
        ('suggestion', 'Suggestion'),
        ('question', 'Question'),
    ]

    STATUT_CHOICES = [
        ('nouveau', 'Nouveau'),
        ('lu', 'Lu'),
        ('en_cours', 'En cours'),
        ('resolu', 'Résolu'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Type de feedback")
    titre = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(verbose_name="Description détaillée")
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='nouveau', verbose_name="Statut")
    
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feedbacks', verbose_name="Auteur")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Feedback"
        verbose_name_plural = "Feedbacks"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_type_display()}] {self.titre} - {self.auteur.username}"
