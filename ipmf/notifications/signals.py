from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.db import transaction
from tasks.models import Tache, DemandeReport, CommentaireTache
from finances.models import Depense
from .services import NotificationService
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(m2m_changed, sender=Tache.agents_assignes.through)
def notify_agents_on_assignment(sender, instance, action, pk_set, **kwargs):
    """
    Notifie les agents lorsqu'ils sont assignés à une tâche.
    Utilise m2m_changed car agents_assignes est un ManyToManyField.
    """
    if action == "post_add":
        def send_notifs():
            NotificationService.notify_task_assigned(instance)
        
        # On attend la fin de la transaction pour être sûr que les relations sont persistées
        transaction.on_commit(send_notifs)

@receiver(post_save, sender=Tache)
def notify_on_task_status_change(sender, instance, created, **kwargs):
    """
    Notifie le créateur lorsque le statut d'une tâche change (ex: terminée).
    """
    if not created:
        if instance.statut == 'terminee':
            NotificationService.send_notification(
                recipient=instance.createur,
                title="Tâche terminée",
                message=f"L'agent a marqué la tâche {instance.numero} comme terminée. Elle attend votre validation.",
                type='task',
                priority='high',
                link=f"/tasks/{instance.id}",
                obj=instance
            )
        elif instance.statut == 'validee':
            # Notifier tous les agents assignés
            for agent in instance.agents_assignes.all():
                NotificationService.send_notification(
                    recipient=agent,
                    title="Tâche validée",
                    message=f"Félicitations ! La tâche {instance.numero} a été validée par {instance.valide_par.get_full_name() if instance.valide_par else 'un administrateur'}.",
                    type='success',
                    priority='medium',
                    link=f"/tasks/{instance.id}",
                    obj=instance
                )

@receiver(post_save, sender=Depense)
def notify_on_expense_status_change(sender, instance, created, **kwargs):
    """
    Gère les notifications liées au workflow des dépenses.
    """
    if created:
        # Nouvelle dépense créée -> à vérifier par le comptable
        comptables = User.objects.filter(role='comptable', is_active=True)
        for comptable in comptables:
            NotificationService.send_notification(
                recipient=comptable,
                title="Nouvelle dépense à vérifier",
                message=f"Une nouvelle dépense {instance.numero} ({instance.montant} Ar) a été soumise par {instance.created_by.get_full_name()}.",
                type='finance',
                priority='high',
                link=f"/expenses/{instance.id}",
                obj=instance
            )
    else:
        # Changement de statut
        if instance.statut == 'verifiee':
            # Notifier le DG pour validation finale
            dgs = User.objects.filter(role='dg', is_active=True)
            for dg in dgs:
                NotificationService.send_notification(
                    recipient=dg,
                    title="Validation de dépense requise",
                    message=f"La dépense {instance.numero} a été vérifiée et attend votre validation.",
                    type='warning',
                    priority='high',
                    link=f"/expenses/{instance.id}",
                    obj=instance
                )
        elif instance.statut == 'validee':
            # Notifier le créateur et la caisse
            NotificationService.send_notification(
                recipient=instance.created_by,
                title="Dépense approuvée",
                message=f"Votre demande de dépense {instance.numero} a été approuvée.",
                type='success',
                priority='medium',
                link=f"/expenses/{instance.id}",
                obj=instance
            )
        elif instance.statut == 'rejetee':
            NotificationService.send_notification(
                recipient=instance.created_by,
                title="Dépense rejetée",
                message=f"Votre demande de dépense {instance.numero} a été rejetée. Motif: {instance.commentaire_validation}",
                type='error',
                priority='high',
                link=f"/expenses/{instance.id}",
                obj=instance
            )

@receiver(post_save, sender=DemandeReport)
def notify_on_report_request(sender, instance, created, **kwargs):
    """
    Notifie lors d'une demande de report d'échéance.
    """
    if created:
        # Notifier le créateur de la tâche
        NotificationService.send_notification(
            recipient=instance.tache.createur,
            title="Demande de report",
            message=f"L'agent {instance.demandeur.get_full_name()} demande un report pour la tâche {instance.tache.numero}.",
            type='warning',
            priority='high',
            link=f"/tasks/{instance.tache.id}",
            obj=instance
        )
    else:
        # Réponse au report
        NotificationService.send_notification(
            recipient=instance.demandeur,
            title="Réponse demande de report",
            message=f"Votre demande de report pour {instance.tache.numero} a été {instance.get_statut_display().lower()}.",
            type='info' if instance.statut == 'approuvee' else 'error',
            priority='medium' if instance.statut == 'approuvee' else 'high',
            link=f"/tasks/{instance.tache.id}",
            obj=instance
        )

@receiver(post_save, sender=CommentaireTache)
def notify_on_new_comment(sender, instance, created, **kwargs):
    """
    Notifie lors d'un nouveau commentaire sur une tâche.
    """
    if created:
        NotificationService.notify_comment_added(instance)
