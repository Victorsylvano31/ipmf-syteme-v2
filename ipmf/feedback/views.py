from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Feedback
from .serializers import FeedbackSerializer, FeedbackAdminSerializer

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()

    def get_serializer_class(self):
        if self.request.user.role == 'admin' and self.action in ['update', 'partial_update']:
            return FeedbackAdminSerializer
        return FeedbackSerializer

    def get_permissions(self):
        # Tout le monde (connecté) peut créer
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        # Seul l'admin peut lister, voir, et modifier
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise PermissionDenied("Seul l'administrateur peut consulter la liste des feedbacks.")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise PermissionDenied("Seul l'administrateur peut consulter les détails d'un feedback.")
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise PermissionDenied("Seul l'administrateur peut modifier un feedback.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise PermissionDenied("Seul l'administrateur peut modifier un feedback.")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            raise PermissionDenied("Seul l'administrateur peut supprimer un feedback.")
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)
