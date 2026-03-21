"""
Healthcare Analytics Views
Provides detailed analytics for laboratory exams, consultations, and healthcare services
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q, Max, Min, Case, When, Value, CharField, IntegerField, DecimalField, F, ExpressionWrapper, DurationField
from django.db.models.functions import ExtractYear, TruncDate, TruncWeek, TruncMonth, TruncYear
from django.utils import timezone
from datetime import date, timedelta, datetime
from apps.laboratory.models import LabOrder, LabOrderItem, Prescriber
from apps.consultations.models import Consultation
from apps.accounts.models import Client
from apps.invoicing.models import Invoice, InvoiceItem


class ExamStatusByPatientView(APIView):
    """
    Get exam status analytics grouped by patient
    Query params: start_date, end_date, patient_id, status
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        queryset = LabOrder.objects.filter(organization=organization)

        # Apply filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        patient_id = request.GET.get('patient_id')
        status = request.GET.get('status')

        if start_date:
            queryset = queryset.filter(order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__lte=end_date)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if status:
            queryset = queryset.filter(status=status)

        # Summary stats by status
        by_status = queryset.values('status').annotate(count=Count('id')).order_by('-count')

        summary = {
            'total_orders': queryset.count(),
            'by_status': list(by_status)
        }

        # By patient aggregation
        by_patient = queryset.values(
            'patient__id',
            'patient__name'
        ).annotate(
            total_exams=Count('id'),
            pending=Count('id', filter=Q(status__in=['pending', 'sample_collected', 'received'])),
            analyzing=Count('id', filter=Q(status='analyzing')),
            completed=Count('id', filter=Q(status__in=['results_entered', 'verified', 'results_delivered'])),
            last_exam_date=Max('order_date')
        ).order_by('-total_exams')[:50]  # Limit to top 50 patients

        # Format patient data
        patient_data = []
        for p in by_patient:
            patient_data.append({
                'patient_id': str(p['patient__id']),
                'patient_name': p['patient__name'],
                'total_exams': p['total_exams'],
                'pending': p['pending'],
                'analyzing': p['analyzing'],
                'completed': p['completed'],
                'last_exam_date': p['last_exam_date'].strftime('%Y-%m-%d') if p['last_exam_date'] else None
            })

        return Response({
            'summary': summary,
            'by_patient': patient_data
        })


class ExamTypesByPeriodView(APIView):
    """
    Get exam types analytics by time period
    Query params: period (day/week/month/year), start_date, end_date, patient_id
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        period = request.GET.get('period', 'week')

        queryset = LabOrderItem.objects.filter(lab_order__organization=organization)

        # Apply filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        patient_id = request.GET.get('patient_id')

        if start_date:
            queryset = queryset.filter(lab_order__order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(lab_order__order_date__lte=end_date)
        if patient_id:
            queryset = queryset.filter(lab_order__patient_id=patient_id)

        # By test type
        by_test = queryset.values(
            'lab_test__name',
            'lab_test__test_code'
        ).annotate(
            count=Count('id'),
            revenue=Sum('price')
        ).order_by('-count')[:20]  # Top 20 tests

        # By category
        by_category = queryset.values(
            'lab_test__category__name'
        ).annotate(
            count=Count('id'),
            revenue=Sum('price')
        ).order_by('-count')

        # Timeline aggregation
        trunc_func = {
            'day': TruncDate,
            'week': TruncWeek,
            'month': TruncMonth,
            'year': TruncYear
        }.get(period, TruncWeek)

        timeline = queryset.annotate(
            period_date=trunc_func('lab_order__order_date')
        ).values('period_date').annotate(
            count=Count('id'),
            revenue=Sum('price')
        ).order_by('period_date')

        # Format timeline data
        timeline_data = []
        for t in timeline:
            timeline_data.append({
                'date': t['period_date'].strftime('%Y-%m-%d') if t['period_date'] else None,
                'count': t['count'],
                'revenue': float(t['revenue']) if t['revenue'] else 0
            })

        return Response({
            'period': period,
            'start_date': start_date,
            'end_date': end_date,
            'by_test_type': [{
                'test_name': item['lab_test__name'],
                'test_code': item['lab_test__test_code'] or 'N/A',
                'count': item['count'],
                'revenue': float(item['revenue']) if item['revenue'] else 0
            } for item in by_test],
            'by_category': [{
                'category': item['lab_test__category__name'] or 'Non Catégorisé',
                'count': item['count'],
                'revenue': float(item['revenue']) if item['revenue'] else 0
            } for item in by_category],
            'timeline': timeline_data
        })


class DemographicAnalysisView(APIView):
    """
    Get demographic analysis of exams (by gender, age groups)
    Query params: start_date, end_date, group_by
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        queryset = LabOrder.objects.filter(organization=organization)

        # Apply filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        if start_date:
            queryset = queryset.filter(order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__lte=end_date)

        # By gender (exclude unspecified) — revenue = factures labo PAYÉES uniquement
        by_gender = queryset.filter(
            patient__gender__isnull=False
        ).exclude(
            patient__gender=''
        ).values('patient__gender').annotate(
            count=Count('id'),
            revenue=Sum(
                Case(
                    When(lab_invoice__status='paid', then='lab_invoice__total_amount'),
                    default=Value(0),
                    output_field=DecimalField()
                )
            )
        ).order_by('-count')

        gender_data = []
        for g in by_gender:
            # Skip "Non spécifié" explicitly if it exists in data
            if g['patient__gender'] == 'Non spécifié':
                continue
                
            gender_data.append({
                'gender': g['patient__gender'],
                'count': g['count'],
                'revenue': float(g['revenue']) if g['revenue'] else 0
            })

        # Calculate age groups with refined ranges
        current_year = date.today().year
        queryset_with_age = queryset.annotate(
            age=current_year - ExtractYear('patient__date_of_birth'),
            age_group=Case(
                When(age__lt=12, then=Value('0-11 ans (Enfants)')),
                When(age__lt=18, then=Value('12-17 ans (Adolescents)')),
                When(age__lt=25, then=Value('18-24 ans (Jeunes adultes)')),
                When(age__lt=50, then=Value('25-49 ans (Adultes)')),
                When(age__lt=65, then=Value('50-64 ans (Adultes matures)')),
                default=Value('65+ ans (Seniors)'),
                output_field=CharField()
            )
        )

        by_age_group = queryset_with_age.values('age_group').annotate(
            count=Count('id'),
            revenue=Sum(
                Case(
                    When(lab_invoice__status='paid', then='lab_invoice__total_amount'),
                    default=Value(0),
                    output_field=DecimalField()
                )
            )
        ).order_by('age_group')

        age_group_data = []
        for a in by_age_group:
            age_group_data.append({
                'age_group': a['age_group'],
                'count': a['count'],
                'revenue': float(a['revenue']) if a['revenue'] else 0
            })

        # Combined: gender and age group (exclude unspecified gender)
        by_gender_and_age = queryset_with_age.filter(
            patient__gender__isnull=False
        ).exclude(
            patient__gender=''
        ).values('patient__gender', 'age_group').annotate(
            count=Count('id'),
            revenue=Sum(
                Case(
                    When(lab_invoice__status='paid', then='lab_invoice__total_amount'),
                    default=Value(0),
                    output_field=DecimalField()
                )
            )
        ).order_by('patient__gender', 'age_group')

        gender_age_data = []
        for ga in by_gender_and_age:
            # Skip "Non spécifié"
            if ga['patient__gender'] == 'Non spécifié':
                continue
                
            gender_age_data.append({
                'gender': ga['patient__gender'],
                'age_group': ga['age_group'],
                'count': ga['count'],
                'revenue': float(ga['revenue']) if ga['revenue'] else 0
            })

        return Response({
            'by_gender': gender_data,
            'by_age_group': age_group_data,
            'by_gender_and_age': gender_age_data
        })


class RevenueAnalyticsView(APIView):
    """
    Get revenue analytics (by module, service, product)
    Query params: start_date, end_date, group_by
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        # Laboratory module stats
        lab_queryset = LabOrder.objects.filter(organization=organization)
        if start_date:
            lab_queryset = lab_queryset.filter(order_date__gte=start_date)
        if end_date:
            lab_queryset = lab_queryset.filter(order_date__lte=end_date)

        lab_stats = lab_queryset.aggregate(
            count=Count('id'),
            revenue=Sum('total_price'),
            avg_amount=Avg('total_price')
        )

        # Consultation module stats (if exists)
        consultation_queryset = Consultation.objects.filter(organization=organization)
        if start_date:
            consultation_queryset = consultation_queryset.filter(consultation_date__gte=start_date)
        if end_date:
            consultation_queryset = consultation_queryset.filter(consultation_date__lte=end_date)

        consultation_stats = consultation_queryset.aggregate(
            count=Count('id'),
            revenue=Sum('fee'),
            avg_amount=Avg('fee')
        )

        # By service (lab categories)
        item_queryset = LabOrderItem.objects.filter(lab_order__organization=organization)
        if start_date:
            item_queryset = item_queryset.filter(lab_order__order_date__gte=start_date)
        if end_date:
            item_queryset = item_queryset.filter(lab_order__order_date__lte=end_date)

        by_service = item_queryset.values('lab_test__category__name').annotate(
            count=Count('id'),
            revenue=Sum('price'),
            avg_amount=Avg('price')
        ).order_by('-revenue')[:10]

        service_data = []
        for s in by_service:
            service_data.append({
                'service': s['lab_test__category__name'] or 'Non Catégorisé',
                'count': s['count'],
                'revenue': float(s['revenue']) if s['revenue'] else 0,
                'avg_amount': float(s['avg_amount']) if s['avg_amount'] else 0
            })

        # Top products (lab tests)
        top_products = item_queryset.values('lab_test__name').annotate(
            count=Count('id'),
            revenue=Sum('price')
        ).order_by('-revenue')[:10]

        product_data = []
        for p in top_products:
            product_data.append({
                'product_name': p['lab_test__name'],
                'count': p['count'],
                'revenue': float(p['revenue']) if p['revenue'] else 0
            })

        return Response({
            'by_module': [
                {
                    'module': 'laboratory',
                    'count': lab_stats['count'] or 0,
                    'revenue': float(lab_stats['revenue']) if lab_stats['revenue'] else 0,
                    'avg_amount': float(lab_stats['avg_amount']) if lab_stats['avg_amount'] else 0
                },
                {
                    'module': 'consultation',
                    'count': consultation_stats['count'] or 0,
                    'revenue': float(consultation_stats['revenue']) if consultation_stats['revenue'] else 0,
                    'avg_amount': float(consultation_stats['avg_amount']) if consultation_stats['avg_amount'] else 0
                }
            ],
            'by_service': service_data,
            'top_products': product_data
        })


class HealthcareDashboardStatsView(APIView):
    """
    Get quick dashboard stats for healthcare module
    Supports date range filtering via start_date and end_date params
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        today = date.today()

        # Get date range from params (defaults to last 30 days)
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            start_date = today - timedelta(days=30)
            end_date = today

        # Base queryset for date range
        range_queryset = LabOrder.objects.filter(
            organization=organization,
            order_date__date__gte=start_date,
            order_date__date__lte=end_date
        )

        # Today's exams (using order_date__date)
        exams_today = LabOrder.objects.filter(
            organization=organization,
            order_date__date=today
        ).count()

        # This week's exams (using __date__gte to compare dates correctly)
        week_ago = today - timedelta(days=7)
        exams_week = LabOrder.objects.filter(
            organization=organization,
            order_date__date__gte=week_ago
        ).count()

        # Exams in selected period
        exams_period = range_queryset.count()

        # Pending results DANS la période (pas all-time)
        pending_results = range_queryset.filter(
            status__in=['pending', 'sample_collected', 'received', 'analyzing']
        ).count()

        # Completed exams in period
        completed_period = range_queryset.filter(
            status__in=['completed', 'results_entered', 'verified', 'results_delivered', 'results_ready']
        ).count()

        # Average exam amount — basé sur les factures labo payées dans la période
        from apps.invoicing.models import Invoice as InvoiceModel
        avg_amount_agg = InvoiceModel.objects.filter(
            created_by__organization=organization,
            invoice_type='healthcare_laboratory',
            status='paid',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(avg=Avg('total_amount'))
        avg_amount = avg_amount_agg['avg']

        return Response({
            'exams_today': exams_today,
            'exams_week': exams_week,
            'exams_month': exams_period,
            'pending_results': pending_results,
            'completed_month': completed_period,
            'avg_exam_amount': float(avg_amount) if avg_amount else 0,
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat()
        })


class ActivityIndicatorsView(APIView):
    """
    Get activity indicators for healthcare dashboard
    Supports period parameter: day, week, month
    Query params: start_date, end_date, period
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        today = date.today()

        # Get period parameter
        period = request.GET.get('period', 'month')

        # Calculate date range based on period
        if period == 'day':
            start_date = today
            end_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
            end_date = today
        else:  # month
            start_date = today - timedelta(days=30)
            end_date = today

        # Allow custom date range override
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')

        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

        from apps.patients.models import PatientVisit
        from apps.invoicing.models import InvoiceItem, Invoice as InvoiceModel

        # ===== INDICATEURS D'ACTIVITÉ ET DE VOLUME =====

        # N°1: Consultations PAYÉES sur la période (facture payée = acte réalisé et encaissé)
        consultations_queryset = Consultation.objects.filter(
            organization=organization,
            consultation_date__date__gte=start_date,
            consultation_date__date__lte=end_date,
            status='completed',
            consultation_invoice__status='paid'
        )
        num_consultations = consultations_queryset.count()

        # Timeline des consultations terminées
        consultations_timeline = consultations_queryset.annotate(
            period_date=TruncDate('consultation_date')
        ).values('period_date').annotate(
            count=Count('id')
        ).order_by('period_date')

        # N°2: Nouveaux patients = patients dont la TOUTE PREMIÈRE visite (all-time) tombe dans la période
        # On cherche les patients dont la date de 1ère visite est dans [start_date, end_date]
        from django.db.models import Subquery, OuterRef
        first_visit_dates = PatientVisit.objects.filter(
            organization=organization,
            patient=OuterRef('patient')
        ).order_by('arrived_at').values('arrived_at')[:1]

        new_patients_qs = PatientVisit.objects.filter(
            organization=organization,
            arrived_at__date__gte=start_date,
            arrived_at__date__lte=end_date,
        ).annotate(
            first_ever=Subquery(first_visit_dates)
        ).filter(
            arrived_at=F('first_ever')
        ).values('patient').distinct()

        new_patients_count = new_patients_qs.count()

        # Timeline des nouveaux patients
        new_patients_timeline = new_patients_qs.annotate(
            period_date=TruncDate('arrived_at')
        ).values('period_date').annotate(
            count=Count('patient', distinct=True)
        ).order_by('period_date')

        # N°3: Actes de laboratoire sur la période
        lab_orders_count = LabOrder.objects.filter(
            organization=organization,
            order_date__date__gte=start_date,
            order_date__date__lte=end_date
        ).count()

        # Actes pharmacie (dispensings) sur la période
        try:
            from apps.pharmacy.models import PharmacyDispensing
            pharmacy_count = PharmacyDispensing.objects.filter(
                organization=organization,
                dispensed_at__date__gte=start_date,
                dispensed_at__date__lte=end_date,
                status='dispensed'
            ).count()
        except Exception:
            pharmacy_count = 0

        total_medical_acts = num_consultations + lab_orders_count + pharmacy_count

        # ===== INDICATEURS DE PERFORMANCE =====

        # N°4: Temps d'attente moyen — UNIQUEMENT consultations avec visite liée ayant arrived_at
        # (pas de fallback biaisé sur created_at)
        consults_with_wait = Consultation.objects.filter(
            organization=organization,
            consultation_date__date__gte=start_date,
            consultation_date__date__lte=end_date,
            status='completed',
            started_at__isnull=False,
            visit__arrived_at__isnull=False
        ).select_related('visit').only('started_at', 'visit__arrived_at')

        wait_times = []
        for c in consults_with_wait:
            if c.visit and c.visit.arrived_at and c.started_at:
                delta_minutes = (c.started_at - c.visit.arrived_at).total_seconds() / 60
                if 0 <= delta_minutes <= 480:  # garde-fou: max 8h, ignore valeurs aberrantes
                    wait_times.append(delta_minutes)

        avg_wait_time = sum(wait_times) / len(wait_times) if wait_times else 0

        # N°5: Durée moyenne de consultation (started_at → ended_at) — consultations terminées
        consultations_with_duration = consultations_queryset.filter(
            started_at__isnull=False,
            ended_at__isnull=False
        )
        consultation_durations = []
        for consult in consultations_with_duration:
            if consult.duration_minutes is not None and 0 < consult.duration_minutes <= 300:
                consultation_durations.append(consult.duration_minutes)

        avg_consultation_duration = sum(consultation_durations) / len(consultation_durations) if consultation_durations else 0

        # ===== INDICATEURS FINANCIERS — SOURCE UNIQUE : factures PAYÉES =====
        # Le CA est toujours calculé depuis Invoice.status='paid' pour cohérence

        paid_invoices = InvoiceModel.objects.filter(
            created_by__organization=organization,
            status='paid',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).exclude(invoice_type='credit_note')

        # CA total toutes activités confondues
        total_revenue_agg = paid_invoices.aggregate(total=Sum('total_amount'))
        total_revenue = float(total_revenue_agg['total'] or 0)

        # CA consultation (factures healthcare_consultation payées)
        consultation_revenue = float(paid_invoices.filter(
            invoice_type='healthcare_consultation'
        ).aggregate(total=Sum('total_amount'))['total'] or 0)

        # CA laboratoire (factures healthcare_laboratory payées)
        lab_revenue = float(paid_invoices.filter(
            invoice_type='healthcare_laboratory'
        ).aggregate(total=Sum('total_amount'))['total'] or 0)

        # CA pharmacie (factures healthcare_pharmacy payées)
        pharmacy_revenue = float(paid_invoices.filter(
            invoice_type='healthcare_pharmacy'
        ).aggregate(total=Sum('total_amount'))['total'] or 0)

        # CA autres (standard) — soins, chirurgie, hospitalisation
        other_revenue = float(paid_invoices.filter(
            invoice_type='standard'
        ).aggregate(total=Sum('total_amount'))['total'] or 0)

        # Moyennes par acte
        avg_consultation_cost = consultation_revenue / num_consultations if num_consultations > 0 else 0
        avg_lab_cost = lab_revenue / lab_orders_count if lab_orders_count > 0 else 0

        total_acts_count = num_consultations + lab_orders_count
        avg_cost_per_act = total_revenue / total_acts_count if total_acts_count > 0 else 0

        # Timeline du CA (basée sur les factures payées)
        revenue_timeline_qs = paid_invoices.annotate(
            period_date=TruncDate('created_at')
        ).values('period_date').annotate(
            revenue=Sum('total_amount')
        ).order_by('period_date')

        revenue_timeline = [
            {'date': item['period_date'].strftime('%Y-%m-%d'), 'revenue': float(item['revenue'] or 0)}
            for item in revenue_timeline_qs
        ]

        # Patients uniques sur la période (avec consultation ou examen)
        consult_patient_ids = set(consultations_queryset.values_list('patient_id', flat=True))
        lab_patient_ids = set(LabOrder.objects.filter(
            organization=organization,
            order_date__date__gte=start_date,
            order_date__date__lte=end_date
        ).values_list('patient_id', flat=True))
        total_patients = len(consult_patient_ids | lab_patient_ids)
        avg_cost_per_patient = round(total_revenue / total_patients, 2) if total_patients > 0 else 0

        return Response({
            'period': period,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),

            'activity_volume': {
                'consultations': {
                    'total': num_consultations,
                    'timeline': [
                        {'date': item['period_date'].strftime('%Y-%m-%d'), 'count': item['count']}
                        for item in consultations_timeline
                    ]
                },
                'new_patients': {
                    'total': new_patients_count,
                    'timeline': [
                        {'date': item['period_date'].strftime('%Y-%m-%d'), 'count': item['count']}
                        for item in new_patients_timeline
                    ]
                },
                'medical_acts': {
                    'total': total_medical_acts,
                    'consultations': num_consultations,
                    'lab_orders': lab_orders_count,
                    'pharmacy': pharmacy_count,
                }
            },

            'performance': {
                'avg_wait_time_minutes': round(avg_wait_time, 1),
                'avg_consultation_duration_minutes': round(avg_consultation_duration, 1),
                'total_visits_tracked': len(wait_times)
            },

            'financial': {
                'total_revenue': round(total_revenue, 2),
                'consultation_revenue': round(consultation_revenue, 2),
                'lab_revenue': round(lab_revenue, 2),
                'pharmacy_revenue': round(pharmacy_revenue, 2),
                'other_revenue': round(other_revenue, 2),
                'avg_consultation_cost': round(avg_consultation_cost, 2),
                'avg_lab_cost': round(avg_lab_cost, 2),
                'avg_cost_per_act': round(avg_cost_per_act, 2),
                'avg_cost_per_patient': avg_cost_per_patient,
                'revenue_timeline': revenue_timeline
            },

            'patients': {
                'total': total_patients,
            }
        })


class EnhancedRevenueAnalyticsView(APIView):
    """
    Enhanced revenue analytics with daily/weekly/monthly aggregation
    Filters: period (day/week/month), start_date, end_date, invoice_type
    IMPORTANT: Only counts PAID invoices (status='paid')
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        period = request.GET.get('period', 'day')  # day, week, month
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        invoice_type = request.GET.get('invoice_type')  # optional filter

        # Base queryset: ONLY paid invoices — exclude credit notes
        invoices = Invoice.objects.filter(
            created_by__organization=organization,
            status='paid'
        ).exclude(invoice_type='credit_note')

        if start_date:
            invoices = invoices.filter(created_at__date__gte=start_date)
        if end_date:
            invoices = invoices.filter(created_at__date__lte=end_date)
        if invoice_type:
            invoices = invoices.filter(invoice_type=invoice_type)

        # Total revenue across ALL activities
        total_stats = invoices.aggregate(
            total_revenue=Sum('total_amount'),
            total_invoices=Count('id'),
            avg_invoice_amount=Avg('total_amount')
        )

        # Revenue PER activity (by invoice_type)
        by_activity = invoices.values('invoice_type').annotate(
            revenue=Sum('total_amount'),
            count=Count('id'),
            avg_amount=Avg('total_amount')
        ).order_by('-revenue')

        # Time-based aggregation
        trunc_func = {
            'day': TruncDate,
            'week': TruncWeek,
            'month': TruncMonth
        }.get(period, TruncDate)

        timeline = invoices.annotate(
            period_date=trunc_func('created_at')
        ).values('period_date').annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        ).order_by('period_date')

        # Get invoice type choices mapping
        invoice_type_dict = dict(Invoice.INVOICE_TYPES) if hasattr(Invoice, 'INVOICE_TYPES') else {}

        # Format response
        return Response({
            'period': period,
            'date_range': {
                'start': start_date,
                'end': end_date
            },
            'total_stats': {
                'total_revenue': float(total_stats['total_revenue'] or 0),
                'total_invoices': total_stats['total_invoices'],
                'avg_invoice_amount': float(total_stats['avg_invoice_amount'] or 0)
            },
            'by_activity': [{
                'activity_type': item['invoice_type'],
                'activity_label': invoice_type_dict.get(item['invoice_type'], item['invoice_type']) if invoice_type_dict else item['invoice_type'],
                'revenue': float(item['revenue'] or 0),
                'count': item['count'],
                'avg_amount': float(item['avg_amount'] or 0)
            } for item in by_activity],
            'timeline': [{
                'date': item['period_date'].strftime('%Y-%m-%d') if hasattr(item['period_date'], 'strftime') else str(item['period_date']),
                'revenue': float(item['revenue'] or 0),
                'count': item['count']
            } for item in timeline]
        })


class ServiceRevenueAnalyticsView(APIView):
    """
    Analyze revenue by service/product category with time-based evolution
    Query params: start_date, end_date, period (day/week/month), service_id, category_id
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        period = request.GET.get('period', 'month')
        service_id = request.GET.get('service_id')
        category_id = request.GET.get('category_id')
        invoice_type_filter = request.GET.get('invoice_type')  # ex: 'healthcare_laboratory'

        # Base queryset: invoice items from paid invoices (hors avoirs)
        queryset = InvoiceItem.objects.filter(
            invoice__created_by__organization=organization,
            invoice__status='paid'
        ).exclude(invoice__invoice_type='credit_note')

        if start_date:
            queryset = queryset.filter(invoice__created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(invoice__created_at__date__lte=end_date)
        if service_id:
            queryset = queryset.filter(product_id=service_id)
        if category_id:
            queryset = queryset.filter(product__category_id=category_id)
        if invoice_type_filter:
            queryset = queryset.filter(invoice__invoice_type=invoice_type_filter)

        # === Revenue by service/product ===
        by_service = queryset.values(
            'product__id', 'product__name', 'product__product_type',
            'product__category__name'
        ).annotate(
            revenue=Sum('total_price'),
            count=Sum('quantity'),
            transactions=Count('id'),
            avg_price=Avg('unit_price')
        ).order_by('-revenue')

        services_data = []
        total_revenue = 0
        for s in by_service:
            rev = float(s['revenue'] or 0)
            total_revenue += rev
            services_data.append({
                'service_id': str(s['product__id']),
                'service_name': s['product__name'] or 'N/A',
                'product_type': s['product__product_type'] or 'N/A',
                'category': s['product__category__name'] or 'Non categorise',
                'revenue': rev,
                'count': s['count'] or 0,
                'transactions': s['transactions'],
                'avg_price': float(s['avg_price'] or 0),
            })

        # Add percentage
        for s in services_data:
            s['revenue_percent'] = round(s['revenue'] / total_revenue * 100, 1) if total_revenue > 0 else 0

        # === Revenue by category ===
        by_category = queryset.values(
            'product__category__id', 'product__category__name'
        ).annotate(
            revenue=Sum('total_price'),
            count=Sum('quantity'),
            transactions=Count('id'),
            unique_services=Count('product', distinct=True)
        ).order_by('-revenue')

        categories_data = []
        for c in by_category:
            rev = float(c['revenue'] or 0)
            categories_data.append({
                'category_id': str(c['product__category__id']) if c['product__category__id'] else None,
                'category_name': c['product__category__name'] or 'Non categorise',
                'revenue': rev,
                'count': c['count'] or 0,
                'transactions': c['transactions'],
                'unique_services': c['unique_services'],
                'revenue_percent': round(rev / total_revenue * 100, 1) if total_revenue > 0 else 0
            })

        # === Timeline for selected service/category ===
        trunc_func = {
            'day': TruncDate,
            'week': TruncWeek,
            'month': TruncMonth
        }.get(period, TruncMonth)

        timeline_qs = queryset
        if service_id:
            timeline_qs = timeline_qs.filter(product_id=service_id)
        if category_id:
            timeline_qs = timeline_qs.filter(product__category_id=category_id)

        timeline = timeline_qs.annotate(
            period_date=trunc_func('invoice__created_at')
        ).values('period_date').annotate(
            revenue=Sum('total_price'),
            count=Sum('quantity')
        ).order_by('period_date')

        timeline_data = []
        for t in timeline:
            timeline_data.append({
                'date': t['period_date'].strftime('%Y-%m-%d') if hasattr(t['period_date'], 'strftime') else str(t['period_date']),
                'revenue': float(t['revenue'] or 0),
                'count': t['count'] or 0
            })

        # === Available categories for filter ===
        from apps.invoicing.models import ProductCategory
        available_categories = ProductCategory.objects.filter(
            organization=organization,
            is_active=True
        ).values('id', 'name').order_by('name')

        return Response({
            'total_revenue': total_revenue,
            'total_transactions': queryset.count(),
            'by_service': services_data[:50],
            'by_category': categories_data,
            'timeline': timeline_data,
            'period': period,
            'filters': {
                'categories': [{'id': str(c['id']), 'name': c['name']} for c in available_categories],
                'selected_service_id': service_id,
                'selected_category_id': category_id,
            }
        })


class LabOrdersStatusWidgetView(APIView):
    """
    Widget data for Lab Orders Status dashboard widget.
    Returns totals, revenue, critical results, avg turnaround, and status breakdown.
    Query params: period (last_7_days | last_30_days | last_90_days)
    Read-only — does not modify any data.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        period = request.GET.get('period', 'last_30_days')

        period_days = {'last_7_days': 7, 'last_30_days': 30, 'last_90_days': 90}
        days = period_days.get(period, 30)
        start_dt = timezone.now() - timedelta(days=days)

        orders = LabOrder.objects.filter(
            organization=organization,
            order_date__gte=start_dt
        )

        total_orders = orders.count()
        revenue = orders.aggregate(total=Sum('total_price'))['total'] or 0

        # Critical: items flagged is_critical
        critical_results = LabOrderItem.objects.filter(
            lab_order__organization=organization,
            lab_order__order_date__gte=start_dt,
            is_critical=True
        ).count()

        # Avg turnaround: (result_entered_at - order_date) in hours for completed items
        avg_turnaround_hours = None
        try:
            avg_result = LabOrderItem.objects.filter(
                lab_order__organization=organization,
                lab_order__order_date__gte=start_dt,
                result_entered_at__isnull=False
            ).annotate(
                turnaround=ExpressionWrapper(
                    F('result_entered_at') - F('lab_order__order_date'),
                    output_field=DurationField()
                )
            ).aggregate(avg=Avg('turnaround'))

            if avg_result['avg']:
                avg_turnaround_hours = round(avg_result['avg'].total_seconds() / 3600, 1)
        except Exception:
            # Fallback: calculate in Python (compatible with all DB backends)
            items = LabOrderItem.objects.filter(
                lab_order__organization=organization,
                lab_order__order_date__gte=start_dt,
                result_entered_at__isnull=False
            ).select_related('lab_order').values_list('result_entered_at', 'lab_order__order_date')
            durations = [
                (r - o).total_seconds() / 3600
                for r, o in items if r and o and r >= o
            ]
            if durations:
                avg_turnaround_hours = round(sum(durations) / len(durations), 1)

        # Status breakdown
        status_list = ['pending', 'sample_collected', 'in_progress', 'completed',
                       'results_ready', 'results_delivered', 'cancelled']
        by_status = {s: orders.filter(status=s).count() for s in status_list}

        # === Per-test-type turnaround breakdown ===
        by_test_type = []
        try:
            items_qs = LabOrderItem.objects.filter(
                lab_order__organization=organization,
                lab_order__order_date__gte=start_dt,
            ).select_related('lab_test', 'lab_test__category')

            # Group by test
            from django.db.models import Subquery, OuterRef
            test_groups = items_qs.values(
                'lab_test__name', 'lab_test__test_code', 'lab_test__category__name',
                'lab_test__estimated_turnaround_hours'
            ).annotate(
                count=Count('id'),
            ).order_by('-count')

            for tg in test_groups:
                test_name = tg['lab_test__name']
                test_code = tg['lab_test__test_code']
                category = tg['lab_test__category__name'] or 'Non classé'
                estimated = tg['lab_test__estimated_turnaround_hours'] or 24
                count = tg['count']

                # Calculate avg turnaround in Python (SQLite-compatible)
                completed_items = items_qs.filter(
                    lab_test__name=test_name,
                    lab_test__test_code=test_code,
                    result_entered_at__isnull=False,
                ).values_list('result_entered_at', 'lab_order__order_date')

                durations = [
                    (r - o).total_seconds() / 3600
                    for r, o in completed_items if r and o and r >= o
                ]
                avg_hours = round(sum(durations) / len(durations), 1) if durations else None

                # Overdue = items where actual turnaround > estimated
                overdue_count = sum(1 for d in durations if d > estimated)

                variance = round(avg_hours - estimated, 1) if avg_hours is not None else None

                by_test_type.append({
                    'test_name': test_name,
                    'test_code': test_code,
                    'category': category,
                    'count': count,
                    'completed_count': len(durations),
                    'avg_turnaround_hours': avg_hours,
                    'estimated_turnaround_hours': estimated,
                    'overdue_count': overdue_count,
                    'variance_hours': variance,
                })
        except Exception:
            pass  # Graceful fallback — by_test_type stays empty

        return Response({
            'success': True,
            'data': {
                'laboratory': {
                    'total_orders': total_orders,
                    'revenue': float(revenue),
                    'critical_results': critical_results,
                    'avg_turnaround_hours': avg_turnaround_hours,
                    'by_status': by_status,
                    'by_test_type': by_test_type,
                }
            }
        })


class LabStageTimingView(APIView):
    """
    Average time spent at each stage of a lab order lifecycle:
      - En attente  : order_date → sample_collected_at
      - Prélevé     : sample_collected_at → results_completed_at
      - Résultats   : results_completed_at → results_verified_at
      - Total       : order_date → results_verified_at  (fully completed orders only)
    Query params: start_date, end_date
    """
    permission_classes = [IsAuthenticated]

    def _avg_hours(self, queryset, field_start, field_end):
        """Return average hours between two DateTimeField columns."""
        durations = []
        for obj in queryset:
            t_start = getattr(obj, field_start)
            t_end = getattr(obj, field_end)
            if t_start and t_end and t_end >= t_start:
                durations.append((t_end - t_start).total_seconds() / 3600)
        if not durations:
            return None, 0
        return round(sum(durations) / len(durations), 2), len(durations)

    def get(self, request):
        organization = request.user.organization
        today = date.today()
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else today - timedelta(days=30)
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today

        base_qs = LabOrder.objects.filter(
            organization=organization,
            order_date__date__gte=start_date,
            order_date__date__lte=end_date,
        )

        # Stage 1: En attente → Prélevé (order_date → sample_collected_at)
        stage1_qs = base_qs.filter(sample_collected_at__isnull=False)
        avg_pending_to_collected, count1 = self._avg_hours(stage1_qs, 'order_date', 'sample_collected_at')

        # Stage 2: Prélevé → Résultats saisis (sample_collected_at → results_completed_at)
        stage2_qs = base_qs.filter(sample_collected_at__isnull=False, results_completed_at__isnull=False)
        avg_collected_to_results, count2 = self._avg_hours(stage2_qs, 'sample_collected_at', 'results_completed_at')

        # Stage 3: Résultats saisis → Validé (results_completed_at → results_verified_at)
        stage3_qs = base_qs.filter(results_completed_at__isnull=False, results_verified_at__isnull=False)
        avg_results_to_validated, count3 = self._avg_hours(stage3_qs, 'results_completed_at', 'results_verified_at')

        # Total turnaround: order_date → results_verified_at (fully completed orders)
        fully_done_qs = base_qs.filter(results_verified_at__isnull=False)
        avg_total_turnaround, count_total = self._avg_hours(fully_done_qs, 'order_date', 'results_verified_at')

        return Response({
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_orders': base_qs.count(),
            'stages': [
                {
                    'key': 'pending_to_collected',
                    'label': 'En attente → Prélevé',
                    'avg_hours': avg_pending_to_collected,
                    'count': count1,
                },
                {
                    'key': 'collected_to_results',
                    'label': 'Prélevé → Résultats saisis',
                    'avg_hours': avg_collected_to_results,
                    'count': count2,
                },
                {
                    'key': 'results_to_validated',
                    'label': 'Résultats saisis → Validé',
                    'avg_hours': avg_results_to_validated,
                    'count': count3,
                },
                {
                    'key': 'total_turnaround',
                    'label': 'Délai total (En attente → Validé)',
                    'avg_hours': avg_total_turnaround,
                    'count': count_total,
                },
            ]
        })


class PrescriberAnalyticsView(APIView):
    """
    GET /analytics/healthcare/prescribers/
    Query params: start_date, end_date, period (day/week/month), prescriber_id
    Returns per-prescriber stats: patient count, revenue, % share, commission amount
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from decimal import Decimal
        organization = request.user.organization
        period = request.GET.get('period', 'month')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        prescriber_id = request.GET.get('prescriber_id')

        queryset = LabOrder.objects.filter(
            organization=organization,
            prescriber__isnull=False,
        ).exclude(status='cancelled')

        if start_date:
            queryset = queryset.filter(order_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__date__lte=end_date)
        if prescriber_id:
            queryset = queryset.filter(prescriber_id=prescriber_id)

        # Per-prescriber aggregation
        by_prescriber_qs = queryset.values(
            'prescriber__id',
            'prescriber__first_name',
            'prescriber__last_name',
            'prescriber__clinic_name',
            'prescriber__commission_rate',
        ).annotate(
            patient_count=Count('patient', distinct=True),
            orders_count=Count('id'),
            total_revenue=Sum('total_price'),
        ).order_by('-orders_count')

        # Grand total revenue for % share calculation
        grand_total = queryset.aggregate(t=Sum('total_price'))['t'] or Decimal('0')

        rows = []
        for row in by_prescriber_qs:
            revenue = row['total_revenue'] or Decimal('0')
            rate = row['prescriber__commission_rate'] or Decimal('0')
            commission_amount = (revenue * rate / Decimal('100')).quantize(Decimal('0.01'))
            share_pct = float(revenue / grand_total * 100) if grand_total else 0
            rows.append({
                'prescriber_id': str(row['prescriber__id']),
                'prescriber_name': f"Dr {row['prescriber__last_name']} {row['prescriber__first_name']}",
                'clinic_name': row['prescriber__clinic_name'],
                'commission_rate': float(row['prescriber__commission_rate'] or 0),
                'patient_count': row['patient_count'],
                'orders_count': row['orders_count'],
                'total_revenue': float(revenue),
                'commission_amount': float(commission_amount),
                'revenue_share_pct': round(share_pct, 2),
            })

        # Timeline aggregated by period
        trunc_map = {'day': TruncDate, 'week': TruncWeek, 'month': TruncMonth}
        trunc_func = trunc_map.get(period, TruncMonth)
        timeline = (
            queryset
            .annotate(period_date=trunc_func('order_date'))
            .values('period_date')
            .annotate(orders_count=Count('id'), revenue=Sum('total_price'))
            .order_by('period_date')
        )

        return Response({
            'period': period,
            'grand_total_revenue': float(grand_total),
            'by_prescriber': rows,
            'timeline': [
                {
                    'date': t['period_date'].strftime('%Y-%m-%d') if t['period_date'] else None,
                    'orders_count': t['orders_count'],
                    'revenue': float(t['revenue'] or 0),
                }
                for t in timeline
            ],
        })
