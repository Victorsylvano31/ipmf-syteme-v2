from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.AuditLogViewSet, basename='auditlog')
router.register(r'exports-history', views.ExportHistoryViewSet, basename='exporthistory')
router.register(r'login-history', views.LoginHistoryViewSet, basename='loginhistory')
router.register(r'system-health', views.SystemHealthLogViewSet, basename='systemhealth')
router.register(r'audit-tools', views.AuditToolsViewSet, basename='audittools')

urlpatterns = [
    path('', include(router.urls)),
]