from django.apps import AppConfig


class CrmConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.crm'
    verbose_name = 'Suivi patients'

    def ready(self):
        from . import signals  # noqa: F401  (enregistre l'auteur de chaque nouvelle fiche)
