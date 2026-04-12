from rest_framework import permissions

class CanCreateEntree(permissions.BasePermission):
    """Peut créer une entrée d'argent"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'caisse', 'comptable', 'dg', 'agent']

class CanConfirmEntree(permissions.BasePermission):
    """Peut confirmer une entrée d'argent"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'caisse', 'dg']

class CanCreateDepense(permissions.BasePermission):
    """Peut créer une dépense"""
    def has_permission(self, request, view):
        return request.user.is_authenticated

class CanVerifyDepense(permissions.BasePermission):
    """Peut vérifier une dépense"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'comptable']

class CanValidateDepense(permissions.BasePermission):
    """Peut valider une dépense"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'dg', 'comptable']

class CanPayDepense(permissions.BasePermission):
    """Peut payer une dépense"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'comptable', 'caisse', 'dg']

class CanViewAllFinances(permissions.BasePermission):
    """Peut voir toutes les données financières (Admin, DG, Comptable)"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        role = getattr(request.user, 'role', '').lower()
        return role in ['admin', 'dg', 'comptable']