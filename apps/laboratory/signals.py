"""
Signals for automatic laboratory order billing
Creates invoices when lab results are verified
"""
from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from .models import LabOrder, LabTest, SubcontractorLab, SubcontractorPrice, Prescriber
from apps.invoicing.models import Invoice
from django.utils import timezone
from datetime import timedelta
import logging
import threading

LAB_ORDER_AUDIT_FIELDS = ['status', 'priority', 'subcontractor_id', 'payment_method']

logger = logging.getLogger(__name__)

# Thread-local pour stocker l'utilisateur courant (injecté depuis les views)
_thread_local = threading.local()


def get_current_user():
    return getattr(_thread_local, 'current_user', None)


def set_current_user(user):
    _thread_local.current_user = user


def _diff(old_obj, new_obj, fields):
    """Calcule le diff entre deux instances sur les champs donnés."""
    changes = {}
    for field in fields:
        old_val = getattr(old_obj, field, None)
        new_val = getattr(new_obj, field, None)
        if str(old_val) != str(new_val):
            changes[field] = [str(old_val), str(new_val)]
    return changes

logger = logging.getLogger(__name__)


@receiver(post_save, sender=LabOrder)
def create_invoice_for_lab_order(sender, instance, **kwargs):
    """
    Crée une facture pour une commande de labo une fois que les résultats sont validés
    """
    # Only when results are verified and not already billed
    if instance.status != 'verified':
        return
    
    # Check if already billed
    if hasattr(instance, 'care_services') and instance.care_services.filter(is_billed=True).exists():
        return
    
    try:
        # Create invoice
        due_date = timezone.now().date() + timedelta(days=7)
        invoice = Invoice.objects.create(
            organization=instance.organization,
            client=instance.patient,
            created_by=instance.ordered_by or instance.organization.users.first(),
            title=f"Analyses Laboratoire - {instance.order_number}",
            description=f"Tests commandés le {instance.order_date.strftime('%d/%m/%Y')}",
            invoice_type='healthcare_laboratory',
            due_date=due_date,
            subtotal=0,
            total_amount=0,
            status='paid'
        )
        
        # Add all tests as items
        for item in instance.items.all():
            result_text = f"Résultat: {item.result_value}" if item.result_value else "En attente"
            abnormal_text = ""
            if item.abnormality:
                abnormal_text = f"\\n[{item.get_abnormality_display()}]"
            
            invoice.add_item(
                service_code=item.lab_test.test_code,
                description=item.lab_test.name,
                detailed_description=f"{result_text}{abnormal_text}",
                quantity=1,
                unit_price=item.price,  # Use price from LabOrderItem
                product=item.lab_test.service_product if hasattr(item.lab_test, 'service_product') else None
            )
        
        invoice.recalculate_totals()
        
        logger.info(f"Created invoice {invoice.invoice_number} for lab order {instance.order_number}")
    
    except Exception as e:
        logger.error(f"Error creating invoice for lab order {instance.id}: {str(e)}", exc_info=True)


# =============================================================================
# Audit log signals — LabTest
# =============================================================================

LAB_TEST_AUDIT_FIELDS = ['name', 'test_code', 'price', 'subcontract_price', 'operating_cost', 'is_active', 'category_id']


@receiver(pre_save, sender=LabTest)
def lab_test_pre_save(sender, instance, **kwargs):
    """Snapshot de l'instance avant modification."""
    if instance.pk:
        try:
            instance._pre_save_snapshot = LabTest.objects.get(pk=instance.pk)
        except LabTest.DoesNotExist:
            instance._pre_save_snapshot = None
    else:
        instance._pre_save_snapshot = None


@receiver(post_save, sender=LabTest)
def lab_test_post_save(sender, instance, created, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        if created:
            LabAuditLog.log(
                user=user,
                action=LabAuditLog.ACTION_CREATE,
                target_type=LabAuditLog.TARGET_LAB_TEST,
                target_obj=instance,
                changes={'price': [None, str(instance.price)], 'test_code': [None, instance.test_code]},
            )
        else:
            snapshot = getattr(instance, '_pre_save_snapshot', None)
            changes = _diff(snapshot, instance, LAB_TEST_AUDIT_FIELDS) if snapshot else {}
            if changes:
                LabAuditLog.log(
                    user=user,
                    action=LabAuditLog.ACTION_UPDATE,
                    target_type=LabAuditLog.TARGET_LAB_TEST,
                    target_obj=instance,
                    changes=changes,
                )
    except Exception as e:
        logger.warning(f"LabAuditLog post_save LabTest failed: {e}")


@receiver(post_delete, sender=LabTest)
def lab_test_post_delete(sender, instance, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        LabAuditLog.log(
            user=user,
            action=LabAuditLog.ACTION_DELETE,
            target_type=LabAuditLog.TARGET_LAB_TEST,
            target_obj=instance,
        )
    except Exception as e:
        logger.warning(f"LabAuditLog post_delete LabTest failed: {e}")


# =============================================================================
# Audit log signals — SubcontractorLab
# =============================================================================

SUBCONTRACTOR_AUDIT_FIELDS = ['name', 'is_active', 'email', 'phone']


@receiver(pre_save, sender=SubcontractorLab)
def subcontractor_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._pre_save_snapshot = SubcontractorLab.objects.get(pk=instance.pk)
        except SubcontractorLab.DoesNotExist:
            instance._pre_save_snapshot = None
    else:
        instance._pre_save_snapshot = None


@receiver(post_save, sender=SubcontractorLab)
def subcontractor_post_save(sender, instance, created, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        if created:
            LabAuditLog.log(user=user, action=LabAuditLog.ACTION_CREATE,
                            target_type=LabAuditLog.TARGET_SUBCONTRACTOR, target_obj=instance)
        else:
            snapshot = getattr(instance, '_pre_save_snapshot', None)
            changes = _diff(snapshot, instance, SUBCONTRACTOR_AUDIT_FIELDS) if snapshot else {}
            if changes:
                LabAuditLog.log(user=user, action=LabAuditLog.ACTION_UPDATE,
                                target_type=LabAuditLog.TARGET_SUBCONTRACTOR, target_obj=instance, changes=changes)
    except Exception as e:
        logger.warning(f"LabAuditLog post_save SubcontractorLab failed: {e}")


@receiver(post_delete, sender=SubcontractorLab)
def subcontractor_post_delete(sender, instance, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        LabAuditLog.log(user=user, action=LabAuditLog.ACTION_DELETE,
                        target_type=LabAuditLog.TARGET_SUBCONTRACTOR, target_obj=instance)
    except Exception as e:
        logger.warning(f"LabAuditLog post_delete SubcontractorLab failed: {e}")


# =============================================================================
# Audit log signals — SubcontractorPrice
# =============================================================================

PRICE_AUDIT_FIELDS = ['price', 'is_active']


@receiver(pre_save, sender=SubcontractorPrice)
def subcontractor_price_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._pre_save_snapshot = SubcontractorPrice.objects.get(pk=instance.pk)
        except SubcontractorPrice.DoesNotExist:
            instance._pre_save_snapshot = None
    else:
        instance._pre_save_snapshot = None


@receiver(post_save, sender=SubcontractorPrice)
def subcontractor_price_post_save(sender, instance, created, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        if created:
            LabAuditLog.log(user=user, action=LabAuditLog.ACTION_CREATE,
                            target_type=LabAuditLog.TARGET_SUBCONTRACTOR_PRICE, target_obj=instance,
                            changes={'price': [None, str(instance.price)]})
        else:
            snapshot = getattr(instance, '_pre_save_snapshot', None)
            changes = _diff(snapshot, instance, PRICE_AUDIT_FIELDS) if snapshot else {}
            if changes:
                LabAuditLog.log(user=user, action=LabAuditLog.ACTION_UPDATE,
                                target_type=LabAuditLog.TARGET_SUBCONTRACTOR_PRICE, target_obj=instance, changes=changes)
    except Exception as e:
        logger.warning(f"LabAuditLog post_save SubcontractorPrice failed: {e}")


# =============================================================================
# Audit log signals — LabOrder
# =============================================================================

@receiver(pre_save, sender=LabOrder)
def lab_order_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._pre_save_snapshot = LabOrder.objects.get(pk=instance.pk)
        except LabOrder.DoesNotExist:
            instance._pre_save_snapshot = None
    else:
        instance._pre_save_snapshot = None


@receiver(post_save, sender=LabOrder)
def lab_order_post_save(sender, instance, created, **kwargs):
    from .models import LabAuditLog
    user = get_current_user() or instance.ordered_by
    try:
        if created:
            LabAuditLog.log(
                user=user,
                action=LabAuditLog.ACTION_CREATE,
                target_type=LabAuditLog.TARGET_LAB_ORDER,
                target_obj=instance,
                changes={'status': [None, instance.status], 'total_price': [None, str(instance.total_price)]},
            )
        else:
            snapshot = getattr(instance, '_pre_save_snapshot', None)
            changes = _diff(snapshot, instance, LAB_ORDER_AUDIT_FIELDS) if snapshot else {}
            if changes:
                LabAuditLog.log(
                    user=user,
                    action=LabAuditLog.ACTION_UPDATE,
                    target_type=LabAuditLog.TARGET_LAB_ORDER,
                    target_obj=instance,
                    changes=changes,
                )
    except Exception as e:
        logger.warning(f"LabAuditLog post_save LabOrder failed: {e}")


@receiver(post_delete, sender=LabOrder)
def lab_order_post_delete(sender, instance, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        LabAuditLog.log(
            user=user,
            action=LabAuditLog.ACTION_DELETE,
            target_type=LabAuditLog.TARGET_LAB_ORDER,
            target_obj=instance,
        )
    except Exception as e:
        logger.warning(f"LabAuditLog post_delete LabOrder failed: {e}")


# =============================================================================
# Audit log signals — Invoice (annulation = suppression logique)
# =============================================================================

@receiver(post_save, sender=Invoice)
def invoice_audit_log(sender, instance, created, **kwargs):
    from .models import LabAuditLog
    user = get_current_user() or getattr(instance, 'created_by', None)
    try:
        if created:
            LabAuditLog.log(
                user=user,
                action=LabAuditLog.ACTION_CREATE,
                target_type='invoice',
                target_obj=instance,
                changes={'status': [None, instance.status], 'total': [None, str(instance.total_amount)]},
            )
        else:
            old_status = getattr(instance, '_old_status', None)
            if old_status and old_status != instance.status:
                action = LabAuditLog.ACTION_DELETE if instance.status == 'cancelled' else LabAuditLog.ACTION_UPDATE
                LabAuditLog.log(
                    user=user,
                    action=action,
                    target_type='invoice',
                    target_obj=instance,
                    changes={'status': [old_status, instance.status]},
                )
    except Exception as e:
        logger.warning(f"LabAuditLog invoice_audit_log failed: {e}")


# =============================================================================
# Audit log signals — Prescriber
# =============================================================================

PRESCRIBER_AUDIT_FIELDS = ['first_name', 'last_name', 'specialty', 'clinic_name', 'commission_rate', 'is_active']


@receiver(pre_save, sender=Prescriber)
def prescriber_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._pre_save_snapshot = Prescriber.objects.get(pk=instance.pk)
        except Prescriber.DoesNotExist:
            instance._pre_save_snapshot = None
    else:
        instance._pre_save_snapshot = None


@receiver(post_save, sender=Prescriber)
def prescriber_post_save(sender, instance, created, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        if created:
            LabAuditLog.log(
                user=user,
                action=LabAuditLog.ACTION_CREATE,
                target_type=LabAuditLog.TARGET_PRESCRIBER,
                target_obj=instance,
                changes={
                    'nom': [None, instance.get_full_name() if hasattr(instance, 'get_full_name') else str(instance)],
                    'specialite': [None, instance.specialty or ''],
                    'commission': [None, str(instance.commission_rate or 0)],
                },
            )
        else:
            snapshot = getattr(instance, '_pre_save_snapshot', None)
            changes = _diff(snapshot, instance, PRESCRIBER_AUDIT_FIELDS) if snapshot else {}
            if changes:
                LabAuditLog.log(
                    user=user,
                    action=LabAuditLog.ACTION_UPDATE,
                    target_type=LabAuditLog.TARGET_PRESCRIBER,
                    target_obj=instance,
                    changes=changes,
                )
    except Exception as e:
        logger.warning(f"LabAuditLog post_save Prescriber failed: {e}")


@receiver(post_delete, sender=Prescriber)
def prescriber_post_delete(sender, instance, **kwargs):
    from .models import LabAuditLog
    user = get_current_user()
    try:
        LabAuditLog.log(
            user=user,
            action=LabAuditLog.ACTION_DELETE,
            target_type=LabAuditLog.TARGET_PRESCRIBER,
            target_obj=instance,
        )
    except Exception as e:
        logger.warning(f"LabAuditLog post_delete Prescriber failed: {e}")
