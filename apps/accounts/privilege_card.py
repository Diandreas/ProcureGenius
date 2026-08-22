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

# Noms de catégorie de produit considérés comme "médicament" pour la réduction
# carte privilège pharmacie — le stock pharmacie mélange médicaments et autres
# produits physiques (consommables labo, matériel médical, etc.), la réduction
# de 15% ne doit porter que sur les vrais médicaments.
MEDICATION_CATEGORY_NAMES = {'medicaments', 'médicaments', 'medicament', 'médicament'}


def is_medication_item(invoice_item):
    """True si la ligne de facture correspond à un produit de catégorie 'Médicaments'."""
    product = invoice_item.product
    if not product or not product.category_id:
        return False
    return product.category.name.strip().lower() in MEDICATION_CATEGORY_NAMES


def apply_privilege_card_discount(invoice, patient, module, used_by_patient=None, used_by_name='', used_by_relationship='', item_filter=None):
    """
    Si le patient a la carte privilège et que la fonctionnalité est activée pour
    l'organisation, applique le taux de réduction configuré pour ce module sur
    les lignes éligibles de la facture (toutes les lignes par défaut, ou
    seulement celles retenues par item_filter(item) -> bool si fourni — ex:
    en laboratoire, uniquement les bilans/packs, jamais les examens individuels),
    et journalise l'utilisation.

    À appeler après création des InvoiceItem et AVANT invoice.recalculate_totals().
    Retourne l'objet PrivilegeCardUsage créé, ou None si rien n'a été appliqué.
    """
    from apps.accounts.models import PrivilegeCardUsage

    # Idempotent : une facture généraliste (page de création de facture) peut être
    # éditée plusieurs fois — les items sont recréés à chaque édition, donc on
    # repart toujours d'un journal d'usage propre pour cette facture avant de
    # ré-appliquer la réduction, plutôt que de l'empiler ou de la dupliquer.
    PrivilegeCardUsage.objects.filter(invoice=invoice).delete()

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
    eligible_items = invoice.items.all()
    if item_filter is not None:
        eligible_items = [item for item in eligible_items if item_filter(item)]
    for item in eligible_items:
        item_discount = (item.total_price * rate / Decimal('100')).quantize(Decimal('0.01'))
        if item_discount <= 0:
            continue
        item.discount_amount = (item.discount_amount or Decimal('0')) + item_discount
        item.total_price = item.total_price - item_discount
        item.save(update_fields=['discount_amount', 'total_price'])
        total_discount += item_discount

    if total_discount <= 0:
        return None

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
