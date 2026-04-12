from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

def validate_positive_amount(value):
    """Valide que le montant est positif"""
    if value <= Decimal('0'):
        raise ValidationError('Le montant doit être positif')

def validate_future_date(value):
    """Valide que la date n'est pas dans le futur"""
    if value > timezone.now().date():
        raise ValidationError('La date ne peut pas être dans le futur')

def validate_file_size(value):
    """Valide la taille du fichier (max 5MB)"""
    filesize = value.size
    if filesize > 5 * 1024 * 1024:  # 5MB
        raise ValidationError("La taille du fichier ne peut pas dépasser 5MB")