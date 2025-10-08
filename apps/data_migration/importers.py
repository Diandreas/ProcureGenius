"""
Services d'import pour Excel/CSV et QuickBooks
"""
import csv
import io
import pandas as pd
import logging
from typing import Dict, List, Any
from django.db import transaction
from apps.suppliers.models import Supplier
from apps.invoicing.models import Product, Invoice, InvoiceItem
from apps.accounts.models import Client
from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from .models import MigrationJob, MigrationLog

logger = logging.getLogger(__name__)


class ExcelCSVImporter:
    """Importeur pour fichiers Excel et CSV"""

    def __init__(self, job: MigrationJob):
        self.job = job
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0

    def read_file(self) -> pd.DataFrame:
        """Lit le fichier Excel ou CSV"""
        try:
            file_path = self.job.source_file.path
            file_extension = file_path.lower().split('.')[-1]

            if file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file_path, header=0 if self.job.has_header else None)
            else:  # CSV
                df = pd.read_csv(
                    file_path,
                    encoding=self.job.file_encoding,
                    delimiter=self.job.delimiter,
                    header=0 if self.job.has_header else None
                )

            # Remplace les NaN par des chaînes vides
            df = df.fillna('')

            return df

        except Exception as e:
            logger.error(f"Erreur lors de la lecture du fichier: {str(e)}")
            raise

    def preview_data(self, max_rows: int = 10) -> List[Dict]:
        """Génère un aperçu des données"""
        try:
            df = self.read_file()
            preview = []

            for index, row in df.head(max_rows).iterrows():
                preview.append({
                    'row_number': index + 1,
                    'data': row.to_dict()
                })

            # Sauvegarde l'aperçu
            self.job.preview_data = preview
            self.job.total_rows = len(df)
            self.job.save(update_fields=['preview_data', 'total_rows'])

            return preview

        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'aperçu: {str(e)}")
            raise

    def get_available_fields(self) -> Dict[str, List[str]]:
        """Retourne les champs disponibles pour le mapping"""
        entity_fields = {
            'suppliers': [
                'name', 'email', 'phone', 'address', 'city', 'province',
                'postal_code', 'country', 'contact_person', 'website',
                'tax_number', 'payment_terms', 'notes'
            ],
            'products': [
                'name', 'sku', 'description', 'category', 'unit_price',
                'cost_price', 'stock_quantity', 'unit_of_measure',
                'supplier', 'notes'
            ],
            'clients': [
                'name', 'email', 'phone', 'address', 'contact_person', 'tax_id'
            ],
            'purchase_orders': [
                'po_number', 'supplier', 'order_date', 'delivery_date',
                'status', 'priority', 'notes', 'shipping_address'
            ],
            'invoices': [
                'invoice_number', 'supplier', 'client', 'invoice_date',
                'due_date', 'status', 'notes', 'payment_terms'
            ],
        }

        return entity_fields.get(self.job.entity_type, [])

    def apply_field_mapping(self, row: pd.Series) -> Dict[str, Any]:
        """Applique le mapping des champs"""
        mapped_data = {}

        for source_field, dest_field in self.job.field_mapping.items():
            value = row.get(source_field, '')

            # Applique les règles de transformation
            if dest_field in self.job.transformation_rules:
                rules = self.job.transformation_rules[dest_field]
                transform_type = rules.get('type')

                if transform_type == 'uppercase':
                    value = str(value).upper()
                elif transform_type == 'lowercase':
                    value = str(value).lower()
                elif transform_type == 'capitalize':
                    value = str(value).capitalize()
                elif transform_type == 'strip':
                    value = str(value).strip()

            mapped_data[dest_field] = value

        # Ajoute les valeurs par défaut
        for field, default_value in self.job.default_values.items():
            if field not in mapped_data or not mapped_data[field]:
                mapped_data[field] = default_value

        return mapped_data

    def import_suppliers(self, df: pd.DataFrame):
        """Importe les fournisseurs"""
        for index, row in df.iterrows():
            row_number = index + 1

            try:
                mapped_data = self.apply_field_mapping(row)

                # Vérifie les doublons
                if self.job.skip_duplicates:
                    existing = Supplier.objects.filter(
                        email=mapped_data.get('email')
                    ).first()

                    if existing:
                        if self.job.update_existing:
                            # Met à jour l'existant
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()

                            self._log_success(row_number, row, mapped_data, existing.id, 'Supplier', 'updated')
                        else:
                            # Ignore le doublon
                            self.skipped_count += 1
                            self._log_skip(row_number, row, "Fournisseur existe déjà")
                        continue

                # Crée le nouveau fournisseur
                supplier = Supplier.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(row_number, row, mapped_data, supplier.id, 'Supplier', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(row_number, row, str(e))

            finally:
                self.job.processed_rows += 1
                if self.job.processed_rows % 10 == 0:
                    self.job.save(update_fields=['processed_rows', 'success_count', 'error_count', 'skipped_count'])

    def import_products(self, df: pd.DataFrame):
        """Importe les produits"""
        for index, row in df.iterrows():
            row_number = index + 1

            try:
                mapped_data = self.apply_field_mapping(row)

                # Gère la relation avec le fournisseur
                supplier_name = mapped_data.pop('supplier', None)
                if supplier_name:
                    supplier = Supplier.objects.filter(name=supplier_name).first()
                    if supplier:
                        mapped_data['supplier'] = supplier

                # Vérifie les doublons
                if self.job.skip_duplicates:
                    existing = Product.objects.filter(
                        sku=mapped_data.get('sku')
                    ).first()

                    if existing:
                        if self.job.update_existing:
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()

                            self._log_success(row_number, row, mapped_data, existing.id, 'Product', 'updated')
                        else:
                            self.skipped_count += 1
                            self._log_skip(row_number, row, "Produit existe déjà")
                        continue

                # Crée le nouveau produit
                product = Product.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(row_number, row, mapped_data, product.id, 'Product', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(row_number, row, str(e))

            finally:
                self.job.processed_rows += 1
                if self.job.processed_rows % 10 == 0:
                    self.job.save(update_fields=['processed_rows', 'success_count', 'error_count', 'skipped_count'])

    def import_clients(self, df: pd.DataFrame):
        """Importe les clients"""
        for index, row in df.iterrows():
            row_number = index + 1

            try:
                mapped_data = self.apply_field_mapping(row)

                # Vérifie les doublons
                if self.job.skip_duplicates:
                    existing = Client.objects.filter(
                        email=mapped_data.get('email')
                    ).first()

                    if existing:
                        if self.job.update_existing:
                            # Met à jour l'existant
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()

                            self._log_success(row_number, row, mapped_data, existing.id, 'Client', 'updated')
                        else:
                            # Ignore le doublon
                            self.skipped_count += 1
                            self._log_skip(row_number, row, "Client existe déjà")
                        continue

                # Crée le nouveau client
                client = Client.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(row_number, row, mapped_data, client.id, 'Client', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(row_number, row, str(e))

            finally:
                self.job.processed_rows += 1
                if self.job.processed_rows % 10 == 0:
                    self.job.save(update_fields=['processed_rows', 'success_count', 'error_count', 'skipped_count'])

    def import_purchase_orders(self, df: pd.DataFrame):
        """Importe les bons de commande"""
        for index, row in df.iterrows():
            row_number = index + 1

            try:
                mapped_data = self.apply_field_mapping(row)

                # Gère la relation avec le fournisseur
                supplier_name = mapped_data.pop('supplier', None)
                if supplier_name:
                    supplier = Supplier.objects.filter(name=supplier_name).first()
                    if supplier:
                        mapped_data['supplier'] = supplier
                    else:
                        self._log_error(row_number, row, f"Fournisseur '{supplier_name}' introuvable")
                        self.error_count += 1
                        continue

                # Vérifie les doublons par PO number
                if self.job.skip_duplicates and mapped_data.get('po_number'):
                    existing = PurchaseOrder.objects.filter(
                        po_number=mapped_data.get('po_number')
                    ).first()

                    if existing:
                        if self.job.update_existing:
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()

                            self._log_success(row_number, row, mapped_data, existing.id, 'PurchaseOrder', 'updated')
                        else:
                            self.skipped_count += 1
                            self._log_skip(row_number, row, "Bon de commande existe déjà")
                        continue

                # Crée le nouveau bon de commande
                po = PurchaseOrder.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(row_number, row, mapped_data, po.id, 'PurchaseOrder', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(row_number, row, str(e))

            finally:
                self.job.processed_rows += 1
                if self.job.processed_rows % 10 == 0:
                    self.job.save(update_fields=['processed_rows', 'success_count', 'error_count', 'skipped_count'])

    def import_invoices(self, df: pd.DataFrame):
        """Importe les factures"""
        for index, row in df.iterrows():
            row_number = index + 1

            try:
                mapped_data = self.apply_field_mapping(row)

                # Gère la relation avec le fournisseur
                supplier_name = mapped_data.pop('supplier', None)
                if supplier_name:
                    supplier = Supplier.objects.filter(name=supplier_name).first()
                    if supplier:
                        mapped_data['supplier'] = supplier

                # Gère la relation avec le client
                client_name = mapped_data.pop('client', None)
                if client_name:
                    client = Client.objects.filter(name=client_name).first()
                    if client:
                        mapped_data['client'] = client

                # Vérifie les doublons par invoice number
                if self.job.skip_duplicates and mapped_data.get('invoice_number'):
                    existing = Invoice.objects.filter(
                        invoice_number=mapped_data.get('invoice_number')
                    ).first()

                    if existing:
                        if self.job.update_existing:
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()

                            self._log_success(row_number, row, mapped_data, existing.id, 'Invoice', 'updated')
                        else:
                            self.skipped_count += 1
                            self._log_skip(row_number, row, "Facture existe déjà")
                        continue

                # Crée la nouvelle facture
                invoice = Invoice.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(row_number, row, mapped_data, invoice.id, 'Invoice', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(row_number, row, str(e))

            finally:
                self.job.processed_rows += 1
                if self.job.processed_rows % 10 == 0:
                    self.job.save(update_fields=['processed_rows', 'success_count', 'error_count', 'skipped_count'])

    def run_import(self):
        """Exécute l'import complet"""
        try:
            self.job.start()

            df = self.read_file()
            self.job.total_rows = len(df)
            self.job.save(update_fields=['total_rows'])

            # Import selon le type d'entité
            if self.job.entity_type == 'suppliers':
                self.import_suppliers(df)
            elif self.job.entity_type == 'products':
                self.import_products(df)
            elif self.job.entity_type == 'clients':
                self.import_clients(df)
            elif self.job.entity_type == 'purchase_orders':
                self.import_purchase_orders(df)
            elif self.job.entity_type == 'invoices':
                self.import_invoices(df)

            # Met à jour les statistiques finales
            self.job.success_count = self.success_count
            self.job.error_count = self.error_count
            self.job.skipped_count = self.skipped_count
            self.job.complete()

            logger.info(
                f"Import terminé: {self.success_count} succès, "
                f"{self.error_count} erreurs, {self.skipped_count} ignorés"
            )

        except Exception as e:
            logger.error(f"Erreur lors de l'import: {str(e)}")
            self.job.fail(str(e))
            raise

    def _log_success(self, row_number: int, source_data: pd.Series,
                     transformed_data: Dict, object_id: str, object_type: str, action: str):
        """Enregistre un succès"""
        MigrationLog.objects.create(
            job=self.job,
            level='success',
            message=f"{object_type} {action} avec succès",
            row_number=row_number,
            source_data=source_data.to_dict(),
            transformed_data=transformed_data,
            created_object_id=str(object_id),
            created_object_type=object_type
        )

    def _log_error(self, row_number: int, source_data: pd.Series, error_message: str):
        """Enregistre une erreur"""
        MigrationLog.objects.create(
            job=self.job,
            level='error',
            message=error_message,
            row_number=row_number,
            source_data=source_data.to_dict() if hasattr(source_data, 'to_dict') else {}
        )

    def _log_skip(self, row_number: int, source_data: pd.Series, reason: str):
        """Enregistre un élément ignoré"""
        MigrationLog.objects.create(
            job=self.job,
            level='warning',
            message=reason,
            row_number=row_number,
            source_data=source_data.to_dict()
        )
