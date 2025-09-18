from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class PurchaseOrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.purchase_orders'
    verbose_name = _('Bons de commande')

    def ready(self):
        import apps.purchase_orders.signals