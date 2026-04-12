import os
import django
import sys

# Add the project root to the python path
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ipmf.settings")
django.setup()

from users.models import CustomUser

def create_users():
    if not CustomUser.objects.filter(username='admin_test').exists():
        CustomUser.objects.create_superuser('admin_test', 'admin@test.com', 'password123', role='admin')
        print("User 'admin_test' created (Role: admin)")
    else:
        print("User 'admin_test' already exists")

    if not CustomUser.objects.filter(username='agent_test').exists():
        CustomUser.objects.create_user('agent_test', 'agent@test.com', 'password123', role='agent')
        print("User 'agent_test' created (Role: agent)")
    else:
        print("User 'agent_test' already exists")

if __name__ == "__main__":
    create_users()
