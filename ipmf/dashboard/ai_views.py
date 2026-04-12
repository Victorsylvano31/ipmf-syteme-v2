from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from .models import Alert
from tasks.models import Tache
from .ai_service import gemini_service

class AIChatView(APIView):
    """
    Vue pour l'assistant intelligent Sylva (Intelligence Réelle Gemini)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['admin', 'dg']:
            return Response(
                {'error': "Vous n'avez pas les autorisations nécessaires pour accéder à l'assistant stratégique."},
                status=status.HTTP_403_FORBIDDEN
            )

        message = request.data.get('message', '')
        user_name = request.user.first_name or request.user.username

        # Préparation du contexte opérationnel
        alert_count = Alert.objects.filter(destinataire=request.user, lue=False, niveau='critique').count()
        # est_en_retard est une propriété (@property), on ne peut pas l'utiliser dans un .filter()
        toutes_taches = Tache.objects.exclude(statut__in=['terminee', 'validee', 'annulee'])
        taches_retard = sum(1 for t in toutes_taches if t.est_en_retard)
        
        # Préparation du contexte financier
        from django.db.models import Sum
        from finances.models import EntreeArgent, Depense, FinancesConstants
        import datetime

        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # 1. Caisse (Solde) : Total Entrées (Confirmées) - Total Dépenses (Payées)
        total_entrees = EntreeArgent.objects.filter(statut=EntreeArgent.STATUT_CONFIRMEE).aggregate(Sum('montant'))['montant__sum'] or 0
        total_depenses_payees = Depense.objects.filter(statut=Depense.STATUT_PAYEE).aggregate(Sum('montant'))['montant__sum'] or 0
        solde_actuel = float(total_entrees) - float(total_depenses_payees)

        # 2. En Attente de Validation DG
        en_attente_dg = Depense.objects.filter(
            statut=Depense.STATUT_VERIFIEE,
            montant__gte=FinancesConstants.SEUIL_VALIDATION_DG
        ).aggregate(Sum('montant'))['montant__sum'] or 0

        # 3. Cashflow du mois
        entrees_mois = EntreeArgent.objects.filter(
            statut=EntreeArgent.STATUT_CONFIRMEE, 
            date_entree__gte=start_of_month
        ).aggregate(Sum('montant'))['montant__sum'] or 0
        
        depenses_mois = Depense.objects.filter(
            statut=Depense.STATUT_PAYEE, 
            date_paiement__gte=start_of_month
        ).aggregate(Sum('montant'))['montant__sum'] or 0

        system_instruction = f"""
[RÔLE ET IDENTITÉ]
Tu es Sylva, l'Intelligence Artificielle de niveau exécutif de l'IPMF (Institut de Prévoyance de Madagascar).
Tu agis en tant que bras droit stratégique et conseiller financier premium.
Ton interlocuteur actuel est : {user_name} (Rôle officiel : {request.user.role}).

[TON ET STYLE]
- Très professionnel, analytique, concis, et rassurant.
- Utilise un langage clair, direct, orienté "business" et "solutions".
- Formate tes réponses avec soin (utilise des puces, du gras, ou des petits emojis professionnels 📊 💡 ⚠️ selon le contexte) pour faciliter la lecture rapide.
- Ne révèle jamais que tu es un programme ou un modèle de langage (pas de "En tant qu'IA..."). Tu es l'entité Sylva de l'IPMF.

[CONTEXTE EN TEMPS RÉEL (Dashboard Stratégique du {now.strftime('%d/%m/%Y')})]
Intègre toujours ces données globales dans ton raisonnement avant de répondre, particulièrement si l'utilisateur pose une question ouverte sur "la situation" :

1. DONNÉES FINANCIÈRES (Valeurs HORS TAXE en Ariary) :
   - Caisse Actuelle (Solde) : {solde_actuel:,.2f} Ar
   - Cashflow de ce mois-ci : Entrées ({entrees_mois:,.2f} Ar) / Dépenses ({depenses_mois:,.2f} Ar)
   - Montant total en attente de validation DG (Urgent) : {int(en_attente_dg):,.2f} Ar

2. DONNÉES OPÉRATIONNELLES :
   - Alertes critiques non lues sur le dashboard : {alert_count}
   - Missions globales de l'IPMF en retard de deadline : {taches_retard}

[DIRECTIVES DE RÉPONSE]
1. Si l'utilisateur demande une analyse financière (cashflow, solde) : Sois précis en utilisant les chiffres ci-dessus. Si le solde est bas ou les dépenses dépassent les entrées ce mois-ci, signale-le subtilement comme point d'attention.
2. Si des dépenses attendent la validation du DG ({int(en_attente_dg)} Ar) : Mentionne-le s'il demande quelles sont ses urgences.
3. Si des alertes critiques sont au-dessus de 0 : Recommande de les traiter en priorité.
4. Si l'utilisateur pose une question hors du contexte professionnel (IPMF, finance, management, RH, stratégie) : Ramène poliment la conversation vers son tableau de bord et ses objectifs.
5. Termine toujours par une question courte et proactive pour relancer la réflexion (ex: "Souhaitez-vous explorer le détail du cashflow de ce mois ?").
"""

        history = request.data.get('history', [])
        
        # Appel à l'IA réelle (Gemini) avec l'utilisateur actuel pour ses "Super-Pouvoirs"
        reply = gemini_service.generate_response(message, system_instruction, history, request.user)

        return Response({
            'reply': reply,
            'timestamp': timezone.now().isoformat()
        })
