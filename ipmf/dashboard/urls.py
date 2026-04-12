from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import ai_views

router = DefaultRouter()
router.register(r'preferences', views.DashboardPreferencesViewSet, basename='dashboardpreferences')
router.register(r'alertes', views.AlertViewSet, basename='alert')
router.register(r'widgets', views.WidgetConfigViewSet, basename='widgetconfig')
router.register(r'vues', views.DashboardViewViewSet, basename='dashboardview')
router.register(r'donnees', views.DashboardDataViewSet, basename='dashboarddata')
router.register(r'gestion-alertes', views.AlertManagementViewSet, basename='alertmanagement')

urlpatterns = [
    path('', include(router.urls)),
    path('ai/chat/', ai_views.AIChatView.as_view(), name='ai-chat'),
]