"""
Vues PDF pour laboratoire: résultats détaillés ET reçus thermal
"""
from django.views.generic import DetailView
from .models import LabOrder
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin


class LabOrderReceiptView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère REÇU thermal pour commande labo (petit ticket de caisse)
    """
    model = LabOrder
    template_name = 'laboratory/pdf_templates/lab_order_receipt_thermal.html'
    pdf_attachment = False
    
    # Options WeasyPrint pour format thermal (80mm)
    # Note: On laisse le template définir la taille exact via CSS (@page)
    # mais 'pdf_options' peut passer des arguments à weasyprint
    pdf_options = {'pdf_variant': 'pdf/a-3b'}

    def get_pdf_filename(self):
        lab_order = self.get_object()
        return f'recu-labo-{lab_order.order_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        lab_order = self.get_object()

        # Données organisation
        org_data = self._get_organization_data(lab_order)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)
        context['paper_size'] = org_data.get('paper_size', 'thermal_80')  # Force thermal

        # QR code avec données labo
        qr_data = {
            'type': 'lab_receipt',
            'order_id': str(lab_order.id),
            'order_number': lab_order.order_number,
            'patient': lab_order.patient.get_full_name() if lab_order.patient else '',
            'date': str(lab_order.order_date),
            'total': str(lab_order.total_price) if hasattr(lab_order, 'total_price') else '0',
        }
        context['qr_code_base64'] = self._generate_qr_code(lab_order, qr_data)

        # Données labo
        context['lab_order'] = lab_order
        context['patient'] = lab_order.patient
        context['items'] = lab_order.items.all()

        return context


class LabResultPDFView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère le rapport de RÉSULTATS (A4)
    """
    model = LabOrder
    template_name = 'laboratory/pdf_templates/lab_result_report.html'
    pdf_attachment = False
    pdf_filename = 'resultats.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        lab_order = self.get_object()
        
        # Organization data
        org_data = self._get_organization_data(lab_order)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)
        
        context['lab_order'] = lab_order
        context['patient'] = lab_order.patient
        # Use items instead of results (items contains the result info)
        context['items'] = lab_order.items.all().select_related('lab_test')
        return context


class LabBarcodeView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère une planche d'étiquettes code-barres pour les échantillons
    """
    model = LabOrder
    template_name = 'laboratory/pdf_templates/lab_barcodes.html'
    pdf_attachment = False
    
    def get_pdf_filename(self):
        return f'barcodes-{self.get_object().order_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        lab_order = self.get_object()
        
        # Generator for barcodes
        # For each sample type needed, we generate a barcode
        # Group items by sample type to avoid duplicate labels if multiple tests use same sample
        samples = {}
        for item in lab_order.items.all():
            sample_type = item.lab_test.sample_type
            if sample_type not in samples:
                samples[sample_type] = []
            samples[sample_type].append(item.lab_test.test_code)
        
        barcode_list = []
        for s_type, tests in samples.items():
            # Code: ORDER-SAMPLETYPE (ex: LAB-20231010-001-BLOOD)
            code_value = f"{lab_order.order_number}-{s_type[:3].upper()}"
            barcode_list.append({
                'type': s_type,
                'code': code_value,
                'tests': ", ".join(tests[:3]) + ("..." if len(tests)>3 else ""),
                'patient_name': lab_order.patient.name,
                'patient_dob': lab_order.patient.date_of_birth,
                'barcode_base64': self._generate_barcode(code_value) # Helper method needed or use template tag
            })
            
        context['barcodes'] = barcode_list
        return context
        
    def _generate_barcode(self, value):
        import io
        import base64
        from barcode import Code128
        from barcode.writer import ImageWriter
        
        buffer = io.BytesIO()
        Code128(value, writer=ImageWriter()).write(buffer)
        return base64.b64encode(buffer.getvalue()).decode()


class LabBenchSheetView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère une fiche de paillasse (A4) pour l'usage interne
    """
    model = LabOrder
    template_name = 'laboratory/pdf_templates/lab_bench_sheet.html'
    pdf_attachment = False

    def get_pdf_filename(self):
        return f'bench-sheet-{self.get_object().order_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        lab_order = self.get_object()

        # Organization data
        org_data = self._get_organization_data(lab_order)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)

        context['lab_order'] = lab_order
        context['patient'] = lab_order.patient
        context['items'] = lab_order.items.all().order_by('lab_test__category', 'lab_test__name')

        return context


class LabBulkBenchSheetView(HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère des fiches de paillasse groupées pour plusieurs commandes
    Format: Une page par commande, toutes dans un seul PDF
    """
    model = LabOrder  # Dummy model, won't actually use DetailView logic
    template_name = 'laboratory/pdf_templates/lab_bulk_bench_sheet.html'
    pdf_attachment = False

    def get_pdf_filename(self):
        from django.utils import timezone
        return f'fiches-paillasse-{timezone.now().strftime("%Y%m%d-%H%M")}.pdf'

    def get(self, request, *args, **kwargs):
        """Override get to handle query parameters instead of single object"""
        return self.render_to_response(self.get_context_data())

    def get_context_data(self, **kwargs):
        context = {}

        # Get filter parameters from query string
        status = self.request.GET.get('status', 'pending,sample_collected,received')
        priority = self.request.GET.get('priority')

        # Build query
        from django.db.models import Q
        query = Q(status__in=status.split(','))

        if priority:
            query &= Q(priority=priority)

        # Get orders
        orders = LabOrder.objects.filter(
            query,
            organization=self.request.user.organization
        ).select_related('patient').prefetch_related('items__lab_test__category').order_by('priority', 'order_date')

        # Get organization data from first order if available
        if orders.exists():
            org_data = self._get_organization_data(orders.first())
        else:
            org_data = {
                'company_name': self.request.user.organization.name,
                'brand_color': '#2563eb'
            }

        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data) if orders.exists() else None
        context['orders'] = orders
        context['total_orders'] = orders.count()

        # Generate date for header
        from django.utils import timezone
        context['generated_date'] = timezone.now()

        return context
