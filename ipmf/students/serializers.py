"""
Module Étudiants - Serializers
"""

from rest_framework import serializers
from .models import Formation, Etudiant, PaiementFrais
from datetime import date, timedelta
from decimal import Decimal


class FormationSerializer(serializers.ModelSerializer):
    nombre_etudiants = serializers.SerializerMethodField()

    class Meta:
        model = Formation
        fields = '__all__'

    def get_nombre_etudiants(self, obj):
        return obj.etudiants.count()


class PaiementFraisSerializer(serializers.ModelSerializer):
    recu_par_nom = serializers.CharField(source='recu_par.get_full_name', read_only=True, default='')
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    mode_display = serializers.CharField(source='get_mode_paiement_display', read_only=True, default='')

    class Meta:
        model = PaiementFrais
        fields = [
            'id', 'etudiant', 'numero_tranche', 'montant_prevu',
            'montant_paye', 'date_echeance', 'date_paiement',
            'statut', 'statut_display', 'mode_paiement', 'mode_display',
            'reference', 'recu_par', 'recu_par_nom', 'observations',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class PaiementEnregistrerSerializer(serializers.Serializer):
    """Serializer pour enregistrer un paiement sur une tranche."""
    montant = serializers.DecimalField(max_digits=12, decimal_places=2)
    mode_paiement = serializers.ChoiceField(choices=PaiementFrais.MODE_CHOICES)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    observations = serializers.CharField(required=False, allow_blank=True)
    date_paiement = serializers.DateField(required=False)

    def validate_montant(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à 0.")
        return value


class EtudiantListSerializer(serializers.ModelSerializer):
    """Serializer léger pour la liste des étudiants."""
    formation_nom = serializers.CharField(source='formation.nom', read_only=True)
    nom_complet = serializers.CharField(read_only=True)
    montant_paye = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    montant_restant = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pourcentage_paye = serializers.FloatField(read_only=True)
    statut_paiement = serializers.CharField(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Etudiant
        fields = [
            'id', 'numero_inscription', 'nom', 'prenom', 'nom_complet',
            'sexe', 'telephone', 'formation', 'formation_nom',
            'annee_scolaire', 'promotion', 'montant_total_frais',
            'montant_paye', 'montant_restant', 'pourcentage_paye',
            'statut_paiement', 'statut', 'statut_display',
            'photo', 'created_at'
        ]


class EtudiantDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour la fiche d'un étudiant."""
    formation_nom = serializers.CharField(source='formation.nom', read_only=True)
    nom_complet = serializers.CharField(read_only=True)
    montant_paye = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    montant_restant = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pourcentage_paye = serializers.FloatField(read_only=True)
    statut_paiement = serializers.CharField(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    sexe_display = serializers.CharField(source='get_sexe_display', read_only=True)
    created_by_nom = serializers.CharField(source='created_by.get_full_name', read_only=True, default='')
    paiements = PaiementFraisSerializer(many=True, read_only=True)

    class Meta:
        model = Etudiant
        fields = [
            'id', 'numero_inscription', 'nom', 'prenom', 'nom_complet',
            'date_naissance', 'lieu_naissance', 'sexe', 'sexe_display',
            'cin', 'photo', 'adresse', 'telephone', 'email',
            'formation', 'formation_nom', 'annee_scolaire', 'promotion', 'date_inscription',
            'montant_total_frais', 'nombre_tranches',
            'montant_paye', 'montant_restant', 'pourcentage_paye', 'statut_paiement',
            'statut', 'statut_display', 'observations',
            'created_by', 'created_by_nom', 'paiements',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['numero_inscription', 'created_by', 'created_at', 'updated_at']


class EtudiantCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'un étudiant (avec génération des tranches)."""

    class Meta:
        model = Etudiant
        fields = [
            'nom', 'prenom', 'date_naissance', 'lieu_naissance',
            'sexe', 'cin', 'photo', 'adresse', 'telephone', 'email',
            'formation', 'annee_scolaire', 'promotion', 'date_inscription',
            'montant_total_frais', 'nombre_tranches',
            'statut', 'observations'
        ]

    def validate_nombre_tranches(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("Le nombre de tranches doit être entre 1 et 12.")
        return value

    def create(self, validated_data):
        """Crée l'étudiant et génère automatiquement les tranches de paiement."""
        user = self.context['request'].user
        validated_data['created_by'] = user

        etudiant = Etudiant.objects.create(**validated_data)

        # Génération automatique des tranches
        montant_total = etudiant.montant_total_frais
        nb_tranches = etudiant.nombre_tranches
        montant_par_tranche = (montant_total / nb_tranches).quantize(Decimal('0.01'))

        # Ajustement de la dernière tranche pour le reste
        reste = montant_total - (montant_par_tranche * nb_tranches)

        for i in range(1, nb_tranches + 1):
            montant = montant_par_tranche
            if i == nb_tranches:
                montant += reste  # La dernière tranche absorbe l'arrondi

            # Échéances espacées de ~2 mois à partir de l'inscription
            echeance = etudiant.date_inscription + timedelta(days=60 * (i - 1))

            PaiementFrais.objects.create(
                etudiant=etudiant,
                numero_tranche=i,
                montant_prevu=montant,
                date_echeance=echeance,
            )

        return etudiant
