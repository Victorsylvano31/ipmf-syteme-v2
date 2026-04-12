from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Permission pour les administrateurs seulement
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsDGUser(permissions.BasePermission):
    """
    Permission pour les Directeurs Généraux
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'dg'


class IsComptableUser(permissions.BasePermission):
    """
    Permission pour les comptables
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'comptable'


class IsCaisseUser(permissions.BasePermission):
    """
    Permission pour les responsables caisse
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'caisse'


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    L'utilisateur peut voir/modifier seulement ses propres données, sauf admin
    """
    def has_object_permission(self, request, view, obj):
        # Admin a tous les droits
        if request.user.role == 'admin':
            return True
        
        # Si l'objet est un utilisateur
        if hasattr(obj, 'username'):
            return obj == request.user
        
        # Si l'objet a une relation user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Si l'objet a un créateur
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class CanManageUsers(permissions.BasePermission):
    """
    Peut gérer les utilisateurs (Admin et DG)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ['admin', 'dg']


class CanViewReports(permissions.BasePermission):
    """
    Peut voir les rapports (Admin, DG, Comptable)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ['admin', 'dg', 'comptable']


class CanExportData(permissions.BasePermission):
    """
    Peut exporter les données (Admin, DG, Comptable)
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.role in ['admin', 'dg', 'comptable']


class ReadOnlyOrAdmin(permissions.BasePermission):
    """
    Lecture seule pour tous, modification pour admin seulement
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == 'admin'