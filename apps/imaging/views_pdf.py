"""
Vue PDF pour le rapport d'imagerie (compte-rendu + images/PDF joints)
"""
from django.views.generic import DetailView
from .models import ImagingOrder
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, TokenLoginRequiredMixin


class ImagingResultPDFView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère le rapport d'imagerie (A4) : compte-rendu texte + images/PDF joints.
    Si la commande est sous-traitée, utilise le logo/entête du sous-traitant
    (même logique que le rapport labo sous-traité).
    """
    model = ImagingOrder
    template_name = 'imaging/pdf_templates/imaging_result.html'
    pdf_attachment = False
    pdf_filename = 'rapport-imagerie.pdf'

    def get_pdf_filename(self):
        order = self.get_object()
        return f'rapport-imagerie-{order.order_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        order = self.get_object()

        org_data = self._get_organization_data(order)
        subcontractor = getattr(order, 'subcontractor', None)

        if subcontractor and subcontractor.is_active:
            context['logo_base64'] = self._get_image_base64(subcontractor.logo) or self._get_logo_base64(org_data)
            context['organization'] = {
                **org_data,
                'name': subcontractor.name,
                'address': subcontractor.address or org_data.get('address', ''),
                'phone': subcontractor.phone or org_data.get('phone', ''),
                'email': subcontractor.email or org_data.get('email', ''),
                'brand_color': subcontractor.brand_color or org_data.get('brand_color', '#2563eb'),
            }
        else:
            context['organization'] = org_data
            context['logo_base64'] = self._get_logo_base64(org_data)

        context['order'] = order
        context['subcontractor'] = subcontractor
        context['patient'] = order.patient

        # Prépare chaque item avec ses fichiers résultat en base64 (images seulement —
        # un PDF joint ne peut pas être fusionné inline par WeasyPrint, on affiche
        # juste une ligne "voir pièce jointe" pour ceux-là).
        items = list(order.items.all().select_related('exam_type').prefetch_related('result_files'))
        for item in items:
            files_with_preview = []
            for f in item.result_files.all():
                preview_base64 = self._get_image_base64(f.file, max_width_px=1000) if f.file_type == 'image' else None
                files_with_preview.append({'obj': f, 'preview_base64': preview_base64})
            item.files_with_preview = files_with_preview
        context['items'] = items

        return context
