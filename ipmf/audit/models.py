from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import json

User = get_user_model()

class AuditLog(models.Model):
    """
    Journal d'audit pour tracer toutes les actions importantes du système
    """
    ACTION_TYPES = [
        ('create', 'Creation'),
        ('read', 'Consultation'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('login', 'Connexion'),
        ('logout', 'Deconnexion'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('validation', 'Validation'),
        ('payment', 'Paiement'),
        ('rejet', 'Rejet'),
        ('system', 'Systeme'),
    ]
    
    MODULES = [
        ('users', 'Utilisateurs'),
        ('finances', 'Finances'),
        ('tasks', 'Taches'),
        ('dashboard', 'Dashboard'),
        ('audit', 'Audit'),
        ('system', 'Systeme'),
        ('auth', 'Authentification'),
    ]
    
    NIVEAU_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
        ('critical', 'Critique'),
    ]
    
    # Informations de base
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES, verbose_name="Type d'action")
    module = models.CharField(max_length=20, choices=MODULES, verbose_name="Module")
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='info', verbose_name="Niveau")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Date et heure")
    
    # Utilisateur et contexte
    utilisateur = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='actions_audit',
        verbose_name="Utilisateur"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Adresse IP")
    user_agent = models.TextField(null=True, blank=True, verbose_name="User Agent")

    
    # Objet concerné
    objet_type = models.CharField(max_length=100, null=True, blank=True, verbose_name="Type d'objet")
    objet_id = models.CharField(max_length=100, null=True, blank=True, verbose_name="ID de l'objet")
    objet_repr = models.CharField(max_length=255, null=True, blank=True, verbose_name="Représentation de l'objet")
    
    # Détails de l'action
    message = models.TextField(verbose_name="Message")
    anciennes_valeurs = models.JSONField(null=True, blank=True, verbose_name="Anciennes valeurs")
    nouvelles_valeurs = models.JSONField(null=True, blank=True, verbose_name="Nouvelles valeurs")
    differences = models.JSONField(null=True, blank=True, verbose_name="Différences")
    
    # Métadonnées
    session_key = models.CharField(max_length=100, null=True, blank=True, verbose_name="Clé de session")
    url = models.URLField(null=True, blank=True, verbose_name="URL")
    method = models.CharField(max_length=10, null=True, blank=True, verbose_name="Méthode HTTP")
    status_code = models.IntegerField(null=True, blank=True, verbose_name="Code statut HTTP")
    duration = models.FloatField(null=True, blank=True, verbose_name="Durée (ms)")
    
    class Meta:
        verbose_name = "Entree d'audit"
        verbose_name_plural = "Entrees d'audit"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['utilisateur']),
            models.Index(fields=['module']),
            models.Index(fields=['action_type']),
            models.Index(fields=['objet_type', 'objet_id']),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} - {self.module} - {self.utilisateur or 'System'}"
    
    def get_differences_text(self):
        """Retourne les différences sous forme de texte lisible"""
        if not self.differences:
            return "Aucune différence"
        
        try:
            differences = []
            for field, values in self.differences.items():
                ancien = values.get('old', 'N/A')
                nouveau = values.get('new', 'N/A')
                differences.append(f"{field}: {ancien} → {nouveau}")
            return "; ".join(differences)
        except:
            return "Erreur de format des différences"
    
    @classmethod
    def log_action(cls, action_type, module, message, utilisateur=None, 
                   ip_address=None, user_agent=None, objet_type=None, 
                   objet_id=None, objet_repr=None, anciennes_valeurs=None,
                   nouvelles_valeurs=None, differences=None, niveau='info',
                   session_key=None, url=None, method=None, status_code=None,
                   duration=None):
        """
        Méthode utilitaire pour créer une entrée d'audit
        """
        return cls.objects.create(
            action_type=action_type,
            module=module,
            message=message,
            utilisateur=utilisateur,
            ip_address=ip_address,
            user_agent=user_agent,
            objet_type=objet_type,
            objet_id=objet_id,
            objet_repr=objet_repr,
            anciennes_valeurs=anciennes_valeurs,
            nouvelles_valeurs=nouvelles_valeurs,
            differences=differences,
            niveau=niveau,
            session_key=session_key,
            url=url,
            method=method,
            status_code=status_code,
            duration=duration
        )

class ExportHistory(models.Model):
    """
    Historique des exports de données
    """
    FORMAT_CHOICES = [
        ('excel', 'Excel'),
        ('pdf', 'PDF'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]
    
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Date et heure")
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, verbose_name="Format")
    module = models.CharField(max_length=20, choices=AuditLog.MODULES, verbose_name="Module")
    fichier = models.FileField(upload_to='exports/%Y/%m/', verbose_name="Fichier exporté")
    parametres = models.JSONField(default=dict, verbose_name="Paramètres d'export")
    nombre_lignes = models.IntegerField(null=True, blank=True, verbose_name="Nombre de lignes")
    taille_fichier = models.BigIntegerField(verbose_name="Taille du fichier (octets)")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Adresse IP")
    
    class Meta:
        verbose_name = "Historique d'export"
        verbose_name_plural = "Historiques d'export"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Export {self.format} - {self.module} - {self.utilisateur}"
    
    def get_taille_format(self):
        """Retourne la taille formatée du fichier"""
        if self.taille_fichier < 1024:
            return f"{self.taille_fichier} o"
        elif self.taille_fichier < 1024 * 1024:
            return f"{self.taille_fichier / 1024:.1f} Ko"
        else:
            return f"{self.taille_fichier / (1024 * 1024):.1f} Mo"

class LoginHistory(models.Model):
    """
    Historique des connexions utilisateur
    """
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Utilisateur")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Date et heure")
    ip_address = models.GenericIPAddressField(verbose_name="Adresse IP")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")
    reussi = models.BooleanField(default=True, verbose_name="Connexion réussie")
    raison_echec = models.CharField(max_length=100, blank=True, verbose_name="Raison de l'échec")
    session_key = models.CharField(max_length=100, blank=True, verbose_name="Clé de session")
    
    class Meta:
        verbose_name = "Historique de connexion"
        verbose_name_plural = "Historiques de connexion"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['utilisateur', 'timestamp']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        status = "Réussi" if self.reussi else f"Échec: {self.raison_echec}"
        return f"Connexion {self.utilisateur} - {status}"

class SystemHealthLog(models.Model):
    """
    Journal de santé du système
    """
    TYPE_CHOICES = [
        ('performance', 'Performance'),
        ('security', 'Securite'),
        ('database', 'Base de donnees'),
        ('storage', 'Stockage'),
        ('network', 'Reseau'),
        ('backup', 'Sauvegarde'),
        ('cleanup', 'Nettoyage'),
    ]
    
    NIVEAU_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
        ('critical', 'Critique'),
    ]
    
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="Date et heure")
    type_check = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Type de vérification")
    niveau = models.CharField(max_length=20, choices=NIVEAU_CHOICES, verbose_name="Niveau")
    composant = models.CharField(max_length=100, verbose_name="Composant")
    message = models.TextField(verbose_name="Message")
    metriques = models.JSONField(default=dict, verbose_name="Métriques")
    duree_execution = models.FloatField(null=True, blank=True, verbose_name="Durée d'exécution (ms)")
    
    class Meta:
        verbose_name = "Journal de sante systeme"
        verbose_name_plural = "Journaux de sante systeme"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.type_check} - {self.composant} - {self.niveau}"