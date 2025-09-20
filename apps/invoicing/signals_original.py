from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Invoice, Payment, RecurringInvoice


@receiver(pre_save, sender=Invoice)
def set_invoice_due_date(sender, instance, **kwargs):
    """Calcule automatiquement la date d'échéance selon les termes de paiement"""
    if not instance.due_date and instance.invoice_date:
        # Parser les termes de paiement (ex: "NET 30", "NET 15")
        terms = instance.payment_terms.upper()
        days = 30  # Par défaut
        
        if 'NET' in terms:
            try:
                days = int(terms.split('NET')[-1].strip())
            except (ValueError, IndexError):
                days = 30
        
        from datetime import timedelta
        instance.due_date = instance.invoice_date + timedelta(days=days)


@receiver(post_save, sender=Invoice)
def generate_invoice_number(sender, instance, created, **kwargs):
    """Génère automatiquement un numéro de facture si nécessaire"""
    if created and not instance.number:
        year = timezone.now().year
        
        # Trouver le dernier numéro de l'année
        last_invoice = Invoice.objects.filter(
            number__startswith=f'INV{year}'
        ).exclude(pk=instance.pk).order_by('-number').first()
        
        if last_invoice and last_invoice.number:
            try:
                last_num = int(last_invoice.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
        
        instance.number = f'INV{year}-{new_num:05d}'
        instance.save(update_fields=['number'])


@receiver(post_save, sender=Invoice)
def update_overdue_status(sender, instance, **kwargs):
    """Met à jour le statut en retard automatiquement"""
    if instance.is_overdue() and instance.status in ['sent', 'viewed', 'partial']:
        if instance.status != 'overdue':
            instance.status = 'overdue'
            instance.save(update_fields=['status'])


@receiver(post_save, sender=Payment)
def update_invoice_status_on_payment(sender, instance, created, **kwargs):
    """Met à jour le statut de la facture lors d'un paiement"""
    if created:
        invoice = instance.invoice
        
        # Calculer le total des paiements
        total_paid = sum(p.amount.amount for p in invoice.payments.all())
        
        # Mettre à jour le statut
        if total_paid >= invoice.total_amount.amount:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'partial'
        
        invoice.save(update_fields=['status'])


@receiver(post_save, sender=RecurringInvoice)
def schedule_next_recurring_invoice(sender, instance, created, **kwargs):
    """Programme la prochaine facture récurrente"""
    if created and not instance.next_invoice_date:
        instance.next_invoice_date = instance.start_date
        instance.save(update_fields=['next_invoice_date'])