"""
URLs principales du projet IPMF
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Administration Django
    path('admin/', admin.site.urls),

    # Authentification JWT
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API des applications IPMF
    path('api/users/', include('users.urls')),  # Gestion des utilisateurs et profils

    # Applications à ajouter plus tard
    path('api/finances/', include('finances.urls')),  # Module financier et budget
    path('api/tasks/', include('tasks.urls')),        # Gestion des tâches et projets
    path('api/dashboard/', include('dashboard.urls')), # Tableaux de bord et rapports
    path('api/audit/', include('audit.urls')),        # Journalisation et audit système
    path('api/notifications/', include('notifications.urls')), # Système de notifications
    path('api/students/', include('students.urls')),          # Module Étudiants
    path('api/feedback/', include('feedback.urls')),          # Module Boîte à Idées
]

# Servir les fichiers média et statiques en mode développement uniquement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Personnalisation de l'interface d'administration
admin.site.site_header = "Administration IPMF"
admin.site.site_title = "Système IPMF - Administration"
admin.site.index_title = "Tableau de bord d'administration"

# Gestionnaires d'erreurs personnalisés (optionnel)
# handler404 = 'ipmf.views.handler_404'
# handler500 = 'ipmf.views.handler_500'
