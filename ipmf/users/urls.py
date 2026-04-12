# backend/apps/users/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# Registering with empty prefix so /api/users/ points to UserViewSet
router.register(r'profiles', views.UserProfileViewSet, basename='profiles')
router.register(r'', views.UserViewSet, basename='users')

urlpatterns = [
    path('', include(router.urls)),
    # Redundant me/ if already in ViewSet, but keeping current_user_simple if needed for specific logic
    path('current-user/', views.current_user_simple, name='current_user_simple'),
]
