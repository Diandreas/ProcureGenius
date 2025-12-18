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
        # #region agent log
        import json, os, time
        log_path = os.path.join(settings.BASE_DIR, '.cursor', 'debug.log')
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, 'a') as f:
            f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H4', 'location': 'report_generator_weasy.py:140', 'message': '_get_logo_base64: entry', 'data': {'has_org_data': bool(org_data), 'has_logo': bool(org_data and org_data.get('logo')) if org_data else False}, 'timestamp': int(time.time() * 1000)}) + '\n')
        # #endregion
        
        if not org_data or not org_data.get('logo'):
            return None
        
        try:
            import os
            logo = org_data['logo']
            
            # Si c'est un champ FileField/ImageField Django
            if hasattr(logo, 'path'):
                logo_path = logo.path
                
                # #region agent log
                with open(log_path, 'a') as f:
                    f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H4', 'location': 'report_generator_weasy.py:145', 'message': '_get_logo_base64: checking file path', 'data': {'logo_path': logo_path, 'path_exists': os.path.exists(logo_path) if logo_path else False, 'is_readable': os.access(logo_path, os.R_OK) if logo_path and os.path.exists(logo_path) else False}, 'timestamp': int(time.time() * 1000)}) + '\n')
                # #endregion
                
                if os.path.exists(logo_path):
                    with open(logo_path, 'rb') as f:
                        logo_data = f.read()
                    
                    # #region agent log
                    with open(log_path, 'a') as f:
                        f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H4,H5', 'location': 'report_generator_weasy.py:152', 'message': '_get_logo_base64: file read', 'data': {'logo_data_len': len(logo_data), 'logo_data_preview': logo_data[:20].hex() if logo_data else None}, 'timestamp': int(time.time() * 1000)}) + '\n')
                    # #endregion
                    
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
                    result = f"data:{mime_type};base64,{logo_base64}"
                    
                    # #region agent log
                    with open(log_path, 'a') as f:
                        f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H4,H5', 'location': 'report_generator_weasy.py:158', 'message': '_get_logo_base64: base64 encoded', 'data': {'base64_len': len(logo_base64), 'result_len': len(result), 'result_preview': result[:50]}, 'timestamp': int(time.time() * 1000)}) + '\n')
                    # #endregion
                    
                    return result
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
            # #region agent log
            import json, os, time
            log_path = os.path.join(settings.BASE_DIR, '.cursor', 'debug.log')
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            with open(log_path, 'a') as f:
                f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H1,H3,H4', 'location': 'report_generator_weasy.py:493', 'message': 'generate_product_report: before render_to_string', 'data': {'product_id': getattr(product, 'id', None), 'template': template_name, 'base_url': str(settings.BASE_DIR), 'logo_base64_len': len(context.get('logo_base64', '')) if context.get('logo_base64') else 0, 'logo_base64_preview': context.get('logo_base64', '')[:50] if context.get('logo_base64') else None}, 'timestamp': int(time.time() * 1000)}) + '\n')
            # #endregion
            
            html_string = render_to_string(template_name, context)
            
            # #region agent log
            with open(log_path, 'a') as f:
                f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H1,H5', 'location': 'report_generator_weasy.py:496', 'message': 'generate_product_report: after render_to_string', 'data': {'html_length': len(html_string) if html_string else 0, 'html_contains_logo': 'logo_base64' in html_string if html_string else False, 'html_contains_img': '<img' in html_string if html_string else False}, 'timestamp': int(time.time() * 1000)}) + '\n')
            # #endregion
            
            # Vérifier que le HTML n'est pas vide
            if not html_string or len(html_string.strip()) == 0:
                raise ValueError("Le template HTML généré est vide")
            
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            # #region agent log
            with open(log_path, 'a') as f:
                f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H1,H2', 'location': 'report_generator_weasy.py:503', 'message': 'generate_product_report: after write_pdf', 'data': {'pdf_bytes_type': str(type(pdf_bytes)), 'pdf_bytes_len': len(pdf_bytes) if pdf_bytes else 0, 'pdf_starts_with': pdf_bytes[:10].hex() if pdf_bytes and len(pdf_bytes) >= 10 else None, 'is_bytes': isinstance(pdf_bytes, bytes), 'is_str': isinstance(pdf_bytes, str), 'starts_with_pdf': pdf_bytes.startswith(b'%PDF') if isinstance(pdf_bytes, bytes) else False}, 'timestamp': int(time.time() * 1000)}) + '\n')
            # #endregion
            
            # Vérifier que les bytes PDF sont valides
            if not pdf_bytes:
                raise ValueError("Aucun contenu PDF généré")
            
            # S'assurer que pdf_bytes est bien des bytes
            if isinstance(pdf_bytes, str):
                pdf_bytes = pdf_bytes.encode('utf-8')
            
            # Vérifier que c'est bien un PDF (commence par %PDF)
            if not pdf_bytes.startswith(b'%PDF'):
                raise ValueError(f"Le contenu généré n'est pas un PDF valide. Début: {pdf_bytes[:20]}")
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            
            # #region agent log
            with open(log_path, 'a') as f:
                f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H1', 'location': 'report_generator_weasy.py:520', 'message': 'generate_product_report: buffer created', 'data': {'buffer_pos': buffer.tell(), 'buffer_size': len(pdf_bytes), 'buffer_getvalue_len': len(buffer.getvalue()) if hasattr(buffer, 'getvalue') else None}, 'timestamp': int(time.time() * 1000)}) + '\n')
            # #endregion
            
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
        """Générer un rapport PDF avancé pour plusieurs factures avec statistiques complètes"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            org_data = {}
        
        # Convertir QuerySet en liste et précharger relations
        try:
            if hasattr(invoices, 'select_related'):
                invoices = invoices.select_related('client', 'created_by').prefetch_related('payments')
            invoices_list = list(invoices)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            invoices_list = []
        
        from collections import defaultdict
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        # === 1. VUE D'ENSEMBLE ===
        total_count = len(invoices_list)
        total_amount = sum(float(getattr(inv, 'total_amount', 0) or 0) for inv in invoices_list)
        avg_amount = total_amount / total_count if total_count > 0 else 0
        
        # === 2. RÉPARTITION PAR STATUT ===
        status_dict = defaultdict(lambda: {'count': 0, 'total': 0})
        overdue_amount = 0
        pending_amount = 0
        paid_amount = 0
        
        for inv in invoices_list:
            status = getattr(inv, 'status', 'unknown') or 'unknown'
            amount = float(getattr(inv, 'total_amount', 0) or 0)
            status_dict[status]['count'] += 1
            status_dict[status]['total'] += amount
            
            if status == 'overdue':
                overdue_amount += amount
            elif status == 'sent':
                pending_amount += amount
            elif status == 'paid':
                paid_amount += amount
        
        by_status = []
        for k, v in status_dict.items():
            percentage = (v['total'] / total_amount * 100) if total_amount > 0 else 0
            by_status.append({'status': k, 'count': v['count'], 'total': v['total'], 'percentage': percentage})
        by_status.sort(key=lambda x: x['total'], reverse=True)
        
        # === 3. TOP 10 CLIENTS PAR CA ===
        client_dict = defaultdict(lambda: {'name': '', 'total': 0, 'count': 0})
        for inv in invoices_list:
            client = getattr(inv, 'client', None)
            if client:
                client_name = getattr(client, 'name', 'Client inconnu')
                amount = float(getattr(inv, 'total_amount', 0) or 0)
                client_dict[client_name]['name'] = client_name
                client_dict[client_name]['total'] += amount
                client_dict[client_name]['count'] += 1
        
        top_clients = sorted(client_dict.values(), key=lambda x: x['total'], reverse=True)[:10]
        for client in top_clients:
            client['percentage'] = (client['total'] / total_amount * 100) if total_amount > 0 else 0
        
        # === 4. PARETO 80/20 ===
        top_20_percent_count = max(1, int(len(client_dict) * 0.2))
        all_clients_sorted = sorted(client_dict.values(), key=lambda x: x['total'], reverse=True)
        top_20_percent_revenue = sum(c['total'] for c in all_clients_sorted[:top_20_percent_count])
        pareto_percentage = (top_20_percent_revenue / total_amount * 100) if total_amount > 0 else 0
        
        # === 5. ÉVOLUTION MENSUELLE (6 derniers mois) ===
        now = timezone.now()
        monthly_evolution = []
        for i in range(5, -1, -1):
            month_date = now - relativedelta(months=i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i == 0:
                month_end = now
            else:
                month_end = (month_start + relativedelta(months=1)) - timedelta(seconds=1)
            
            month_invoices = [inv for inv in invoices_list 
                            if month_start <= getattr(inv, 'created_at', now) <= month_end]
            month_total = sum(float(getattr(inv, 'total_amount', 0) or 0) for inv in month_invoices)
            month_count = len(month_invoices)
            
            monthly_evolution.append({
                'month': month_date.strftime('%b %Y'),
                'total': month_total,
                'count': month_count
            })
        
        # === 6. ÉVOLUTION VS MOIS DERNIER ===
        current_month_total = monthly_evolution[-1]['total'] if monthly_evolution else 0
        previous_month_total = monthly_evolution[-2]['total'] if len(monthly_evolution) > 1 else 0
        evolution_percentage = 0
        if previous_month_total > 0:
            evolution_percentage = ((current_month_total - previous_month_total) / previous_month_total) * 100
        
        # === 7. ALERTES ===
        today = timezone.now().date()
        overdue_count = sum(1 for inv in invoices_list if getattr(inv, 'status', '') == 'overdue')
        due_soon_count = sum(1 for inv in invoices_list 
                            if getattr(inv, 'status', '') in ['sent', 'draft'] 
                            and getattr(inv, 'due_date', None)
                            and today <= getattr(inv, 'due_date') < today + timedelta(days=7))
        due_30_days = sum(1 for inv in invoices_list 
                         if getattr(inv, 'status', '') in ['sent', 'overdue']
                         and getattr(inv, 'due_date', None)
                         and getattr(inv, 'due_date') < today - timedelta(days=30))
        
        # === 8. TAUX DE PAIEMENT ===
        payment_rate = (paid_amount / total_amount * 100) if total_amount > 0 else 0
        overdue_rate = (overdue_amount / total_amount * 100) if total_amount > 0 else 0
        
        # QR Code
        try:
            qr_data = f"Invoices Report | Count: {total_count} | Total: {total_amount:.2f}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'invoices': invoices_list[:50],  # Limiter à 50 pour le PDF
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            # Vue d'ensemble
            'total_amount': total_amount,
            'total_count': total_count,
            'avg_amount': avg_amount,
            'evolution_percentage': evolution_percentage,
            # Analyse financière
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'overdue_amount': overdue_amount,
            'payment_rate': payment_rate,
            'overdue_rate': overdue_rate,
            'by_status': by_status,
            # Clients
            'top_clients': top_clients,
            'pareto_count': top_20_percent_count,
            'pareto_percentage': pareto_percentage,
            # Évolution
            'monthly_evolution': monthly_evolution,
            # Alertes
            'overdue_count': overdue_count,
            'due_soon_count': due_soon_count,
            'due_30_days': due_30_days,
            # Dates
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
        """Générer un rapport PDF avancé pour plusieurs bons de commande"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            org_data = {}
        
        # Convertir QuerySet en liste
        try:
            purchase_orders_list = list(purchase_orders)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            purchase_orders_list = []
        
        from collections import defaultdict
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        total_count = len(purchase_orders_list)
        total_amount = sum(float(po.total_amount or 0) for po in purchase_orders_list)
        avg_amount = total_amount / total_count if total_count > 0 else 0
        
        # Par statut
        status_dict = defaultdict(lambda: {'count': 0, 'total': 0})
        approved_count = 0
        received_count = 0
        cancelled_count = 0
        pending_approval_count = 0
        overdue_count = 0
        today = timezone.now().date()
        
        for po in purchase_orders_list:
            po_status = getattr(po, 'status', 'unknown')
            amount = float(po.total_amount or 0)
            status_dict[po_status]['count'] += 1
            status_dict[po_status]['total'] += amount
            
            if po_status == 'approved':
                approved_count += 1
            elif po_status == 'received':
                received_count += 1
            elif po_status == 'cancelled':
                cancelled_count += 1
            elif po_status == 'draft':
                pending_approval_count += 1
            
            # Vérifier les retards
            required_date = getattr(po, 'required_date', None)
            if required_date and required_date < today and po_status not in ['received', 'cancelled']:
                overdue_count += 1
        
        by_status = []
        for k, v in status_dict.items():
            percentage = (v['total'] / total_amount * 100) if total_amount > 0 else 0
            by_status.append({'status': k, 'count': v['count'], 'total': v['total'], 'percentage': percentage})
        by_status.sort(key=lambda x: x['total'], reverse=True)
        
        # Performance rates
        approval_rate = (approved_count / total_count * 100) if total_count > 0 else 0
        reception_rate = (received_count / total_count * 100) if total_count > 0 else 0
        cancellation_rate = (cancelled_count / total_count * 100) if total_count > 0 else 0
        
        # Top fournisseurs
        supplier_dict = defaultdict(lambda: {'count': 0, 'total': 0, 'name': ''})
        for po in purchase_orders_list:
            supplier = getattr(po, 'supplier', None)
            supplier_name = getattr(supplier, 'name', 'Non spécifié') if supplier else 'Non spécifié'
            amount = float(po.total_amount or 0)
            supplier_dict[supplier_name]['count'] += 1
            supplier_dict[supplier_name]['total'] += amount
            supplier_dict[supplier_name]['name'] = supplier_name
        
        top_suppliers = []
        for k, v in supplier_dict.items():
            percentage = (v['total'] / total_amount * 100) if total_amount > 0 else 0
            top_suppliers.append({'name': v['name'], 'count': v['count'], 'total': v['total'], 'percentage': percentage})
        top_suppliers.sort(key=lambda x: x['total'], reverse=True)
        
        # Concentration (top 5)
        top5_total = sum(s['total'] for s in top_suppliers[:5])
        top5_percentage = (top5_total / total_amount * 100) if total_amount > 0 else 0
        concentration_risk = top5_percentage > 70
        
        # Évolution vs mois dernier
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_month_start = (current_month_start - relativedelta(months=1))
        previous_month_end = current_month_start - timedelta(seconds=1)
        
        current_month_total = sum(float(po.total_amount or 0) for po in purchase_orders_list 
                                 if getattr(po, 'created_at', None) and getattr(po, 'created_at') >= current_month_start)
        previous_month_total = sum(float(po.total_amount or 0) for po in purchase_orders_list 
                                  if getattr(po, 'created_at', None) 
                                  and previous_month_start <= getattr(po, 'created_at') <= previous_month_end)
        
        evolution_percentage = 0
        if previous_month_total > 0:
            evolution_percentage = ((current_month_total - previous_month_total) / previous_month_total) * 100
        
        # QR Code
        try:
            qr_data = f"Purchase Orders Report | Count: {total_count} | Total: {total_amount:.2f}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'purchase_orders': purchase_orders_list,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            # Vue d'ensemble
            'total_amount': total_amount,
            'total_count': total_count,
            'avg_amount': avg_amount,
            'evolution_percentage': evolution_percentage,
            # Performance
            'approval_rate': approval_rate,
            'reception_rate': reception_rate,
            'cancellation_rate': cancellation_rate,
            'received_count': received_count,
            # Fournisseurs
            'top_suppliers': top_suppliers,
            'concentration_risk': concentration_risk,
            'top5_percentage': top5_percentage,
            # Répartition
            'by_status': by_status,
            'by_supplier': top_suppliers[:10],
            # Alertes
            'overdue_count': overdue_count,
            'pending_approval_count': pending_approval_count,
            # Dates
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
        """Générer un rapport PDF avancé pour plusieurs clients"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            org_data = {}
        
        try:
            clients_list = list(clients)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            clients_list = []
        
        from collections import defaultdict
        from django.utils import timezone
        
        total_count = len(clients_list)
        active_count = sum(1 for c in clients_list if getattr(c, 'is_active', True))
        active_percentage = (active_count / total_count * 100) if total_count > 0 else 0
        
        # Calculer CA total et créer enrichissement
        clients_enriched = []
        total_revenue = 0
        new_clients_count = 0
        payment_issues_count = 0
        payment_issues_amount = 0
        inactive_90_count = 0
        today = timezone.now()
        days_90_ago = today - timedelta(days=90)
        current_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        active_this_month_count = 0
        
        for client in clients_list:
            try:
                invoices = getattr(client, 'invoices', None)
                if invoices:
                    client_invoices = invoices.all()
                    client_revenue = sum(float(inv.total_amount or 0) for inv in client_invoices)
                    invoice_count = client_invoices.count()
                    
                    # Client actif ce mois
                    if any(getattr(inv, 'created_at', None) and getattr(inv, 'created_at') >= current_month_start for inv in client_invoices):
                        active_this_month_count += 1
                    
                    # Problèmes paiement
                    overdue_invoices = [inv for inv in client_invoices if getattr(inv, 'status', '') == 'overdue']
                    if overdue_invoices:
                        payment_issues_count += 1
                        payment_issues_amount += sum(float(inv.total_amount or 0) for inv in overdue_invoices)
                    
                    # Inactif 90j+
                    last_invoice = max((getattr(inv, 'created_at', None) for inv in client_invoices if getattr(inv, 'created_at', None)), default=None)
                    if last_invoice and last_invoice < days_90_ago:
                        inactive_90_count += 1
                else:
                    client_revenue = 0
                    invoice_count = 0
                
                total_revenue += client_revenue
                
                # Nouveau client ce mois
                if getattr(client, 'created_at', None) and getattr(client, 'created_at') >= current_month_start:
                    new_clients_count += 1
                
                # Enrichir
                client.total_revenue = client_revenue
                client.invoice_count = invoice_count
                clients_enriched.append(client)
            except Exception as e:
                print(f"Erreur traitement client {client.id}: {e}")
        
        avg_basket = total_revenue / total_count if total_count > 0 else 0
        active_clients_percentage = (active_this_month_count / total_count * 100) if total_count > 0 else 0
        
        # Top 10 clients
        top_clients = sorted(clients_enriched, key=lambda x: getattr(x, 'total_revenue', 0), reverse=True)[:10]
        top_clients_data = []
        for client in top_clients:
            invoice_count = getattr(client, 'invoice_count', 0)
            total_rev = getattr(client, 'total_revenue', 0)
            avg = total_rev / invoice_count if invoice_count > 0 else 0
            top_clients_data.append({
                'name': getattr(client, 'name', 'Client inconnu'),
                'invoice_count': invoice_count,
                'total_revenue': total_rev,
                'avg_basket': avg
            })
        
        # Pareto 80/20
        vip_count = max(1, int(total_count * 0.2))
        sorted_clients = sorted(clients_enriched, key=lambda x: getattr(x, 'total_revenue', 0), reverse=True)
        vip_revenue = sum(getattr(c, 'total_revenue', 0) for c in sorted_clients[:vip_count])
        vip_percentage = (vip_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        inactive_percentage = (inactive_90_count / total_count * 100) if total_count > 0 else 0
        
        # QR Code
        try:
            qr_data = f"Clients Report | Count: {total_count} | Revenue: {total_revenue:.2f}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'clients': clients_enriched,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            # Vue d'ensemble
            'total_count': total_count,
            'active_count': active_count,
            'active_percentage': active_percentage,
            'total_revenue': total_revenue,
            'avg_basket': avg_basket,
            'active_clients_this_month': active_this_month_count,
            'active_clients_percentage': active_clients_percentage,
            # Segmentation
            'vip_count': vip_count,
            'vip_revenue': vip_revenue,
            'vip_percentage': vip_percentage,
            'inactive_count': inactive_90_count,
            'inactive_percentage': inactive_percentage,
            # Top clients
            'top_clients': top_clients_data,
            # Alertes
            'payment_issues_count': payment_issues_count,
            'payment_issues_amount': payment_issues_amount,
            'new_clients_count': new_clients_count,
            # Dates
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
        """Générer un rapport PDF avancé pour plusieurs produits"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            org_data = {}
        
        try:
            products_list = list(products)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            products_list = []
        
        from collections import defaultdict
        
        total_count = len(products_list)
        active_count = sum(1 for p in products_list if getattr(p, 'is_active', True))
        active_percentage = (active_count / total_count * 100) if total_count > 0 else 0
        
        # Stock et marges
        stock_value = 0
        total_margin = 0
        margin_count = 0
        out_of_stock_count = 0
        low_stock_count = 0
        no_sales_count = 0
        dormant_stock_value = 0
        
        # Pour Top products (simulé car pas d'InvoiceItem accessible ici facilement)
        products_enriched = []
        
        for product in products_list:
            product_type = getattr(product, 'product_type', 'physical')
            price = float(getattr(product, 'price', 0) or 0)
            cost_price = float(getattr(product, 'cost_price', 0) or 0)
            stock_qty = float(getattr(product, 'stock_quantity', 0) or 0)
            low_threshold = float(getattr(product, 'low_stock_threshold', 5) or 5)
            
            # Valeur stock (physiques seulement)
            if product_type == 'physical':
                stock_value += stock_qty * cost_price
                
                # Alertes stock
                if stock_qty == 0:
                    out_of_stock_count += 1
                elif stock_qty <= low_threshold:
                    low_stock_count += 1
            
            # Marge
            if cost_price > 0 and price > 0:
                margin = ((price - cost_price) / price) * 100
                total_margin += margin
                margin_count += 1
            
            products_enriched.append(product)
        
        avg_margin = total_margin / margin_count if margin_count > 0 else 0
        rotation_rate = 3.0  # Valeur par défaut (nécessiterait historique ventes)
        
        # Top 10 produits (par prix pour simulation, idéalement par CA réel)
        top_products = sorted(products_enriched, key=lambda x: float(getattr(x, 'price', 0) or 0) * float(getattr(x, 'stock_quantity', 0) or 0), reverse=True)[:10]
        top_products_data = []
        for product in top_products:
            qty = float(getattr(product, 'stock_quantity', 0) or 0)
            price = float(getattr(product, 'price', 0) or 0)
            revenue = qty * price
            top_products_data.append({
                'name': getattr(product, 'name', 'Produit inconnu'),
                'quantity_sold': int(qty),
                'revenue': revenue,
                'percentage': (revenue / stock_value * 100) if stock_value > 0 else 0
            })
        
        # QR Code
        try:
            qr_data = f"Products Report | Count: {total_count} | Stock Value: {stock_value:.2f}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'products': products_enriched,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            # Vue d'ensemble
            'total_count': total_count,
            'active_count': active_count,
            'active_percentage': active_percentage,
            'stock_value': stock_value,
            'avg_margin': avg_margin,
            'rotation_rate': rotation_rate,
            # Top products
            'top_products': top_products_data,
            # Alertes stock
            'out_of_stock_count': out_of_stock_count,
            'low_stock_count': low_stock_count,
            'no_sales_count': no_sales_count,
            'dormant_stock_value': dormant_stock_value,
            # Dates
            'date_start': date_start,
            'date_end': date_end,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/products_report.html'
        try:
            # #region agent log
            import json, os, time
            log_path = os.path.join(settings.BASE_DIR, '.cursor', 'debug.log')
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            with open(log_path, 'a') as f:
                f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H1', 'location': 'report_generator_weasy.py:1190', 'message': 'generate_products_report: before render_to_string (BULK - working)', 'data': {'products_count': len(products_list) if 'products_list' in locals() else 0, 'base_url': str(settings.BASE_DIR)}, 'timestamp': int(time.time() * 1000)}) + '\n')
            # #endregion
            
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            # #region agent log
            with open(log_path, 'a') as f:
                f.write(json.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'H1,H2', 'location': 'report_generator_weasy.py:1196', 'message': 'generate_products_report: after write_pdf (BULK - working)', 'data': {'pdf_bytes_type': str(type(pdf_bytes)), 'pdf_bytes_len': len(pdf_bytes) if pdf_bytes else 0, 'pdf_starts_with': pdf_bytes[:10].hex() if pdf_bytes and len(pdf_bytes) >= 10 else None, 'is_bytes': isinstance(pdf_bytes, bytes), 'starts_with_pdf': pdf_bytes.startswith(b'%PDF') if isinstance(pdf_bytes, bytes) else False}, 'timestamp': int(time.time() * 1000)}) + '\n')
            # #endregion
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF produits: {e}")
            import traceback
            traceback.print_exc()
            raise

    def generate_suppliers_report(self, suppliers, user=None, date_start=None, date_end=None):
        """Générer un rapport PDF avancé pour plusieurs fournisseurs"""
        if not self.weasyprint_available:
            raise ImportError("WeasyPrint n'est pas disponible")
        
        try:
            org_data = self._get_organization_data(user)
        except Exception as e:
            print(f"Erreur récupération données organisation: {e}")
            org_data = {}
        
        try:
            suppliers_list = list(suppliers)
        except Exception as e:
            print(f"Erreur conversion QuerySet: {e}")
            suppliers_list = []
        
        from collections import defaultdict
        from django.utils import timezone
        
        total_count = len(suppliers_list)
        active_count = sum(1 for s in suppliers_list if getattr(s, 'is_active', True))
        active_percentage = (active_count / total_count * 100) if total_count > 0 else 0
        
        # Calculer volume et notes
        total_volume = 0
        total_rating = 0
        rating_count = 0
        local_count = 0
        minority_count = 0
        women_count = 0
        indigenous_count = 0
        inactive_count = 0
        excellent_count = 0
        good_count = 0
        poor_count = 0
        
        suppliers_enriched = []
        today = timezone.now()
        days_90_ago = today - timedelta(days=90)
        
        for supplier in suppliers_list:
            # Volume d'achats
            try:
                from apps.purchase_orders.models import PurchaseOrder
                pos = PurchaseOrder.objects.filter(supplier=supplier)
                supplier_volume = sum(float(po.total_amount or 0) for po in pos)
                po_count = pos.count()
                total_volume += supplier_volume
                
                # Inactif si pas de PO depuis 90j
                recent_pos = pos.filter(created_at__gte=days_90_ago)
                if not recent_pos.exists():
                    inactive_count += 1
            except:
                supplier_volume = 0
                po_count = 0
            
            # Notes
            rating = float(getattr(supplier, 'rating', 0) or 0)
            if rating > 0:
                total_rating += rating
                rating_count += 1
                
                if rating >= 4.5:
                    excellent_count += 1
                elif rating >= 3.5:
                    good_count += 1
                else:
                    poor_count += 1
            
            # Diversité
            if getattr(supplier, 'is_local', False):
                local_count += 1
            if getattr(supplier, 'is_minority_owned', False):
                minority_count += 1
            if getattr(supplier, 'is_woman_owned', False):
                women_count += 1
            if getattr(supplier, 'is_indigenous', False):
                indigenous_count += 1
            
            supplier.volume = supplier_volume
            supplier.po_count = po_count
            suppliers_enriched.append(supplier)
        
        avg_rating = total_rating / rating_count if rating_count > 0 else 0
        
        # Pourcentages diversité
        local_percentage = (local_count / total_count * 100) if total_count > 0 else 0
        minority_percentage = (minority_count / total_count * 100) if total_count > 0 else 0
        women_percentage = (women_count / total_count * 100) if total_count > 0 else 0
        indigenous_percentage = (indigenous_count / total_count * 100) if total_count > 0 else 0
        
        # Pourcentages performance
        excellent_percentage = (excellent_count / total_count * 100) if total_count > 0 else 0
        good_percentage = (good_count / total_count * 100) if total_count > 0 else 0
        poor_percentage = (poor_count / total_count * 100) if total_count > 0 else 0
        
        # Top 10 fournisseurs
        top_suppliers = sorted(suppliers_enriched, key=lambda x: getattr(x, 'volume', 0), reverse=True)[:10]
        top_suppliers_data = []
        for supplier in top_suppliers:
            volume = getattr(supplier, 'volume', 0)
            percentage = (volume / total_volume * 100) if total_volume > 0 else 0
            top_suppliers_data.append({
                'name': getattr(supplier, 'name', 'Fournisseur inconnu'),
                'rating': getattr(supplier, 'rating', 0),
                'po_count': getattr(supplier, 'po_count', 0),
                'volume': volume,
                'percentage': percentage
            })
        
        # Concentration (top 5)
        top5_volume = sum(getattr(s, 'volume', 0) for s in top_suppliers[:5])
        top5_percentage = (top5_volume / total_volume * 100) if total_volume > 0 else 0
        concentration_risk = top5_percentage > 70
        
        # QR Code
        try:
            qr_data = f"Suppliers Report | Count: {total_count} | Volume: {total_volume:.2f}"
            qr_code = self._generate_qr_code(qr_data)
        except Exception as e:
            print(f"Erreur génération QR code: {e}")
            qr_code = None
        
        context = {
            'suppliers': suppliers_enriched,
            'organization': org_data or {},
            'logo_base64': self._get_logo_base64(org_data),
            'qr_code_base64': qr_code,
            # Vue d'ensemble
            'total_count': total_count,
            'active_count': active_count,
            'active_percentage': active_percentage,
            'total_volume': total_volume,
            'avg_rating': avg_rating,
            # Performance par note
            'excellent_count': excellent_count,
            'excellent_percentage': excellent_percentage,
            'good_count': good_count,
            'good_percentage': good_percentage,
            'poor_count': poor_count,
            'poor_percentage': poor_percentage,
            # Top suppliers
            'top_suppliers': top_suppliers_data,
            'concentration_risk': concentration_risk,
            'top5_percentage': top5_percentage,
            # Diversité
            'local_count': local_count,
            'local_percentage': local_percentage,
            'minority_count': minority_count,
            'minority_percentage': minority_percentage,
            'women_count': women_count,
            'women_percentage': women_percentage,
            'indigenous_count': indigenous_count,
            'indigenous_percentage': indigenous_percentage,
            # Alertes
            'inactive_count': inactive_count,
            # Dates
            'date_start': date_start,
            'date_end': date_end,
            'generated_at': datetime.now(),
        }
        
        template_name = 'reports/pdf/suppliers_report.html'
        try:
            html_string = render_to_string(template_name, context)
            html = self.HTML(string=html_string, base_url=settings.BASE_DIR)
            pdf_bytes = html.write_pdf()
            
            buffer = BytesIO(pdf_bytes)
            buffer.seek(0)
            return buffer
        except Exception as e:
            print(f"Erreur génération PDF fournisseurs: {e}")
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

