"""
Module Étudiants - URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FormationViewSet, EtudiantViewSet, PaiementFraisViewSet

router = DefaultRouter()
router.register(r'formations', FormationViewSet, basename='formation')
router.register(r'etudiants', EtudiantViewSet, basename='etudiant')
router.register(r'paiements', PaiementFraisViewSet, basename='paiement')

urlpatterns = [
    path('', include(router.urls)),
]
