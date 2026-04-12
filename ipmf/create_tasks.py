import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

# Add the project root to the python path
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ipmf.settings")
django.setup()

from users.models import CustomUser
from tasks.models import Tache

def create_tasks():
    try:
        admin = CustomUser.objects.get(username='admin_test')
        agent = CustomUser.objects.get(username='agent_test')
    except CustomUser.DoesNotExist:
        print("Test users not found. Run create_users.py first.")
        return

    # Task 1: Assigned to Agent (Created)
    Tache.objects.create(
        titre="Mettre à jour le registre",
        description="Vérifier les entrées du mois dernier.",
        date_echeance=timezone.now().date() + timedelta(days=2),
        priorite='haute',
        statut='creee',
        createur=admin,
        agent_assigne=agent
    )

    # Task 2: Assigned to Agent (In Progress)
    Tache.objects.create(
        titre="Préparer le rapport mensuel",
        description="Inclure les graphiques financiers.",
        date_echeance=timezone.now().date() + timedelta(days=5),
        priorite='moyenne',
        statut='en_cours',
        createur=admin,
        agent_assigne=agent
    )

    # Task 3: Assigned to Admin (Should not be seen by agent normally, but here we check agent view)
    Tache.objects.create(
        titre="Audit de sécurité",
        description="Revue des logs d'accès.",
        date_echeance=timezone.now().date() + timedelta(days=10),
        priorite='urgente',
        statut='creee',
        createur=admin,
        agent_assigne=admin
    )

    print(f"3 Tasks created successfully.")

if __name__ == "__main__":
    create_tasks()
