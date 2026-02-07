"""
Vues PDF pour laboratoire: résultats détaillés ET reçus thermal
"""
from django.views.generic import DetailView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import LabOrder # Imports checked
from apps.healthcare.pdf_helpers import HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, TokenAuthMixin, TokenLoginRequiredMixin


class LabOrderReceiptView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
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


class LabResultPDFView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
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
        
        # Enrich items with previous results
        items = list(lab_order.items.all().select_related('lab_test', 'lab_test__category'))
        enriched_items = []
        for item in items:
            prev_results = item.get_previous_results(limit=1)
            prev_value = prev_results[0].result_value if prev_results else None
            prev_date = prev_results[0].lab_order.order_date.strftime('%d/%m/%Y') if prev_results else None
            
            enriched_items.append({
                'item': item,
                'previous_result': prev_value,
                'previous_date': prev_date
            })
            
        context['items'] = enriched_items
        return context


class LabBarcodeView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
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

        # Get quantity parameter (number of copies per label)
        quantity = int(self.request.GET.get('quantity', 1))

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
            barcode_data = {
                'type': s_type,
                'code': code_value,
                'tests': ", ".join(tests[:3]) + ("..." if len(tests)>3 else ""),
                'patient_name': lab_order.patient.name,
                'patient_dob': lab_order.patient.date_of_birth,
                'barcode_base64': self._generate_barcode(code_value) # Helper method needed or use template tag
            }

            # Add the barcode 'quantity' times
            for _ in range(quantity):
                barcode_list.append(barcode_data.copy())

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


class LabTubeLabelsView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
    """
    Génère des étiquettes pour chaque tube nécessaire (1 étiquette par tube)
    Plusieurs examens peuvent être regroupés sur le même tube
    Format: 100.5mm x 63.5mm paysage (imprimante thermique TSC)
    SIZE 100.5 MM, 63.5 MM - GAP 2 MM
    """
    model = LabOrder
    template_name = 'laboratory/pdf_templates/lab_tube_labels.html'
    pdf_attachment = False

    def get_pdf_filename(self):
        return f'etiquettes-tubes-{self.get_object().order_number}.pdf'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        lab_order = self.get_object()

        # Organization data
        org_data = self._get_organization_data(lab_order)
        context['organization'] = org_data
        context['logo_base64'] = self._get_logo_base64(org_data)

        # Get quantity parameter (number of copies per label)
        quantity = int(self.request.GET.get('quantity', 1))

        # Get max tests per tube (can be overridden by query param)
        max_tests_per_tube = int(self.request.GET.get('max_tests_per_tube', 5))

        # Group tests by container type (1 tube = 1 label)
        tubes = {}  # Dict: container_type -> list of tests
        for item in lab_order.items.all().select_related('lab_test'):
            container = item.lab_test.container_type or 'other'
            if container not in tubes:
                tubes[container] = []
            tubes[container].append(item)

        # Generate labels - 1 label per tube
        labels = []
        tube_counter = 1
        for container_type, items in tubes.items():
            # If more than max_tests_per_tube, split into multiple tubes
            for i in range(0, len(items), max_tests_per_tube):
                tube_items = items[i:i + max_tests_per_tube]

                # Build test list for display (only names)
                test_list = []
                for item in tube_items:
                    test_list.append({
                        'name': item.lab_test.name,
                    })

                # Get display names using Django's get_FOO_display()
                container_display = tube_items[0].lab_test.get_container_type_display() if tube_items[0].lab_test.container_type else 'Tube'
                sample_display = tube_items[0].lab_test.get_sample_type_display() if tube_items[0].lab_test.sample_type else ''

                # QR code contains just the lab order ID
                qr_data = str(lab_order.id)

                label_data = {
                    'tube_number': tube_counter,
                    'container_type': container_display,
                    'container_type_code': container_type,
                    'sample_type': sample_display,
                    'tests': test_list,
                    'tests_count': len(test_list),
                    'patient_name': lab_order.patient.name,
                    'patient_number': lab_order.patient.patient_number or lab_order.patient.id,
                    'patient_dob': lab_order.patient.date_of_birth,
                    'order_number': lab_order.order_number,
                    'order_date': lab_order.order_date,
                    'qrcode_base64': self._generate_qrcode(qr_data)
                }

                # Add the label 'quantity' times
                for _ in range(quantity):
                    labels.append(label_data.copy())

                tube_counter += 1

        context['labels'] = labels
        context['lab_order'] = lab_order
        context['patient'] = lab_order.patient

        return context

    def _generate_qrcode(self, value):
        """Generate QR code as base64 image"""
        import io
        import base64
        import qrcode

        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=4,
            border=1,
        )
        qr.add_data(value)
        qr.make(fit=True)

        # Generate image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()


class LabBenchSheetView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
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


class LabBulkBenchSheetView(TokenLoginRequiredMixin, HealthcarePDFMixin, SafeWeasyTemplateResponseMixin, DetailView):
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
                'name': self.request.user.organization.name,  # Mapped Key
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
