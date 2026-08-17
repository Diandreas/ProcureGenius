"""
Application de la réduction "Carte Privilège" aux factures des modules santé.
Logique partagée par ConsultationInvoiceService, LabOrderInvoiceService,
PharmacyInvoiceService et ImagingOrderInvoiceService.
"""
from decimal import Decimal

MODULE_DISCOUNT_FIELDS = {
    'laboratory': 'privilege_card_laboratory_discount_percent',
    'imaging': 'privilege_card_imaging_discount_percent',
    'pharmacy': 'privilege_card_pharmacy_discount_percent',
    'consultation': 'privilege_card_consultation_discount_percent',
}


def apply_privilege_card_discount(invoice, patient, module, used_by_patient=None, used_by_name='', used_by_relationship=''):
    """
    Si le patient a la carte privilège et que la fonctionnalité est activée pour
    l'organisation, applique le taux de réduction configuré pour ce module sur
    chaque ligne déjà créée de la facture, et journalise l'utilisation.

    À appeler après création des InvoiceItem et AVANT invoice.recalculate_totals().
    Retourne l'objet PrivilegeCardUsage créé, ou None si rien n'a été appliqué.
    """
    if not patient or not getattr(patient, 'has_privilege_card', False):
        return None

    from apps.core.models import OrganizationSettings
    org_settings = OrganizationSettings.objects.filter(organization=patient.organization).first()
    if not org_settings or not org_settings.privilege_card_enabled:
        return None

    field_name = MODULE_DISCOUNT_FIELDS.get(module)
    if not field_name:
        return None
    rate = getattr(org_settings, field_name, None) or Decimal('0')
    if rate <= 0:
        return None

    total_discount = Decimal('0')
    for item in invoice.items.all():
        item_discount = (item.total_price * rate / Decimal('100')).quantize(Decimal('0.01'))
        if item_discount <= 0:
            continue
        item.discount_amount = (item.discount_amount or Decimal('0')) + item_discount
        item.total_price = item.total_price - item_discount
        item.save(update_fields=['discount_amount', 'total_price'])
        total_discount += item_discount

    if total_discount <= 0:
        return None

    from apps.accounts.models import PrivilegeCardUsage
    return PrivilegeCardUsage.objects.create(
        organization=patient.organization,
        card_holder=patient,
        used_by_patient=used_by_patient,
        used_by_name=used_by_name,
        used_by_relationship=used_by_relationship,
        invoice=invoice,
        module=module,
        discount_amount=total_discount,
    )
