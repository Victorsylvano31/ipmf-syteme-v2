
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ipmf.settings')
django.setup()

from users.models import CustomUser

admin_user = CustomUser.objects.filter(username='admin_sys').first()
if admin_user:
    admin_user.set_password('admin123')
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.save()
    print("Mot de passe pour admin_sys mis à jour: admin123")
else:
    # Création d'un superuser si admin_sys n'existe pas
    admin_user = CustomUser.objects.create_superuser('admin_sys', 'admin@ipmf.mg', 'admin123')
    print("Superuser admin_sys créé avec MDP: admin123")

dg_user = CustomUser.objects.filter(username='directeur').first()
if dg_user:
    dg_user.set_password('admin123')
    dg_user.is_staff = True
    dg_user.save()
    print("Mot de passe pour directeur mis à jour: admin123")
