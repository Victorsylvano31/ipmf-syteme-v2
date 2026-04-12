from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta, datetime
from finances.models import EntreeArgent, Depense
from tasks.models import Tache
from users.models import CustomUser
from .models import Alert

class DashboardService:
    """Service pour le calcul des données du dashboard"""
    
    @staticmethod
    def get_dg_dashboard_data(user):
        """Données du dashboard stratégique pour le Directeur Général"""
        if user.role != 'dg':
            return {'error': 'Accès non autorisé'}
        
        try:
            now = timezone.now()
            debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            fin_mois = (debut_mois + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            # Mois précédent pour calcul de tendance
            debut_mois_prec = (debut_mois - timedelta(days=1)).replace(day=1)
            fin_mois_prec = debut_mois - timedelta(seconds=1)

            # --- 1. KPIs & TRENDS ---
            # Entrées (Réalité : Confirmées)
            entrees_mois = float(EntreeArgent.objects.filter(date_entree__range=[debut_mois, fin_mois], statut='confirmee').aggregate(Sum('montant'))['montant__sum'] or 0)
            entrees_prec = float(EntreeArgent.objects.filter(date_entree__range=[debut_mois_prec, fin_mois_prec], statut='confirmee').aggregate(Sum('montant'))['montant__sum'] or 0)
            
            # Dépenses (Réalité : Payées - Impact sur la trésorerie)
            depenses_mois = float(Depense.objects.filter(date_paiement__range=[debut_mois, fin_mois], statut='payee').aggregate(Sum('montant'))['montant__sum'] or 0)
            depenses_prec = float(Depense.objects.filter(date_paiement__range=[debut_mois_prec, fin_mois_prec], statut='payee').aggregate(Sum('montant'))['montant__sum'] or 0)
            
            # Tâches (Missions)
            missions_actives = int(Tache.objects.filter(statut__in=['creee', 'en_cours']).count())
            missions_prec = int(Tache.objects.filter(date_creation__range=[debut_mois_prec, fin_mois_prec]).count())

            def calc_trend(current, previous):
                if not previous or previous == 0: return 0
                return round(((current - previous) / previous) * 100, 1)

            # --- 2. SPARKLINE DATA (Last 30 days) ---
            sparklines = {
                'depenses': [],
                'entrees': []
            }
            for i in range(30, -1, -1):
                date_point = (now - timedelta(days=i)).date()
                sparklines['depenses'].append({
                    'date': date_point.strftime('%d/%m'),
                    'valeur': float(Depense.objects.filter(date_paiement__date=date_point, statut='payee').aggregate(Sum('montant'))['montant__sum'] or 0)
                })
                sparklines['entrees'].append({
                    'date': date_point.strftime('%d/%m'),
                    'valeur': float(EntreeArgent.objects.filter(date_entree=date_point, statut='confirmee').aggregate(Sum('montant'))['montant__sum'] or 0)
                })

            # --- 3. MISSIONS BUDGET ANALYSIS (Consommation budgétaire = Validé + Payé) ---
            missions_budget = []
            # On ne montre au DG que les missions réellement "en cours" (non terminées)
            active_taches = Tache.objects.filter(statut__in=['creee', 'en_cours'])[:5]
            for t in active_taches:
                # Pour le budget, on compte tout ce qui est validé (engagé) + payé
                spent = float(Depense.objects.filter(tache=t, statut__in=['payee', 'validee']).aggregate(Sum('montant'))['montant__sum'] or 0)
                budget = float(t.budget_alloue or 1)
                percent = round((spent / budget) * 100, 1)
                missions_budget.append({
                    'id': t.id,
                    'numero': t.numero,
                    'titre': t.titre,
                    'budget': budget,
                    'spent': spent,
                    'percent': percent,
                    'status': 'warning' if percent > 90 else 'success'
                })

            # Strategic alerts logic
            alerts = []
            # Retard critique
            retards = Tache.objects.filter(
                date_echeance__lt=now, 
                statut__in=['creee', 'en_cours']
            ).count()
            if retards > 0:
                alerts.append({
                    'type': 'danger',
                    'title': f'{retards} Missions en retard',
                    'description': 'Risque de pénalités ou blocage opérationnel.',
                    'action': '/tasks'
                })
            
            # Dépassement budget mission
            overbudgets = [m for m in missions_budget if m['percent'] > 100]
            if overbudgets:
                alerts.append({
                    'type': 'warning',
                    'title': 'Dépassement de budget',
                    'description': f'{len(overbudgets)} mission(s) ont dépassé leur budget alloué.',
                    'action': '/finances/analytics'
                })

            # --- 5. ACTIVITY FEED ---
            recent_activity = []
            latest_tasks = Tache.objects.order_by('-date_creation')[:3]
            for lt in latest_tasks:
                recent_activity.append({
                    'type': 'task',
                    'title': lt.titre,
                    'subtitle': f'Mission {lt.numero}',
                    'status': lt.statut,
                    'time': lt.date_creation.isoformat() if lt.date_creation else None
                })
            
            latest_depenses = Depense.objects.order_by('-created_at')[:3]
            for ld in latest_depenses:
                recent_activity.append({
                    'type': 'expense',
                    'title': ld.motif,
                    'subtitle': f'Dépense {ld.numero} - {float(ld.montant):,.0f} Ar',
                    'status': ld.statut,
                    'time': ld.created_at.isoformat() if ld.created_at else None
                })
            recent_activity.sort(key=lambda x: x['time'] or '', reverse=True)

            return {
                'kpis': [
                    {
                        'label': 'Missions en cours',
                        'value': missions_actives,
                        'trend': calc_trend(missions_actives, missions_prec),
                        'sparkline': sparklines['depenses'],
                        'color': 'blue'
                    },
                    {
                        'label': 'Dépenses (Mois)',
                        'value': f"{depenses_mois:,.0f} Ar".replace(',', ' '),
                        'trend': calc_trend(depenses_mois, depenses_prec),
                        'sparkline': sparklines['depenses'],
                        'color': 'orange'
                    },
                    {
                        'label': 'Trésorerie',
                        'value': f"{(entrees_mois - depenses_mois):,.0f} Ar".replace(',', ' '),
                        'trend': calc_trend(entrees_mois - depenses_mois, entrees_prec - depenses_prec),
                        'sparkline': sparklines['entrees'],
                        'color': 'emerald'
                    },
                    {
                        'label': 'Marge Bénéficiaire',
                        'value': f"{((entrees_mois - depenses_mois) / entrees_mois * 100 if entrees_mois > 0 else 0):.1f}%",
                        'trend': calc_trend(
                            (entrees_mois - depenses_mois) / entrees_mois * 100 if entrees_mois > 0 else 0,
                            (entrees_prec - depenses_prec) / entrees_prec * 100 if entrees_prec > 0 else 0
                        ),
                        'sparkline': None,
                        'color': 'indigo'
                    },
                ],
                'charts': {
                    'budget_distribution': missions_budget,
                    'cashflow_history': sparklines['entrees']
                },
                'strategic_alerts': alerts,
                'recent_activity': recent_activity[:5]
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'error': str(e)}
    
    @staticmethod
    def get_agent_dashboard_data(user):
        """Données du dashboard pour les Agents"""
        now = timezone.now()
        debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Mes demandes de dépenses
        mes_demandes = Depense.objects.filter(created_by=user).aggregate(
            total=Count('id'),
            en_attente=Count('id', filter=Q(statut='en_attente')),
            validees=Count('id', filter=Q(statut__in=['validee', 'payee'])),
            rejetees=Count('id', filter=Q(statut='rejetee'))
        )
        
        # Mes tâches
        mes_taches = Tache.objects.filter(agents_assignes=user).aggregate(
            total=Count('id'),
            en_cours=Count('id', filter=Q(statut='en_cours')),
            terminees=Count('id', filter=Q(statut='terminee')),
            validees=Count('id', filter=Q(statut='validee')),
            en_retard=Count('id', filter=Q(date_echeance__lt=now, statut__in=['creee', 'en_cours']))
        )
        
        # Dépenses du mois
        mes_depenses_mois = float(Depense.objects.filter(
            created_by=user,
            date_paiement__gte=debut_mois,
            statut='payee'
        ).aggregate(total=Sum('montant'))['total'] or 0)
        
        # --- 2. SPARKLINE DATA (Last 30 days) ---
        sparkline_tasks = []
        for i in range(30, -1, -1):
            date_point = (now - timedelta(days=i)).date()
            sparkline_tasks.append({
                'date': date_point.strftime('%d/%m'),
                'valeur': Tache.objects.filter(agents_assignes=user, date_creation__date=date_point).count()
            })

        # Alerte si retard
        alerts = []
        if mes_taches['en_retard'] > 0:
            alerts.append({
                'type': 'danger',
                'title': 'Missions en retard',
                'description': f"Vous avez {mes_taches['en_retard']} mission(s) dépassant l'échéance.",
                'action': '/tasks'
            })

        return {
            'kpis': [
                {
                    'label': 'Mes Missions',
                    'value': f"{mes_taches['en_cours']} en cours",
                    'trend': 100 if mes_taches['total'] > 0 else 0,
                    'sparkline': sparkline_tasks,
                    'color': 'blue'
                },
                {
                    'label': 'Accomplissement',
                    'value': f"{((mes_taches['terminees'] + mes_taches['validees']) / mes_taches['total'] * 100 if mes_taches['total'] > 0 else 0):.1f}%",
                    'trend': 0,
                    'sparkline': None,
                    'color': 'emerald'
                },
                {
                    'label': 'Dépenses Perso (Mois)',
                    'value': f"{mes_depenses_mois:,.0f} Ar".replace(',', ' '),
                    'trend': 0,
                    'sparkline': None,
                    'color': 'orange'
                }
            ],
            'recent_activity': list(Tache.objects.filter(agents_assignes=user).order_by('-date_creation')[:5].values(
                'id', 'numero', 'titre', 'statut', 'date_creation'
            )),
            'strategic_alerts': alerts
        }
    
    @staticmethod
    def get_comptable_dashboard_data(user):
        """Données du dashboard pour le Comptable"""
        if user.role != 'comptable':
            return {'error': 'Accès non autorisé'}
        
        now = timezone.now()
        debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Dépenses à vérifier
        a_verifier = Depense.objects.filter(statut='en_attente').count()
        # Entrées du mois
        entrees_mois = float(EntreeArgent.objects.filter(date_entree__gte=debut_mois, statut='confirmee').aggregate(Sum('montant'))['montant__sum'] or 0)
        # Paiements du mois
        paye_mois = float(Depense.objects.filter(date_paiement__gte=debut_mois, statut='payee').aggregate(Sum('montant'))['montant__sum'] or 0)
        
        return {
            'kpis': [
                {
                    'label': 'À Vérifier',
                    'value': a_verifier,
                    'trend': 0,
                    'sparkline': None,
                    'color': 'orange'
                },
                {
                    'label': 'Recettes (Mois)',
                    'value': f"{entrees_mois:,.0f} Ar".replace(',', ' '),
                    'trend': 0,
                    'sparkline': None,
                    'color': 'emerald'
                },
                {
                    'label': 'Décaissements (Mois)',
                    'value': f"{paye_mois:,.0f} Ar".replace(',', ' '),
                    'trend': 0,
                    'sparkline': None,
                    'color': 'blue'
                }
            ],
            'strategic_alerts': [
                {
                    'type': 'warning',
                    'title': f'{a_verifier} Demandes en attente',
                    'description': 'Verification de conformité requise.',
                    'action': '/expenses'
                }
            ] if a_verifier > 0 else [],
            'recent_activity': list(Depense.objects.filter(statut='en_attente').order_by('-created_at')[:5].values(
                'id', 'numero', 'motif', 'montant', 'statut', 'created_at'
            ))
        }

    @staticmethod
    def get_caisse_dashboard_data(user):
        """Données pour le Responsable Caisse"""
        if user.role != 'caisse':
            return {'error': 'Accès non autorisé'}
        
        # Paiements à effectuer
        a_payer_qs = Depense.objects.filter(statut='validee')
        count_a_payer = a_payer_qs.count()
        montant_a_payer = float(a_payer_qs.aggregate(Sum('montant'))['montant__sum'] or 0)
        
        # Entrées du jour
        aujourdhui = timezone.now().date()
        entrees_jour = float(EntreeArgent.objects.filter(date_entree=aujourdhui, statut='confirmee').aggregate(Sum('montant'))['montant__sum'] or 0)
        
        # Décaissements du mois (Dépenses payées ce mois-ci)
        debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        decaissements_mois = float(Depense.objects.filter(date_paiement__gte=debut_mois, statut='payee').aggregate(Sum('montant'))['montant__sum'] or 0)
        
        return {
            'kpis': [
                {
                    'label': 'À Payer (En attente)',
                    'value': f"{montant_a_payer:,.0f} Ar".replace(',', ' '),
                    'trend': 0,
                    'sparkline': None,
                    'color': 'orange'
                },
                {
                    'label': 'Décaissements du Mois',
                    'value': f"{decaissements_mois:,.0f} Ar".replace(',', ' '),
                    'trend': 0,
                    'sparkline': None,
                    'color': 'blue'
                },
                {
                    'label': 'Recettes du Jour',
                    'value': f"{entrees_jour:,.0f} Ar".replace(',', ' '),
                    'trend': 0,
                    'sparkline': None,
                    'color': 'emerald'
                }
            ],
            'strategic_alerts': [
                {
                    'type': 'danger',
                    'title': 'Ordres de paiement actifs',
                    'description': f'Vous avez {count_a_payer} paiements validés à effectuer.',
                    'action': '/expenses'
                }
            ] if count_a_payer > 0 else [],
            'recent_activity': list(a_payer_qs.order_by('-updated_at')[:5].values(
                'id', 'numero', 'motif', 'montant', 'statut', 'updated_at'
            ))
        }

class AlertService:
    """Service pour la gestion des alertes"""
    
    @staticmethod
    def check_depenses_retard():
        """Vérifie les dépenses en retard et crée des alertes"""
        from datetime import timedelta
        from django.utils import timezone
        
        depenses_retard = Depense.objects.filter(
            statut='en_attente',
            created_at__lt=timezone.now() - timedelta(days=7)
        )
        
        for depense in depenses_retard:
            # Créer une alerte pour le comptable
            Alert.creer_alerte(
                type_alerte='depense_attente',
                titre=f"Dépense en retard - {depense.numero}",
                message=f"La dépense {depense.numero} ({depense.montant:,} Ar) est en attente depuis plus de 7 jours",
                destinataire=CustomUser.objects.filter(role='comptable').first(),
                niveau='moyen',
                lien_objet=f"/expenses/{depense.id}",
                donnees_contexte={'depense_id': depense.id, 'delai_jours': depense.delai_attente}
            )
    
    @staticmethod
    def check_taches_retard():
        """Vérifie les tâches en retard et crée des alertes"""
        t_now = timezone.now()
        taches_retard = Tache.objects.filter(
            date_echeance__lt=t_now, 
            statut__in=['creee', 'en_cours']
        )
        
        for tache in taches_retard:
            # Alerte pour chaque agent assigné
            for agent in tache.agents_assignes.all():
                Alert.creer_alerte(
                    type_alerte='tache_retard',
                    titre=f"Tâche en retard - {tache.numero}",
                    message=f"La tâche '{tache.titre}' est en retard de {abs(tache.jours_restants)} jours",
                    destinataire=agent,
                    niveau='eleve',
                    lien_objet=f"/tasks/{tache.id}",
                    donnees_contexte={'tache_id': tache.id, 'jours_retard': abs(tache.jours_restants)}
                )
            
            # Alerte pour le DG
            dg = CustomUser.objects.filter(role='dg').first()
            if dg:
                agents_names = ", ".join([a.get_full_name() for a in tache.agents_assignes.all()])
                Alert.creer_alerte(
                    type_alerte='tache_retard',
                    titre=f"Tâche en retard - {tache.numero}",
                    message=f"La tâche '{tache.titre}' assignée à {agents_names} est en retard",
                    destinataire=dg,
                    niveau='moyen',
                    lien_objet=f"/tasks/{tache.id}",
                    donnees_contexte={'tache_id': tache.id, 'agents': agents_names}
                )
