from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Avg, Max, Min, DateField, DateTimeField
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear, Coalesce, Cast
from django.utils import timezone
from datetime import timedelta, datetime
import csv
from django.http import HttpResponse
from .models import EntreeArgent, Depense
from .serializers import (
    EntreeArgentSerializer, DepenseSerializer, DepenseActionSerializer
)
from .permissions import (
    CanCreateEntree, CanConfirmEntree, CanCreateDepense, 
    CanVerifyDepense, CanValidateDepense, CanPayDepense, CanViewAllFinances
)
from .services import FinanceService
from audit.models import AuditLog
from django.core.exceptions import ValidationError

class EntreeArgentViewSet(viewsets.ModelViewSet):
    queryset = EntreeArgent.objects.all()
    serializer_class = EntreeArgentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['statut', 'mode_paiement', 'date_entree']
    search_fields = ['numero', 'motif', 'commentaire']
    ordering_fields = ['date_entree', 'montant', 'created_at']
    ordering = ['-date_entree']
    
    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated, CanCreateEntree]
        elif self.action in ['confirmer', 'annuler']:
            permission_classes = [permissions.IsAuthenticated, CanConfirmEntree]
        elif self.action in ['destroy']:
            permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        return EntreeArgent.objects.pour_utilisateur(user).select_related('created_by')
    
    def perform_create(self, serializer):
        user = self.request.user
        entree = serializer.save(created_by=user)
        
        # Auto-confirmation logic
        should_auto_confirm = False
        if user.role in ['admin', 'dg']:
            should_auto_confirm = True
        elif user.role == 'caisse' and entree.montant < 100000: # Explicit check to match the model logic
            should_auto_confirm = True
            
        if should_auto_confirm:
            try:
                # Use FinanceService to ensure audit logs and correct business rules
                FinanceService.confirm_entree(entree, user)
            except Exception as e:
                print(f"Auto-confirmation failed: {e}")

        AuditLog.log_action(
            action_type='create',
            module='finances',
            message=f"Nouvelle entrée {entree.numero} créée par {self.request.user.username}",
            utilisateur=self.request.user,
            objet_type='EntreeArgent',
            objet_id=str(entree.pk),
            objet_repr=str(entree)
        )
    
    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        """Action pour confirmer une entrée d'argent"""
        entree = self.get_object()
        try:
            FinanceService.confirm_entree(entree, request.user)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(entree)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        """Action pour annuler une entrée d'argent"""
        entree = self.get_object()
        comment = request.data.get('commentaire', '')
        
        try:
            FinanceService.cancel_entree(entree, request.user, comment)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(entree)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Statistiques des entrées d'argent"""
        user = request.user
        if user.role not in ['admin', 'comptable', 'dg']:
            return Response(
                {'error': "Permission refusée"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Période : mois en cours
        debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fin_mois = (debut_mois + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        # Statistiques de base
        stats_base = EntreeArgent.objects.filter(
            date_entree__range=[debut_mois, fin_mois],
            statut='confirmee'
        ).aggregate(
            total_montant=Sum('montant'),
            total_entrees=Count('id'),
            moyenne_montant=Avg('montant'),
            montant_max=Max('montant'),
            montant_min=Min('montant')
        )
        
        # Par mode de paiement
        par_mode = EntreeArgent.objects.filter(
            date_entree__range=[debut_mois, fin_mois],
            statut='confirmee'
        ).values('mode_paiement').annotate(
            total=Sum('montant'),
            count=Count('id'),
            pourcentage=Sum('montant') * 100 / stats_base['total_montant']
        ).order_by('-total')
        
        # Évolution sur 6 mois
        evolution = []
        for i in range(6):
            mois = debut_mois - timedelta(days=30*i)
            debut_mois_calc = mois.replace(day=1)
            fin_mois_calc = (debut_mois_calc + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            total_mois = EntreeArgent.objects.filter(
                date_entree__range=[debut_mois_calc, fin_mois_calc],
                statut='confirmee'
            ).aggregate(total=Sum('montant'))['total'] or 0
            
            evolution.append({
                'mois': debut_mois_calc.strftime('%Y-%m'),
                'total': float(total_mois)
            })
        
        evolution.reverse()
        
        stats_data = {
            'periode': {
                'debut': debut_mois.strftime('%Y-%m-%d'),
                'fin': fin_mois.strftime('%Y-%m-%d')
            },
            'stats_base': stats_base,
            'par_mode_paiement': list(par_mode),
            'evolution': evolution
        }
        return Response(stats_data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Exporter les entrées d'argent en CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="entrees_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Numéro', 'Date', 'Motif', 'Montant', 'Statut', 'Mode Paiement', 'Créé par'])
        
        queryset = self.get_queryset()
        for item in queryset:
            writer.writerow([
                item.numero,
                item.date_entree.strftime('%Y-%m-%d') if item.date_entree else '',
                item.motif,
                item.montant,
                item.get_statut_display(),
                item.get_mode_paiement_display(),
                item.created_by.username if item.created_by else ''
            ])
            
        return response

class FinanceAnalyticsViewSet(viewsets.ViewSet):
    """ViewSet pour les analyses financières"""
    permission_classes = [permissions.IsAuthenticated, CanViewAllFinances]

    def list(self, request):
        granularity = request.query_params.get('granularity', 'month')
        today = timezone.now().date()
        
        # Déterminer la période et la fonction de troncature selon la granularité
        if granularity == 'day':
            date_debut = today - timedelta(days=30)
            trunc_fn = TruncDay
            date_format = '%Y-%m-%d'
            forecast_delta = timedelta(days=7)
        elif granularity == 'week':
            date_debut = today - timedelta(weeks=12)
            trunc_fn = TruncWeek
            date_format = '%G-W%V'  # Format ISO week
            forecast_delta = timedelta(weeks=4)
        elif granularity == 'year':
            date_debut = today.replace(year=today.year - 5, month=1, day=1)
            trunc_fn = TruncYear
            date_format = '%Y'
            forecast_delta = timedelta(days=365*2)
        else:  # month (default)
            date_debut = (today.replace(day=1) - timedelta(days=365)).replace(day=1)
            trunc_fn = TruncMonth
            date_format = '%Y-%m'
            forecast_delta = timedelta(days=120)

        # Récupérer les données réelles (Entrées) - Confirmées uniquement
        entrees_qs = EntreeArgent.objects.filter(
            statut='confirmee'
        ).annotate(
            # date_entree est DateField, created_at est DateTimeField
            ref_date=Coalesce('date_entree', Cast('created_at', output_field=DateField())),
            period=trunc_fn('ref_date')
        ).filter(
            ref_date__gte=date_debut
        ).values('period').annotate(
            total=Sum('montant')
        ).order_by('period')

        # Récupérer les données réelles (Dépenses) - Payées uniquement
        depenses_qs = Depense.objects.filter(
            statut='payee'
        ).annotate(
            # date_paiement est DateTimeField, created_at est DateTimeField -> OK
            ref_date=Coalesce('date_paiement', 'created_at'),
            period=trunc_fn('ref_date')
        ).filter(
            ref_date__gte=date_debut
        ).values('period').annotate(
            total=Sum('montant')
        ).order_by('period')

        # Calculer les totaux globaux (TOUTE l'histoire) - Strict Cash
        overall_entrees = EntreeArgent.objects.filter(
            statut='confirmee'
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        overall_depenses = Depense.objects.filter(
            statut='payee'
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        overall_solde = float(overall_entrees) - float(overall_depenses)

        # Calculer le solde initial avant date_debut
        somme_entrees_init = EntreeArgent.objects.filter(
            statut='confirmee',
            date_entree__lt=date_debut
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        somme_depenses_init = Depense.objects.filter(
            statut='payee',
            date_paiement__lt=date_debut
        ).aggregate(total=Sum('montant'))['total'] or 0
        
        running_balance = float(somme_entrees_init) - float(somme_depenses_init)

        # Mapper les données par période
        data_by_period = {}
        
        # Initialiser les périodes
        current = date_debut
        end_date = today + forecast_delta
        
        while current <= end_date:
            key = current.strftime(date_format)
            # Détecter si c'est la période en cours
            is_ongoing = False
            if granularity == 'day' and current == today: is_ongoing = True
            elif granularity == 'week' and current <= today < current + timedelta(weeks=1): is_ongoing = True
            elif granularity == 'month' and current.year == today.year and current.month == today.month: is_ongoing = True
            elif granularity == 'year' and current.year == today.year: is_ongoing = True

            data_by_period[key] = {
                'label': key,
                'entrees': 0,
                'depenses': 0,
                'is_forecast': current > today,
                'is_ongoing': is_ongoing
            }
            
            # Incrémenter selon la granularité
            if granularity == 'day': current += timedelta(days=1)
            elif granularity == 'week': current += timedelta(weeks=1)
            elif granularity == 'year': current = current.replace(year=current.year + 1)
            else: # month
                if current.month == 12: current = current.replace(year=current.year + 1, month=1)
                else: current = current.replace(month=current.month + 1)

        for e in entrees_qs:
            key = e['period'].strftime(date_format)
            if key in data_by_period:
                data_by_period[key]['entrees'] = float(e['total'])

        for d in depenses_qs:
            key = d['period'].strftime(date_format)
            if key in data_by_period:
                data_by_period[key]['depenses'] = float(d['total'])

        # Calculer le solde cumulé
        sorted_keys = sorted(data_by_period.keys())
        for key in sorted_keys:
            val = data_by_period[key]
            if not val['is_forecast']:
                running_balance += (val['entrees'] - val['depenses'])
                val['solde_cumule'] = running_balance
                
                # Si c'est en cours et que tout est à 0, on met à None pour éviter la chute à 0 sur le graph
                if val.get('is_ongoing') and val['entrees'] == 0 and val['depenses'] == 0:
                    val['entrees'] = None
                    val['depenses'] = None

        # Calcul des prévisions - Modèle de Tendance Linéaire (Semi-Intelligent)
        historical_data = [(v['entrees'] or 0, v['depenses'] or 0) for k, v in data_by_period.items() if not v['is_forecast']]
        
        if len(historical_data) >= 2:
            n = len(historical_data)
            x = list(range(n))
            
            # Fonction interne pour calculer la régression linéaire simple
            def get_trend(values):
                sum_x = sum(x)
                sum_y = sum(values)
                sum_xy = sum(i * values[i] for i in range(n))
                sum_x2 = sum(i**2 for i in range(n))
                
                denominator = (n * sum_x2 - sum_x**2)
                if denominator == 0: return 0, sum_y / n
                
                slope = (n * sum_xy - sum_x * sum_y) / denominator
                intercept = (sum_y - slope * sum_x) / n
                return slope, intercept

            slope_e, intercept_e = get_trend([h[0] for h in historical_data])
            slope_d, intercept_d = get_trend([h[1] for h in historical_data])
            
            # Projeter le solde cumulé pour les prévisions
            temp_balance = running_balance
            forecast_count = 1
            for key in sorted_keys:
                val = data_by_period[key]
                if val['is_forecast']:
                    # Projection x = n + offset
                    proj_x = n + forecast_count - 1
                    
                    e_proj = max(0, slope_e * proj_x + intercept_e)
                    d_proj = max(0, slope_d * proj_x + intercept_d)
                    
                    val['entrees_prevues'] = float(round(e_proj, 2))
                    val['depenses_prevues'] = float(round(d_proj, 2))
                    val['prevision'] = val['entrees_prevues'] - val['depenses_prevues']
                    
                    temp_balance += val['prevision']
                    val['solde_cumule_prevu'] = float(round(temp_balance, 2))
                    forecast_count += 1
        elif historical_data:
            # Fallback sur moyenne simple si pas assez de points
            avg_e = sum(h[0] for h in historical_data) / len(historical_data)
            avg_d = sum(h[1] for h in historical_data) / len(historical_data)
            
            temp_balance = running_balance
            for key in sorted_keys:
                val = data_by_period[key]
                if val['is_forecast']:
                    val['entrees_prevues'] = float(round(avg_e, 2))
                    val['depenses_prevues'] = float(round(avg_d, 2))
                    val['prevision'] = avg_e - avg_d
                    temp_balance += val['prevision']
                    val['solde_cumule_prevu'] = float(round(temp_balance, 2))

        return Response({
            'data': [data_by_period[k] for k in sorted_keys],
            'overall_totals': {
                'total_entrees': float(overall_entrees),
                'total_depenses': float(overall_depenses),
                'solde': overall_solde
            }
        })

class DepenseViewSet(viewsets.ModelViewSet):
    queryset = Depense.objects.all()
    serializer_class = DepenseSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['statut', 'categorie', 'created_by']
    search_fields = ['numero', 'motif', 'commentaire']
    ordering_fields = ['created_at', 'montant', 'statut']
    ordering = ['-created_at']
    
    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated, CanCreateDepense]
        elif self.action in ['verifier']:
            permission_classes = [permissions.IsAuthenticated, CanVerifyDepense]
        elif self.action in ['valider']:
            permission_classes = [permissions.IsAuthenticated, CanValidateDepense]
        elif self.action in ['payer']:
            permission_classes = [permissions.IsAuthenticated, CanPayDepense]
        elif self.action in ['destroy']:
            permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        return Depense.objects.pour_utilisateur(user).select_related(
            'created_by', 'verifie_par', 'valide_par_comptable', 'valide_par_dg'
        )
    
    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        
        # Validation : Seuls l'admin, le DG ou le Chef de mission peuvent demander des fonds pour une mission
        tache = serializer.validated_data.get('tache')
        if tache and self.request.user.role not in ['admin', 'dg']:
            if tache.agent_principal != self.request.user:
                raise PermissionDenied("Seul le Chef de mission peut demander des fonds pour cette mission.")
                
        depense = serializer.save(created_by=self.request.user)
        
        # 1. DG Auto-Validation (Haute Priorité)
        if self.request.user.role == 'dg':
            try:
                FinanceService.process_dg_direct_validation(depense, self.request.user)
            except Exception as e:
                print(f"Auto-validation DG failed: {e}")
        else:
            # 2. Tentative d'auto-approbation (Workflow Mission)
            try:
                FinanceService.process_auto_approval(depense, self.request.user)
            except Exception as e:
                print(f"Auto-approval failed: {e}")
            
        AuditLog.log_action(
            action_type='create',
            module='finances',
            message=f"Nouvelle demande {depense.numero} créée par {self.request.user.username}",
            utilisateur=self.request.user,
            objet_type='Depense',
            objet_id=str(depense.pk),
            objet_repr=str(depense)
        )
    
    @action(detail=True, methods=['post'])
    def verifier(self, request, pk=None):
        """Action pour vérifier une dépense (comptable)"""
        depense = self.get_object()
        serializer = DepenseActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            FinanceService.verify_depense(
                depense, 
                request.user, 
                serializer.validated_data.get('commentaire', '')
            )
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(DepenseSerializer(depense).data)
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Action pour valider une dépense (DG ou comptable)"""
        depense = self.get_object()
        serializer = DepenseActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            FinanceService.validate_depense(
                depense, 
                request.user, 
                serializer.validated_data.get('commentaire', '')
            )
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(DepenseSerializer(depense).data)
    
    @action(detail=True, methods=['post'])
    def payer(self, request, pk=None):
        """Action pour marquer une dépense comme payée"""
        depense = self.get_object()
        serializer = DepenseActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            FinanceService.pay_depense(
                depense, 
                request.user, 
                serializer.validated_data.get('commentaire', '')
            )
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(DepenseSerializer(depense).data)

    @action(detail=True, methods=['post'])
    def payer_direct(self, request, pk=None):
        """Action 'Express' pour DG : Valide et Paye en une seule fois"""
        depense = self.get_object()
        serializer = DepenseActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            FinanceService.approve_and_pay_depense(
                depense, 
                request.user, 
                serializer.validated_data.get('commentaire', '')
            )
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(DepenseSerializer(depense).data)


    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Action pour rejeter une dépense"""
        depense = self.get_object()
        serializer = DepenseActionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            FinanceService.reject_depense(
                depense, 
                request.user, 
                serializer.validated_data.get('commentaire', '')
            )
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(DepenseSerializer(depense).data)
    
    @action(detail=False, methods=['get'])
    def en_retard(self, request):
        """Liste des dépenses en retard de traitement"""
        if request.user.role not in ['admin', 'comptable', 'dg']:
            return Response(
                {'error': "Permission refusée"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        depenses_retard = Depense.objects.filter(
            statut='en_attente',
            created_at__lt=timezone.now() - timedelta(days=7)
        )
        
        serializer = self.get_serializer(depenses_retard, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Exporter les dépenses en CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="depenses_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Numéro', 'Titre', 'Montant', 'Catégorie', 'Statut', 'Date Création', 'Date Paiement', 'Créé par'])
        
        queryset = self.get_queryset()
        for item in queryset:
            writer.writerow([
                item.numero,
                item.titre,
                item.montant,
                item.get_categorie_display(),
                item.get_statut_display(),
                item.created_at.strftime('%Y-%m-%d %H:%M') if item.created_at else '',
                item.date_paiement.strftime('%Y-%m-%d') if item.date_paiement else '',
                item.created_by.username if item.created_by else ''
            ])
            
        return response
    
    @action(detail=False, methods=['get'])
    def a_valider(self, request):
        """
        Liste des dépenses à valider.
        Param 'type': 'verification' (Comptable) ou 'validation' (DG).
        Si non spécifié, déduit du rôle.
        """
        user = request.user
        request_type = request.query_params.get('type')
        queryset = Depense.objects.none()

        # Déterminer le mode (verification ou validation)
        mode = None
        if request_type:
            mode = request_type
        else:
            if user.role == 'comptable':
                mode = 'verification'
            elif user.role == 'dg':
                mode = 'validation'
            elif user.role == 'admin':
                # Admin par défaut voit tout? Non, le front demandera spécifiquement
                pass

        if mode == 'verification':
             # Dépenses en attente de vérification (Admin ou Comptable)
             if user.role in ['admin', 'comptable']:
                queryset = Depense.objects.filter(statut='en_attente').exclude(created_by=user)
        
        elif mode == 'validation':
            # Dépenses vérifiées nécessitant validation DG (Admin ou DG)
            if user.role in ['admin', 'dg']:
                queryset = Depense.objects.filter(
                    statut='verifiee', 
                    montant__gte=500000
                ).exclude(created_by=user)
        
        elif mode == 'paiement':
            # Dépenses validées prêtes à être payées (Caissier ou Admin)
            if user.role in ['admin', 'caisse']:
                queryset = Depense.objects.filter(statut='validee').exclude(created_by=user)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)