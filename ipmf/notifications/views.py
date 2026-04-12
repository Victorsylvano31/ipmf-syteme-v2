from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'all marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['post'])
    def mark_related_read(self, request):
        """Marque comme lues les notifications liées à un objet spécifique (ex: tâche X)"""
        link_pattern = request.data.get('link_pattern')
        if not link_pattern:
            return Response({'error': 'link_pattern required'}, status=status.HTTP_400_BAD_REQUEST)
            
        self.get_queryset().filter(
            is_read=False,
            link__contains=link_pattern
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'related marked as read'})
