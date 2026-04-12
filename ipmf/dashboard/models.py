from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils import timezone
User = get_user_model()

class DashboardPreferences(models.Model):
    """Préférences de tableau de bord par utilisateur"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dashboard_preferences')
    layout_config = models.JSONField(default=dict, verbose_name="Configuration du layout")
    favorite_widgets = models.JSONField(default=list, verbose_name="Widgets favoris")
    default_view = models.CharField(
        max_length=50, 
        default='overview',
        choices=[
            ('overview', 'Vue d\'ensemble'),
            ('financial', 'Vue financière'),
            ('tasks', 'Vue tâches'),
            ('custom', 'Vue personnalisée')
        ],
        verbose_name="Vue par défaut"
    )
    refresh_interval = models.IntegerField(
        default=300,  # 5 minutes
        choices=[
            (60, '1 minute'),
            (300, '5 minutes'),
            (600, '10 minutes'),
            (1800, '30 minutes')
        ],
        verbose_name="Intervalle de rafraîchissement (secondes)"
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")
    
    class Meta:
        verbose_name = "Preference Dashboard"
        verbose_name_plural = "Preferences Dashboard"
    
    def __str__(self):
        return f"Préférences Dashboard - {self.user.username}"

class Alert(models.Model):
    """Système d'alertes"""
    TYPE_CHOICES = [
        ('depense_attente', 'Depense en attente'),
        ('budget_seuil', 'Budget seuil atteint'),
        ('tache_retard', 'Tache en retard'),
        ('tresorerie_bas', 'Tresorerie basse'),
        ('validation_requise', 'Validation requise'),
        ('systeme', 'Alerte systeme'),
        ('information', 'Information'),
    ]
    
    NIVEAU_CHOICES = [
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('eleve', 'Eleve'),
        ('critique', 'Critique'),
    ]
    
    type_alerte = models.CharField(max_length=50, choices=TYPE_CHOICES, verbose_name="Type d'alerte")
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='moyen', verbose_name="Niveau")
    titre = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    destinataire = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alertes', verbose_name="Destinataire")
    lue = models.BooleanField(default=False, verbose_name="Lue")
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_lecture = models.DateTimeField(null=True, blank=True, verbose_name="Date de lecture")
    lien_objet = models.CharField(max_length=500, blank=True, verbose_name="Lien vers l'objet")
    donnees_contexte = models.JSONField(default=dict, blank=True, verbose_name="Données de contexte")
    
    class Meta:
        verbose_name = "Alerte"
        verbose_name_plural = "Alertes"
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['destinataire', 'lue']),
            models.Index(fields=['date_creation']),
            models.Index(fields=['type_alerte']),
        ]
    
    def __str__(self):
        return f"{self.get_type_alerte_display()} - {self.titre}"
    
    def marquer_comme_lue(self):
        """Marque l'alerte comme lue"""
        self.lue = True
        self.date_lecture = timezone.now()
        self.save()
    
    @classmethod
    def creer_alerte(cls, type_alerte, titre, message, destinataire, niveau='moyen', lien_objet='', donnees_contexte=None):
        """Méthode utilitaire pour créer une alerte"""
        return cls.objects.create(
            type_alerte=type_alerte,
            titre=titre,
            message=message,
            destinataire=destinataire,
            niveau=niveau,
            lien_objet=lien_objet,
            donnees_contexte=donnees_contexte or {}
        )

class WidgetConfig(models.Model):
    """Configuration des widgets pour le dashboard"""
    WIDGET_TYPES = [
        ('financial_summary', 'Resume financier'),
        ('task_overview', 'Vue d\'ensemble des taches'),
        ('recent_activities', 'Activites recentes'),
        ('alerts_panel', 'Panel d\'alertes'),
        ('charts', 'Graphiques'),
        ('quick_actions', 'Actions rapides'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='widgets')
    widget_type = models.CharField(max_length=50, choices=WIDGET_TYPES)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=4)
    height = models.IntegerField(default=3)
    config = models.JSONField(default=dict)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuration Widget"
        verbose_name_plural = "Configurations Widgets"
        unique_together = ['user', 'widget_type']
        ordering = ['position_y', 'position_x']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_widget_type_display()}"

class DashboardView(models.Model):
    """Vues personnalisées du dashboard"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dashboard_views')
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    configuration = models.JSONField(default=dict)
    est_public = models.BooleanField(default=False)
    est_defaut = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Vue Dashboard"
        verbose_name_plural = "Vues Dashboard"
        ordering = ['-est_defaut', 'nom']
    
    def __str__(self):
        return f"{self.user.username} - {self.nom}"
    
    def save(self, *args, **kwargs):
        if self.est_defaut:
            # S'assurer qu'il n'y a qu'une seule vue par défaut par utilisateur
            DashboardView.objects.filter(user=self.user, est_defaut=True).update(est_defaut=False)
        super().save(*args, **kwargs)