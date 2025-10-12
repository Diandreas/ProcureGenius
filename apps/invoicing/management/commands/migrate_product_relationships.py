"""
Script de migration pour lier les InvoiceItems, PurchaseOrderItems et BidItems existants aux Products
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.invoicing.models import InvoiceItem, Product, Warehouse
from apps.purchase_orders.models import PurchaseOrderItem
from apps.e_sourcing.models import BidItem


class Command(BaseCommand):
    help = 'Migre les données existantes pour lier les items aux produits via FK'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simule la migration sans modifier la base de données',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Mode DRY-RUN activé - Aucune modification ne sera faite'))
        
        # Compteurs
        stats = {
            'invoice_items_linked': 0,
            'invoice_items_failed': 0,
            'po_items_linked': 0,
            'po_items_failed': 0,
            'bid_items_linked': 0,
            'bid_items_failed': 0,
            'products_with_warehouse': 0,
        }
        
        with transaction.atomic():
            # 1. Lier InvoiceItems aux Products
            self.stdout.write('\n1. Migration des InvoiceItems...')
            invoice_items = InvoiceItem.objects.filter(product__isnull=True)
            total_invoice_items = invoice_items.count()
            
            for item in invoice_items:
                if item.product_reference:
                    product = Product.objects.filter(reference=item.product_reference).first()
                    if product:
                        if not dry_run:
                            item.product = product
                            item.save(update_fields=['product'])
                        stats['invoice_items_linked'] += 1
                        self.stdout.write(f'  ✓ InvoiceItem {item.id} lié à Product {product.name}')
                    else:
                        stats['invoice_items_failed'] += 1
                        self.stdout.write(self.style.WARNING(
                            f'  ✗ InvoiceItem {item.id} - Produit non trouvé: {item.product_reference}'
                        ))
            
            self.stdout.write(self.style.SUCCESS(
                f'InvoiceItems: {stats["invoice_items_linked"]}/{total_invoice_items} liés'
            ))
            
            # 2. Lier PurchaseOrderItems aux Products
            self.stdout.write('\n2. Migration des PurchaseOrderItems...')
            po_items = PurchaseOrderItem.objects.filter(product__isnull=True)
            total_po_items = po_items.count()
            
            for item in po_items:
                if item.product_reference:
                    product = Product.objects.filter(reference=item.product_reference).first()
                    if product:
                        if not dry_run:
                            item.product = product
                            item.save(update_fields=['product'])
                        stats['po_items_linked'] += 1
                        self.stdout.write(f'  ✓ PurchaseOrderItem {item.id} lié à Product {product.name}')
                    else:
                        stats['po_items_failed'] += 1
                        self.stdout.write(self.style.WARNING(
                            f'  ✗ PurchaseOrderItem {item.id} - Produit non trouvé: {item.product_reference}'
                        ))
            
            self.stdout.write(self.style.SUCCESS(
                f'PurchaseOrderItems: {stats["po_items_linked"]}/{total_po_items} liés'
            ))
            
            # 3. Lier BidItems aux Products
            self.stdout.write('\n3. Migration des BidItems...')
            bid_items = BidItem.objects.filter(product__isnull=True)
            total_bid_items = bid_items.count()
            
            for item in bid_items:
                if item.product_reference:
                    product = Product.objects.filter(reference=item.product_reference).first()
                    if product:
                        if not dry_run:
                            item.product = product
                            item.save(update_fields=['product'])
                        stats['bid_items_linked'] += 1
                        self.stdout.write(f'  ✓ BidItem {item.id} lié à Product {product.name}')
                    else:
                        stats['bid_items_failed'] += 1
                        self.stdout.write(self.style.WARNING(
                            f'  ✗ BidItem {item.id} - Produit non trouvé: {item.product_reference}'
                        ))
            
            self.stdout.write(self.style.SUCCESS(
                f'BidItems: {stats["bid_items_linked"]}/{total_bid_items} liés'
            ))
            
            # 4. Assigner warehouse par défaut aux produits sans warehouse
            self.stdout.write('\n4. Attribution warehouse par défaut...')
            products_without_warehouse = Product.objects.filter(warehouse__isnull=True)
            total_products = products_without_warehouse.count()
            
            if total_products > 0:
                default_warehouse = Warehouse.objects.first()
                if default_warehouse:
                    if not dry_run:
                        products_without_warehouse.update(warehouse=default_warehouse)
                    stats['products_with_warehouse'] = total_products
                    self.stdout.write(self.style.SUCCESS(
                        f'{total_products} produits assignés à warehouse: {default_warehouse.name}'
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f'Aucun warehouse trouvé - {total_products} produits restent sans warehouse'
                    ))
            else:
                self.stdout.write('Tous les produits ont déjà un warehouse assigné')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('\n⚠️ Mode DRY-RUN - Rollback de toutes les modifications'))
                raise Exception('Dry run - rollback')
        
        # Résumé final
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('RÉSUMÉ DE LA MIGRATION:'))
        self.stdout.write(f'  InvoiceItems liés:        {stats["invoice_items_linked"]} (échecs: {stats["invoice_items_failed"]})')
        self.stdout.write(f'  PurchaseOrderItems liés:  {stats["po_items_linked"]} (échecs: {stats["po_items_failed"]})')
        self.stdout.write(f'  BidItems liés:            {stats["bid_items_linked"]} (échecs: {stats["bid_items_failed"]})')
        self.stdout.write(f'  Produits avec warehouse:  {stats["products_with_warehouse"]}')
        self.stdout.write('='*60)
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS('\n✓ Migration terminée avec succès!'))
        else:
            self.stdout.write(self.style.WARNING('\n✓ Simulation terminée (aucune modification effectuée)'))

