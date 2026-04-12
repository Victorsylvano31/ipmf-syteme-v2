import os
from PIL import Image
from django.core.files.base import ContentFile
from io import BytesIO

def process_avatar(image_file, size=(400, 400)):
    """
    Redimensionne et optimise l'image de l'avatar.
    Retourne un objet ContentFile prêt à être sauvegardé.
    """
    img = Image.open(image_file)
    
    # Conversion en RGB si nécessaire (pour gérer les PNG avec transparence vers JPEG/WebP)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # Redimensionnement (Thumbnail garde le ratio, Resize force la taille)
    # Pour un avatar, on veut généralement un carré centré (Crop)
    
    width, height = img.size
    new_side = min(width, height)
    left = (width - new_side) / 2
    top = (height - new_side) / 2
    right = (width + new_side) / 2
    bottom = (height + new_side) / 2
    
    # Crop central
    img = img.crop((left, top, right, bottom))
    img = img.resize(size, Image.Resampling.LANCZOS)
    
    # Sauvegarde dans un buffer
    buffer = BytesIO()
    # On reste en JPEG pour la compatibilité maximale, ou WebP si souhaité
    img.save(buffer, format='JPEG', quality=85, optimize=True)
    
    return ContentFile(buffer.getvalue())
