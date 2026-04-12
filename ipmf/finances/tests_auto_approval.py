from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from finances.models import Depense, FinancesConstants
from tasks.models import Tache
from finances.services import FinanceService

User = get_user_model()

class AutoApprovalTest(TestCase):
    def setUp(self):
        # Users
        self.agent = User.objects.create_user(username='agent_test', password='pwd', role='agent')
        self.comptable = User.objects.create_user(username='comptable_test', password='pwd', role='comptable')
        
        # Mission
        self.tache = Tache.objects.create(
            titre="Mission Test",
            description="Description",
            createur=self.comptable,
            statut='en_cours',
            priorite='moyenne',
            date_debut=timezone.now(),
            date_echeance=timezone.now() + timezone.timedelta(days=5),
            budget_alloue=Decimal('200000.00')
        )
        self.tache.agents_assignes.add(self.agent)
        if hasattr(self.tache, 'assign_numero_if_missing'):
            self.tache.assign_numero_if_missing() 
        self.tache.save()

    def test_auto_approval_success(self):
        """Test qu'une dépense respectant le budget est auto-approuvée"""
        depense = Depense.objects.create(
            quantite=1,
            prix_unitaire=Decimal('50000.00'),
            motif="Frais de route",
            categorie="mission",
            created_by=self.agent,
            tache=self.tache
        )
        
        # Manually trigger service logic
        FinanceService.process_auto_approval(depense, self.agent)
        
        depense.refresh_from_db()
        self.assertEqual(depense.statut, Depense.STATUT_VALIDEE)
        self.assertTrue(depense.approved_by_system)
        self.assertIsNotNone(depense.date_validation_comptable)

    def test_auto_approval_budget_exceeded(self):
        """Test qu'une dépense dépassant le budget n'est PAS auto-approuvée"""
        depense = Depense.objects.create(
            quantite=1,
            prix_unitaire=Decimal('250000.00'), # > 200k
            motif="Trop cher",
            categorie="mission",
            created_by=self.agent,
            tache=self.tache
        )
        
        FinanceService.process_auto_approval(depense, self.agent)
        
        depense.refresh_from_db()
        self.assertEqual(depense.statut, Depense.STATUT_EN_ATTENTE)
        self.assertFalse(depense.approved_by_system)

    def test_auto_approval_user_not_assigned(self):
        """Test qu'un user non assigné ne déclenche pas l'auto-approval"""
        other_agent = User.objects.create_user(username='other', password='pwd', role='agent')
        
        depense = Depense.objects.create(
            quantite=1,
            prix_unitaire=Decimal('10000.00'),
            motif="Intrus",
            categorie="mission",
            created_by=other_agent,
            tache=self.tache
        )
        
        FinanceService.process_auto_approval(depense, other_agent)
        
        depense.refresh_from_db()
        self.assertEqual(depense.statut, Depense.STATUT_EN_ATTENTE)

    def test_auto_approval_task_not_active(self):
        """Test qu'une tâche terminée ne permet plus l'auto-approval"""
        self.tache.statut = 'terminee'
        self.tache.save()
        
        depense = Depense.objects.create(
            quantite=1,
            prix_unitaire=Decimal('10000.00'),
            motif="En retard",
            categorie="mission",
            created_by=self.agent,
            tache=self.tache
        )
        
        FinanceService.process_auto_approval(depense, self.agent)
        
        depense.refresh_from_db()
        self.assertEqual(depense.statut, Depense.STATUT_EN_ATTENTE)
