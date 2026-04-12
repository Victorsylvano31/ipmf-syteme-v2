"""
Script Avancé de génération de données fictives IPMF.
Version "Bien Organisée" : Nettoie l'existant, génère un historique cohérent sur 3 mois
avec des volumes réalistes pour tester les performances du Dashboard.
Exécuter avec : python seed_data.py
"""
import os
import django
import random
from datetime import date, timedelta, datetime
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ipmf.settings')
django.setup()

from django.db import connection as dbconn
from django.contrib.auth import get_user_model
from tasks.models import Tache, CommentaireTache, SousTache
from finances.models import EntreeArgent, Depense

User = get_user_model()

print("🧹 1. Nettoyage de la base de données existante...")
# Désactiver les contraintes temporairement pour le nettoyage
with dbconn.cursor() as cur:
    cur.execute("PRAGMA ignore_check_constraints=ON")
    # Ordre de suppression pour éviter les erreurs de clés étrangères
    CommentaireTache.objects.all().delete()
    SousTache.objects.all().delete()
    Depense.objects.all().delete()
    EntreeArgent.objects.all().delete()
    Tache.objects.all().delete()
    # On garde les utilisateurs existants !

print("👤 2. Récupération des utilisateurs clés...")
dg = User.objects.filter(role='dg').first()
comptable = User.objects.filter(role='comptable').first()
caisser = User.objects.filter(role='caisse').first()
admin = User.objects.filter(role='admin').first()
agents = list(User.objects.filter(role='agent'))

if not all([dg, comptable, caisser, agents]):
    print("❌ Erreur: Les utilisateurs de base sont introuvables. Lancez le premier seed d'abord.")
    exit(1)

# --- GÉNÉRATEURS DE TEXTE RÉALISTES ---
M_PROJETS = [
    ("Construction Puits Sud", "Déploiement de 3 infrastructures d'eau potable dans les villages du sud."),
    ("Campagne Vaccination 2026", "Coordination avec le ministère pour la vaccination rurale (T1 2026)."),
    ("Mise à niveau Parc Informatique", "Renouvellement de 15 postes de travail et serveurs locaux."),
    ("Audit Financier Externe", "Préparation des documents comptables pour l'audit annuel du cabinet PwC."),
    ("Recrutement Agents Terrain", "Processus de recrutement et formation pour 5 nouveaux agents."),
    ("Aménagement Nouveaux Locaux", "Installation du nouveau bureau régional à Majunga."),
    ("Programme Nutrition Scolaire", "Logistique de distribution des vivres pour 5 écoles partenaires."),
    ("Sécurisation Réseau IPMF", "Installation de pare-feux matériels et formation cybersécurité de l'équipe.")
]

# ============================================================
# 3. GÉNÉRATION DES TÂCHES (HISTORISÉES)
# ============================================================
print("📋 3. Génération de 25 Tâches structurées...")
taches_creees = []

# Génération répartie sur les 90 derniers jours
for i in range(25):
    # Logique chronologique (tâches anciennes terminées, tâches récentes en cours)
    jours_passes = random.randint(5, 90)
    date_creation = datetime.now() - timedelta(days=jours_passes)
    date_debut = date_creation + timedelta(days=random.randint(1, 3))
    duree = random.randint(5, 25)
    date_echeance = date_debut + timedelta(days=duree)
    
    # Choix du statut basé sur la date d'échéance
    if date_echeance < datetime.now():
        statut = random.choices(['terminee', 'annulee'], weights=[90, 10])[0]
    else:
        statut = random.choices(['creee', 'en_cours'], weights=[30, 70])[0]
        
    priorite = random.choices(['basse', 'normale', 'haute', 'urgente'], weights=[10, 50, 30, 10])[0]
    projet = random.choice(M_PROJETS)
    
    t = Tache(
        numero=f"TSK-2026-{i+1:03d}",
        titre=f"{projet[0]} - Phase {random.randint(1,4)}",
        description=f"{projet[1]}\nLivrable attendu : Validation des étapes intermédiaires avec les parties prenantes.",
        statut=statut,
        priorite=priorite,
        date_echeance=date_echeance,
        createur=dg if random.random() > 0.5 else admin
    )
    t.save()
    # On modifie manuellement la date de création
    Tache.objects.filter(id=t.id).update(date_creation=date_creation, date_debut=date_debut)
    
    # Assigner des agents
    nb_agents = random.randint(1, min(3, len(agents)))
    t.agents_assignes.set(random.sample(agents, nb_agents))
    
    # Créer 2 à 4 sous-tâches
    for st_idx in range(random.randint(2, 4)):
        est_term = (statut == 'terminee') or (random.random() > 0.5)
        SousTache.objects.create(tache=t, titre=f"Livrable technique {st_idx+1}", est_terminee=est_term)
        
    # Ajouter des commentaires réalistes
    messages = [
        "Dossier reçu, on commence l'analyse.", 
        "Il manque des pièces justificatives du fournisseur.",
        "Le client a demandé un délai supplémentaire de 2 jours.",
        "Validation technique OK, je passe à la suite.",
        "Attention, léger dépassement de budget prévu sur cette ligne."
    ]
    if statut in ['en_cours', 'terminee']:
        for _ in range(random.randint(1, 3)):
            CommentaireTache.objects.create(tache=t, auteur=random.choice(agents), message=random.choice(messages))
            
    taches_creees.append(t)

# ============================================================
# 4. GÉNÉRATION DES FINANCES (DÉPENSES & ENTRÉES)
# ============================================================
print("💰 4. Génération du flux financier (Entrées & Dépenses)...")

with dbconn.cursor() as cur:
    cur.execute("PRAGMA ignore_check_constraints=ON")

# --- 4.1 Entrées d'Argent (Subventions, Dons, Ventes) ---
M_ENTREES = [
    ("Subvention Ministère", Decimal('15000000.00'), 'Ministère', 'virement'),
    ("Donateur Privé Anonyme", Decimal('2500000.00'), 'Dons', 'virement'),
    ("Fonds de roulement Q1", Decimal('8000000.00'), 'Siège Central', 'virement'),
    ("Cotisation Partenaires", Decimal('450000.00'), 'Partenaires', 'especes'),
    ("Vente d'anciens matériels", Decimal('1200000.00'), 'Ventes Diverses', 'cheque'),
    ("Aide humanitaire BM", Decimal('25000000.00'), 'Banque Mondiale', 'virement'),
    ("Recouvrement frais avancés", Decimal('320000.00'), 'Clients', 'especes'),
]

for _ in range(15):
    jours_passes = random.randint(1, 90)
    source = random.choice(M_ENTREES)
    montant_varie = (source[1] * Decimal(str(random.uniform(0.8, 1.2)))).quantize(Decimal('0.01'))
    statut = 'confirmee' if jours_passes > 10 else random.choice(['en_attente', 'confirmee'])
    e = EntreeArgent(
        motif=f"{source[0]} - Réf {random.randint(100, 999)}",
        montant=montant_varie,
        statut=statut,
        date_entree=date.today() - timedelta(days=jours_passes),
        mode_paiement=source[3],
        created_by=comptable
    )
    e.save()

# --- 4.2 Dépenses associées aux Tâches ---
M_DEPENSES = [
    ("Achat Fournitures Bureau", Decimal('150000.00')),
    ("Frais de Carburant (Mission)", Decimal('250000.00')),
    ("Perdiem Agents Terrain", Decimal('450000.00')),
    ("Facture Internet FAI", Decimal('200000.00')),
    ("Achat Matériel Informatique", Decimal('1200000.00')),
    ("Loyer Mensuel Locaux", Decimal('800000.00')),
    ("Frais Réparation Véhicule", Decimal('345000.00')),
    ("Achat Cartouches d'encre", Decimal('90000.00')),
    ("Frais Hébergement Mission", Decimal('180000.00')),
    ("Consultation Expert Externe", Decimal('2500000.00'))
]

for i in range(40):
    jours_passes = random.randint(1, 90)
    date_d = date.today() - timedelta(days=jours_passes)
    base_dep = random.choice(M_DEPENSES)
    montant = (base_dep[1] * Decimal(str(random.uniform(0.9, 1.1)))).quantize(Decimal('0.01'))
    
    # Évolution de statut logique
    if jours_passes > 30:
        statut = 'payee'
    elif jours_passes > 15:
        statut = random.choices(['payee', 'validee'], weights=[80, 20])[0]
    elif jours_passes > 5:
        statut = random.choices(['payee', 'validee', 'verifiee'], weights=[40, 30, 30])[0]
    else:
        statut = random.choices(['en_attente', 'verifiee', 'rejetee'], weights=[50, 40, 10])[0]
        
    tache_associee = random.choices([random.choice(taches_creees), None], weights=[70, 30])[0]
    
    d = Depense(
        motif=f"{base_dep[0]} - Lot {random.randint(10, 99)}",
        montant=montant,
        prix_unitaire=montant,
        quantite=1,
        statut=statut,
        date_paiement=date_d if statut == 'payee' else None,
        created_by=random.choice(agents),
        tache=tache_associee,
        verifie_par=comptable if statut in ['verifiee', 'validee', 'payee'] else None,
        valide_par_comptable=comptable if statut in ['validee', 'payee'] else None,
        valide_par_dg=dg if statut in ['validee', 'payee'] else None
    )
    d.save()
    # Forcer la vraie date de dépense (created_at fallback si possible, ou on laisse django gerer)
    Depense.objects.filter(id=d.id).update(created_at=datetime.now() - timedelta(days=jours_passes))

print("\n" + "="*60)
print("🎉 BASE DE DONNÉES PARFAITEMENT ORGANISÉE !")
print("="*60)
print(f"📊 Dashboard Statistiques :")
print(f"  📋 {Tache.objects.count()} Tâches structurées créées (avec sous-tâches/commentaires)")
print(f"  💰 {EntreeArgent.objects.count()} Entrées d'Argent générées (sur 3 mois)")
print(f"  🧾 {Depense.objects.count()} Dépenses catégorisées générées (avec flux de validation)")
print("\n💡 Tout est prêt ! Testez immédiatement votre Dashboard IPFM.")
