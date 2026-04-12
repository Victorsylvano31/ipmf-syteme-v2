from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'taches', views.TacheViewSet, basename='tache')
router.register(r'commentaires', views.CommentaireTacheViewSet, basename='commentairetache')
router.register(r'demandes-report', views.DemandeReportViewSet, basename='demandereport')
router.register(r'sous-taches', views.SousTacheViewSet, basename='soustache')
router.register(r'lignes-devis', views.LigneDevisViewSet, basename='lignedevis')

urlpatterns = [
    path('', include(router.urls)),
]