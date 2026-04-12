
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from finances.models import Depense
from finances.services import FinanceService
from django.core.exceptions import ValidationError
from decimal import Decimal

class Command(BaseCommand):
    help = 'Test self-validation vulnerability'

    def handle(self, *args, **options):
        User = get_user_model()
        
        self.stdout.write("--- Testing Self-Validation Vulnerability ---")
        
        # Create a comptable user if not exists
        comptable, _ = User.objects.get_or_create(username='comptable_security_test', defaults={
            'role': 'comptable',
            'email': 'comptable_sec@test.com'
        })
        comptable.set_password('password123')
        comptable.save()
        
        # 1. Comptable creates a depense
        depense = Depense.objects.create(
            montant=Decimal('10000.00'),
            motif="Test Self Validation Security",
            created_by=comptable,
            categorie=Depense.CATEGORIE_FONCTIONNEMENT,
            prix_unitaire=Decimal('10000.00'),
            quantite=1
        )
        self.stdout.write(f"Depense created: {depense.numero} by {depense.created_by.username}")
        
        # 2. Comptable tries to verify their own depense
        self.stdout.write(f"Attempting verification by {comptable.username}...")
        try:
            FinanceService.verify_depense(depense, comptable, "Self verification")
            self.stdout.write(self.style.ERROR("❌ VULNERABILITY FOUND: Comptable successfully verified their own expense!"))
        except ValidationError as e:
            self.stdout.write(self.style.SUCCESS(f"✅ BLOCKED: Verification failed as expected: {e}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠️ Unexpected error during verification: {e}"))

        # Reset depense status for next test if it was verified
        depense.refresh_from_db()
        if depense.statut == Depense.STATUT_VERIFIEE:
            # 3. Comptable tries to validate their own depense (since it's < 500k)
            self.stdout.write(f"Attempting validation by {comptable.username}...")
            try:
                FinanceService.validate_depense(depense, comptable, "Self validation")
                self.stdout.write(self.style.ERROR("❌ VULNERABILITY FOUND: Comptable successfully validated their own expense!"))
            except ValidationError as e:
                self.stdout.write(self.style.SUCCESS(f"✅ BLOCKED: Validation failed as expected: {e}"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️ Unexpected error during validation: {e}"))
                
        # Cleanup
        depense.delete()
        self.stdout.write("---------------------------------------------")
