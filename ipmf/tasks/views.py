from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from datetime import timedelta
import csv
from django.http import HttpResponse
from .models import Tache, CommentaireTache, DemandeReport, SousTache, LigneDevis
from audit.models import AuditLog
from notifications.services import NotificationService
from .serializers import (
    TacheSerializer, CommentaireTacheSerializer, TacheActionSerializer,
    DemandeReportSerializer, SousTacheSerializer, LigneDevisSerializer
)
from rest_framework.exceptions import PermissionDenied
from .permissions import CanAssignTasks, CanValidateTasks, IsTaskOwnerOrAssignee, CanViewAllTasks


class TacheViewSet(viewsets.ModelViewSet):
    queryset = Tache.objects.all()
    serializer_class = TacheSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['statut', 'priorite', 'createur', 'agents_assignes']
    search_fields = ['numero', 'titre', 'description']
    ordering_fields = ['date_creation', 'date_echeance', 'priorite', 'statut']
    ordering = ['-date_creation']
    
    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated, CanAssignTasks]
        elif self.action in ['valider', 'annuler']:
            permission_classes = [permissions.IsAuthenticated, CanValidateTasks]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [permissions.IsAuthenticated, IsTaskOwnerOrAssignee | CanAssignTasks]
        elif self.action in ['destroy']:
            # Seul le créateur ou admin/DG peut supprimer
            permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser | CanAssignTasks]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Règle DG : Modification autorisée uniquement avant le début
        if request.user.role in ['admin', 'dg'] or request.user.is_superuser:
            # On bloque si la date est passée OU si le statut n'est plus "creee"
            if (instance.date_debut and instance.date_debut <= timezone.now()) or instance.statut != 'creee':
                # On autorise quand même certaines modifications mineures si nécessaire, 
                # mais on bloque les changements structurels via le formulaire principal
                if request.data.get('titre') or request.data.get('date_debut') or request.data.get('agent_principal'):
                     return Response(
                         {'error': "Impossible de modifier les paramètres de base d'une mission qui est déjà en cours ou terminée."},
                         status=status.HTTP_400_BAD_REQUEST
                     )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Règle : Suppression autorisée uniquement si non commencée
        if (instance.date_debut and instance.date_debut <= timezone.now()) or instance.statut != 'creee':
            return Response(
                {'error': "Vous ne pouvez pas supprimer une mission qui a déjà commencé ou qui n'est plus à l'état 'Créée'. Utilisez l'annulation."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.log_action(request.user, f"Tache {instance.numero} supprimee", instance, action_type='delete')
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'dg']:
            return Tache.objects.select_related('createur').prefetch_related('agents_assignes').all()
        else:
            # Les utilisateurs voient les tâches qu'ils ont créées ou qui leur sont assignées
            return Tache.objects.select_related('createur').prefetch_related('agents_assignes').filter(
                Q(createur=user) | Q(agents_assignes=user)
            ).distinct()
    
    def perform_create(self, serializer):
        tache = serializer.save(createur=self.request.user)
        # Auto-ajouter le Chef de mission dans l'équipe
        if tache.agent_principal:
            tache.agents_assignes.add(tache.agent_principal)
        self.log_action(self.request.user, f"Tache {tache.numero} creee", tache, action_type='create')
        # Notifier les agents assignés
        NotificationService.notify_task_assigned(tache)
    
    @action(detail=True, methods=['post'])
    def demarrer(self, request, pk=None):
        """Démarrer une tâche (agent assigné)"""
        tache = self.get_object()
        serializer = TacheActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if not tache.peut_demarrer(request.user):
            return Response(
                {'error': "Vous ne pouvez pas démarrer cette tâche"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        tache.statut = 'en_cours'
        tache.date_debut_reelle = timezone.now()
        tache.save()
        
        # Créer un commentaire
        CommentaireTache.objects.create(
            tache=tache,
            auteur=request.user,
            message=f"🚀 Mission démarrée. {serializer.validated_data.get('commentaire', '')}",
            piece_jointe=serializer.validated_data.get('attachment')
        )
        
        self.log_action(request.user, f"Tache {tache.numero} demarree", tache)
        
        return Response(TacheSerializer(tache).data)
    
    @action(detail=True, methods=['post'])
    def terminer(self, request, pk=None):
        """Terminer une tâche (agent assigné)"""
        tache = self.get_object()
        serializer = TacheActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if not tache.peut_terminer(request.user):
            return Response(
                {'error': "Vous ne pouvez pas terminer cette tâche"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        tache.statut = 'terminee'
        tache.date_fin_reelle = timezone.now()
        tache.resultat = serializer.validated_data.get('resultat', '')
        tache.save()
        
        # Créer un commentaire
        CommentaireTache.objects.create(
            tache=tache,
            auteur=request.user,
            message=f"🏁 Mission terminée. {serializer.validated_data.get('commentaire', '')}",
            piece_jointe=serializer.validated_data.get('attachment')
        )
        
        self.log_action(request.user, f"Tache {tache.numero} terminee", tache)
        
        return Response(TacheSerializer(tache).data)
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valider une tâche (DG ou admin)"""
        tache = self.get_object()

        # Vérification du rôle
        if request.user.role not in ['admin', 'dg'] and not request.user.is_superuser:
            return Response(
                {'error': "Seuls les administrateurs et le Directeur Général peuvent valider une tâche."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Vérification du statut
        if tache.statut != 'terminee':
            return Response(
                {'error': f"La tâche doit être à l'état 'terminée' pour être validée. Statut actuel : {tache.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        commentaire = request.data.get('commentaire', 'Validation effectuée.')
        attachment = request.FILES.get('attachment', None)

        tache.statut = 'validee'
        tache.valide_par = request.user
        tache.date_validation = timezone.now()
        tache.commentaire_validation = commentaire
        tache.save()

        # Commentaire dans l'historique
        CommentaireTache.objects.create(
            tache=tache,
            auteur=request.user,
            message=f"✅ Mission validée par {request.user.get_full_name()}. {commentaire}",
            piece_jointe=attachment
        )

        # Notifier les agents assignés
        for agent in tache.agents_assignes.all():
            NotificationService.send_notification(
                recipient=agent,
                title="✅ Mission validée !",
                message=f"La mission {tache.numero} : {tache.titre} a été validée par {request.user.get_full_name()}.",
                type='success',
                priority='high',
                link=f"/tasks/{tache.id}",
                obj=tache
            )

        self.log_action(request.user, f"Tache {tache.numero} validee", tache, action_type='validation')

        return Response(TacheSerializer(tache, context={'request': request}).data)

    
    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        """Annuler une tâche (DG ou admin)"""
        tache = self.get_object()
        serializer = TacheActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if not tache.peut_annuler(request.user):
            return Response(
                {'error': "Vous ne pouvez pas annuler cette tâche"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        tache.statut = 'annulee'
        tache.save()
        
        # Créer un commentaire
        CommentaireTache.objects.create(
            tache=tache,
            auteur=request.user,
            message=f"Tâche annulée: {serializer.validated_data.get('commentaire', 'Annulation effectuée')}",
            piece_jointe=serializer.validated_data.get('attachment')
        )
        
        self.log_action(request.user, f"Tache {tache.numero} annulee", tache)
        
        return Response(TacheSerializer(tache).data)
    
    @action(detail=False, methods=['get'])
    def mes_taches(self, request):
        """Liste des tâches de l'utilisateur connecté"""
        user = request.user
        queryset = self.get_queryset().filter(agents_assignes=user)
        
        # Filtres supplémentaires
        statut = request.query_params.get('statut', None)
        if statut:
            queryset = queryset.filter(statut=statut)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def en_retard(self, request):
        """Liste des tâches en retard"""
        if request.user.role not in ['admin', 'dg']:
            return Response(
                {'error': "Permission refusée"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        taches_retard = self.get_queryset().filter(est_en_retard=True)
        serializer = self.get_serializer(taches_retard, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques des tâches"""
        user = request.user
        if user.role not in ['admin', 'dg']:
            return Response(
                {'error': "Permission refusée"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Statistiques globales
        stats_globales = Tache.objects.aggregate(
            total=Count('id'),
            en_retard=Count('id', filter=Q(est_en_retard=True)),
            terminees=Count('id', filter=Q(statut='terminee')),
            validees=Count('id', filter=Q(statut='validee')),
        )
        
        # Par statut
        par_statut = Tache.objects.values('statut').annotate(
            count=Count('id')
        ).order_by('statut')
        
        # Par priorité
        par_priorite = Tache.objects.values('priorite').annotate(
            count=Count('id')
        ).order_by('priorite')
        
        # Tâches par utilisateur (pour les admins/DG)
        par_utilisateur = Tache.objects.values('agents_assignes__username').annotate(
            total=Count('id'),
            en_cours=Count('id', filter=Q(statut='en_cours')),
            terminees=Count('id', filter=Q(statut='terminee')),
        ).order_by('-total')
        
        return Response({
            'stats_globales': stats_globales,
            'par_statut': list(par_statut),
            'par_priorite': list(par_priorite),
            'par_utilisateur': list(par_utilisateur),
        })
        
    @action(detail=True, methods=['post'])
    def gerer_equipe(self, request, pk=None):
        """Gérer l'équipe assignée à la mission (Chef de mission uniquement)"""
        tache = self.get_object()
        user = request.user
        
        if tache.agent_principal != user:
            return Response(
                {'error': "Seul le Chef de mission peut gérer l'équipe."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        agents_ids = request.data.get('agents', [])
        # Mettre à jour les agents
        tache.agents_assignes.set(agents_ids)
        
        # Le chef de mission doit toujours être dans l'équipe
        if tache.agent_principal and tache.agent_principal.id not in agents_ids:
            tache.agents_assignes.add(tache.agent_principal)
            
        self.log_action(user, f"Équipe de la tâche {tache.numero} mise à jour", tache)
        return Response({'status': 'success', 'agents_count': tache.agents_assignes.count()})
    
    def log_action(self, user, message, tache=None, action_type='update'):
        """Log une action via le module audit"""
        AuditLog.log_action(
            action_type=action_type,
            module='tasks',
            message=message,
            utilisateur=user,
            objet_type='Tache',
            objet_id=str(tache.pk) if tache else None,
            objet_repr=str(tache) if tache else None
        )

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Exporter les tâches en CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="missions_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Numéro', 'Titre', 'Priorité', 'Statut', 'Créateur', 'Date Échéance', 'Date Création'])
        
        queryset = self.get_queryset()
        for item in queryset:
            writer.writerow([
                item.numero,
                item.titre,
                item.get_priorite_display(),
                item.get_statut_display(),
                item.createur.username if item.createur else '',
                item.date_echeance.strftime('%Y-%m-%d %H:%M') if item.date_echeance else '',
                item.date_creation.strftime('%Y-%m-%d %H:%M') if item.date_creation else ''
            ])
            
        return response
    
class CommentaireTacheViewSet(viewsets.ModelViewSet):
    queryset = CommentaireTache.objects.all()
    serializer_class = CommentaireTacheSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'dg']:
            return CommentaireTache.objects.all()
        else:
            # Les utilisateurs voient les commentaires des tâches qui les concernent
            return CommentaireTache.objects.filter(
                Q(tache__createur=user) | Q(tache__agents_assignes=user)
            ).distinct()
    
    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)

class DemandeReportViewSet(viewsets.ModelViewSet):
    queryset = DemandeReport.objects.all()
    serializer_class = DemandeReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'dg']:
            return DemandeReport.objects.all()
        else:
            return DemandeReport.objects.filter(demandeur=user)
    
    def perform_create(self, serializer):
        # Vérifier que l'utilisateur est assigné à la tâche
        tache = serializer.validated_data['tache']
        user = self.request.user
        if not tache.agents_assignes.filter(id=user.id).exists():
             raise PermissionDenied("Vous n'êtes pas assigné à cette tâche.")
             
        demande = serializer.save(demandeur=user)
        
        # Notifier tous les admins/DG via le service centralisé
        NotificationService.notify_report_request(demande)

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        demande = self.get_object()
        user = request.user
        
        if user.role not in ['admin', 'dg']:
            return Response({'error': "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
            
        if demande.statut != 'en_attente':
            return Response({'error': "Cette demande a déjà été traitée"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Appliquer le report
        tache = demande.tache
        ancien_echeance = tache.date_echeance
        tache.date_echeance = demande.date_demandee
        
        # Si la tâche était en échec/terminée, on la remet en cours
        if tache.statut == 'terminee' or tache.resultat == "ECHEC_AUTOMATIQUE":
            tache.statut = 'en_cours'
            tache.resultat = '' # Clear failure result
            # tache.date_fin_reelle = None # Keep history? Or clear? Let's clear to indicate active.
            tache.date_fin_reelle = None
            
        tache.save()
        
        # Mettre à jour la demande
        demande.statut = 'approuvee'
        demande.repondu_par = user
        demande.date_reponse = timezone.now()
        demande.commentaire_reponse = request.data.get('commentaire', '')
        demande.save()
        
        # Audit
        AuditLog.log_action(
            user, 
            f"Report approuvé pour tâche {tache.numero}. Nouvelle échéance: {tache.date_echeance}", 
            demande, 
            action_type='update'
        )
        
        # Notification
        NotificationService.send_notification(
            recipient=demande.demandeur,
            title="Demande de report approuvée",
            message=f"Votre demande pour la tâche {tache.numero} a été approuvée.",
            type='success',
            link=f"/tasks/{tache.id}"
        )
        
        return Response({'status': 'approuvee'})

    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        demande = self.get_object()
        user = request.user
        
        if user.role not in ['admin', 'dg']:
            return Response({'error': "Permission refusée"}, status=status.HTTP_403_FORBIDDEN)
            
        if demande.statut != 'en_attente':
            return Response({'error': "Cette demande a déjà été traitée"}, status=status.HTTP_400_BAD_REQUEST)
            
        demande.statut = 'rejetee'
        demande.repondu_par = user
        demande.date_reponse = timezone.now()
        demande.commentaire_reponse = request.data.get('commentaire', '')
        demande.save()
        
        AuditLog.log_action(
            user, 
            f"Report rejeté pour tâche {demande.tache.numero}", 
            demande, 
            action_type='update'
        )
        
        NotificationService.send_notification(
            recipient=demande.demandeur,
            title="Demande de report rejetée",
            message=f"Votre demande pour la tâche {demande.tache.numero} a été rejetée.",
            type='error',
            link=f"/tasks/{demande.tache.id}"
        )
        
        return Response({'status': 'rejetee'})
class SousTacheViewSet(viewsets.ModelViewSet):
    queryset = SousTache.objects.all()
    serializer_class = SousTacheSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'dg']:
            return SousTache.objects.all()
        else:
            # Un agent ne voit que les sous-tâches des missions qui lui sont assignées
            return SousTache.objects.filter(
                Q(tache__agents_assignes=user) | Q(assigne_a=user)
            ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        tache = serializer.validated_data.get('tache')
        # Permissions: admin, dg, ou l'agent principal (chef de mission)
        if user.role not in ['admin', 'dg'] and tache.agent_principal != user:
            raise PermissionDenied("Seuls les administrateurs, le DG ou le Chef de mission peuvent ajouter des sous-tâches.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Marquer une sous-tâche comme terminée ou non."""
        sous_tache = self.get_object()
        user = request.user
        # Seul l'admin, le DG, ou le chef de mission peut basculer la sous-tâche
        if user.role not in ['admin', 'dg'] and sous_tache.tache.agent_principal != user:
            raise PermissionDenied("Seul le Chef de mission ou la Direction peut valider cette sous-tâche.")
            
        if sous_tache.tache.statut in ['terminee', 'validee', 'annulee']:
            raise PermissionDenied("Vous ne pouvez pas modifier une sous-tâche d'une mission terminée.")
            
        sous_tache.est_terminee = not sous_tache.est_terminee
        if sous_tache.est_terminee:
            sous_tache.date_fin = timezone.now()
        else:
            sous_tache.date_fin = None
        sous_tache.save()
        return Response(SousTacheSerializer(sous_tache).data)


class LigneDevisViewSet(viewsets.ModelViewSet):
    """ViewSet pour les lignes du bon de commande d'une mission."""
    queryset = LigneDevis.objects.all()
    serializer_class = LigneDevisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        tache_id = self.request.query_params.get('tache', None)
        qs = LigneDevis.objects.all()
        if tache_id:
            qs = qs.filter(tache_id=tache_id)
        if user.role in ['admin', 'dg']:
            return qs
        # Agents voient les lignes des missions qui leur sont assignées
        return qs.filter(
            Q(tache__agents_assignes=user) | Q(tache__createur=user)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['admin', 'dg']:
            raise PermissionDenied("Seuls le DG et l'admin peuvent créer des lignes de devis.")
        serializer.save(cree_par=user)

    def update(self, request, *args, **kwargs):
        """Agents (Chef uniquement) peuvent mettre à jour prix_reel. DG/Admin ne peuvent pas modifier prix_reel."""
        instance = self.get_object()
        user = request.user
        partial = kwargs.pop('partial', False)
        
        incoming = set(request.data.keys())

        if user.role not in ['admin', 'dg']:
            # L'agent peut seulement remplir le prix réel, mais uniquement s'il est CHEF
            if instance.tache.agent_principal != user:
                raise PermissionDenied("Seul le Chef de mission peut modifier le bon de commande.")
            allowed_fields = {'prix_reel'}
            if not incoming.issubset(allowed_fields):
                raise PermissionDenied("Vous pouvez uniquement renseigner le prix réel du marché.")
        else:
            # DG/Admin ne peuvent pas modifier le prix réel fait par l'agent
            if 'prix_reel' in incoming:
                raise PermissionDenied("Vous ne pouvez pas modifier le prix réel saisi par l'agent.")
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ['admin', 'dg']:
            raise PermissionDenied("Seuls le DG et l'admin peuvent supprimer des lignes de devis.")
        return super().destroy(request, *args, **kwargs)
