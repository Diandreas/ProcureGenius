"""
Service d'intégration QuickBooks Online pour import de données
"""
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from django.conf import settings
from django.utils import timezone
from .models import QuickBooksConnection, MigrationJob, MigrationLog

logger = logging.getLogger(__name__)


class QuickBooksService:
    """Service pour interagir avec QuickBooks Online API"""

    # URLs QuickBooks
    OAUTH_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2"
    OAUTH_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    API_BASE_URL = "https://quickbooks.api.intuit.com/v3/company"

    def __init__(self, connection: QuickBooksConnection):
        self.connection = connection
        self.realm_id = connection.realm_id

    def _get_headers(self) -> Dict[str, str]:
        """Retourne les headers pour les requêtes API"""
        # Refresh token if expired
        if self.connection.is_token_expired:
            self._refresh_access_token()

        return {
            'Authorization': f'Bearer {self.connection.access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    def _refresh_access_token(self):
        """Rafraîchit le access token en utilisant le refresh token"""
        try:
            data = {
                'grant_type': 'refresh_token',
                'refresh_token': self.connection.refresh_token,
            }

            # Ces valeurs doivent être configurées dans settings.py
            auth = (
                getattr(settings, 'QUICKBOOKS_CLIENT_ID', ''),
                getattr(settings, 'QUICKBOOKS_CLIENT_SECRET', '')
            )

            response = requests.post(
                self.OAUTH_TOKEN_URL,
                data=data,
                auth=auth
            )
            response.raise_for_status()

            tokens = response.json()

            # Mise à jour de la connexion
            self.connection.access_token = tokens['access_token']
            self.connection.refresh_token = tokens.get('refresh_token', self.connection.refresh_token)
            self.connection.token_expires_at = timezone.now() + timedelta(seconds=tokens['expires_in'])
            self.connection.save()

            logger.info(f"Token QuickBooks rafraîchi pour {self.connection.company_name}")

        except Exception as e:
            logger.error(f"Erreur lors du rafraîchissement du token: {str(e)}")
            raise

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Effectue une requête à l'API QuickBooks"""
        url = f"{self.API_BASE_URL}/{self.realm_id}/{endpoint}"

        try:
            response = requests.get(
                url,
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur requête QuickBooks {endpoint}: {str(e)}")
            raise

    def get_vendors(self, max_results: int = 1000) -> List[Dict]:
        """Récupère la liste des fournisseurs (vendors)"""
        try:
            query = f"SELECT * FROM Vendor MAXRESULTS {max_results}"
            response = self._make_request('query', params={'query': query})

            vendors = response.get('QueryResponse', {}).get('Vendor', [])
            logger.info(f"Récupéré {len(vendors)} fournisseurs depuis QuickBooks")

            return vendors

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des fournisseurs: {str(e)}")
            return []

    def get_customers(self, max_results: int = 1000) -> List[Dict]:
        """Récupère la liste des clients"""
        try:
            query = f"SELECT * FROM Customer MAXRESULTS {max_results}"
            response = self._make_request('query', params={'query': query})

            customers = response.get('QueryResponse', {}).get('Customer', [])
            logger.info(f"Récupéré {len(customers)} clients depuis QuickBooks")

            return customers

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des clients: {str(e)}")
            return []

    def get_items(self, max_results: int = 1000) -> List[Dict]:
        """Récupère la liste des articles/produits"""
        try:
            query = f"SELECT * FROM Item MAXRESULTS {max_results}"
            response = self._make_request('query', params={'query': query})

            items = response.get('QueryResponse', {}).get('Item', [])
            logger.info(f"Récupéré {len(items)} produits depuis QuickBooks")

            return items

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des produits: {str(e)}")
            return []

    def get_invoices(self, max_results: int = 1000) -> List[Dict]:
        """Récupère la liste des factures"""
        try:
            query = f"SELECT * FROM Invoice MAXRESULTS {max_results}"
            response = self._make_request('query', params={'query': query})

            invoices = response.get('QueryResponse', {}).get('Invoice', [])
            logger.info(f"Récupéré {len(invoices)} factures depuis QuickBooks")

            return invoices

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des factures: {str(e)}")
            return []

    def get_purchase_orders(self, max_results: int = 1000) -> List[Dict]:
        """Récupère la liste des bons de commande"""
        try:
            query = f"SELECT * FROM PurchaseOrder MAXRESULTS {max_results}"
            response = self._make_request('query', params={'query': query})

            purchase_orders = response.get('QueryResponse', {}).get('PurchaseOrder', [])
            logger.info(f"Récupéré {len(purchase_orders)} bons de commande depuis QuickBooks")

            return purchase_orders

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des bons de commande: {str(e)}")
            return []

    def test_connection(self) -> bool:
        """Test la connexion QuickBooks"""
        try:
            response = self._make_request('companyinfo/' + self.realm_id)
            company_info = response.get('CompanyInfo', {})

            # Mise à jour du nom de l'entreprise
            if company_info.get('CompanyName'):
                self.connection.company_name = company_info['CompanyName']
                self.connection.save(update_fields=['company_name'])

            logger.info(f"Connexion QuickBooks OK: {company_info.get('CompanyName')}")
            return True

        except Exception as e:
            logger.error(f"Test de connexion QuickBooks échoué: {str(e)}")
            return False


class QuickBooksImporter:
    """Importeur de données depuis QuickBooks vers ProcureGenius"""

    def __init__(self, job: MigrationJob, connection: QuickBooksConnection):
        self.job = job
        self.service = QuickBooksService(connection)
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0

    def _map_vendor_to_supplier(self, vendor: Dict) -> Dict:
        """Mappe un vendor QuickBooks vers un fournisseur ProcureGenius"""
        return {
            'name': vendor.get('DisplayName', ''),
            'email': vendor.get('PrimaryEmailAddr', {}).get('Address', ''),
            'phone': vendor.get('PrimaryPhone', {}).get('FreeFormNumber', ''),
            'address': self._format_address(vendor.get('BillAddr', {})),
            'contact_person': vendor.get('GivenName', '') + ' ' + vendor.get('FamilyName', ''),
            'website': vendor.get('WebAddr', {}).get('URI', ''),
            'notes': f"Importé de QuickBooks - ID: {vendor.get('Id')}"
        }

    def _map_customer_to_client(self, customer: Dict) -> Dict:
        """Mappe un customer QuickBooks vers un client ProcureGenius"""
        return {
            'name': customer.get('DisplayName', ''),
            'email': customer.get('PrimaryEmailAddr', {}).get('Address', ''),
            'phone': customer.get('PrimaryPhone', {}).get('FreeFormNumber', ''),
            'address': self._format_address(customer.get('BillAddr', {})),
            'contact_person': customer.get('GivenName', '') + ' ' + customer.get('FamilyName', ''),
        }

    def _map_item_to_product(self, item: Dict) -> Dict:
        """Mappe un item QuickBooks vers un produit ProcureGenius"""
        return {
            'name': item.get('Name', ''),
            'sku': item.get('Sku', item.get('Id', '')),
            'description': item.get('Description', ''),
            'unit_price': float(item.get('UnitPrice', 0)),
            'cost_price': float(item.get('PurchaseCost', 0)),
            'stock_quantity': int(item.get('QtyOnHand', 0)),
            'notes': f"Importé de QuickBooks - ID: {item.get('Id')}"
        }

    def _format_address(self, addr: Dict) -> str:
        """Formate une adresse QuickBooks"""
        parts = [
            addr.get('Line1', ''),
            addr.get('Line2', ''),
            addr.get('City', ''),
            addr.get('CountrySubDivisionCode', ''),
            addr.get('PostalCode', ''),
        ]
        return ', '.join(filter(None, parts))

    def import_vendors(self):
        """Importe les fournisseurs depuis QuickBooks"""
        from apps.suppliers.models import Supplier

        vendors = self.service.get_vendors()
        self.job.total_rows = len(vendors)
        self.job.save(update_fields=['total_rows'])

        for idx, vendor in enumerate(vendors, 1):
            try:
                mapped_data = self._map_vendor_to_supplier(vendor)

                # Vérifie les doublons
                if self.job.skip_duplicates:
                    existing = Supplier.objects.filter(email=mapped_data.get('email')).first()
                    if existing:
                        if self.job.update_existing:
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()
                            self.success_count += 1
                            self._log_success(idx, vendor, mapped_data, existing.id, 'Supplier', 'updated')
                        else:
                            self.skipped_count += 1
                            self._log_skip(idx, vendor, "Fournisseur existe déjà")
                        continue

                # Crée le nouveau fournisseur
                supplier = Supplier.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(idx, vendor, mapped_data, supplier.id, 'Supplier', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(idx, vendor, str(e))

            finally:
                self.job.processed_rows = idx
                if idx % 10 == 0:
                    self.job.save(update_fields=['processed_rows'])

    def import_customers(self):
        """Importe les clients depuis QuickBooks"""
        from apps.accounts.models import Client

        customers = self.service.get_customers()
        self.job.total_rows = len(customers)
        self.job.save(update_fields=['total_rows'])

        for idx, customer in enumerate(customers, 1):
            try:
                mapped_data = self._map_customer_to_client(customer)

                # Vérifie les doublons
                if self.job.skip_duplicates:
                    existing = Client.objects.filter(email=mapped_data.get('email')).first()
                    if existing:
                        if self.job.update_existing:
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()
                            self.success_count += 1
                            self._log_success(idx, customer, mapped_data, existing.id, 'Client', 'updated')
                        else:
                            self.skipped_count += 1
                            self._log_skip(idx, customer, "Client existe déjà")
                        continue

                # Crée le nouveau client
                client = Client.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(idx, customer, mapped_data, client.id, 'Client', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(idx, customer, str(e))

            finally:
                self.job.processed_rows = idx
                if idx % 10 == 0:
                    self.job.save(update_fields=['processed_rows'])

    def import_items(self):
        """Importe les produits depuis QuickBooks"""
        from apps.invoicing.models import Product

        items = self.service.get_items()
        self.job.total_rows = len(items)
        self.job.save(update_fields=['total_rows'])

        for idx, item in enumerate(items, 1):
            try:
                mapped_data = self._map_item_to_product(item)

                # Vérifie les doublons
                if self.job.skip_duplicates:
                    existing = Product.objects.filter(sku=mapped_data.get('sku')).first()
                    if existing:
                        if self.job.update_existing:
                            for field, value in mapped_data.items():
                                if hasattr(existing, field) and value:
                                    setattr(existing, field, value)
                            existing.save()
                            self.success_count += 1
                            self._log_success(idx, item, mapped_data, existing.id, 'Product', 'updated')
                        else:
                            self.skipped_count += 1
                            self._log_skip(idx, item, "Produit existe déjà")
                        continue

                # Crée le nouveau produit
                product = Product.objects.create(**mapped_data)
                self.success_count += 1
                self._log_success(idx, item, mapped_data, product.id, 'Product', 'created')

            except Exception as e:
                self.error_count += 1
                self._log_error(idx, item, str(e))

            finally:
                self.job.processed_rows = idx
                if idx % 10 == 0:
                    self.job.save(update_fields=['processed_rows'])

    def run_import(self):
        """Exécute l'import complet depuis QuickBooks"""
        try:
            self.job.start()

            # Test de connexion
            if not self.service.test_connection():
                raise Exception("Impossible de se connecter à QuickBooks")

            # Import selon le type d'entité
            if self.job.entity_type == 'suppliers':
                self.import_vendors()
            elif self.job.entity_type == 'clients':
                self.import_customers()
            elif self.job.entity_type == 'products':
                self.import_items()

            # Met à jour les statistiques finales
            self.job.success_count = self.success_count
            self.job.error_count = self.error_count
            self.job.skipped_count = self.skipped_count
            self.job.complete()

            logger.info(
                f"Import QuickBooks terminé: {self.success_count} succès, "
                f"{self.error_count} erreurs, {self.skipped_count} ignorés"
            )

        except Exception as e:
            logger.error(f"Erreur lors de l'import QuickBooks: {str(e)}")
            self.job.fail(str(e))
            raise

    def _log_success(self, row_number: int, source_data: Dict,
                     transformed_data: Dict, object_id: str, object_type: str, action: str):
        """Enregistre un succès"""
        MigrationLog.objects.create(
            job=self.job,
            level='success',
            message=f"{object_type} {action} avec succès depuis QuickBooks",
            row_number=row_number,
            source_data=source_data,
            transformed_data=transformed_data,
            created_object_id=str(object_id),
            created_object_type=object_type
        )

    def _log_error(self, row_number: int, source_data: Dict, error_message: str):
        """Enregistre une erreur"""
        MigrationLog.objects.create(
            job=self.job,
            level='error',
            message=error_message,
            row_number=row_number,
            source_data=source_data
        )

    def _log_skip(self, row_number: int, source_data: Dict, reason: str):
        """Enregistre un élément ignoré"""
        MigrationLog.objects.create(
            job=self.job,
            level='warning',
            message=reason,
            row_number=row_number,
            source_data=source_data
        )
