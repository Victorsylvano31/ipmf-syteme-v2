from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg  # Import complet
from django.utils import timezone
from datetime import timedelta

# Import des modèles
from .models import DashboardPreferences, Alert, WidgetConfig, DashboardView
from .serializers import (
    DashboardPreferencesSerializer, AlertSerializer, WidgetConfigSerializer,
    DashboardViewSerializer, AlertActionSerializer, DashboardStatsSerializer
)
from .services import DashboardService, AlertService

# Import des modèles d'autres apps pour les statistiques
from finances.models import EntreeArgent, Depense
from tasks.models import Tache
from users.models import CustomUser


class DashboardPreferencesViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des préférences du dashboard
    """
    queryset = DashboardPreferences.objects.all()
    serializer_class = DashboardPreferencesSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retourne seulement les préférences de l'utilisateur connecté"""
        return DashboardPreferences.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Associe automatiquement l'utilisateur connecté"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def my_preferences(self, request):
        """
        Endpoint pour récupérer ou mettre à jour les préférences de l'utilisateur connecté
        """
        # Récupère ou crée les préférences de l'utilisateur
        preferences, created = DashboardPreferences.objects.get_or_create(
            user=request.user,
            defaults={
                'layout_config': {},
                'favorite_widgets': [],
                'default_view': 'overview',
                'refresh_interval': 300
            }
        )
        
        if request.method == 'GET':
            serializer = self.get_serializer(preferences)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            serializer = self.get_serializer(
                preferences, 
                data=request.data, 
                partial=(request.method == 'PATCH')
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des alertes utilisateur
    """
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type_alerte', 'niveau', 'lue']
    ordering_fields = ['date_creation', 'niveau']
    ordering = ['-date_creation']
    
    def get_queryset(self):
        """Retourne seulement les alertes de l'utilisateur connecté"""
        return Alert.objects.filter(destinataire=self.request.user)
    
    def perform_create(self, serializer):
        """Assure que l'alerte est créée pour l'utilisateur connecté"""
        serializer.save(destinataire=self.request.user)
    
    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        """
        Récupère les alertes non lues de l'utilisateur
        """
        alertes = self.get_queryset().filter(lue=False)
        page = self.paginate_queryset(alertes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(alertes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def marquer_comme_lues(self, request):
        """
        Marque plusieurs alertes comme lues en une seule requête
        """
        serializer = AlertActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        alerte_ids = serializer.validated_data['alerte_ids']
        alertes = self.get_queryset().filter(id__in=alerte_ids, lue=False)
        
        count_updated = 0
        for alerte in alertes:
            alerte.marquer_comme_lue()
            count_updated += 1
        
        return Response({
            'message': f'{count_updated} alerte(s) marquée(s) comme lue(s)',
            'alertes_traitees': count_updated
        })
    
    @action(detail=True, methods=['post'])
    def marquer_comme_lue(self, request, pk=None):
        """
        Marque une alerte spécifique comme lue
        """
        alerte = self.get_object()
        if not alerte.lue:
            alerte.marquer_comme_lue()
            message = "Alerte marquée comme lue"
        else:
            message = "L'alerte était déjà marquée comme lue"
        
        serializer = self.get_serializer(alerte)
        return Response({
            'message': message,
            'alerte': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def stats_personnelles(self, request):
        """
        Statistiques des alertes de l'utilisateur
        """
        queryset = self.get_queryset()
        stats = {
            'total': queryset.count(),
            'lues': queryset.filter(lue=True).count(),
            'non_lues': queryset.filter(lue=False).count(),
            'par_type': list(queryset.values('type_alerte').annotate(
                count=Count('id'),
                non_lues=Count('id', filter=Q(lue=False))
            ).order_by('-count')),
            'par_niveau': list(queryset.values('niveau').annotate(
                count=Count('id'),
                non_lues=Count('id', filter=Q(lue=False))
            ).order_by('niveau'))
        }
        return Response(stats)


class WidgetConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la configuration des widgets du dashboard
    """
    queryset = WidgetConfig.objects.all()
    serializer_class = WidgetConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retourne seulement les widgets de l'utilisateur connecté"""
        return WidgetConfig.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Associe automatiquement l'utilisateur connecté"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def mes_widgets(self, request):
        """
        Récupère tous les widgets visibles de l'utilisateur
        """
        widgets = self.get_queryset().filter(is_visible=True).order_by('position_y', 'position_x')
        serializer = self.get_serializer(widgets, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reordonner(self, request):
        """
        Réordonne les widgets en une seule requête
        """
        nouvelles_positions = request.data.get('positions', [])
        
        try:
            for pos_data in nouvelles_positions:
                widget_id = pos_data.get('id')
                position_x = pos_data.get('position_x', 0)
                position_y = pos_data.get('position_y', 0)
                
                widget = self.get_queryset().get(id=widget_id)
                widget.position_x = position_x
                widget.position_y = position_y
                widget.save()
            
            return Response({'message': 'Widgets réordonnés avec succès'})
            
        except WidgetConfig.DoesNotExist:
            return Response(
                {'error': 'Widget non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du réordonnancement: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class DashboardViewViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des vues personnalisées du dashboard
    """
    queryset = DashboardView.objects.all()
    serializer_class = DashboardViewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les vues de l'utilisateur et les vues publiques"""
        return DashboardView.objects.filter(
            Q(user=self.request.user) | Q(est_public=True)
        )
    
    def perform_create(self, serializer):
        """Associe automatiquement l'utilisateur connecté"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def definir_comme_defaut(self, request, pk=None):
        """
        Définit une vue comme vue par défaut
        """
        vue = self.get_object()
        
        # S'assurer que l'utilisateur est propriétaire ou admin
        if vue.user != request.user and not request.user.is_admin:
            return Response(
                {'error': 'Vous ne pouvez pas modifier cette vue'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Désactiver les autres vues par défaut de l'utilisateur
        DashboardView.objects.filter(user=request.user, est_defaut=True).update(est_defaut=False)
        
        # Définir cette vue comme défaut
        vue.est_defaut = True
        vue.save()
        
        serializer = self.get_serializer(vue)
        return Response(serializer.data)


class DashboardDataViewSet(viewsets.ViewSet):
    """
    ViewSet pour les données du dashboard - pas de modèle direct
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """
        Point d'entrée principal du dashboard
        Redirige vers la vue appropriée selon le rôle
        """
        return self.overview(request)
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Données générales du dashboard selon le rôle de l'utilisateur
        """
        user = request.user
        
        try:
            if user.role == 'dg':
                data = DashboardService.get_dg_dashboard_data(user)
            elif user.role == 'comptable':
                data = DashboardService.get_comptable_dashboard_data(user)
            elif user.role == 'caisse':
                data = DashboardService.get_caisse_dashboard_data(user)
            else:
                data = DashboardService.get_agent_dashboard_data(user)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_403_FORBIDDEN)
            
            return Response(data)
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement du dashboard: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Recherche globale à travers plusieurs modèles
        """
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response([])

        results = []
        user = request.user
        
        # 1. Recherche dans les Tâches
        taches = Tache.objects.filter(
            Q(numero__icontains=query) |
            Q(titre__icontains=query) |
            Q(description__icontains=query)
        )[:5]
        
        for t in taches:
            results.append({
                'type': 'task',
                'id': t.id,
                'title': t.titre,
                'subtitle': f"Mission {t.numero} - {t.get_statut_display()}",
                'url': f"/tasks/{t.id}",
                'icon': 'ClipboardList'
            })

        # 2. Recherche dans les Dépenses (si autorisé)
        if user.role != 'agent':
            depenses = Depense.objects.filter(
                Q(numero__icontains=query) |
                Q(motif__icontains=query) |
                Q(montant__icontains=query)
            )[:5]
            
            for d in depenses:
                results.append({
                    'type': 'expense',
                    'id': d.id,
                    'title': d.motif,
                    'subtitle': f"Dépense {d.numero} - {d.montant:,.0f} Ar".replace(',', ' '),
                    'url': f"/expenses/{d.id}",
                    'icon': 'Wallet'
                })

            # 3. Recherche dans les Entrées d'Argent
            entrees = EntreeArgent.objects.filter(
                Q(reference__icontains=query) |
                Q(source__icontains=query) |
                Q(montant__icontains=query)
            )[:5]
            
            for e in entrees:
                results.append({
                    'type': 'income',
                    'id': e.id,
                    'title': e.source,
                    'subtitle': f"Recette {e.reference} - {e.montant:,.0f} Ar".replace(',', ' '),
                    'url': f"/finances/incomes/{e.id}",
                    'icon': 'TrendingUp'
                })

        # 4. Recherche dans les Utilisateurs (Admin/DG seulement)
        if user.role in ['admin', 'dg']:
            users = CustomUser.objects.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )[:5]
            
            for u in users:
                results.append({
                    'type': 'user',
                    'id': u.id,
                    'title': f"{u.first_name} {u.last_name}" if u.first_name else u.username,
                    'subtitle': f"Utilisateur - Rôle: {u.role}",
                    'url': f"/users", # On redirige vers la liste car pas encore de vue détail par ID utilisateur direct
                    'icon': 'User'
                })

        return Response(results)

    @action(detail=False, methods=['get'])
    def finances(self, request):
        """
        Données financières détaillées
        """
        user = request.user
        if user.role not in ['admin', 'dg', 'comptable', 'caisse']:
            return Response(
                {'error': 'Accès non autorisé aux données financières'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Période : 12 derniers mois
            debut_periode = timezone.now().replace(day=1) - timedelta(days=365)
            
            # Entrées par mois
            from django.db.models.functions import TruncMonth
            entrees_par_mois = EntreeArgent.objects.filter(
                date_entree__gte=debut_periode,
                statut='confirmee'
            ).annotate(
                mois=TruncMonth('date_entree')
            ).values('mois').annotate(
                total=Sum('montant'),
                count=Count('id')
            ).order_by('mois')
            
            # Dépenses par mois
            depenses_par_mois = Depense.objects.filter(
                created_at__gte=debut_periode,
                statut__in=['payee', 'validee']
            ).annotate(
                mois=TruncMonth('created_at')
            ).values('mois').annotate(
                total=Sum('montant'),
                count=Count('id')
            ).order_by('mois')
            
            # Dépenses par catégorie
            depenses_par_categorie = Depense.objects.filter(
                created_at__gte=debut_periode,
                statut__in=['payee', 'validee']
            ).values('categorie').annotate(
                total=Sum('montant'),
                count=Count('id')
            ).order_by('-total')
            
            # Statistiques récentes (30 derniers jours)
            trente_jours = timezone.now() - timedelta(days=30)
            stats_recentes = {
                'entrees_30j': EntreeArgent.objects.filter(
                    date_entree__gte=trente_jours,
                    statut='confirmee'
                ).aggregate(total=Sum('montant'))['total'] or 0,
                'depenses_30j': Depense.objects.filter(
                    created_at__gte=trente_jours,
                    statut__in=['payee', 'validee']
                ).aggregate(total=Sum('montant'))['total'] or 0,
            }
            
            return Response({
                'entrees_par_mois': list(entrees_par_mois),
                'depenses_par_mois': list(depenses_par_mois),
                'depenses_par_categorie': list(depenses_par_categorie),
                'stats_recentes': stats_recentes,
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement des données financières: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def taches(self, request):
        """
        Données des tâches détaillées
        """
        user = request.user
        if user.role not in ['admin', 'dg']:
            # Les autres utilisateurs voient seulement leurs tâches
            taches_perso = Tache.objects.filter(
                Q(createur=user) | Q(agent_assigne=user)
            )
            
            stats = taches_perso.aggregate(
                total=Count('id'),
                en_cours=Count('id', filter=Q(statut='en_cours')),
                terminees=Count('id', filter=Q(statut='terminee')),
                en_retard=Count('id', filter=Q(est_en_retard=True))
            )
            
            return Response({
                'mes_taches': stats,
                'taches_recentes': list(taches_perso.order_by('-date_creation')[:10].values(
                    'id', 'numero', 'titre', 'statut', 'date_echeance'
                ))
            })
        
        try:
            # Pour admin/DG: données complètes
            taches_par_statut = Tache.objects.values('statut').annotate(
                count=Count('id')
            ).order_by('statut')
            
            taches_par_priorite = Tache.objects.values('priorite').annotate(
                count=Count('id')
            ).order_by('priorite')
            
            taches_retard_par_utilisateur = Tache.objects.filter(
                est_en_retard=True
            ).values('agent_assigne__username', 'agent_assigne__first_name', 'agent_assigne__last_name').annotate(
                count=Count('id')
            ).order_by('-count')
            
            return Response({
                'taches_par_statut': list(taches_par_statut),
                'taches_par_priorite': list(taches_par_priorite),
                'taches_retard_par_utilisateur': list(taches_retard_par_utilisateur),
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement des données des tâches: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def indicateurs_cles(self, request):
        """
        Indicateurs clés de performance
        """
        user = request.user
        if user.role not in ['admin', 'dg', 'comptable']:
            return Response(
                {'error': 'Accès non autorisé aux indicateurs'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Période : mois en cours
            debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Calcul des indicateurs financiers
            indicateurs = {
                'tresorerie_mensuelle': EntreeArgent.objects.filter(
                    date_entree__gte=debut_mois,
                    statut='confirmee'
                ).aggregate(total=Sum('montant'))['total'] or 0,
                
                'depenses_mensuelles': Depense.objects.filter(
                    created_at__gte=debut_mois,
                    statut__in=['payee', 'validee']
                ).aggregate(total=Sum('montant'))['total'] or 0,
                
                'dépenses_en_retard': Depense.objects.filter(
                    statut='en_attente',
                    created_at__lt=timezone.now() - timedelta(days=7)
                ).count(),
                
                'taches_en_retard': Tache.objects.filter(est_en_retard=True).count(),
                
                'utilisateurs_actifs': CustomUser.objects.filter(is_active=True).count(),
            }
            
            # Calcul du taux d'accomplissement des tâches
            total_taches = Tache.objects.count()
            taches_terminees = Tache.objects.filter(statut__in=['terminee', 'validee']).count()
            if total_taches > 0:
                indicateurs['taux_accomplissement_taches'] = (taches_terminees / total_taches) * 100
            else:
                indicateurs['taux_accomplissement_taches'] = 0
            
            # Formatage des valeurs monétaires
            indicateurs['tresorerie_mensuelle_format'] = f"{indicateurs['tresorerie_mensuelle']:,.0f} Ar".replace(",", " ")
            indicateurs['depenses_mensuelles_format'] = f"{indicateurs['depenses_mensuelles']:,.0f} Ar".replace(",", " ")
            indicateurs['taux_accomplissement_taches_format'] = f"{indicateurs['taux_accomplissement_taches']:.1f}%"
            
            return Response(indicateurs)
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement des indicateurs: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AlertManagementViewSet(viewsets.ViewSet):
    """
    ViewSet pour la gestion administrative des alertes
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """
        Seuls les admin et DG peuvent accéder à ces endpoints
        """
        if self.request.user.role not in ['admin', 'dg']:
            self.permission_denied(self.request)
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def toutes_alertes(self, request):
        """
        Récupère toutes les alertes du système (admin/DG seulement)
        """
        try:
            alertes = Alert.objects.all().select_related('destinataire').order_by('-date_creation')
            
            # Pagination
            page = self.paginate_queryset(alertes)
            if page is not None:
                serializer = AlertSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = AlertSerializer(alertes, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement des alertes: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generer_alertes_retard(self, request):
        """
        Génère des alertes pour les éléments en retard
        """
        try:
            # Appeler les services de génération d'alertes
            AlertService.check_depenses_retard()
            AlertService.check_taches_retard()
            
            return Response({
                'message': 'Vérification des alertes de retard effectuée avec succès',
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération des alertes: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def statistiques_alertes(self, request):
        """
        Statistiques détaillées des alertes
        """
        try:
            # Statistiques générales
            stats_generales = Alert.objects.aggregate(
                total=Count('id'),
                lues=Count('id', filter=Q(lue=True)),
                non_lues=Count('id', filter=Q(lue=False))
            )
            
            # Alertes par type détaillé
            alertes_par_type = Alert.objects.values('type_alerte').annotate(
                total=Count('id'),
                lues=Count('id', filter=Q(lue=True)),
                non_lues=Count('id', filter=Q(lue=False))
            ).order_by('-total')
            
            # Alertes par niveau
            alertes_par_niveau = Alert.objects.values('niveau').annotate(
                total=Count('id'),
                non_lues=Count('id', filter=Q(lue=False))
            ).order_by('niveau')
            
            # Alertes par utilisateur
            alertes_par_utilisateur = Alert.objects.values(
                'destinataire__username',
                'destinataire__first_name', 
                'destinataire__last_name'
            ).annotate(
                total=Count('id'),
                non_lues=Count('id', filter=Q(lue=False))
            ).order_by('-non_lues')[:10]  # Top 10 seulement
            
            # Évolution sur 30 jours
            trente_jours = timezone.now() - timedelta(days=30)
            evolution_alertes = Alert.objects.filter(
                date_creation__gte=trente_jours
            ).extra({
                'date': "DATE(date_creation)"
            }).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            return Response({
                'stats_generales': stats_generales,
                'par_type': list(alertes_par_type),
                'par_niveau': list(alertes_par_niveau),
                'par_utilisateur': list(alertes_par_utilisateur),
                'evolution_30j': list(evolution_alertes),
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du chargement des statistiques: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def nettoyer_alertes(self, request):
        """
        Nettoie les alertes anciennes (plus de 90 jours)
        """
        try:
            jours = request.data.get('jours', 90)
            date_limite = timezone.now() - timedelta(days=jours)
            
            alertes_supprimees = Alert.objects.filter(
                date_creation__lt=date_limite
            ).count()
            
            Alert.objects.filter(
                date_creation__lt=date_limite
            ).delete()
            
            return Response({
                'message': f'{alertes_supprimees} alerte(s) de plus de {jours} jours supprimée(s)',
                'alertes_supprimees': alertes_supprimees
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du nettoyage des alertes: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
