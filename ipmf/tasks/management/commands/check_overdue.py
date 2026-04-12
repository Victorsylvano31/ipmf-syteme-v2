from django.core.management.base import BaseCommand
from django.utils import timezone
from tasks.models import Tache
from notifications.services import NotificationService
from notifications.models import Notification

class Command(BaseCommand):
    help = 'Vérifie les tâches en retard et notifie les agents assignés'

    def handle(self, *args, **options):
        now = timezone.now()
        # Tâches non terminées/validées/annulées et dont la date d'échéance est passée
        overdue_tasks = Tache.objects.filter(
            statut__in=['creee', 'en_cours'],
            date_echeance__lt=now
        )
        
        count = 0
        for task in overdue_tasks:
            # Pour chaque agent assigné
            for agent in task.agents_assignes.all():
                # Vérifier si une notification pour cette tâche a déjà été envoyée AUJOURD'HUI
                # On utilise created_at__date pour vérifier la date du jour
                already_notified = Notification.objects.filter(
                    recipient=agent,
                    link=f"/tasks/{task.id}",
                    type='error',
                    title="Tâche en retard",
                    created_at__date=now.date()
                ).exists()
                
                if not already_notified:
                    NotificationService.notify_task_overdue(task, agent)
                    
            # La notification est déjà envoyée au-dessus si nécessaire.
            pass
        
        self.stdout.write(self.style.SUCCESS(f'Successfully checked {overdue_tasks.count()} overdue tasks for notifications'))
