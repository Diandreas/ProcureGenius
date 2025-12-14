from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, Sum
from .models import Contract, ContractClause, ContractMilestone, ContractDocument
from .serializers import (
    ContractListSerializer, ContractDetailSerializer, ContractCreateSerializer,
    ContractClauseSerializer, ContractMilestoneSerializer, ContractDocumentSerializer,
    ClauseExtractionRequestSerializer, ClauseExtractionResponseSerializer,
    ContractApprovalSerializer, ContractRenewalSerializer
)
from .ai_service import ContractAIService
import logging

logger = logging.getLogger(__name__)


class ContractViewSet(viewsets.ModelViewSet):
    """ViewSet pour les contrats"""

    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['contract_number', 'title', 'description', 'supplier__name']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'total_value', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Contract.objects.all()

        # Filtrer par statut
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filtrer par type
        contract_type = self.request.query_params.get('contract_type')
        if contract_type:
            queryset = queryset.filter(contract_type=contract_type)

        # Filtrer par fournisseur
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Filtrer les contrats expirant bientôt
        expiring_soon = self.request.query_params.get('expiring_soon')
        if expiring_soon == 'true':
            queryset = queryset.filter(status='expiring_soon')

        return queryset.select_related('supplier', 'created_by', 'approved_by', 'internal_contact').prefetch_related('clauses', 'milestones', 'documents')

    def get_serializer_class(self):
        if self.action == 'list':
            return ContractListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ContractCreateSerializer
        return ContractDetailSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuve le contrat"""
        contract = self.get_object()
        serializer = ContractApprovalSerializer(data=request.data)

        if serializer.is_valid():
            if contract.approve(request.user):
                if serializer.validated_data.get('notes'):
                    contract.internal_notes += f"\n\n[Approbation par {request.user.get_full_name()}]\n{serializer.validated_data['notes']}"
                    contract.save(update_fields=['internal_notes'])

                return Response({
                    'status': 'success',
                    'message': 'Contrat approuvé avec succès',
                    'data': ContractDetailSerializer(contract).data
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Le contrat ne peut pas être approuvé'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Active le contrat"""
        contract = self.get_object()

        if contract.activate():
            return Response({
                'status': 'success',
                'message': 'Contrat activé avec succès',
                'data': ContractDetailSerializer(contract).data
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Le contrat ne peut pas être activé'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """Résilie le contrat"""
        contract = self.get_object()

        if contract.terminate():
            return Response({
                'status': 'success',
                'message': 'Contrat résilié avec succès',
                'data': ContractDetailSerializer(contract).data
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Le contrat ne peut pas être résilié'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """Renouvelle le contrat"""
        contract = self.get_object()
        serializer = ContractRenewalSerializer(data=request.data)

        if serializer.is_valid():
            # Crée un nouveau contrat basé sur l'ancien
            new_contract = Contract.objects.create(
                title=f"{contract.title} (Renouvellement {contract.renewal_count + 1})",
                contract_type=contract.contract_type,
                supplier=contract.supplier,
                internal_contact=contract.internal_contact,
                description=contract.description,
                terms_and_conditions=contract.terms_and_conditions,
                payment_terms=contract.payment_terms,
                start_date=contract.end_date,
                end_date=serializer.validated_data['new_end_date'],
                total_value=serializer.validated_data.get('new_total_value', contract.total_value),
                currency=contract.currency,
                auto_renewal=contract.auto_renewal,
                renewal_notice_days=contract.renewal_notice_days,
                alert_days_before_expiry=contract.alert_days_before_expiry,
                created_by=request.user,
                internal_notes=serializer.validated_data.get('notes', ''),
                renewal_count=contract.renewal_count + 1
            )

            # Marque l'ancien contrat comme renouvelé
            contract.status = 'renewed'
            contract.save(update_fields=['status'])

            return Response({
                'status': 'success',
                'message': 'Contrat renouvelé avec succès',
                'old_contract': ContractDetailSerializer(contract).data,
                'new_contract': ContractDetailSerializer(new_contract).data
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def extract_clauses(self, request, pk=None):
        """Extrait les clauses du contrat avec Mistral AI"""
        contract = self.get_object()
        serializer = ClauseExtractionRequestSerializer(data=request.data)

        if serializer.is_valid():
            try:
                ai_service = ContractAIService()
                contract_text = serializer.validated_data['contract_text']
                language = serializer.validated_data.get('language', 'fr')

                # Extraction par IA
                result = ai_service.extract_clauses(contract_text, language)

                # Sauvegarde des clauses extraites
                created_clauses = []
                for clause_data in result.get('clauses', []):
                    clause = ContractClause.objects.create(
                        contract=contract,
                        clause_type=clause_data.get('clause_type', 'other'),
                        title=clause_data.get('title', ''),
                        content=clause_data.get('content', ''),
                        section_reference=clause_data.get('section_reference', ''),
                        risk_level=clause_data.get('risk_level'),
                        ai_confidence_score=clause_data.get('ai_confidence_score'),
                        ai_analysis=clause_data.get('ai_analysis', ''),
                        ai_recommendations=clause_data.get('ai_recommendations', ''),
                        extracted_by_ai=True
                    )
                    created_clauses.append(clause)

                # Ajoute le résumé aux notes internes
                if result.get('summary'):
                    contract.internal_notes += f"\n\n[Analyse IA - {timezone.now().strftime('%Y-%m-%d %H:%M')}]\nRésumé: {result['summary']}\n\nÉvaluation globale: {result.get('overall_risk_assessment', '')}"
                    contract.save(update_fields=['internal_notes'])

                response_data = {
                    'clauses': ContractClauseSerializer(created_clauses, many=True).data,
                    'summary': result.get('summary', ''),
                    'overall_risk_assessment': result.get('overall_risk_assessment', ''),
                    'key_dates': result.get('key_dates', []),
                    'recommendations': result.get('recommendations', [])
                }

                return Response({
                    'status': 'success',
                    'message': f'{len(created_clauses)} clauses extraites avec succès',
                    'data': response_data
                })

            except Exception as e:
                logger.error(f"Erreur lors de l'extraction de clauses: {str(e)}")
                return Response({
                    'status': 'error',
                    'message': f'Erreur lors de l\'extraction: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Retourne les statistiques des contrats"""
        queryset = self.get_queryset()

        stats = {
            'total_contracts': queryset.count(),
            'active_contracts': queryset.filter(status='active').count(),
            'expiring_soon': queryset.filter(status='expiring_soon').count(),
            'expired': queryset.filter(status='expired').count(),
            'total_value': queryset.aggregate(Sum('total_value'))['total_value__sum'] or 0,
            'by_status': {},
            'by_type': {},
            'by_risk_level': {}
        }

        # Statistiques par statut
        for choice in Contract.STATUS_CHOICES:
            status_key = choice[0]
            stats['by_status'][status_key] = queryset.filter(status=status_key).count()

        # Statistiques par type
        for choice in Contract.CONTRACT_TYPE_CHOICES:
            type_key = choice[0]
            stats['by_type'][type_key] = queryset.filter(contract_type=type_key).count()

        # Statistiques par niveau de risque (basé sur les clauses)
        all_clauses = ContractClause.objects.filter(contract__in=queryset)
        for risk in ['low', 'medium', 'high', 'critical']:
            stats['by_risk_level'][risk] = all_clauses.filter(risk_level=risk).count()

        return Response(stats)
    
    @action(detail=True, methods=['get'], url_path='pdf-report')
    def generate_pdf_report(self, request, pk=None):
        """Générer un rapport PDF pour un contrat"""
        from django.http import HttpResponse
        
        try:
            contract = self.get_object()
            
            # Générer le PDF avec WeasyPrint
            from apps.api.services.report_generator_weasy import generate_contract_report_pdf
            pdf_buffer = generate_contract_report_pdf(contract, request.user)
            
            # Créer la réponse HTTP
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )
            
            filename = f"rapport-contrat-{contract.id}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(response.content)
            
            return response
            
        except ImportError as e:
            return Response(
                {'error': 'Service de génération PDF non disponible', 'details': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ContractClauseViewSet(viewsets.ModelViewSet):
    """ViewSet pour les clauses de contrat"""

    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    serializer_class = ContractClauseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'section_reference']
    ordering_fields = ['created_at', 'risk_level', 'ai_confidence_score']
    ordering = ['contract', 'clause_type']

    def get_queryset(self):
        queryset = ContractClause.objects.all()

        # Filtrer par contrat
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            queryset = queryset.filter(contract_id=contract_id)

        # Filtrer par type
        clause_type = self.request.query_params.get('clause_type')
        if clause_type:
            queryset = queryset.filter(clause_type=clause_type)

        # Filtrer par niveau de risque
        risk_level = self.request.query_params.get('risk_level')
        if risk_level:
            queryset = queryset.filter(risk_level=risk_level)

        # Filtrer les clauses non vérifiées
        unverified = self.request.query_params.get('unverified')
        if unverified == 'true':
            queryset = queryset.filter(verified=False)

        return queryset.select_related('contract', 'verified_by')

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Marque la clause comme vérifiée"""
        clause = self.get_object()
        clause.verify(request.user)

        return Response({
            'status': 'success',
            'message': 'Clause vérifiée avec succès',
            'data': ContractClauseSerializer(clause).data
        })

    @action(detail=True, methods=['post'])
    def analyze_risk(self, request, pk=None):
        """Analyse le risque d'une clause avec l'IA"""
        clause = self.get_object()

        try:
            ai_service = ContractAIService()
            language = request.data.get('language', 'fr')

            result = ai_service.analyze_clause_risk(
                clause.content,
                clause.clause_type,
                language
            )

            # Met à jour la clause avec l'analyse
            clause.risk_level = result.get('risk_level', clause.risk_level)
            clause.ai_confidence_score = result.get('confidence_score', clause.ai_confidence_score)
            clause.ai_analysis = result.get('analysis', clause.ai_analysis)
            clause.ai_recommendations = result.get('recommendations', clause.ai_recommendations)
            clause.save()

            return Response({
                'status': 'success',
                'message': 'Analyse de risque effectuée',
                'data': ContractClauseSerializer(clause).data,
                'red_flags': result.get('red_flags', [])
            })

        except Exception as e:
            logger.error(f"Erreur lors de l'analyse de risque: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erreur lors de l\'analyse: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContractMilestoneViewSet(viewsets.ModelViewSet):
    """ViewSet pour les jalons de contrat"""

    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    serializer_class = ContractMilestoneSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'created_at', 'status']
    ordering = ['due_date']

    def get_queryset(self):
        queryset = ContractMilestone.objects.all()

        # Filtrer par contrat
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            queryset = queryset.filter(contract_id=contract_id)

        # Filtrer par statut
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.select_related('contract', 'completed_by')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marque le jalon comme complété"""
        milestone = self.get_object()

        if milestone.complete(request.user):
            return Response({
                'status': 'success',
                'message': 'Jalon complété avec succès',
                'data': ContractMilestoneSerializer(milestone).data
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Le jalon ne peut pas être complété'
            }, status=status.HTTP_400_BAD_REQUEST)


class ContractDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet pour les documents de contrat"""

    permission_classes = [permissions.AllowAny]  # Temporaire pour le développement
    serializer_class = ContractDocumentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['uploaded_at', 'document_type']
    ordering = ['-uploaded_at']

    def get_queryset(self):
        queryset = ContractDocument.objects.all()

        # Filtrer par contrat
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            queryset = queryset.filter(contract_id=contract_id)

        # Filtrer par type
        document_type = self.request.query_params.get('document_type')
        if document_type:
            queryset = queryset.filter(document_type=document_type)

        return queryset.select_related('contract', 'uploaded_by')

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
