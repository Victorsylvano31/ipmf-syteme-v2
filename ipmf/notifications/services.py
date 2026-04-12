from notifications.models import Notification

class NotificationService:
    @staticmethod
    def send_notification(recipient, title, message, type='info', priority='medium', link='', metadata=None, obj=None):
        """
        Crée une notification pour un utilisateur
        """
        if not recipient:
            return None
            
        return Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            type=type,
            priority=priority,
            link=link,
            metadata=metadata or {},
            content_object=obj
        )
    
    @staticmethod
    def notify_task_assigned(task):
        """Notifie les agents assignés à une nouvelle tâche"""
        for agent in task.agents_assignes.all():
            NotificationService.send_notification(
                recipient=agent,
                title="Nouvelle tâche assignée",
                message=f"La tâche {task.numero}: {task.titre} vous a été assignée.",
                type='task',
                priority='high',
                link=f"/tasks/{task.id}",
                obj=task
            )

    @staticmethod
    def notify_comment_added(comment):
        """Notifie les participants d'une tâche d'un nouveau commentaire"""
        task = comment.tache
        # Notifier le créateur si ce n'est pas lui qui a commenté
        recipients = set()
        if task.createur != comment.auteur:
            recipients.add(task.createur)
            
        # Notifier les agents assignés
        for agent in task.agents_assignes.all():
            if agent != comment.auteur:
                recipients.add(agent)
                
        for recipient in recipients:
            NotificationService.send_notification(
                recipient=recipient,
                title="Nouveau commentaire",
                message=f"{comment.auteur.get_full_name()} a commenté la tâche {task.numero}.",
                type='info',
                priority='low',
                link=f"/tasks/{task.id}",
                obj=comment
            )

    @staticmethod
    def notify_task_overdue(task, agent):
        """Notifie un agent qu'une tâche est en retard"""
        NotificationService.send_notification(
            recipient=agent,
            title="Tâche en retard",
            message=f"La tâche {task.numero}: {task.titre} est arrivée à échéance le {task.date_echeance.strftime('%d/%m/%Y')}.",
            type='error',
            priority='critical',
            link=f"/tasks/{task.id}",
            obj=task
        )
            
    @staticmethod
    def notify_expense_validation_needed(depense, validator):
        """Notifie qu'une dépense nécessite validation"""
        NotificationService.send_notification(
            recipient=validator,
            title="Validation requise",
            message=f"La dépense {depense.numero} ({depense.montant} Ar) nécessite votre validation.",
            type='finance',
            priority='high',
            link=f"/expenses/{depense.id}",
            obj=depense
        )

    @staticmethod
    def notify_report_request(demande):
        """Notifie TOUS les admins et DG d'une nouvelle demande de report."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        destinataires = set()

        # Tous les admins et DG actifs
        admins_dgs = User.objects.filter(role__in=['admin', 'dg'], is_active=True)
        for user in admins_dgs:
            destinataires.add(user)

        # Le créateur de la tâche si différent
        if demande.tache.createur != demande.demandeur:
            destinataires.add(demande.tache.createur)

        for recipient in destinataires:
            NotificationService.send_notification(
                recipient=recipient,
                title="Demande de report reçue ⚠️",
                message=(
                    f"{demande.demandeur.get_full_name()} demande un report pour la mission "
                    f"{demande.tache.numero} : {demande.tache.titre}."
                ),
                type='warning',
                priority='high',
                link=f"/tasks/{demande.tache.id}",
                obj=demande
            )
