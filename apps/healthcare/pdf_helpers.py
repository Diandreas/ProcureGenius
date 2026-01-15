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
from PIL import Image
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.functional import SimpleLazyObject
from django.contrib.auth.mixins import AccessMixin
from django.http import HttpResponse

class TokenAuthMixin:
    """
    Mixin to authenticate requests using Token Authentication (DRF).
    This allows standard Django Views to accept the Token sent by frontend.
    Checks 'Authorization' header or 'token' query parameter.
    """
    def dispatch(self, request, *args, **kwargs):
        # 1. Check for Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        token = None

        if auth_header and auth_header.startswith('Token '):
            token = auth_header.split(' ')[1]
        
        # 2. Check for query parameter (for window.open)
        if not token:
            token = request.GET.get('token')

        if token:
            try:
                # Manually authenticate using DRF's TokenAuthentication logic
                user, auth = TokenAuthentication().authenticate_credentials(token)
                request.user = user
                request.auth = auth
                print(f"[AUTH] Token auth successful for user: {user.username}")
            except AuthenticationFailed:
                print(f"[AUTH] Invalid token provided: {token}")
                pass
            except Exception as e:
                print(f"[AUTH] Unexpected error during token auth: {e}")

        return super().dispatch(request, *args, **kwargs)

class TokenLoginRequiredMixin(TokenAuthMixin, AccessMixin):
    """
    Mixin that performs Token Authentication and then verifies login.
    If not authenticated, returns 401 Unauthorized instead of redirecting (302) to login page.
    Using 401 allows the frontend (Axios/JS) to handle the error properly.
    """
    def dispatch(self, request, *args, **kwargs):
        # 1. Run Token Auth first (via super of TokenAuthMixin's super which is problematic)
        # Actually TokenAuthMixin.dispatch calls super().dispatch.
        # So we should rely on MRO or call auth logic directly.
        
        # Let's call the auth logic directly or ensure the mixin order logic
        # If we use `class View(TokenLoginRequiredMixin, DetailView)`, MRO is:
        # TokenLoginRequiredMixin -> TokenAuthMixin -> AccessMixin -> DetailView
        
        # So super().dispatch() in TokenAuthMixin calls AccessMixin.dispatch? No, AccessMixin has dispatch.
        # But AccessMixin doesn't have a useful dispatch for us to just "run".
        
        # Better approach: Manually run auth logic here or rely on TokenAuthMixin being first.
        # We can inheritance: TokenLoginRequiredMixin(AccessMixin)
        # And we copy the TokenAuthMixin logic or import it.
        # Let's just inherit TokenAuthMixin and override dispatch to check `request.user.is_authenticated`.
        
        # Call parent dispatch to run TokenAuth
        response = super().dispatch(request, *args, **kwargs)
        
        # Check authentication (after TokenAuthMixin ran)
        if not request.user.is_authenticated:
            print("[AUTH] User not authenticated, returning 401")
            return HttpResponse('Unauthorized: Valid Token Required', status=401)
            
        return response


# =============================================================================
# GTK3 CONFIGURATION (CRITICAL FOR WINDOWS)
# =============================================================================
def configure_gtk3_path():
    """Ajoute GTK3 au PATH système pour Windows"""
    if sys.platform != 'win32':
        return True
        
    gtk3_paths = [
        r"C:\Program Files\GTK3-Runtime Win64\bin",
        r"C:\GTK3-Runtime Win64\bin",
        r"C:\Program Files (x86)\GTK3-Runtime Win64\bin",
    ]

    for gtk_path in gtk3_paths:
        if os.path.exists(gtk_path) and gtk_path not in os.environ.get('PATH', ''):
            os.environ['PATH'] = gtk_path + os.pathsep + os.environ.get('PATH', '')
            print(f"[INFO] GTK3 ajoute au PATH: {gtk_path}")
            return True
    return False

# Configurer GTK3
configure_gtk3_path()

# =============================================================================
# WEASYPRINT IMPORT WITH FALLBACK
# =============================================================================
try:
    from django_weasyprint import WeasyTemplateResponseMixin
    WEASYPRINT_AVAILABLE = True
    print("[OK] WeasyPrint (Healthcare) charge avec succes!")
except (ImportError, OSError) as e:
    print(f"[ERROR] WeasyPrint non disponible (Healthcare): {e}")
    # Packages might be missing, check pip install
    WEASYPRINT_AVAILABLE = False
    WeasyTemplateResponseMixin = object

class SafeWeasyTemplateResponseMixin(WeasyTemplateResponseMixin):
    """
    Mixin wrapper that safely handles missing WeasyPrint.
    If WeasyPrint is available, acts as WeasyTemplateResponseMixin.
    If not, intercepts GET requests to return a helpful 503 error.
    """
    
    def get(self, request, *args, **kwargs):
        if not WEASYPRINT_AVAILABLE:
            return self._get_error_response()
        return super().get(request, *args, **kwargs)

    def _get_error_response(self):
        return HttpResponse(
            """
            <html>
            <head><title>Erreur - WeasyPrint non disponible</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px;">
                <h1 style="color: #e74c3c;">WeasyPrint non disponible</h1>
                <p>WeasyPrint n'a pas pu être chargé pour les modules santé. GTK3 est probablement manquant ou mal configuré.</p>
                <h2>Solutions :</h2>
                <ol>
                    <li>Vérifiez que GTK3 est installé dans : <code>C:\\Program Files\\GTK3-Runtime Win64\\bin</code></li>
                    <li>Redémarrez le serveur Django</li>
                    <li>Consultez la documentation : INSTALL_GTK3_WINDOWS.md</li>
                </ol>
            </body>
            </html>
            """,
            content_type='text/html',
            status=503
        )


class HealthcarePDFMixin:
    """Mixin réutilisable pour génération PDF thermal/standard"""

    def _get_organization_data(self, instance):
        """
        Récupère données organisation depuis OrganizationSettings ou fallback

        Args:
            instance: Consultation, LabOrder ou PharmacyDispensing

        Returns:
            dict: Données organisation (nom, adresse, logo, paper_size, etc.)
        """
        from apps.core.models import OrganizationSettings
        from apps.invoicing.models import PrintTemplate

        organization = instance.organization
        org_data = {}

        # 1. Essayer OrganizationSettings
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
                        'company_name': print_template.company_name or organization.name,
                        'company_address': print_template.company_address or '',
                        'company_phone': print_template.company_phone or '',
                        'company_email': print_template.company_email or '',
                        'company_logo': print_template.company_logo,
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

        return org_data

    def _get_logo_base64(self, org_data):
        """
        Convertit logo en base64 pour embedding HTML
        Aligned with invoice pattern - uses file path approach

        Args:
            org_data: dict avec 'company_logo' (ImageField)

        Returns:
            str: data URL base64 ou None
        """
        import os
        import base64
        
        logo_field = org_data.get('company_logo')
        if not logo_field:
            return None

        try:
            # Get the file path from the ImageField
            if hasattr(logo_field, 'path'):
                logo_path = logo_field.path
            else:
                # Fallback if it's already a string path
                logo_path = str(logo_field)
            
            if os.path.exists(logo_path):
                with open(logo_path, 'rb') as f:
                    logo_data = f.read()
                    logo_base64 = base64.b64encode(logo_data).decode('utf-8')

                    # Detect MIME type
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

                    print(f"[INFO] Logo loaded: {os.path.basename(logo_path)} ({mime_type})")
                    return f"data:{mime_type};base64,{logo_base64}"
            else:
                print(f"[WARN] Logo file not found: {logo_path}")
        except Exception as e:
            print(f"[ERROR] Logo conversion failed: {e}")
            import traceback
            traceback.print_exc()

        return None

    def _generate_qr_code(self, instance, data_dict):
        """
        Génère QR code avec données de l'instance

        Args:
            instance: L'objet (Consultation, LabOrder, PharmacyDispensing)
            data_dict: Données à encoder dans QR (dict)

        Returns:
            str: data URL base64 du QR code
        """
        try:
            # Créer QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=2,
            )

            # Encoder données en JSON
            qr_data = json.dumps(data_dict, default=str)
            qr.add_data(qr_data)
            qr.make(fit=True)

            # Générer image
            img = qr.make_image(fill_color="black", back_color="white")

            # Convertir en base64
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            print(f"[ERROR] QR code generation failed: {e}")
            return None

    def detect_thermal_mode(self, org_data):
        """
        Détermine si mode thermal activé

        Args:
            org_data: dict avec 'paper_size'

        Returns:
            str: 'thermal_80', 'thermal_58' ou None
        """
        paper_size = org_data.get('paper_size', 'A4')
        if paper_size in ['thermal_80', 'thermal_58']:
            return paper_size
        return None
