"""
Utilitaires d'initialisation du plan comptable.
Utilisé par :
  - la commande management setup_accounting
  - le signal post_save Organization (première création)
  - l'endpoint API /accounting/setup/
"""
from apps.accounting.management.commands.setup_accounting import (
    DEFAULT_ACCOUNTS,
    DEFAULT_JOURNALS,
)


def setup_accounting_for_org(organization):
    """
    Crée les comptes et journaux par défaut pour une organisation.
    Idempotent : utilise get_or_create, n'écrase rien d'existant.
    Retourne (accounts_created, journals_created).
    """
    from apps.accounting.models import Account, AccountingJournal

    accounts_created = 0
    for code, name, atype in DEFAULT_ACCOUNTS:
        _, created = Account.objects.get_or_create(
            organization=organization,
            code=code,
            defaults={
                'name': name,
                'account_type': atype,
                'is_system': False,
                'is_active': True,
            }
        )
        if created:
            accounts_created += 1

    journals_created = 0
    for code, name, jtype in DEFAULT_JOURNALS:
        _, created = AccountingJournal.objects.get_or_create(
            organization=organization,
            code=code,
            defaults={'name': name, 'journal_type': jtype, 'is_active': True}
        )
        if created:
            journals_created += 1

    return accounts_created, journals_created
