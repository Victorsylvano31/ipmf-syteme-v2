import datetime
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from finances.models import EntreeArgent, Depense

User = get_user_model()

class FinanceAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='password123',
            role='admin'
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse('analytics-list')

    def test_expense_sync_date_paiement(self):
        """
        Test that expenses are grouped by date_paiement, not created_at.
        """
        # Create an expense in January but pay it in February
        jan_date = timezone.datetime(2026, 1, 15, tzinfo=datetime.timezone.utc)
        feb_date = timezone.datetime(2026, 2, 10, tzinfo=datetime.timezone.utc)
        
        expense = Depense.objects.create(
            motif="Achat Bureau",
            montant=100000,
            quantite=1,
            prix_unitaire=100000,
            created_by=self.user,
            statut='payee'
        )
        
        # Bypass auto_now_add for created_at to simulate creation in Jan
        Depense.objects.filter(pk=expense.pk).update(created_at=jan_date, date_paiement=feb_date)
        
        # Refresh from DB
        expense.refresh_from_db()
        
        # Get analytics with month granularity
        response = self.client.get(self.url, {'granularity': 'month'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        
        # Find January data
        jan_data = next((item for item in data if item['label'] == '2026-01'), None)
        # Find February data
        feb_data = next((item for item in data if item['label'] == '2026-02'), None)
        
        # Before fix: expense would be in January because of created_at
        # After fix: expense should be in February because of date_paiement
        if jan_data:
            self.assertEqual(jan_data['depenses'], 0, "January should have 0 expenses (fix active)")
        
        if feb_data:
            self.assertEqual(feb_data['depenses'], 100000, "February should have the 100k expense (fix active)")
        else:
            self.fail("February data not found in analytics response")

    def test_solde_cumule_calculation(self):
        """
        Verify that running balance calculation follows the correct logical flow.
        """
        # Jan: +200k
        jan_date = timezone.datetime(2026, 1, 15, tzinfo=datetime.timezone.utc).date()
        EntreeArgent.objects.create(
            motif="Vente",
            montant=200000,
            date_entree=jan_date,
            mode_paiement='especes',
            created_by=self.user,
            statut='confirmee'
        )
        
        # Feb: -50k
        feb_date = timezone.datetime(2026, 2, 5, tzinfo=timezone.utc)
        expense = Depense.objects.create(
            motif="Transport",
            montant=50000,
            quantite=1,
            prix_unitaire=50000,
            created_by=self.user,
            statut='payee'
        )
        Depense.objects.filter(pk=expense.pk).update(date_paiement=feb_date)
        
        response = self.client.get(self.url, {'granularity': 'month'})
        data = response.data
        
        jan_data = next((item for item in data if item['label'] == '2026-01'), None)
        feb_data = next((item for item in data if item['label'] == '2026-02'), None)
        
        if jan_data:
            self.assertEqual(jan_data['solde_cumule'], 200000)
        
        if feb_data:
            # 200k - 50k = 150k
            self.assertEqual(feb_data['solde_cumule'], 150000)
