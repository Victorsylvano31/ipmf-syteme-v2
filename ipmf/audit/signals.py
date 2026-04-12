from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.utils import timezone
import json

from .models import AuditLog, LoginHistory

User = get_user_model()

# Signal pour les connexions utilisateur
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Journalise les connexions réussies"""
    LoginHistory.objects.create(
        utilisateur=user,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        reussi=True,
        session_key=request.session.session_key
    )
    
    AuditLog.log_action(
        action_type='login',
        module='auth',
        message=f"Connexion réussie de {user.username}",
        utilisateur=user,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        url=request.path,
        method=request.method
    )

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Journalise les déconnexions"""
    if user:
        AuditLog.log_action(
            action_type='logout',
            module='auth',
            message=f"Déconnexion de {user.username}",
            utilisateur=user,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            url=request.path,
            method=request.method
        )

@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    """Journalise les échecs de connexion"""
    username = credentials.get('username', 'Inconnu')
    
    LoginHistory.objects.create(
        utilisateur=None,  # Utilisateur non connecté
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        reussi=False,
        raison_echec="Identifiants invalides"
    )
    
    AuditLog.log_action(
        action_type='login',
        module='auth',
        message=f"Tentative de connexion échouée pour {username}",
        utilisateur=None,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        url=request.path,
        method=request.method,
        niveau='warning'
    )

# Fonction utilitaire pour récupérer l'IP du client
def get_client_ip(request):
    """Récupère l'adresse IP du client"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# Vous pouvez ajouter d'autres signaux pour auditer les modifications sur les modèles spécifiques
@receiver(pre_save, sender=User)
def log_user_changes(sender, instance, **kwargs):
    """Journalise les modifications des utilisateurs"""
    if instance.pk:
        try:
            ancien = User.objects.get(pk=instance.pk)
            differences = {}
            
            # Comparer les champs modifiés
            for field in ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']:
                ancienne_valeur = getattr(ancien, field)
                nouvelle_valeur = getattr(instance, field)
                
                if ancienne_valeur != nouvelle_valeur:
                    differences[field] = {
                        'old': str(ancienne_valeur),
                        'new': str(nouvelle_valeur)
                    }
            
            if differences:
                AuditLog.log_action(
                    action_type='update',
                    module='users',
                    message=f"Modification de l'utilisateur {instance.username}",
                    utilisateur=instance,  # Celui qui modifie (peut être différent)
                    objet_type='User',
                    objet_id=instance.pk,
                    objet_repr=str(instance),
                    anciennes_valeurs={k: v['old'] for k, v in differences.items()},
                    nouvelles_valeurs={k: v['new'] for k, v in differences.items()},
                    differences=differences
                )
                
        except User.DoesNotExist:
            pass

@receiver(post_save, sender=User)
def log_user_creation(sender, instance, created, **kwargs):
    """Journalise la création d'utilisateurs"""
    if created:
        AuditLog.log_action(
            action_type='create',
            module='users',
            message=f"Création du nouvel utilisateur {instance.username}",
            utilisateur=instance,  # Ou l'admin qui a créé l'utilisateur
            objet_type='User',
            objet_id=instance.pk,
            objet_repr=str(instance),
            nouvelles_valeurs={
                'username': instance.username,
                'email': instance.email,
                'role': instance.role
            }
        )