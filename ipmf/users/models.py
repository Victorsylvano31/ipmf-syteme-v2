# backend/apps/users/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator

class CustomUser(AbstractUser):
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Format: '+261321234567'. 9-15 chiffres autorisés."
    )

    ROLE_CHOICES = [
        ('admin', 'Administrateur Systeme'),
        ('dg', 'Directeur General'),
        ('comptable', 'Comptable'),
        ('caisse', 'Responsable Caisse'),
        ('agent', 'Agent'),
        ('superviseur_it', 'Superviseur IT'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='agent', verbose_name="Role")
    telephone = models.CharField(max_length=17, validators=[phone_regex], blank=True, verbose_name="Telephone")
    departement = models.CharField(max_length=100, blank=True, verbose_name="Departement")
    date_embauche = models.DateField(null=True, blank=True, verbose_name="Date d'embauche")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    date_created = models.DateTimeField(auto_now_add=True, verbose_name="Date de creation")
    date_updated = models.DateTimeField(auto_now=True, verbose_name="Derniere modification")

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-date_created']
        permissions = [
            ("can_manage_users", "Peut gérer les utilisateurs"),
            ("can_view_reports", "Peut voir les rapports"),
            ("can_export_data", "Peut exporter les données"),
        ]

    def __str__(self):
        return f"{self.get_full_name()} - {self.get_role_display()}"

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip() if full_name.strip() else self.username

    @property
    def is_dg(self):
        return self.role == 'dg'
    
    @property
    def is_comptable(self):
        return self.role == 'comptable'
    
    @property
    def is_caisse(self):
        return self.role == 'caisse'
    
    @property
    def is_admin(self):
        return self.role == 'admin'


import os
import uuid
from django.db import models
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

def avatar_upload_path(instance, filename):
    """Génère un chemin unique pour chaque avatar : avatars/uuid.ext"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('avatars', filename)

class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    signature = models.ImageField(upload_to='signatures/%Y/%m/', null=True, blank=True)
    photo = models.ImageField(upload_to=avatar_upload_path, null=True, blank=True)
    notifications_active = models.BooleanField(default=True)
    theme_preference = models.CharField(max_length=20, default='light', choices=[('light','Clair'),('dark','Sombre')])
    language = models.CharField(max_length=10, default='fr', choices=[('fr','Français'),('mg','Malagasy')])
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profil de {self.user.username}"


# --- SIGNALS POUR LE NETTOYAGE DU DISQUE ---

@receiver(post_delete, sender=UserProfile)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """Supprime le fichier du stockage lors de la suppression de l'objet."""
    if instance.photo:
        if os.path.isfile(instance.photo.path):
            os.remove(instance.photo.path)
    if instance.signature:
        if os.path.isfile(instance.signature.path):
            os.remove(instance.signature.path)

@receiver(pre_save, sender=UserProfile)
def auto_delete_file_on_change(sender, instance, **kwargs):
    """Supprime l'ancien fichier du stockage lorsqu'un nouveau est uploadé."""
    if not instance.pk:
        return False

    try:
        old_profile = UserProfile.objects.get(pk=instance.pk)
    except UserProfile.DoesNotExist:
        return False

    # Nettoyage photo
    new_photo = instance.photo
    old_photo = old_profile.photo
    if old_photo and new_photo != old_photo:
        if os.path.isfile(old_photo.path):
            os.remove(old_photo.path)
            
    # Nettoyage signature
    new_sig = instance.signature
    old_sig = old_profile.signature
    if old_sig and new_sig != old_sig:
        if os.path.isfile(old_sig.path):
            os.remove(old_sig.path)
