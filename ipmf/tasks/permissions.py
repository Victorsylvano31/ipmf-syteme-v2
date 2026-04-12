from rest_framework import permissions

class CanAssignTasks(permissions.BasePermission):
    """Peut assigner des tâches"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'dg']

class CanValidateTasks(permissions.BasePermission):
    """Peut valider des tâches"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'dg']

class IsTaskOwnerOrAssignee(permissions.BasePermission):
    """Est le créateur ou l'un des assignés de la tâche"""
    def has_object_permission(self, request, view, obj):
        return obj.createur == request.user or obj.agents_assignes.filter(id=request.user.id).exists()

class CanViewAllTasks(permissions.BasePermission):
    """Peut voir toutes les tâches"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'dg']