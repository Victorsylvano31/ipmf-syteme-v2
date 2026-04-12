# backend/apps/users/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.contrib.auth import get_user_model

from .models import UserProfile
from .serializers import (
    UserSerializer, UserProfileSerializer, UserCreateSerializer, 
    UserUpdateSerializer, AvatarUpdateSerializer
)
from .permissions import IsAdminUser, IsOwnerOrAdmin, CanManageUsers, CanViewReports

User = get_user_model()

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user_simple(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': user.get_full_name(),
        'role': user.role,
        'role_display': user.get_role_display(),
        'telephone': user.telephone,
        'departement': user.departement,
        'date_embauche': user.date_embauche,
        'is_active': user.is_active,
        'last_login': user.last_login,
    })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_created')
    
    def get_permissions(self):
        """
        Permissions personnalisées :
        - list/retrieve/me : Tous les utilisateurs authentifiés
        - create/update/delete : Admin et DG via CanManageUsers
        """
        if self.action in ['list', 'retrieve', 'me']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), CanManageUsers()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return User.objects.all()
        elif user.role == 'dg':
            return User.objects.exclude(role='admin')
        elif user.role in ['comptable', 'caisse']:
            return User.objects.exclude(role__in=['admin', 'dg'])
        # Par défaut (agent, etc.), ils voient tous les employés sauf la direction (DG/Admin)
        # pour pouvoir constituer une équipe polyvalente
        return User.objects.exclude(role__in=['admin', 'dg'])

    def perform_create(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return Response(
                {"error": "Vous ne pouvez pas supprimer votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if getattr(instance, 'is_superuser', False):
            return Response(
                {"error": "Il est interdit de supprimer le super-administrateur du système."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def update_me(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def roles(self, request):
        roles = dict(User.ROLE_CHOICES)
        return Response(roles)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, CanViewReports])
    def stats(self, request):
        queryset = self.get_queryset()
        stats = {
            'total': queryset.count(),
            'actifs': queryset.filter(is_active=True).count(),
            'inactifs': queryset.filter(is_active=False).count(),
            'par_role': {role: queryset.filter(role=role, is_active=True).count() for role, _ in User.ROLE_CHOICES},
            'derniers_utilisateurs': queryset.filter(is_active=True).order_by('-date_created')[:5].values('id', 'username', 'first_name', 'last_name', 'role', 'date_created')
        }
        return Response(stats)

    @action(detail=True, methods=['post'], permission_classes=[CanManageUsers])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        action = "activé" if user.is_active else "désactivé"
        return Response({'message': f'Utilisateur {action} avec succès', 'is_active': user.is_active})

    @action(detail=True, methods=['post'], permission_classes=[CanManageUsers])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'Le nouveau mot de passe est requis'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Mot de passe réinitialisé avec succès'})


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all().order_by('-date_created')
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def my_profile(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        serializer = self.get_serializer(profile, data=request.data, partial=request.method=='PATCH')
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='upload-avatar', permission_classes=[permissions.IsAuthenticated])
    def upload_avatar(self, request):
        """Action dédiée à l'upload d'avatar avec sécurisation et optimisation."""
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = AvatarUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # On retourne le profil complet mis à jour pour rafraîchir le store frontend
        return Response(UserProfileSerializer(profile, context={'request': request}).data)
