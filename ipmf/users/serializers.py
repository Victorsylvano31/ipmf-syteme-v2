# backend/apps/users/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile
from .utils import process_avatar

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'telephone', 'departement', 'date_embauche',
            'is_active', 'is_staff', 'is_superuser', 'date_created', 'date_updated', 
            'last_login', 'photo_url'
        ]
        read_only_fields = ['id', 'date_created', 'date_updated', 'last_login', 'is_staff', 'is_superuser', 'photo_url']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}
    
    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_photo_url(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.photo:
                return obj.profile.photo.url
        except Exception:
            pass
        return None
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AvatarUpdateSerializer(serializers.ModelSerializer):
    """Serializer dédié à l'upload d'avatar avec validation et traitement."""
    class Meta:
        model = UserProfile
        fields = ['photo']

    def validate_photo(self, value):
        # 1. Validation de la taille (2MB)
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("L'image ne doit pas dépasser 2 Mo.")
        
        # 2. Validation du type MIME
        valid_mime_types = ['image/jpeg', 'image/png', 'image/webp']
        if value.content_type not in valid_mime_types:
            raise serializers.ValidationError("Format non supporté. Utilisez JPG, PNG ou WEBP.")

        # 3. Traitement de l'image (redimensionnement & optimisation)
        try:
            processed_image = process_avatar(value)
            # On conserve le nom d'origine pour l'extension, le modèle gérera le renommage UUID
            processed_image.name = value.name
            return processed_image
        except Exception as e:
            raise serializers.ValidationError(f"Erreur lors du traitement de l'image : {str(e)}")


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ['user', 'date_created', 'date_updated']
    
    def get_photo_url(self, obj):
        if obj.photo:
            return obj.photo.url
        return None
    
    def get_signature_url(self, obj):
        if obj.signature:
            return obj.signature.url
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm',
                  'first_name', 'last_name', 'role', 'telephone', 
                  'departement', 'date_embauche', 'is_active']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'telephone',
                  'departement', 'date_embauche', 'is_active', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
