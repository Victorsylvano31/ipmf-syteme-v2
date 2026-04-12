from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import EntreeArgent, Depense

User = get_user_model()

class EntreeArgentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    montant_format = serializers.SerializerMethodField()
    can_confirm = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    mode_paiement_display = serializers.CharField(source='get_mode_paiement_display', read_only=True)
    piece_justificative_name = serializers.CharField(source='get_piece_justificative_name', read_only=True)
    
    class Meta:
        model = EntreeArgent
        fields = [
            'id', 'numero', 'montant', 'montant_format', 'motif', 'mode_paiement', 'mode_paiement_display',
            'date_entree', 'created_by', 'created_by_name', 'created_at', 'statut', 'statut_display',
            'piece_justificative', 'piece_justificative_name', 'commentaire', 'can_confirm', 'can_cancel'
        ]
        read_only_fields = ('numero', 'created_by', 'created_at', 'montant_format', 'statut')
    
    def get_montant_format(self, obj):
        try:
            from decimal import Decimal, ROUND_HALF_UP
            montant_int = int(obj.montant.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
            return f"{montant_int:,} Ar".replace(",", " ")
        except (ValueError, TypeError, AttributeError):
            return f"{obj.montant} Ar"

    def get_can_confirm(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_confirmed_by(request.user)
        return False
    
    def get_can_cancel(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_cancelled_by(request.user)
        return False
    
    def validate_montant(self, value):
        """Validation personnalisée du montant"""
        from decimal import Decimal
        if value < Decimal('1000.00'):
            raise serializers.ValidationError("Le montant minimum est de 1 000 Ar")
        if value > Decimal('1000000000'):  # 1 milliard Ar
            raise serializers.ValidationError("Le montant est trop élevé (max: 1 000 000 000 Ar)")
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class DepenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    montant = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    montant_format = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    piece_justificative_name = serializers.CharField(source='get_piece_justificative_name', read_only=True)
    necessite_validation_dg = serializers.BooleanField(read_only=True)
    delai_attente = serializers.IntegerField(read_only=True)
    est_en_retard = serializers.BooleanField(read_only=True)
    can_verify = serializers.SerializerMethodField()
    can_validate = serializers.SerializerMethodField()
    can_pay = serializers.SerializerMethodField()
    can_reject = serializers.SerializerMethodField()
    tache_titre = serializers.CharField(source='tache.titre', read_only=True)
    tache_budget = serializers.DecimalField(source='tache.budget_alloue', max_digits=12, decimal_places=2, read_only=True)
    
    valide_par_comptable_name = serializers.CharField(source='valide_par_comptable.get_full_name', read_only=True)
    valide_par_dg_name = serializers.CharField(source='valide_par_dg.get_full_name', read_only=True)
    verifie_par_name = serializers.CharField(source='verifie_par.get_full_name', read_only=True)
    
    class Meta:
        model = Depense
        fields = [
            'id', 'numero', 'montant', 'montant_format', 'motif', 'categorie', 'categorie_display',
            'quantite', 'prix_unitaire', 'created_by', 'created_by_name', 'created_at', 'statut', 'statut_display',
            'piece_justificative', 'piece_justificative_name', 'commentaire', 'necessite_validation_dg',
            'delai_attente', 'est_en_retard', 'can_verify', 'can_validate', 'can_pay', 'can_reject',
            'verifie_par', 'verifie_par_name', 'valide_par_comptable', 'valide_par_comptable_name', 
            'valide_par_dg', 'valide_par_dg_name', 'date_verification', 'date_validation_comptable', 
            'date_validation_dg', 'date_paiement', 'commentaire_validation',
            'tache', 'tache_titre', 'tache_budget', 'approved_by_system'
        ]
        read_only_fields = (
            'numero', 'created_by', 'created_at', 'montant_format', 'statut',
            'necessite_validation_dg', 'delai_attente', 'est_en_retard',
            'valide_par_comptable', 'valide_par_dg', 'date_validation_comptable', 'date_validation_dg'
        )
    
    def get_montant_format(self, obj):
        try:
            from decimal import Decimal, ROUND_HALF_UP
            montant_int = int(obj.montant.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
            return f"{montant_int:,} Ar".replace(",", " ")
        except (ValueError, TypeError, AttributeError):
            return f"{obj.montant} Ar"
    
    def get_can_verify(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_verified_by(request.user)
        return False
    
    def get_can_validate(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_validated_by(request.user)
        return False
    
    def get_can_pay(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_paid_by(request.user)
        return False

    def get_can_reject(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_rejected_by(request.user)
        return False
    
    def validate(self, data):
        """Validation croisée des données"""
        if 'quantite' in data and 'prix_unitaire' in data:
            data['montant'] = data['quantite'] * data['prix_unitaire']
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        
        # Calcul du montant final
        if 'quantite' in validated_data and 'prix_unitaire' in validated_data:
            validated_data['montant'] = validated_data['quantite'] * validated_data['prix_unitaire']
        
        return super().create(validated_data)

class DepenseActionSerializer(serializers.Serializer):
    """Serializer pour les actions sur les dépenses"""
    commentaire = serializers.CharField(required=False, allow_blank=True)
    
    def validate_commentaire(self, value):
        if len(value) > 1000:
            raise serializers.ValidationError("Le commentaire ne peut pas dépasser 1000 caractères")
        return value