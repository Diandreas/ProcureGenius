"""
Service de génération de rapports PDF avec WeasyPrint pour tous les modules
"""
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
from django.db.models import Sum, Count, Avg, Q
from datetime import datetime, timedelta
import base64
import qrcode


class ReportPDFGenerator:
    """Générateur de rapports PDF avec WeasyPrint"""

    def __init__(self):
        try:
            from weasyprint import HTML, CSS
            self.HTML = HTML
            self.CSS = CSS
            self.weasyprint_available = True
        except ImportError:
            self.weasyprint_available = False
            print("⚠ WeasyPrint non disponible")

    def _get_organization_data(self, user):
        """Récupérer les données complètes de l'organisation (comme les factures)"""
        org_data = {
            'name': None,
            'address': None,
            'phone': None,
            'email': None,
            'website': None,
            'logo': None,
            'currency': 'CAD',
            'tax_region': 'international',
            # Identifiants légaux et fiscaux
            'niu': None,
            'tax_number': None,
            'rc_number': None,
            'rccm_number': None,
            'vat_number': None,
            # Canada/Québec
            'gst_number': None,
            'qst_number': None,
            'neq': None,
            # Informations bancaires
            'bank_name': None,
            'bank_account': None,
        }
        
        if not user or not hasattr(user, 'organization') or not user.organization:
            return org_data
        
        try:
            from apps.core.models import OrganizationSettings
            
            organization = user.organization
            org_settings = OrganizationSettings.objects.filter(organization=organization).first()
            
            # Nom de l'organisation (priorité: company_name > name)
            if org_settings and org_settings.company_name and org_settings.company_name.strip():
                org_data['name'] = org_settings.company_name
            else:
                org_data['name'] = organization.name if organization.name else None
            
            if org_settings:
                # Adresse
                if org_settings.company_address and org_settings.company_address.strip():
                    org_data['address'] = org_settings.company_address
                
                # Téléphone
                if org_settings.company_phone and org_settings.company_phone.strip():
                    org_data['phone'] = org_settings.company_phone
                
                # Email
                if org_settings.company_email and org_settings.company_email.strip():
                    org_data['email'] = org_settings.company_email
                
                # Website
                if hasattr(org_settings, 'company_website') and org_settings.company_website and org_settings.company_website.strip():
                    org_data['website'] = org_settings.company_website
                
                # Logo
                if org_settings.company_logo:
                    org_data['logo'] = org_settings.company_logo
                
                # Devise
                if hasattr(org_settings, 'default_currency') and org_settings.default_currency:
                    org_data['currency'] = org_settings.default_currency
                
                # Région fiscale
                if hasattr(org_settings, 'tax_region') and org_settings.tax_region:
                    org_data['tax_region'] = org_settings.tax_region
                
                # Identifiants fiscaux
                if hasattr(org_settings, 'company_niu') and org_settings.company_niu and org_settings.company_niu.strip():
                    org_data['niu'] = org_settings.company_niu
                if hasattr(org_settings, 'company_tax_number') and org_settings.company_tax_number and org_settings.company_tax_number.strip():
                    org_data['tax_number'] = org_settings.company_tax_number
                if hasattr(org_settings, 'company_rc_number') and org_settings.company_rc_number and org_settings.company_rc_number.strip():
                    org_data['rc_number'] = org_settings.company_rc_number
                if hasattr(org_settings, 'company_rccm_number') and org_settings.company_rccm_number and org_settings.company_rccm_number.strip():
                    org_data['rccm_number'] = org_settings.company_rccm_number
                if hasattr(org_settings, 'company_vat_number') and org_settings.company_vat_number and org_settings.company_vat_number.strip():
                    org_data['vat_number'] = org_settings.company_vat_number
                
                # Canada/Québec
                if hasattr(org_settings, 'company_gst_number') and org_settings.company_gst_number and org_settings.company_gst_number.strip():
                    org_data['gst_number'] = org_settings.company_gst_number
                if hasattr(org_settings, 'company_qst_number') and org_settings.company_qst_number and org_settings.company_qst_number.strip():
                    org_data['qst_number'] = org_settings.company_qst_number
                if hasattr(org_settings, 'company_neq') and org_settings.company_neq and org_settings.company_neq.strip():
                    org_data['neq'] = org_settings.company_neq
                
                # Informations bancaires
                if hasattr(org_settings, 'company_bank_name') and org_settings.company_bank_name and org_settings.company_bank_name.strip():
                    org_data['bank_name'] = org_settings.company_bank_name
                if hasattr(org_settings, 'company_bank_account') and org_settings.company_bank_account and org_settings.company_bank_account.strip():
                    org_data['bank_account'] = org_settings.company_bank_account
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            import traceback
            traceback.print_exc()
        
        return org_data

    def _get_logo_base64(self, org_data):
        """Convertir le logo en base64 (comme les factures)"""
        if not org_data or not org_data.get('logo'):
            return None
        
        try:
            import os
            logo = org_data['logo']
            
            # Si c'est un champ FileField/ImageField Django
            if hasattr(logo, 'path'):
                logo_path = logo.path
                if os.path.exists(logo_path):
                    with open(logo_path, 'rb') as f:
                        logo_data = f.read()
                    
                    # Détecter le type MIME
                    ext = os.path.splitext(logo_path)[1].lower()
                    mime_types = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.svg': 'image/svg+xml',
                        '.webp': 'image/webp',
                        '.bmp': 'image/bmp',
                    }
                    mime_type = mime_types.get(ext, 'image/png')
                    
                    logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                    return f"data:{mime_type};base64,{logo_base64}"
            # Si c'est un objet avec méthode read()
            elif hasattr(logo, 'read'):
                logo.seek(0)
                logo_data = logo.read()
                logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                return f"data:image/png;base64,{logo_base64}"
            # Si c'est déjà un chemin
            elif isinstance(logo, str):
                if os.path.exists(logo):
                    with open(logo, 'rb') as f:
                        logo_data = f.read()
                    logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                    return f"data:image/png;base64,{logo_base64}"
        except Exception as e:
            print(f"Erreur lors de la conversion du logo: {e}")
            import traceback
            traceback.print_exc()
            return None
        
        return None

    def _generate_qr_code(self, data_string):
        """Générer un QR code"""
        try:
            qr = qrcode.QRCode(version=1, box_size=10, border=2)
            qr.add_data(data_string)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{qr_base64}"
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            return None

    # ===== SUPPLIER REPORT =====
    def generate_supplier_report(self, supplier, user=None):
        """Générer un rapport PDF pour un fournisseur"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")

        try:
            from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
        except ImportError as e:
            print(f"Erreur import modèles: {e}")
            raise
        
        # Récupérer les données
        org_data = self._get_organization_data(user)
        
        # Statistiques avec gestion d'erreurs
        total_spent = 0
        total_orders = 0
        avg_order = 0
        po_by_status = []
        top_products = []
        recent_activity = []
        
        try:
            purchase_orders = PurchaseOrder.objects.filter(supplier=supplier)
            
            # Statistiques
            total_spent = purchase_orders.aggregate(total=Sum('total_amount'))['total'] or 0
            total_orders = purchase_orders.count()
            avg_order = total_spent / total_orders if total_orders > 0 else 0
            
            # Commandes par statut
            try:
                po_by_status = list(purchase_orders.values('status').annotate(
                    count=Count('id'),
                    total=Sum('total_amount')
                ))
            except Exception as e:
                print(f"Erreur calcul statuts: {e}")
                po_by_status = []
            
            # Top produits
            try:
                top_products = list(PurchaseOrderItem.objects.filter(
                    purchase_order__supplier=supplier
                ).values('description', 'product_reference').annotate(
                    total_qty=Sum('quantity'),
                    total_value=Sum('total_price')
                ).order_by('-total_value')[:10])
            except Exception as e:
                print(f"Erreur calcul top produits: {e}")
                top_products = []
            
            # Activité récente (6 mois)
            try:
                six_months_ago = datetime.now() - timedelta(days=180)
                recent_activity = list(purchase_orders.filter(
                    created_at__gte=six_months_ago
                ).order_by('-created_at')[:20])
            except Exception as e:
                print(f"Erreur calcul activité récente: {e}")
                recent_activity = []
        except Exception as e:
            print(f"Erreur calcul statistiques fournisseur: {e}")
            import traceback
            traceback.print_exc()
        
        # QR Code
        try:
            supplier_name = getattr(supplier, 'name', 'Fournisseur') or 'Fournisseur'
            qr_data = f"Supplier: {supplier_name} | ID: {supplier.id}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        # Contexte du template
        context = {
            'supplier': supplier,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_spent': total_spent,
            'total_orders': total_orders,
            'avg_order_value': avg_order,
            'po_by_status': po_by_status,
            'top_products': top_products,
            'recent_activity': recent_activity,
            'generated_at': datetime.now(),
        }
        
        # Générer le PDF
        template_name = 'reports/pdf/supplier_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF fournisseur: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ===== CLIENT REPORT =====
    def generate_client_report(self, client, user=None):
        """Générer un rapport PDF pour un client"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")

        try:
            from apps.invoicing.models import Invoice
        except ImportError as e:
            print(f"Erreur import modèles: {e}")
            raise
        
        # Récupérer les données
        org_data = self._get_organization_data(user)
        
        # Statistiques avec gestion d'erreurs
        total_invoiced = 0
        total_invoices = 0
        avg_invoice = 0
        invoices_by_status = []
        recent_invoices = []
        
        try:
            invoices = Invoice.objects.filter(client=client)
            
            # Statistiques
            total_invoiced = invoices.aggregate(total=Sum('total_amount'))['total'] or 0
            total_invoices = invoices.count()
            avg_invoice = total_invoiced / total_invoices if total_invoices > 0 else 0
            
            # Factures par statut
            try:
                invoices_by_status = list(invoices.values('status').annotate(
                    count=Count('id'),
                    total=Sum('total_amount')
                ))
            except Exception as e:
                print(f"Erreur calcul statuts factures: {e}")
                invoices_by_status = []
            
            # Factures récentes
            try:
                recent_invoices = list(invoices.order_by('-issue_date')[:20])
            except Exception as e:
                print(f"Erreur chargement factures récentes: {e}")
                recent_invoices = []
        except Exception as e:
            print(f"Erreur calcul statistiques client: {e}")
            import traceback
            traceback.print_exc()
        
        # QR Code
        try:
            client_name = getattr(client, 'name', 'Client') or 'Client'
            qr_data = f"Client: {client_name} | ID: {client.id}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'client': client,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_invoiced': total_invoiced,
            'total_invoices': total_invoices,
            'avg_invoice_value': avg_invoice,
            'invoices_by_status': invoices_by_status,
            'recent_invoices': recent_invoices,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/client_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF client: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ===== PRODUCT REPORT =====
    def generate_product_report(self, product, user=None):
        """Générer un rapport PDF pour un produit"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")

        try:
            from apps.invoicing.models import InvoiceItem
            from apps.purchase_orders.models import PurchaseOrderItem
            from apps.suppliers.models import SupplierProduct
        except ImportError as e:
            print(f"Erreur import modèles: {e}")
            raise
        
        # Récupérer les données
        org_data = self._get_organization_data(user)
        
        # Ventes - avec gestion d'erreurs
        total_sold = 0
        total_revenue = 0
        recent_sales = []
        
        try:
            invoice_items = InvoiceItem.objects.filter(product=product)
            total_sold = invoice_items.aggregate(total_qty=Sum('quantity'))['total_qty'] or 0
            
            # Calculer le revenu total
            from django.db.models import F
            total_revenue_result = invoice_items.aggregate(
                total=Sum(F('quantity') * F('unit_price'))
            )
            total_revenue = total_revenue_result.get('total') or 0
            
            # Ventes récentes
            try:
                recent_sales = list(invoice_items.select_related('invoice', 'invoice__client').order_by('-invoice__issue_date')[:15])
            except Exception as e:
                print(f"Erreur chargement ventes récentes: {e}")
                recent_sales = []
        except Exception as e:
            print(f"Erreur calcul ventes: {e}")
            import traceback
            traceback.print_exc()
        
        # Achats - avec gestion d'erreurs
        total_purchased = 0
        recent_purchases = []
        
        try:
            po_items = PurchaseOrderItem.objects.filter(product=product)
            total_purchased = po_items.aggregate(total_qty=Sum('quantity'))['total_qty'] or 0
            
            # Achats récents
            try:
                recent_purchases = list(po_items.select_related('purchase_order', 'purchase_order__supplier').order_by('-purchase_order__created_at')[:15])
            except Exception as e:
                print(f"Erreur chargement achats récents: {e}")
                recent_purchases = []
        except Exception as e:
            print(f"Erreur calcul achats: {e}")
            import traceback
            traceback.print_exc()
        
        # Fournisseurs - avec gestion d'erreurs
        suppliers = []
        try:
            suppliers = list(SupplierProduct.objects.filter(product=product, is_active=True).select_related('supplier'))
        except Exception as e:
            print(f"Erreur chargement fournisseurs: {e}")
            suppliers = []
        
        # Stock actuel
        current_stock = getattr(product, 'stock_quantity', 0) or 0
        
        # QR Code
        try:
            product_name = getattr(product, 'name', 'Produit') or 'Produit'
            product_sku = getattr(product, 'sku', '') or getattr(product, 'reference', '') or str(product.id)
            qr_data = f"Product: {product_name} | SKU: {product_sku}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        # Préparer le contexte avec valeurs par défaut
        context = {
            'product': product,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_sold': total_sold,
            'total_revenue': total_revenue,
            'total_purchased': total_purchased,
            'current_stock': current_stock,
            'suppliers': suppliers,
            'recent_sales': recent_sales,
            'recent_purchases': recent_purchases,
            'generated_at': datetime.now(),
        }
        
        # Générer le PDF
        template_name = 'reports/pdf/product_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF produit: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ===== CONTRACT REPORT =====
    def generate_contract_report(self, contract, user=None):
        """Générer un rapport PDF pour un contrat"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        org_data = self._get_organization_data(user)
        
        # QR Code
        qr_data = f"Contract: {contract.title} | ID: {contract.id}"
        qr_code = self._generate_qr_code(qr_data)
        
        context = {
            'contract': contract,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/contract_report.html'
        html_string = render_to_string(template_name, context)
        html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
        pdf_bytes = html.write_pdf()
        
        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)
        return buffer

    # ===== SOURCING EVENT REPORT =====
    def generate_sourcing_event_report(self, event, user=None):
        """Générer un rapport PDF pour un événement d'e-sourcing"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        org_data = self._get_organization_data(user)
        
        # Statistiques des soumissions
        bids = event.bids.all() if hasattr(event, 'bids') else []
        total_bids = bids.count() if hasattr(bids, 'count') else len(bids)
        
        # QR Code
        qr_data = f"Sourcing Event: {event.title} | ID: {event.id}"
        qr_code = self._generate_qr_code(qr_data)
        
        context = {
            'event': event,
            'organization': org_data,
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'bids': bids,
            'total_bids': total_bids,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/sourcing_event_report.html'
        html_string = render_to_string(template_name, context)
        html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
        pdf_bytes = html.write_pdf()
        
        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)
        return buffer

    # ===== INVOICES REPORT =====
    def generate_invoices_report(self, invoices, user=None, date_start=None, date_end=None):
        """Générer un rapport PDF pour plusieurs factures"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            import traceback
            traceback.print_exc()
            org_data = {}
        
        # Convertir QuerySet en liste pour éviter les problèmes
        # Précharger les relations avant la conversion
        try:
            if hasattr(invoices, 'select_related'):
                try:
                    invoices = invoices.select_related('client', 'created_by')
                except Exception as e:
                    print(f"Erreur select_related: {e}")
            invoices_list = list(invoices)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            import traceback
            traceback.print_exc()
            invoices_list = []
        
        # Statistiques globales avec gestion d'erreurs
        total_amount = 0
        total_count = 0
        avg_amount = 0
        by_status = []
        
        try:
            if invoices_list:
                total_amount = 0
                total_count = len(invoices_list)
                for inv in invoices_list:
                    try:
                        amount = float(getattr(inv, 'total_amount', 0) or 0)
                        total_amount += amount
                    except (ValueError, TypeError) as e:
                        print(f"Erreur conversion montant facture {getattr(inv, 'id', 'unknown')}: {e}")
                        continue
                
                avg_amount = total_amount / total_count if total_count > 0 else 0
                
                # Par statut
                try:
                    from collections import defaultdict
                    status_dict = defaultdict(lambda: {'count': 0, 'total': 0})
                    for inv in invoices_list:
                        try:
                            status = getattr(inv, 'status', 'unknown') or 'unknown'
                            amount = float(getattr(inv, 'total_amount', 0) or 0)
                            status_dict[status]['count'] += 1
                            status_dict[status]['total'] += amount
                        except Exception as e:
                            print(f"Erreur traitement facture {getattr(inv, 'id', 'unknown')}: {e}")
                            continue
                    # Calculate percentage for each status
                    by_status = []
                    for k, v in status_dict.items():
                        percentage = (v['total'] / total_amount * 100) if total_amount > 0 else 0
                        by_status.append({
                            'status': k,
                            'count': v['count'],
                            'total': v['total'],
                            'percentage': percentage
                        })
                except Exception as e:
                    print(f"Erreur calcul par statut: {e}")
                    import traceback
                    traceback.print_exc()
                    by_status = []
        except Exception as e:
            print(f"Erreur calcul statistiques: {e}")
            import traceback
            traceback.print_exc()
        
        # QR Code
        try:
            qr_data = f"Invoices Report | Count: {total_count} | Total: {total_amount}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'invoices': invoices_list,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_amount': total_amount,
            'total_count': total_count,
            'avg_amount': avg_amount,
            'by_status': by_status,
            'date_start': date_start,
            'date_end': date_end,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/invoices_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF factures: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ===== PURCHASE ORDERS REPORT =====
    def generate_purchase_orders_report(self, purchase_orders, user=None, date_start=None, date_end=None):
        """Générer un rapport PDF pour plusieurs bons de commande"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            import traceback
            traceback.print_exc()
            org_data = {}
        
        # Convertir QuerySet en liste pour éviter les problèmes
        try:
            purchase_orders_list = list(purchase_orders)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            import traceback
            traceback.print_exc()
            purchase_orders_list = []
        
        # Statistiques globales avec gestion d'erreurs
        total_amount = 0
        total_count = 0
        avg_amount = 0
        by_status = []
        by_supplier = []
        
        try:
            if purchase_orders_list:
                total_amount = sum(float(po.total_amount or 0) for po in purchase_orders_list)
                total_count = len(purchase_orders_list)
                avg_amount = total_amount / total_count if total_count > 0 else 0
                
                # Par statut
                try:
                    from collections import defaultdict
                    status_dict = defaultdict(lambda: {'count': 0, 'total': 0})
                    for po in purchase_orders_list:
                        po_status = getattr(po, 'status', 'unknown')
                        amount = float(po.total_amount or 0)
                        status_dict[po_status]['count'] += 1
                        status_dict[po_status]['total'] += amount
                    # Calculate percentage for each status
                    by_status = []
                    for k, v in status_dict.items():
                        percentage = (v['total'] / total_amount * 100) if total_amount > 0 else 0
                        by_status.append({
                            'status': k,
                            'count': v['count'],
                            'total': v['total'],
                            'percentage': percentage
                        })
                    by_status.sort(key=lambda x: x['total'], reverse=True)
                except Exception as e:
                    print(f"Erreur calcul par statut: {e}")
                    by_status = []
                
                # Par fournisseur (top 10)
                try:
                    supplier_dict = defaultdict(lambda: {'count': 0, 'total': 0, 'name': ''})
                    for po in purchase_orders_list:
                        supplier = getattr(po, 'supplier', None)
                        supplier_name = getattr(supplier, 'name', 'Unknown') if supplier else 'Unknown'
                        amount = float(po.total_amount or 0)
                        supplier_dict[supplier_name]['count'] += 1
                        supplier_dict[supplier_name]['total'] += amount
                        supplier_dict[supplier_name]['name'] = supplier_name
                    # Calculate percentage for each supplier
                    by_supplier = []
                    for k, v in supplier_dict.items():
                        percentage = (v['total'] / total_amount * 100) if total_amount > 0 else 0
                        by_supplier.append({
                            'supplier__name': v['name'],
                            'count': v['count'],
                            'total': v['total'],
                            'percentage': percentage
                        })
                    by_supplier.sort(key=lambda x: x['total'], reverse=True)
                    by_supplier = by_supplier[:10]
                except Exception as e:
                    print(f"Erreur calcul par fournisseur: {e}")
                    by_supplier = []
        except Exception as e:
            print(f"Erreur calcul statistiques: {e}")
            import traceback
            traceback.print_exc()
        
        # QR Code
        try:
            qr_data = f"Purchase Orders Report | Count: {total_count} | Total: {total_amount}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'purchase_orders': purchase_orders_list,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_amount': total_amount,
            'total_count': total_count,
            'avg_amount': avg_amount,
            'by_status': by_status,
            'by_supplier': by_supplier,
            'date_start': date_start,
            'date_end': date_end,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/purchase_orders_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF bons de commande: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ===== CLIENTS REPORT =====
    def generate_clients_report(self, clients, user=None, date_start=None, date_end=None):
        """Générer un rapport PDF pour plusieurs clients"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            import traceback
            traceback.print_exc()
            org_data = {}
        
        # Convertir QuerySet en liste
        try:
            clients_list = list(clients)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            import traceback
            traceback.print_exc()
            clients_list = []
        
        # Statistiques globales
        total_clients = len(clients_list)
        total_sales = 0
        total_invoices = 0
        by_status = []
        
        try:
            if clients_list:
                from collections import defaultdict
                status_dict = defaultdict(lambda: {'count': 0, 'total_sales': 0})
                
                for client in clients_list:
                    try:
                        invoices = getattr(client, 'invoices', None)
                        if invoices:
                            client_sales = sum(float(inv.total_amount or 0) for inv in invoices.all())
                            client_invoices_count = invoices.count()
                        else:
                            client_sales = 0
                            client_invoices_count = 0
                        
                        total_sales += client_sales
                        total_invoices += client_invoices_count
                        
                        client_status = getattr(client, 'status', 'active')
                        status_dict[client_status]['count'] += 1
                        status_dict[client_status]['total_sales'] += client_sales
                    except Exception as e:
                        print(f"Erreur traitement client {client.id}: {e}")
                
                by_status = [{'status': k, 'count': v['count'], 'total_sales': v['total_sales']} for k, v in status_dict.items()]
        except Exception as e:
            print(f"Erreur calcul statistiques clients: {e}")
            import traceback
            traceback.print_exc()
        
        # QR Code
        try:
            qr_data = f"Clients Report | Count: {total_clients} | Total Sales: {total_sales}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'clients': clients_list,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_clients': total_clients,
            'total_sales': total_sales,
            'total_invoices': total_invoices,
            'avg_sales': total_sales / total_clients if total_clients > 0 else 0,
            'by_status': by_status,
            'date_start': date_start,
            'date_end': date_end,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/clients_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF clients: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ===== PRODUCTS REPORT =====
    def generate_products_report(self, products, user=None, date_start=None, date_end=None):
        """Générer un rapport PDF pour plusieurs produits"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            import traceback
            traceback.print_exc()
            org_data = {}
        
        # Convertir QuerySet en liste
        try:
            products_list = list(products)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            import traceback
            traceback.print_exc()
            products_list = []
        
        # Statistiques globales
        total_products = len(products_list)
        total_stock = 0
        total_value = 0
        by_category = []
        
        try:
            if products_list:
                from collections import defaultdict
                category_dict = defaultdict(lambda: {'count': 0, 'total_stock': 0, 'total_value': 0})
                
                for product in products_list:
                    try:
                        stock = float(getattr(product, 'stock_quantity', 0) or 0)
                        price = float(getattr(product, 'sale_price', 0) or 0)
                        value = stock * price
                        
                        total_stock += stock
                        total_value += value
                        
                        category = getattr(product, 'category', None)
                        category_name = getattr(category, 'name', 'Sans catégorie') if category else 'Sans catégorie'
                        category_dict[category_name]['count'] += 1
                        category_dict[category_name]['total_stock'] += stock
                        category_dict[category_name]['total_value'] += value
                    except Exception as e:
                        print(f"Erreur traitement produit {product.id}: {e}")
                
                by_category = [{'category': k, 'count': v['count'], 'total_stock': v['total_stock'], 'total_value': v['total_value']} for k, v in category_dict.items()]
        except Exception as e:
            print(f"Erreur calcul statistiques produits: {e}")
            import traceback
            traceback.print_exc()
        
        # QR Code
        try:
            qr_data = f"Products Report | Count: {total_products} | Total Value: {total_value}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'products': products_list,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            'total_products': total_products,
            'total_stock': total_stock,
            'total_value': total_value,
            'avg_value': total_value / total_products if total_products > 0 else 0,
            'by_category': by_category,
            'date_start': date_start,
            'date_end': date_end,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/products_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF produits: {e}")
            import traceback
            traceback.print_exc()
            raise


# Instance globale
report_generator = ReportPDFGenerator()


# Fonctions d'export pour faciliter l'utilisation
def generate_supplier_report_pdf(supplier, user=None):
    return report_generator.generate_supplier_report(supplier, user)


def generate_client_report_pdf(client, user=None):
    return report_generator.generate_client_report(client, user)


def generate_product_report_pdf(product, user=None):
    return report_generator.generate_product_report(product, user)


def generate_contract_report_pdf(contract, user=None):
    return report_generator.generate_contract_report(contract, user)


def generate_sourcing_event_report_pdf(event, user=None):
    return report_generator.generate_sourcing_event_report(event, user)


def generate_invoices_report_pdf(invoices, user=None, date_start=None, date_end=None):
    return report_generator.generate_invoices_report(invoices, user, date_start, date_end)


def generate_purchase_orders_report_pdf(purchase_orders, user=None, date_start=None, date_end=None):
    return report_generator.generate_purchase_orders_report(purchase_orders, user, date_start, date_end)


def generate_clients_report_pdf(clients, user=None, date_start=None, date_end=None):
    return report_generator.generate_clients_report(clients, user, date_start, date_end)


def generate_products_report_pdf(products, user=None, date_start=None, date_end=None):
    return report_generator.generate_products_report(products, user, date_start, date_end)


def generate_clients_report_pdf(clients, user=None, date_start=None, date_end=None):
    return report_generator.generate_clients_report(clients, user, date_start, date_end)


def generate_products_report_pdf(products, user=None, date_start=None, date_end=None):
    return report_generator.generate_products_report(products, user, date_start, date_end)

