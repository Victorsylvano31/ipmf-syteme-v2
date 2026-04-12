
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ipmf.settings')
django.setup()

from users.models import CustomUser

print(f"{'Username':<15} | {'Role':<10} | {'Is Staff':<8} | {'Is Superuser':<12}")
print("-" * 55)
for user in CustomUser.objects.all():
    print(f"{user.username:<15} | {user.role:<10} | {str(user.is_staff):<8} | {str(user.is_superuser):<12}")
