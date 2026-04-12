"""
Module Étudiants - Vues API
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date

from .models import Formation, Etudiant, PaiementFrais
from .serializers import (
    FormationSerializer,
    EtudiantListSerializer,
    EtudiantDetailSerializer,
    EtudiantCreateSerializer,
    PaiementFraisSerializer,
    PaiementEnregistrerSerializer,
)


class FormationViewSet(viewsets.ModelViewSet):
    """CRUD pour les formations."""
    queryset = Formation.objects.all()
    serializer_class = FormationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('active_only'):
            qs = qs.filter(is_active=True)
        return qs


class EtudiantViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les étudiants.
    - Liste: GET /api/students/etudiants/
    - Détail: GET /api/students/etudiants/{id}/
    - Création: POST /api/students/etudiants/
    - Mise à jour: PUT/PATCH /api/students/etudiants/{id}/
    - Stats: GET /api/students/etudiants/stats/
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['formation', 'annee_scolaire', 'promotion', 'statut', 'sexe']
    search_fields = ['nom', 'prenom', 'numero_inscription', 'telephone', 'cin']
    ordering_fields = ['created_at', 'nom', 'prenom', 'montant_total_frais']
    ordering = ['-created_at']

    def get_queryset(self):
        return Etudiant.objects.select_related('formation', 'created_by').prefetch_related('paiements')

    def get_serializer_class(self):
        if self.action == 'list':
            return EtudiantListSerializer
        if self.action == 'create':
            return EtudiantCreateSerializer
        return EtudiantDetailSerializer

    def perform_create(self, serializer):
        serializer.save()

    def check_permissions(self, request):
        """Seuls admin et caisse peuvent créer/modifier des étudiants."""
        super().check_permissions(request)
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            if request.user.role not in ['admin', 'caisse', 'dg']:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Seuls l'administrateur, le directeur et le caissier peuvent modifier les étudiants.")

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques globales des étudiants pour le tableau de bord."""
        qs = self.get_queryset()
        total = qs.count()
        actifs = qs.filter(statut='actif').count()
        suspendus = qs.filter(statut='suspendu').count()
        diplomes = qs.filter(statut='diplome').count()
        abandonnes = qs.filter(statut='abandonne').count()

        # Répartition par sexe
        repartition_sexe = {
            'M': qs.filter(sexe='M').count(),
            'F': qs.filter(sexe='F').count(),
        }

        # Compter les statuts de paiement
        today = date.today()
        etudiants = qs.filter(statut='actif')
        
        solde = 0
        en_retard = 0
        en_cours = 0
        frais_total_attendu = 0
        frais_total_encaisse = 0

        # Par formation statistics
        par_formation = {}

        for e in etudiants:
            frais_total_attendu += e.montant_total_frais
            frais_total_encaisse += e.montant_paye

            # Statut paiement
            sp = e.statut_paiement
            if sp == 'solde':
                solde += 1
            elif sp == 'en_retard':
                en_retard += 1
            else:
                en_cours += 1

            # Stats par formation
            form_nom = e.formation.nom
            if form_nom not in par_formation:
                par_formation[form_nom] = {
                    "nom": form_nom,
                    "count": 0,
                    "frais_total": 0,
                    "frais_paye": 0
                }
            
            par_formation[form_nom]["count"] += 1
            par_formation[form_nom]["frais_total"] += float(e.montant_total_frais)
            par_formation[form_nom]["frais_paye"] += float(e.montant_paye)

        # Calcul taux recouvrement global
        taux_recouvrement = 0
        if frais_total_attendu > 0:
            taux_recouvrement = round((float(frais_total_encaisse) / float(frais_total_attendu)) * 100, 1)

        # Recouvrements du mois
        from django.db.models import Sum
        from datetime import datetime
        debut_mois = today.replace(day=1)
        recouvrements_mois = PaiementFrais.objects.filter(
            date_paiement__gte=debut_mois,
            statut__in=['paye', 'partiel']
        ).aggregate(total=Sum('montant_paye'))['total'] or 0

        import calendar
        inscriptions_mensuelles = []

        current_year = today.year
        current_month = today.month

        for i in range(5, -1, -1):
            target_month = current_month - i
            target_year = current_year
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            from datetime import date as dt_date
            start_of_month = dt_date(target_year, target_month, 1)
            _, last_day = calendar.monthrange(target_year, target_month)
            end_of_month = dt_date(target_year, target_month, last_day)
            
            count = qs.filter(date_inscription__gte=start_of_month, date_inscription__lte=end_of_month).count()
            
            mois_nom = calendar.month_abbr[target_month] # Jan, Feb, etc.
            inscriptions_mensuelles.append({
                "mois": f"{mois_nom} {target_year % 100}",
                "count": count
            })

        return Response({
            'total_etudiants': total,
            'etudiants_actifs': actifs,
            'etudiants_suspendus': suspendus,
            'etudiants_diplomes': diplomes,
            'etudiants_abandonnes': abandonnes,
            'paiements_soldes': solde,
            'paiements_en_retard': en_retard,
            'paiements_en_cours': en_cours,
            'recouvrements_mois': float(recouvrements_mois),
            'repartition_sexe': repartition_sexe,
            'par_formation': list(par_formation.values()),
            'revenus_financiers': {
                'frais_total_attendu': float(frais_total_attendu),
                'frais_total_encaisse': float(frais_total_encaisse),
                'taux_recouvrement': taux_recouvrement
            },
            'inscriptions_mensuelles': inscriptions_mensuelles
        })


class PaiementFraisViewSet(viewsets.ModelViewSet):
    """
    Gestion des paiements de frais.
    - Liste par étudiant: GET /api/students/paiements/?etudiant={id}
    - Enregistrer: POST /api/students/paiements/{id}/enregistrer_paiement/
    """
    queryset = PaiementFrais.objects.select_related('etudiant', 'recu_par')
    serializer_class = PaiementFraisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['etudiant', 'statut', 'numero_tranche']
    ordering = ['numero_tranche']

    def check_permissions(self, request):
        """Seuls admin et caisse peuvent enregistrer des paiements."""
        super().check_permissions(request)
        if request.method in ['POST', 'PUT', 'PATCH']:
            if request.user.role not in ['admin', 'caisse', 'dg']:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Seuls l'administrateur, le directeur et le caissier peuvent enregistrer des paiements.")

    @action(detail=True, methods=['post'])
    def enregistrer_paiement(self, request, pk=None):
        """Enregistrer un paiement pour une tranche donnée."""
        paiement = self.get_object()

        serializer = PaiementEnregistrerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        montant = data['montant']
        paiement.montant_paye = montant
        paiement.mode_paiement = data['mode_paiement']
        paiement.reference = data.get('reference', '')
        paiement.observations = data.get('observations', '')
        paiement.date_paiement = data.get('date_paiement', date.today())
        paiement.recu_par = request.user

        # Déterminer le statut
        if montant >= paiement.montant_prevu:
            paiement.statut = 'paye'
        elif montant > 0:
            paiement.statut = 'partiel'

        paiement.save()

        # ── Synchronisation avec la caisse principale ──────────────────────────
        try:
            from finances.models import EntreeArgent
            from datetime import date as dt

            # Mapping des modes de paiement students → finances
            MODE_MAP = {
                'especes':      'especes',
                'virement':     'virement',
                'cheque':       'cheque',
                'mobile_money': 'mobile',
            }
            mode_entree = MODE_MAP.get(paiement.mode_paiement, 'especes')

            motif = (
                f"Frais de formation – {paiement.etudiant.nom_complet} "
                f"({paiement.etudiant.formation}) – "
                f"Tranche {paiement.numero_tranche}/{paiement.etudiant.nombre_tranches}"
            )

            entree = EntreeArgent(
                montant=paiement.montant_paye,
                motif=motif[:200],
                mode_paiement=mode_entree,
                date_entree=paiement.date_paiement or dt.today(),
                created_by=request.user,
                statut=EntreeArgent.STATUT_CONFIRMEE,
                commentaire=f"Synchronisation automatique – N° inscription : {paiement.etudiant.numero_inscription}",
            )
            entree.assign_numero_if_missing()
            # bypass full_clean pour éviter la validation de date future
            from django.db.models import Model
            Model.save(entree)
        except Exception as sync_err:
            # La synchro ne doit jamais bloquer le paiement principal
            import logging
            logging.getLogger(__name__).warning(
                f"Sync finances failed for paiement {paiement.id}: {sync_err}"
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(
            PaiementFraisSerializer(paiement).data,
            status=status.HTTP_200_OK
        )
