"""
Healthcare Analytics Views
Provides detailed analytics for laboratory exams, consultations, and healthcare services
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Avg, Q, Max, Case, When, Value, CharField, IntegerField
from django.db.models.functions import ExtractYear, TruncDate, TruncWeek, TruncMonth, TruncYear
from datetime import date, timedelta
from apps.laboratory.models import LabOrder, LabOrderItem
from apps.consultations.models import Consultation
from apps.accounts.models import Client


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
            'patient__first_name',
            'patient__last_name'
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
                'patient_name': f"{p['patient__first_name']} {p['patient__last_name']}",
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

        # By gender
        by_gender = queryset.values('patient__gender').annotate(
            count=Count('id'),
            revenue=Sum('total_price')
        ).order_by('-count')

        gender_data = []
        for g in by_gender:
            gender_data.append({
                'gender': g['patient__gender'] or 'Non Spécifié',
                'count': g['count'],
                'revenue': float(g['revenue']) if g['revenue'] else 0
            })

        # Calculate age groups
        current_year = date.today().year
        queryset_with_age = queryset.annotate(
            age=current_year - ExtractYear('patient__date_of_birth'),
            age_group=Case(
                When(age__lt=13, then=Value('0-12 (Enfants)')),
                When(age__lt=18, then=Value('13-17 (Adolescents)')),
                When(age__lt=65, then=Value('18-64 (Adultes)')),
                default=Value('65+ (Seniors)'),
                output_field=CharField()
            )
        )

        by_age_group = queryset_with_age.values('age_group').annotate(
            count=Count('id'),
            revenue=Sum('total_price')
        ).order_by('age_group')

        age_group_data = []
        for a in by_age_group:
            age_group_data.append({
                'age_group': a['age_group'],
                'count': a['count'],
                'revenue': float(a['revenue']) if a['revenue'] else 0
            })

        # Combined: gender and age group
        by_gender_and_age = queryset_with_age.values('patient__gender', 'age_group').annotate(
            count=Count('id'),
            revenue=Sum('total_price')
        ).order_by('patient__gender', 'age_group')

        gender_age_data = []
        for ga in by_gender_and_age:
            gender_age_data.append({
                'gender': ga['patient__gender'] or 'Non Spécifié',
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

        # Today's exams
        exams_today = LabOrder.objects.filter(
            organization=organization,
            order_date__date=today
        ).count()

        # This week's exams
        week_ago = today - timedelta(days=7)
        exams_week = LabOrder.objects.filter(
            organization=organization,
            order_date__gte=week_ago
        ).count()

        # Exams in selected period
        exams_period = range_queryset.count()

        # Pending results (all time)
        pending_results = LabOrder.objects.filter(
            organization=organization,
            status__in=['pending', 'sample_collected', 'received', 'analyzing']
        ).count()

        # Completed exams in period
        completed_period = range_queryset.filter(
            status__in=['results_entered', 'verified', 'results_delivered']
        ).count()

        # Average exam amount in period
        avg_amount = range_queryset.aggregate(avg=Avg('total_price'))['avg']

        return Response({
            'exams_today': exams_today,
            'exams_week': exams_week,
            'exams_month': exams_period,  # Renamed but kept for compatibility
            'pending_results': pending_results,
            'completed_month': completed_period,  # Renamed but kept for compatibility
            'avg_exam_amount': float(avg_amount) if avg_amount else 0,
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat()
        })
