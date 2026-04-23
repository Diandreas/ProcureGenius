"""
Helpers partagés pour génération PDF des modules santé
Réutilise la logique de apps/invoicing/views_pdf.py
"""
import os
import sys
import base64
import json
import qrcode
from io import BytesIO
from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _
from django.core.files.base import ContentFile
from django.contrib.staticfiles import finders

try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    print("[WARNING] WeasyPrint not available. PDF generation will fail.")

from apps.accounts.models import Organization
from apps.core.models import OrganizationSettings
from apps.invoicing.models import PrintTemplate


class TokenAuthMixin:
    """
    Mixin pour authentification par token (pour accès direct PDF)
    """
    def dispatch(self, request, *args, **kwargs):
        token = request.GET.get('token')
        if token and token == getattr(settings, 'PDF_ACCESS_TOKEN', None):
            # Bypass auth si token valide
            return super().dispatch(request, *args, **kwargs)
        return super().dispatch(request, *args, **kwargs)


class TokenLoginRequiredMixin:
    """
    Alternative à LoginRequiredMixin qui supporte:
    1. Le token secret dans l'URL (?token=...)
    2. L'authentification par session Django (Cookies)
    3. L'authentification par Token API (JWT/Header via DRF)
    """
    def dispatch(self, request, *args, **kwargs):
        # 1. Vérification du Token secret dans l'URL (Accès direct/partage)
        token = request.GET.get('token')
        if token and token == getattr(settings, 'PDF_ACCESS_TOKEN', 'csj-secure-pdf-2024'):
            return super().dispatch(request, *args, **kwargs)
        
        # 2. Vérification de l'authentification session classique
        if request.user.is_authenticated:
            return super().dispatch(request, *args, **kwargs)
            
        # 3. Tentative d'authentification via les headers API (DRF)
        # Utile si l'appel vient du frontend avec un header Authorization
        try:
            from rest_framework.authentication import TokenAuthentication, SessionAuthentication
            from rest_framework.request import Request as DRFRequest

            # Wrap Django request in DRF Request so authenticators can read headers properly
            drf_request = DRFRequest(request)

            authenticators = [TokenAuthentication(), SessionAuthentication()]
            try:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                authenticators.insert(0, JWTAuthentication())
            except ImportError:
                pass

            for authenticator in authenticators:
                try:
                    auth_res = authenticator.authenticate(drf_request)
                    if auth_res:
                        user, auth = auth_res
                        request.user = user
                        return super().dispatch(request, *args, **kwargs)
                except Exception:
                    continue
        except ImportError:
            pass

        # 4. Si vraiment pas authentifié -> 403
        from django.http import HttpResponseForbidden
        return HttpResponseForbidden("Authentification requise pour accéder à ce document PDF.")


class SafeWeasyTemplateResponseMixin:
    """
    Mixin pour générer du PDF avec WeasyPrint de manière sécurisée
    """
    pdf_attachment = True
    pdf_filename = 'document.pdf'
    pdf_options = {}

    def get_pdf_filename(self):
        return self.pdf_filename

    def render_to_response(self, context, **response_kwargs):
        if not WEASYPRINT_AVAILABLE:
            return HttpResponse("Moteur PDF (WeasyPrint) non disponible sur ce serveur.", status=500)

        html_string = render_to_string(self.template_name, context)
        
        # Base URL pour les images
        base_url = self.request.build_absolute_uri('/')
        
        wp = HTML(string=html_string, base_url=base_url)
        pdf = wp.write_pdf(**self.pdf_options)

        response = HttpResponse(pdf, content_type='application/pdf')
        if self.pdf_attachment:
            filename = self.get_pdf_filename()
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        else:
            response['Content-Disposition'] = 'inline'
            
        return response


class HealthcarePDFMixin:
    """
    Mixin fournissant des outils communs pour les PDFs Santé
    """
    def _get_organization_data(self, instance):
        """
        Récupère les infos d'entête (Settings ou Organization)
        """
        organization = getattr(instance, 'organization', None)
        if not organization and hasattr(self.request.user, 'organization'):
            organization = self.request.user.organization
            
        if not organization:
            return {}

        org_data = {}
        
        # 1. Priorité: OrganizationSettings
        try:
            org_settings = OrganizationSettings.objects.get(organization=organization)
            org_data = {
                'company_name': org_settings.company_name or organization.name,
                'company_address': org_settings.company_address or '',
                'company_phone': org_settings.company_phone or '',
                'company_email': org_settings.company_email or '',
                'company_website': org_settings.company_website or '',
                'company_logo': org_settings.company_logo,
                'company_niu': org_settings.company_niu or '',
                'company_rc_number': org_settings.company_rc_number or '',
                'gst_number': org_settings.company_gst_number or '',
                'qst_number': org_settings.company_qst_number or '',
                'paper_size': org_settings.paper_size or 'A4',
                'paper_orientation': org_settings.paper_orientation or 'portrait',
                'brand_color': org_settings.brand_color or '#2563eb',
            }
        except OrganizationSettings.DoesNotExist:
            # 2. Fallback: PrintTemplate
            try:
                print_template = PrintTemplate.objects.filter(
                    organization=organization
                ).first()
                if print_template:
                    org_data = {
                        'company_name': print_template.header_company_name or organization.name,
                        'company_address': print_template.header_address or '',
                        'company_phone': print_template.header_phone or '',
                        'company_email': print_template.header_email or '',
                        'company_logo': print_template.header_logo,
                        'paper_size': 'A4',  # Default
                        'brand_color': print_template.primary_color or '#2563eb',
                    }
            except Exception:
                pass

        # 3. Fallback ultime: organization seul
        if not org_data:
            org_data = {
                'company_name': organization.name,
                'paper_size': 'A4',
                'brand_color': '#2563eb',
            }

        # --- POST-PROCESSING ---
        
        # 1. Sanitize brand_color
        color = org_data.get('brand_color')
        if not color or not isinstance(color, str) or not color.startswith('#'):
            org_data['brand_color'] = '#2563eb'

        # 2. Map standard keys for pdf_base.html compatibility
        # pdf_base.html uses organization.name, organization.address, etc.
        org_data['name'] = org_data.get('company_name')
        org_data['address'] = org_data.get('company_address')
        org_data['phone'] = org_data.get('company_phone')
        org_data['email'] = org_data.get('company_email')
        org_data['website'] = org_data.get('company_website')
        org_data['niu'] = org_data.get('company_niu')
        org_data['rc_number'] = org_data.get('company_rc_number')

        return org_data

    def _get_logo_base64(self, org_data):
        """
        Convertit logo en base64 pour embedding HTML
        """
        logo_field = org_data.get('company_logo')
        return self._get_image_base64(logo_field)

    def _get_image_base64(self, image_field, max_width_px=None, max_height_px=None):
        """
        Convertit un ImageField ou un chemin d'image en base64 data URL.
        Si max_width_px ou max_height_px est fourni, redimensionne avec Pillow
        en conservant le ratio avant encodage.
        """
        if not image_field:
            return None

        import os
        import base64
        from io import BytesIO

        try:
            if hasattr(image_field, 'path'):
                image_path = image_field.path
            else:
                image_path = str(image_field)

            if not os.path.exists(image_path):
                return None

            ext = os.path.splitext(image_path)[1].lower()
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

            if (max_width_px or max_height_px) and ext != '.svg':
                try:
                    from PIL import Image as PILImage
                    img = PILImage.open(image_path).convert('RGB')
                    w, h = img.size
                    scale = 1.0
                    if max_width_px and w > max_width_px:
                        scale = min(scale, max_width_px / w)
                    if max_height_px and h > max_height_px:
                        scale = min(scale, max_height_px / h)
                    if scale < 1.0:
                        img = img.resize((int(w * scale), int(h * scale)), PILImage.LANCZOS)
                    buf = BytesIO()
                    img.save(buf, format='PNG')
                    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
                    return f"data:image/png;base64,{image_base64}"
                except ImportError:
                    pass  # Pillow not available, fall through to raw read

            with open(image_path, 'rb') as f:
                image_base64 = base64.b64encode(f.read()).decode('utf-8')
            return f"data:{mime_type};base64,{image_base64}"

        except Exception as e:
            print(f"[ERROR] Error encoding image to base64: {e}")

        return None

    def _generate_qr_code(self, instance, data=None):
        """
        Génère un QR code pour le document
        """
        if data is None:
            data = f"DOC-{instance.id}"
        
        if isinstance(data, dict):
            data = json.dumps(data)

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()

    def _get_paper_size(self, org_data):
        """
        Retourne la taille du papier pour WeasyPrint
        
        Returns:
            str: 'thermal_80', 'thermal_58' ou None
        """
        paper_size = org_data.get('paper_size', 'A4')
        if paper_size in ['thermal_80', 'thermal_58']:
            return paper_size
        return None
