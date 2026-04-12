from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'entrees', views.EntreeArgentViewSet, basename='entree')
router.register(r'depenses', views.DepenseViewSet, basename='depense')
router.register(r'analytics', views.FinanceAnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]