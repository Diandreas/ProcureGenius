from django.apps import AppConfig


class PharmacyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.pharmacy'
    verbose_name = 'Pro-pharmacie'
    
    def ready(self):
        import apps.pharmacy.signals  # noqa
