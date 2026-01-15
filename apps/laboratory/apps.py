from django.apps import AppConfig


class LaboratoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.laboratory'
    verbose_name = 'Laboratoire (LIMS)'
    
    def ready(self):
        import apps.laboratory.signals  # noqa
