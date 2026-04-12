from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    verbose_name = "👥 Gestion des Utilisateurs"
    
    def ready(self):
        """
        Code à exécuter au chargement de l'application
        """
        try:
            import users.signals  # noqa: F401
        except ImportError:
            pass