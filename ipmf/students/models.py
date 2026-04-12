"""
Module Étudiants - Modèles
Gestion des inscriptions et suivi des paiements de frais de formation
"""

import uuid
import os
from datetime import date
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator, MinValueValidator


def photo_etudiant_upload(instance, filename):
    """Génère un chemin unique pour la photo d'un étudiant."""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('etudiants', 'photos', filename)


class Formation(models.Model):
    """
    Formations proposées par l'IPMF.
    Extensible pour ajouter de nouvelles formations à l'avenir.
    """
    nom = models.CharField(max_length=200, unique=True, verbose_name="Nom de la formation")
    description = models.TextField(blank=True, verbose_name="Description")
    duree_mois = models.PositiveIntegerField(default=12, verbose_name="Durée (mois)")
    frais_defaut = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Frais par défaut (Ar)",
        help_text="Montant par défaut des frais de formation"
    )
    nombre_tranches_defaut = models.PositiveIntegerField(
        default=3,
        verbose_name="Nombre de tranches par défaut"
    )
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Formation"
        verbose_name_plural = "Formations"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Etudiant(models.Model):
    """
    Modèle principal pour les étudiants inscrits à l'IPMF.
    """
    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('suspendu', 'Suspendu'),
        ('diplome', 'Diplômé'),
        ('abandonne', 'Abandonné'),
    ]

    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Format: '+261321234567'. 9-15 chiffres autorisés."
    )

    # Identifiant unique
    numero_inscription = models.CharField(
        max_length=20, unique=True, editable=False,
        verbose_name="Numéro d'inscription"
    )

    # Identité
    nom = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, verbose_name="Prénom(s)")
    date_naissance = models.DateField(verbose_name="Date de naissance")
    lieu_naissance = models.CharField(max_length=150, verbose_name="Lieu de naissance")
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES, verbose_name="Sexe")
    cin = models.CharField(max_length=30, blank=True, verbose_name="N° CIN")
    photo = models.ImageField(upload_to=photo_etudiant_upload, null=True, blank=True, verbose_name="Photo")

    # Contact
    adresse = models.TextField(verbose_name="Adresse")
    telephone = models.CharField(max_length=17, validators=[RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Format: '+261321234567'. 9-15 chiffres autorisés."
    )], verbose_name="Téléphone")
    email = models.EmailField(blank=True, verbose_name="Email")

    # Scolarité
    formation = models.ForeignKey(
        Formation, on_delete=models.PROTECT,
        related_name='etudiants',
        verbose_name="Formation"
    )
    annee_scolaire = models.CharField(max_length=9, verbose_name="Année scolaire",
                                       help_text="Ex: 2025-2026")
    promotion = models.CharField(max_length=50, blank=True, verbose_name="Promotion", help_text="Ex: 5, Promo 5")
    date_inscription = models.DateField(default=date.today, verbose_name="Date d'inscription")

    # Frais
    montant_total_frais = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Montant total des frais (Ar)"
    )
    nombre_tranches = models.PositiveIntegerField(
        default=3,
        verbose_name="Nombre de tranches"
    )

    # Statut
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='actif', verbose_name="Statut")
    observations = models.TextField(blank=True, verbose_name="Observations")

    # Métadonnées
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='etudiants_inscrits',
        verbose_name="Inscrit par"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Étudiant"
        verbose_name_plural = "Étudiants"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.numero_inscription} - {self.nom} {self.prenom}"

    def save(self, *args, **kwargs):
        """Auto-génère le numéro d'inscription si absent."""
        if not self.numero_inscription:
            year = date.today().year
            last = Etudiant.objects.filter(
                numero_inscription__startswith=f"ETU-{year}-"
            ).order_by('-numero_inscription').first()
            if last:
                try:
                    last_num = int(last.numero_inscription.split('-')[-1])
                except (ValueError, IndexError):
                    last_num = 0
                new_num = last_num + 1
            else:
                new_num = 1
            self.numero_inscription = f"ETU-{year}-{new_num:03d}"
        super().save(*args, **kwargs)

    @property
    def nom_complet(self):
        return f"{self.prenom} {self.nom}"

    @property
    def montant_paye(self):
        """Total des paiements effectués."""
        return self.paiements.filter(
            statut__in=['paye', 'partiel']
        ).aggregate(
            total=models.Sum('montant_paye')
        )['total'] or Decimal('0')

    @property
    def montant_restant(self):
        """Montant restant à payer."""
        return self.montant_total_frais - self.montant_paye

    @property
    def pourcentage_paye(self):
        """Pourcentage payé (0-100)."""
        if self.montant_total_frais == 0:
            return 100
        return round((self.montant_paye / self.montant_total_frais) * 100, 1)

    @property
    def statut_paiement(self):
        """Statut global des paiements: solde, en_cours, en_retard."""
        if self.montant_paye >= self.montant_total_frais:
            return 'solde'
        has_retard = self.paiements.filter(
            statut='en_attente', date_echeance__lt=date.today()
        ).exists()
        if has_retard:
            return 'en_retard'
        return 'en_cours'


class PaiementFrais(models.Model):
    """
    Suivi individuel de chaque tranche de paiement.
    """
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('paye', 'Payé'),
        ('en_retard', 'En retard'),
        ('partiel', 'Partiel'),
    ]

    MODE_CHOICES = [
        ('especes', 'Espèces'),
        ('virement', 'Virement bancaire'),
        ('cheque', 'Chèque'),
        ('mobile_money', 'Mobile Money'),
    ]

    etudiant = models.ForeignKey(
        Etudiant, on_delete=models.CASCADE,
        related_name='paiements',
        verbose_name="Étudiant"
    )
    numero_tranche = models.PositiveIntegerField(verbose_name="N° de tranche")
    montant_prevu = models.DecimalField(
        max_digits=12, decimal_places=2,
        verbose_name="Montant prévu (Ar)"
    )
    montant_paye = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Montant payé (Ar)"
    )
    date_echeance = models.DateField(verbose_name="Date d'échéance")
    date_paiement = models.DateField(null=True, blank=True, verbose_name="Date de paiement")
    statut = models.CharField(
        max_length=15, choices=STATUT_CHOICES,
        default='en_attente', verbose_name="Statut"
    )
    mode_paiement = models.CharField(
        max_length=20, choices=MODE_CHOICES,
        blank=True, verbose_name="Mode de paiement"
    )
    reference = models.CharField(
        max_length=100, blank=True,
        verbose_name="Référence reçu/bordereau"
    )
    recu_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='paiements_recus',
        verbose_name="Reçu par"
    )
    observations = models.TextField(blank=True, verbose_name="Observations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Paiement de frais"
        verbose_name_plural = "Paiements de frais"
        ordering = ['etudiant', 'numero_tranche']
        unique_together = ['etudiant', 'numero_tranche']

    def __str__(self):
        return f"Tranche {self.numero_tranche} - {self.etudiant.nom_complet}"
