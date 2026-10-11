"""
Utilitaires d'initialisation du plan comptable.
Utilisé par :
  - la commande management setup_accounting
  - le signal post_save Organization (première création)
  - l'endpoint API /accounting/setup/
  - le choix du pays (Paramètres / onboarding) pour une organisation sans écriture
"""
from apps.accounting.charts import install_chart, org_standard, CHARTS


def setup_accounting_for_org(organization):
    """
    Crée les comptes et journaux du référentiel de l'organisation (plan historique Procura si
    aucun référentiel n'est choisi). Idempotent : n'écrase rien d'existant.
    Retourne (accounts_created, journals_created) ; journals_created vaut 0 (non compté).
    """
    return install_chart(organization, org_standard(organization)), 0


def adopt_country_chart(organization, standard):
    """
    Pays choisi alors que l'organisation n'a encore aucune écriture : on passe directement au plan
    de son pays (comptes recodés, rien à reprendre). Sinon on laisse le plan en place ; le passage
    reste proposé dans Comptabilité (apps.accounting.charts.apply_switch).
    Retourne True si le plan a été changé.
    """
    from apps.accounting.models import JournalEntry
    from apps.accounting.charts import apply_switch
    if standard not in CHARTS or org_standard(organization) == standard:
        return False
    if organization.settings.accounting_standard:
        return False
    if JournalEntry.objects.filter(organization=organization).exists():
        return False
    apply_switch(organization, standard)
    return True
