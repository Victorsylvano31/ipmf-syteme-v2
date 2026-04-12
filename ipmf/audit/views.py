from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta, datetime
import csv
import json

from .models import AuditLog, ExportHistory, LoginHistory, SystemHealthLog
from .serializers import (
    AuditLogSerializer, ExportHistorySerializer, LoginHistorySerializer,
    SystemHealthLogSerializer, AuditStatsSerializer, AuditFilterSerializer
)
from users.permissions import IsAdminUser, IsDGUser

class AuditLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la consultation des logs d'audit
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser | IsDGUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['action_type', 'module', 'niveau', 'utilisateur', 'objet_type']
    ordering_fields = ['timestamp', 'niveau', 'action_type']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Filtrage avancé des logs d'audit"""
        queryset = AuditLog.objects.all().select_related('utilisateur')
        
        # Filtres personnalisés
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')
        search = self.request.query_params.get('search')
        
        if date_debut:
            try:
                date_debut = datetime.strptime(date_debut, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__gte=date_debut)
            except ValueError:
                pass
        
        if date_fin:
            try:
                date_fin = datetime.strptime(date_fin, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__lte=date_fin)
            except ValueError:
                pass
        
        if search:
            queryset = queryset.filter(
                Q(message__icontains=search) |
                Q(objet_repr__icontains=search) |
                Q(utilisateur__username__icontains=search) |
                Q(utilisateur__first_name__icontains=search) |
                Q(utilisateur__last_name__icontains=search)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """
        Statistiques détaillées des logs d'audit
        """
        # Période par défaut: 30 derniers jours
        date_debut = timezone.now() - timedelta(days=30)
        date_fin = timezone.now()
        
        # Filtres optionnels
        date_debut_param = request.query_params.get('date_debut')
        date_fin_param = request.query_params.get('date_fin')
        
        if date_debut_param:
            try:
                date_debut = datetime.strptime(date_debut_param, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        if date_fin_param:
            try:
                date_fin = datetime.strptime(date_fin_param, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        queryset = self.get_queryset().filter(
            timestamp__date__range=[date_debut, date_fin]
        )
        
        # Statistiques par type d'action
        actions_par_type = queryset.values('action_type').annotate(
            count=Count('id'),
            pourcentage=Count('id') * 100 / queryset.count()
        ).order_by('-count')
        
        # Statistiques par module
        actions_par_module = queryset.values('module').annotate(
            count=Count('id'),
            pourcentage=Count('id') * 100 / queryset.count()
        ).order_by('-count')
        
        # Statistiques par utilisateur
        actions_par_utilisateur = queryset.filter(
            utilisateur__isnull=False
        ).values(
            'utilisateur__username',
            'utilisateur__first_name',
            'utilisateur__last_name',
            'utilisateur__role'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]  # Top 10 seulement
        
        # Activité récente (7 derniers jours)
        activite_recente = []
        for i in range(7):
            date = timezone.now().date() - timedelta(days=i)
            count = queryset.filter(timestamp__date=date).count()
            activite_recente.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })
        
        activite_recente.reverse()
        
        stats = {
            'periode': {
                'debut': date_debut.strftime('%Y-%m-%d'),
                'fin': date_fin.strftime('%Y-%m-%d')
            },
            'actions_par_type': list(actions_par_type),
            'actions_par_module': list(actions_par_module),
            'actions_par_utilisateur': list(actions_par_utilisateur),
            'activite_recente': activite_recente,
            'total_actions': queryset.count(),
            'actions_aujourdhui': queryset.filter(
                timestamp__date=timezone.now().date()
            ).count()
        }
        
        serializer = AuditStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def exporter(self, request):
        """
        Export des logs d'audit en CSV ou JSON
        """
        format_export = request.data.get('format', 'csv')
        queryset = self.get_queryset()
        
        # Appliquer les filtres de l'export
        filter_serializer = AuditFilterSerializer(data=request.data)
        if filter_serializer.is_valid():
            filters = filter_serializer.validated_data
            
            if filters.get('date_debut'):
                queryset = queryset.filter(timestamp__date__gte=filters['date_debut'])
            if filters.get('date_fin'):
                queryset = queryset.filter(timestamp__date__lte=filters['date_fin'])
            if filters.get('utilisateur'):
                queryset = queryset.filter(utilisateur_id=filters['utilisateur'])
            if filters.get('module'):
                queryset = queryset.filter(module=filters['module'])
            if filters.get('action_type'):
                queryset = queryset.filter(action_type=filters['action_type'])
            if filters.get('niveau'):
                queryset = queryset.filter(niveau=filters['niveau'])
        
        if format_export == 'csv':
            return self.export_csv(queryset)
        elif format_export == 'json':
            return self.export_json(queryset)
        else:
            return Response(
                {'error': 'Format non supporté. Utilisez "csv" ou "json".'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def export_csv(self, queryset):
        """Export CSV des logs d'audit"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Type Action', 'Module', 'Niveau', 'Utilisateur', 
            'IP', 'Objet', 'Message', 'URL', 'Méthode', 'Statut'
        ])
        
        for log in queryset:
            writer.writerow([
                log.timestamp.strftime("%d/%m/%Y %H:%M:%S"),
                log.get_action_type_display(),
                log.get_module_display(),
                log.get_niveau_display(),
                log.utilisateur.get_full_name() if log.utilisateur else 'System',
                log.ip_address or 'N/A',
                f"{log.objet_type} ({log.objet_id})" if log.objet_type else 'N/A',
                log.message[:100] + '...' if len(log.message) > 100 else log.message,
                log.url or 'N/A',
                log.method or 'N/A',
                log.status_code or 'N/A'
            ])
        
        # Enregistrer l'export dans l'historique
        ExportHistory.objects.create(
            utilisateur=self.request.user,
            format='csv',
            module='audit',
            fichier=None,  # On ne sauvegarde pas le fichier pour les exports CSV en temps réel
            parametres={},
            nombre_lignes=queryset.count(),
            taille_fichier=len(response.content),
            ip_address=self.get_client_ip(self.request)
        )
        
        return response
    
    def export_json(self, queryset):
        """Export JSON des logs d'audit"""
        data = []
        for log in queryset:
            data.append({
                'id': log.id,
                'timestamp': log.timestamp.isoformat(),
                'action_type': log.action_type,
                'action_type_display': log.get_action_type_display(),
                'module': log.module,
                'module_display': log.get_module_display(),
                'niveau': log.niveau,
                'utilisateur': {
                    'id': log.utilisateur.id if log.utilisateur else None,
                    'username': log.utilisateur.username if log.utilisateur else None,
                    'full_name': log.utilisateur.get_full_name() if log.utilisateur else 'System'
                } if log.utilisateur else None,
                'ip_address': log.ip_address,
                'objet_type': log.objet_type,
                'objet_id': log.objet_id,
                'objet_repr': log.objet_repr,
                'message': log.message,
                'url': log.url,
                'method': log.method,
                'status_code': log.status_code
            })
        
        response = HttpResponse(json.dumps(data, indent=2, ensure_ascii=False), content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.json"'
        
        # Enregistrer l'export dans l'historique
        ExportHistory.objects.create(
            utilisateur=self.request.user,
            format='json',
            module='audit',
            fichier=None,
            parametres={},
            nombre_lignes=queryset.count(),
            taille_fichier=len(response.content),
            ip_address=self.get_client_ip(self.request)
        )
        
        return response
    
    @action(detail=False, methods=['get'])
    def activite_utilisateur(self, request, user_id=None):
        """
        Activité d'audit pour un utilisateur spécifique
        """
        if user_id is None:
            return Response(
                {'error': 'ID utilisateur requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            queryset = self.get_queryset().filter(utilisateur_id=user_id)
            
            # Statistiques par type d'action pour cet utilisateur
            stats_par_type = queryset.values('action_type').annotate(
                count=Count('id')
            ).order_by('-count')
            
            # Dernières activités
            dernieres_activites = queryset.order_by('-timestamp')[:20]
            
            return Response({
                'stats_par_type': list(stats_par_type),
                'dernieres_activites': AuditLogSerializer(dernieres_activites, many=True).data,
                'total_actions': queryset.count(),
                'premiere_action': queryset.order_by('timestamp').first().timestamp if queryset.exists() else None,
                'derniere_action': queryset.order_by('-timestamp').first().timestamp if queryset.exists() else None
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement des données: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Récupère l'adresse IP du client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ExportHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour l'historique des exports
    """
    queryset = ExportHistory.objects.all()
    serializer_class = ExportHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser | IsDGUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['format', 'module', 'utilisateur']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Les utilisateurs ne voient que leurs propres exports, sauf admin/DG"""
        user = self.request.user
        if user.role in ['admin', 'dg']:
            return ExportHistory.objects.all().select_related('utilisateur')
        else:
            return ExportHistory.objects.filter(utilisateur=user).select_related('utilisateur')
    
    @action(detail=True, methods=['get'])
    def telecharger(self, request, pk=None):
        """
        Télécharge le fichier d'export
        """
        export = self.get_object()
        
        # Vérifier les permissions
        if request.user != export.utilisateur and request.user.role not in ['admin', 'dg']:
            return Response(
                {'error': 'Vous ne pouvez pas télécharger ce fichier'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not export.fichier:
            return Response(
                {'error': 'Fichier non disponible'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Journaliser le téléchargement
        AuditLog.log_action(
            action_type='read',
            module='audit',
            message=f"Téléchargement de l'export {export.format} - {export.module}",
            utilisateur=request.user,
            ip_address=self.get_client_ip(request),
            objet_type='ExportHistory',
            objet_id=export.id,
            objet_repr=str(export)
        )
        
        response = HttpResponse(export.fichier.read(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{export.fichier.name}"'
        return response
    
    @action(detail=False, methods=['get'])
    def statistiques_exports(self, request):
        """
        Statistiques des exports
        """
        if request.user.role not in ['admin', 'dg']:
            return Response(
                {'error': 'Accès non autorisé'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Période: 30 derniers jours
        date_debut = timezone.now() - timedelta(days=30)
        
        stats = ExportHistory.objects.filter(
            timestamp__gte=date_debut
        ).aggregate(
            total=Count('id'),
            total_taille=Sum('taille_fichier'),
            moyenne_taille=Avg('taille_fichier')
        )
        
        # Exports par format
        exports_par_format = ExportHistory.objects.filter(
            timestamp__gte=date_debut
        ).values('format').annotate(
            count=Count('id'),
            total_taille=Sum('taille_fichier')
        ).order_by('-count')
        
        # Exports par module
        exports_par_module = ExportHistory.objects.filter(
            timestamp__gte=date_debut
        ).values('module').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Top utilisateurs exportateurs
        top_exportateurs = ExportHistory.objects.filter(
            timestamp__gte=date_debut
        ).values(
            'utilisateur__username',
            'utilisateur__first_name',
            'utilisateur__last_name'
        ).annotate(
            count=Count('id'),
            total_taille=Sum('taille_fichier')
        ).order_by('-count')[:10]
        
        return Response({
            'periode': {
                'debut': date_debut.strftime('%Y-%m-%d'),
                'fin': timezone.now().strftime('%Y-%m-%d')
            },
            'stats_generales': stats,
            'par_format': list(exports_par_format),
            'par_module': list(exports_par_module),
            'top_exportateurs': list(top_exportateurs)
        })
    
    def get_client_ip(self, request):
        """Récupère l'adresse IP du client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LoginHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour l'historique des connexions
    """
    queryset = LoginHistory.objects.all()
    serializer_class = LoginHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser | IsDGUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['reussi', 'utilisateur']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        return LoginHistory.objects.all().select_related('utilisateur')
    
    @action(detail=False, methods=['get'])
    def statistiques_connexions(self, request):
        """
        Statistiques des connexions
        """
        # Période: 30 derniers jours
        date_debut = timezone.now() - timedelta(days=30)
        
        stats = LoginHistory.objects.filter(
            timestamp__gte=date_debut
        ).aggregate(
            total=Count('id'),
            reussies=Count('id', filter=Q(reussi=True)),
            echecs=Count('id', filter=Q(reussi=False)),
            taux_reussite=Count('id', filter=Q(reussi=True)) * 100 / Count('id')
        )
        
        # Connexions par jour
        connexions_par_jour = LoginHistory.objects.filter(
            timestamp__gte=date_debut
        ).extra({
            'date': "DATE(timestamp)"
        }).values('date').annotate(
            total=Count('id'),
            reussies=Count('id', filter=Q(reussi=True)),
            echecs=Count('id', filter=Q(reussi=False))
        ).order_by('date')
        
        # Top IP des échecs
        top_ip_echecs = LoginHistory.objects.filter(
            timestamp__gte=date_debut,
            reussi=False
        ).values('ip_address').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return Response({
            'periode': {
                'debut': date_debut.strftime('%Y-%m-%d'),
                'fin': timezone.now().strftime('%Y-%m-%d')
            },
            'stats_generales': stats,
            'connexions_par_jour': list(connexions_par_jour),
            'top_ip_echecs': list(top_ip_echecs)
        })


class SystemHealthLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les logs de santé du système
    """
    queryset = SystemHealthLog.objects.all()
    serializer_class = SystemHealthLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type_check', 'niveau']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    @action(detail=False, methods=['get'])
    def etat_systeme(self, request):
        """
        État actuel du système basé sur les logs récents
        """
        # Dernières 24 heures
        date_debut = timezone.now() - timedelta(hours=24)
        
        # Dernier log de chaque type
        derniers_logs = {}
        for type_check in ['performance', 'security', 'database', 'storage']:
            dernier = SystemHealthLog.objects.filter(
                type_check=type_check
            ).order_by('-timestamp').first()
            if dernier:
                derniers_logs[type_check] = SystemHealthLogSerializer(dernier).data
        
        # Statistiques des niveaux
        stats_niveaux = SystemHealthLog.objects.filter(
            timestamp__gte=date_debut
        ).values('niveau').annotate(
            count=Count('id')
        ).order_by('niveau')
        
        # Logs critiques récents
        logs_critiques = SystemHealthLog.objects.filter(
            timestamp__gte=date_debut,
            niveau__in=['error', 'critical']
        ).order_by('-timestamp')[:10]
        
        return Response({
            'derniers_logs': derniers_logs,
            'stats_niveaux': list(stats_niveaux),
            'logs_critiques': SystemHealthLogSerializer(logs_critiques, many=True).data,
            'timestamp_verification': timezone.now().isoformat()
        })


class AuditToolsViewSet(viewsets.ViewSet):
    """
    ViewSet pour les outils d'audit
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=False, methods=['post'])
    def nettoyer_logs(self, request):
        """
        Nettoie les logs anciens
        """
        try:
            jours = request.data.get('jours', 365)  # Par défaut, 1 an
            date_limite = timezone.now() - timedelta(days=jours)
            
            # Compter les logs à supprimer
            logs_supprimes = AuditLog.objects.filter(
                timestamp__lt=date_limite
            ).count()
            
            # Supprimer les logs
            AuditLog.objects.filter(
                timestamp__lt=date_limite
            ).delete()
            
            # Journaliser l'action
            AuditLog.log_action(
                action_type='system',
                module='audit',
                message=f"Nettoyage des logs d'audit de plus de {jours} jours",
                utilisateur=request.user,
                ip_address=self.get_client_ip(request),
                niveau='info'
            )
            
            return Response({
                'message': f'{logs_supprimes} logs supprimés (plus de {jours} jours)',
                'logs_supprimes': logs_supprimes,
                'date_limite': date_limite.strftime('%Y-%m-%d')
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du nettoyage: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def resume_securite(self, request):
        """
        Résumé de sécurité du système
        """
        # Période: 7 derniers jours
        date_debut = timezone.now() - timedelta(days=7)
        
        # Tentatives de connexion échouées
        echecs_connexion = LoginHistory.objects.filter(
            timestamp__gte=date_debut,
            reussi=False
        ).count()
        
        # Actions sensibles
        actions_sensibles = AuditLog.objects.filter(
            timestamp__gte=date_debut,
            action_type__in=['delete', 'validation', 'rejet']
        ).count()
        
        # Exports de données
        exports = ExportHistory.objects.filter(
            timestamp__gte=date_debut
        ).count()
        
        # Logs d'erreur système
        erreurs_systeme = SystemHealthLog.objects.filter(
            timestamp__gte=date_debut,
            niveau__in=['error', 'critical']
        ).count()
        
        return Response({
            'periode': {
                'debut': date_debut.strftime('%Y-%m-%d'),
                'fin': timezone.now().strftime('%Y-%m-%d')
            },
            'metriques_securite': {
                'echecs_connexion': echecs_connexion,
                'actions_sensibles': actions_sensibles,
                'exports_donnees': exports,
                'erreurs_systeme': erreurs_systeme
            },
            'recommandations': self.generer_recommandations(
                echecs_connexion, actions_sensibles, exports, erreurs_systeme
            )
        })
    
    def generer_recommandations(self, echecs_connexion, actions_sensibles, exports, erreurs_systeme):
        """Génère des recommandations de sécurité basées sur les métriques"""
        recommandations = []
        
        if echecs_connexion > 50:
            recommandations.append({
                'niveau': 'warning',
                'message': 'Nombre élevé de tentatives de connexion échouées. Vérifiez les logs de sécurité.',
                'action': 'Examiner les adresses IP sources des échecs'
            })
        
        if actions_sensibles > 100:
            recommandations.append({
                'niveau': 'info',
                'message': 'Activité importante d\'actions sensibles détectée.',
                'action': 'S\'assurer que toutes les actions sont légitimes'
            })
        
        if exports > 20:
            recommandations.append({
                'niveau': 'info',
                'message': 'Nombre important d\'exports de données.',
                'action': 'Vérifier la légitimité des exports'
            })
        
        if erreurs_systeme > 10:
            recommandations.append({
                'niveau': 'critical',
                'message': 'Erreurs système critiques détectées.',
                'action': 'Intervenir rapidement pour résoudre les problèmes'
            })
        
        if not recommandations:
            recommandations.append({
                'niveau': 'success',
                'message': 'Aucun problème de sécurité majeur détecté.',
                'action': 'Continuer la surveillance normale'
            })
        
        return recommandations
    
    def get_client_ip(self, request):
        """Récupère l'adresse IP du client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip