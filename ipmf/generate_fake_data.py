import os
import django
import sys
import random
from datetime import timedelta, datetime
from decimal import Decimal
from django.utils import timezone

# Configuration de l'environnement Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ipmf.settings")
django.setup()

from users.models import CustomUser
from tasks.models import Tache, SousTache, DemandeReport
from finances.models import EntreeArgent, Depense, SequenceCounter

def delete_existing_data():
    """Supprime les données existantes pour repartir de zéro"""
    print("Nettoyage de la base de données...")
    # Supprimer dans le bon ordre pour les contraintes FK
    DemandeReport.objects.all().delete()
    Depense.objects.all().delete()
    EntreeArgent.objects.all().delete()
    Tache.objects.all().delete()
    # Supprimer les utilisateurs non-admins
    CustomUser.objects.filter(is_superuser=False, is_staff=False).delete()
    SequenceCounter.objects.all().delete()

def create_users():
    print("Création des utilisateurs...")
    roles = [
        ('dg', 'Directeur', 'General'),
        ('comptable', 'Jean', 'Comptable'),
        ('caisse', 'Marie', 'Caisse'),
        ('agent', 'Sylvain', 'Agent'),
        ('agent', 'Alice', 'Agent'),
        ('agent', 'Bob', 'Agent'),
    ]
    
    users = []
    # Assurer qu'il y a un admin
    admin, _ = CustomUser.objects.get_or_create(
        username='admin',
        defaults={
            'first_name': 'Admin',
            'last_name': 'Systeme',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin.set_password('admin123')
    admin.save()
    users.append(admin)

    for role, first, last in roles:
        username = f"{first.lower()}_{role}"
        user, created = CustomUser.objects.get_or_create(
            username=username,
            defaults={
                'first_name': first,
                'last_name': last,
                'role': role,
                'email': f"{username}@ipmf.mg",
                'telephone': f"+2613400000{random.randint(10,99)}"
            }
        )
        if created:
            user.set_password('password123')
            user.save()
        users.append(user)
    
    return users

def create_tasks(users):
    print("Génération des tâches...")
    admins_dgs = [u for u in users if u.role in ['admin', 'dg']]
    agents = [u for u in users if u.role == 'agent']
    
    titres = [
        "Audit financier Q1", "Maintenance serveurs", "Rapport RH annuel",
        "Inventaire stock bureau", "Formation nouveaux agents", "Mise à jour site web",
        "Préparation CA", "Archivage dossiers 2025", "Planification budget 2027",
        "Révision contrats prestataires"
    ]
    
    taches_creees = []
    for i in range(50):
        createur = random.choice(admins_dgs)
        jours_offset = random.randint(-30, 0)
        date_creation = timezone.now() + timedelta(days=jours_offset)
        date_echeance = date_creation + timedelta(days=random.randint(5, 20))
        
        t = Tache.objects.create(
            titre=random.choice(titres) + f" #{i+1}",
            description=f"Description détaillée pour la tâche {i+1}. Objectifs et livrables clairs.",
            date_echeance=date_echeance,
            priorite=random.choice(['basse', 'moyenne', 'haute', 'urgente']),
            statut=random.choice(['creee', 'en_cours', 'terminee', 'validee']),
            createur=createur,
            budget_alloue=Decimal(random.randint(50000, 2000000))
        )
        
        # Assigner des agents
        num_agents = random.randint(1, 2)
        assigned = random.sample(agents, num_agents)
        t.agents_assignes.set(assigned)
        
        # Forcer la date de création
        Tache.objects.filter(id=t.id).update(date_creation=date_creation)

        # Sous-tâches
        for j in range(random.randint(2, 4)):
            SousTache.objects.create(
                tache=t,
                titre=f"Sous-étape {j+1} de {t.titre}",
                est_terminee=random.choice([True, False]),
                assigne_a=random.choice(assigned)
            )
        
        taches_creees.append(t)
    return taches_creees

def create_finances(users, tasks):
    print("Génération des flux financiers...")
    caisse_users = [u for u in users if u.role in ['caisse', 'admin']]
    comptables = [u for u in users if u.role in ['comptable', 'admin']]
    dgs = [u for u in users if u.role == 'dg']
    
    # Entrées d'argent
    motifs_entree = ["Subvention État", "Donation partenaire", "Remboursement frais", "Vente matériel reformé", "Apport capital"]
    for i in range(30):
        date_entree = timezone.now() - timedelta(days=random.randint(0, 30))
        e = EntreeArgent.objects.create(
            montant=Decimal(random.randint(100000, 5000000)),
            motif=random.choice(motifs_entree),
            mode_paiement=random.choice(['especes', 'virement', 'mobile']),
            date_entree=date_entree.date(),
            created_by=random.choice(caisse_users),
            statut=random.choice(['confirmee', 'en_attente'])
        )
        EntreeArgent.objects.filter(id=e.id).update(created_at=date_entree)
    
    # Dépenses
    motifs_depense = ["Achat fournitures", "Frais de déplacement", "Réparation véhicule", "Abonnement internet", "Facture électricité"]
    for i in range(45):
        montant = Decimal(random.randint(10000, 800000))
        createur = random.choice(users)
        statut = random.choice(['payee', 'validee', 'verifiee', 'en_attente'])
        date_creation = timezone.now() - timedelta(days=random.randint(0, 30))
        
        # On crée l'objet sans save() d'abord pour gérer les dépendances de validation
        d = Depense(
            motif=random.choice(motifs_depense),
            montant=montant,
            prix_unitaire=montant,
            quantite=1,
            categorie=random.choice(['fonctionnement', 'mission', 'autre']),
            created_by=createur,
            statut=statut,
            tache=random.choice(tasks) if random.random() > 0.5 else None
        )
        
        # Workflow de validation
        if statut in ['verifiee', 'validee', 'payee']:
            d.verifie_par = random.choice(comptables)
            d.date_verification = timezone.now()
        
        if statut in ['validee', 'payee']:
            d.valide_par_comptable = random.choice(comptables)
            d.date_validation_comptable = timezone.now()
            if d.montant >= 500000:
                d.valide_par_dg = random.choice(dgs)
                d.date_validation_dg = timezone.now()
        
        if statut == 'payee':
            d.date_paiement = timezone.now()
            
        d.save()
        Depense.objects.filter(id=d.id).update(created_at=date_creation)

def create_demandes_report(users, tasks):
    print("Génération des demandes de report...")
    agents = [u for u in users if u.role == 'agent']
    dg_admins = [u for u in users if u.role in ['dg', 'admin']]
    
    # Cibler seulement les tâches en cours ou créées
    taches_actives = [t for t in tasks if t.statut in ['creee', 'en_cours']]
    if not taches_actives:
        taches_actives = tasks[:5]

    motifs = [
        "Absence imprévue d'un membre clé de l'équipe.",
        "Retard de livraison des ressources nécessaires par le fournisseur.",
        "Complexité sous-estimée lors de la planification initiale.",
        "Panne matérielle ayant impacté la progression.",
        "Priorité donnée à une mission urgente de la direction.",
    ]
    
    statuts = ['en_attente', 'approuvee', 'rejetee']
    nb_demandes = min(20, len(taches_actives))
    
    for i in range(nb_demandes):
        tache = taches_actives[i % len(taches_actives)]
        
        # L'agent demandeur est l'un des agents assignés à la tâche
        agents_assignes = list(tache.agents_assignes.all())
        demandeur = random.choice(agents_assignes) if agents_assignes else random.choice(agents)
        
        nouvelle_date = tache.date_echeance + timedelta(days=random.randint(5, 20))
        statut = random.choice(statuts)
        
        d = DemandeReport(
            tache=tache,
            demandeur=demandeur,
            date_demandee=nouvelle_date,
            motif=random.choice(motifs),
            statut=statut,
        )
        
        if statut in ['approuvee', 'rejetee']:
            d.repondu_par = random.choice(dg_admins)
            d.date_reponse = timezone.now()
            if statut == 'approuvee':
                d.commentaire_reponse = "Report accordé. Veuillez m'envoyer un rapport d'étape d'ici la fin de semaine."
                # Mettre à jour la date d'échéance de la tâche
                tache.date_echeance = nouvelle_date
                tache.save(update_fields=['date_echeance'])
            else:
                d.commentaire_reponse = "Demande rejetée. La mission doit être terminée dans les délais prévus."
        
        d.save()

def main():
    try:
        delete_existing_data()
        users = create_users()
        tasks = create_tasks(users)
        create_finances(users, tasks)
        create_demandes_report(users, tasks)
        print("\nSuccès ! Les données fictives ont été générées.")
        
        # Résumé
        print(f"- Utilisateurs: {CustomUser.objects.count()}")
        print(f"- Tâches: {Tache.objects.count()}")
        print(f"- Entrées: {EntreeArgent.objects.count()}")
        print(f"- Dépenses: {Depense.objects.count()}")
        print(f"- Demandes de report: {DemandeReport.objects.count()}")
        
    except Exception as e:
        print(f"Erreur lors de la génération: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
