from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
import os

def validate_positive_amount(value):
    """Valide que le montant est positif"""
    if value <= Decimal('0'):
        raise ValidationError(_('Le montant doit être positif'))

def validate_future_date(value):
    """Valide que la date n'est pas dans le futur"""
    if value > timezone.now().date():
        raise ValidationError(_('La date ne peut pas être dans le futur'))

def validate_file_size(value):
    """Valide la taille du fichier (max 10MB)"""
    max_size = 10 * 1024 * 1024  # 10MB
    if value.size > max_size:
        raise ValidationError(_(f"La taille du fichier ne peut pas dépasser {max_size//1024//1024}MB"))

def validate_file_extension(value):
    """Valide l'extension du fichier"""
    ext = os.path.splitext(value.name)[1]
    valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
    if not ext.lower() in valid_extensions:
        raise ValidationError(_('Extension de fichier non supportée.'))

def validate_entree_montant(value):
    """Validation spécifique pour les entrées d'argent"""
    if value > Decimal('1000000000'):  # 1 milliard Ar
        raise ValidationError(_("Le montant est trop élevé (max: 1 000 000 000 Ar)"))
    return value