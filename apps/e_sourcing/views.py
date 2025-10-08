from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count, Avg
from .models import SourcingEvent, SupplierInvitation, SupplierBid, BidItem
from .serializers import (
    SourcingEventListSerializer, SourcingEventDetailSerializer,
    SourcingEventCreateSerializer, SupplierInvitationSerializer,
    SupplierBidListSerializer, SupplierBidDetailSerializer,
    SupplierBidCreateSerializer, BidItemSerializer,
    BidEvaluationSerializer, BidComparisonSerializer
)


class SourcingEventViewSet(viewsets.ModelViewSet):
    """ViewSet pour les événements de sourcing"""

    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['event_number', 'title', 'description']
    ordering_fields = ['created_at', 'submission_deadline', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = SourcingEvent.objects.all()

        # Filtrer par statut
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filtrer par type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        # Filtrer par créateur
        created_by = self.request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by_id=created_by)

        return queryset.select_related('created_by').prefetch_related('invitations', 'bids')

    def get_serializer_class(self):
        if self.action == 'list':
            return SourcingEventListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SourcingEventCreateSerializer
        return SourcingEventDetailSerializer

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publie l'événement et envoie les invitations"""
        event = self.get_object()

        if event.publish():
            # Marque toutes les invitations comme envoyées
            invitations = event.invitations.filter(status='pending')
            for invitation in invitations:
                invitation.mark_as_sent()

            return Response({
                'status': 'success',
                'message': f"L'événement {event.event_number} a été publié avec succès",
                'data': SourcingEventDetailSerializer(event).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "L'événement ne peut pas être publié"
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Clôture l'événement"""
        event = self.get_object()

        if event.status in ['published', 'in_progress', 'evaluation']:
            event.status = 'closed'
            event.save(update_fields=['status'])

            return Response({
                'status': 'success',
                'message': f"L'événement {event.event_number} a été clôturé",
                'data': SourcingEventDetailSerializer(event).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "L'événement ne peut pas être clôturé"
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annule l'événement"""
        event = self.get_object()

        if event.status not in ['awarded', 'closed', 'cancelled']:
            event.status = 'cancelled'
            event.save(update_fields=['status'])

            return Response({
                'status': 'success',
                'message': f"L'événement {event.event_number} a été annulé",
                'data': SourcingEventDetailSerializer(event).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "L'événement ne peut pas être annulé"
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def compare_bids(self, request, pk=None):
        """Compare toutes les soumissions d'un événement"""
        event = self.get_object()
        bids = event.bids.filter(status__in=['submitted', 'under_review', 'shortlisted', 'awarded'])

        comparison_data = []
        for bid in bids:
            comparison_data.append({
                'bid_id': bid.id,
                'supplier_name': bid.supplier.name,
                'total_amount': bid.total_amount,
                'delivery_time_days': bid.delivery_time_days,
                'evaluation_score': bid.evaluation_score,
                'status': bid.status,
                'submitted_at': bid.submitted_at,
                'items': BidItemSerializer(bid.items.all(), many=True).data
            })

        serializer = BidComparisonSerializer(comparison_data, many=True)
        return Response({
            'event': SourcingEventListSerializer(event).data,
            'bids': serializer.data
        })

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Retourne les statistiques d'un événement"""
        event = self.get_object()

        stats = {
            'total_invitations': event.total_invitations,
            'total_bids': event.total_bids,
            'submission_rate': (event.total_bids / event.total_invitations * 100) if event.total_invitations > 0 else 0,
            'average_bid_amount': event.bids.filter(status='submitted').aggregate(Avg('total_amount'))['total_amount__avg'],
            'lowest_bid': event.bids.filter(status='submitted').order_by('total_amount').first(),
            'highest_bid': event.bids.filter(status='submitted').order_by('-total_amount').first(),
            'bids_by_status': {
                'draft': event.bids.filter(status='draft').count(),
                'submitted': event.bids.filter(status='submitted').count(),
                'under_review': event.bids.filter(status='under_review').count(),
                'shortlisted': event.bids.filter(status='shortlisted').count(),
                'awarded': event.bids.filter(status='awarded').count(),
                'rejected': event.bids.filter(status='rejected').count(),
            }
        }

        # Serialize lowest and highest bids
        if stats['lowest_bid']:
            stats['lowest_bid'] = SupplierBidListSerializer(stats['lowest_bid']).data
        if stats['highest_bid']:
            stats['highest_bid'] = SupplierBidListSerializer(stats['highest_bid']).data

        return Response(stats)


class SupplierInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les invitations fournisseurs"""

    permission_classes = [IsAuthenticated]
    serializer_class = SupplierInvitationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['supplier__name', 'sourcing_event__event_number']
    ordering_fields = ['created_at', 'sent_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = SupplierInvitation.objects.all()

        # Filtrer par événement
        event_id = self.request.query_params.get('sourcing_event')
        if event_id:
            queryset = queryset.filter(sourcing_event_id=event_id)

        # Filtrer par fournisseur
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Filtrer par statut
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.select_related('sourcing_event', 'supplier')

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Envoie l'invitation au fournisseur"""
        invitation = self.get_object()
        invitation.mark_as_sent()

        return Response({
            'status': 'success',
            'message': "L'invitation a été envoyée",
            'data': SupplierInvitationSerializer(invitation).data
        })

    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        """Marque l'invitation comme vue"""
        invitation = self.get_object()
        invitation.mark_as_viewed()

        return Response({
            'status': 'success',
            'message': "L'invitation a été marquée comme vue",
            'data': SupplierInvitationSerializer(invitation).data
        })

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Refuse l'invitation"""
        invitation = self.get_object()
        decline_reason = request.data.get('decline_reason', '')

        if invitation.status in ['sent', 'viewed']:
            invitation.status = 'declined'
            invitation.decline_reason = decline_reason
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'decline_reason', 'responded_at'])

            return Response({
                'status': 'success',
                'message': "L'invitation a été refusée",
                'data': SupplierInvitationSerializer(invitation).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "L'invitation ne peut pas être refusée"
            }, status=status.HTTP_400_BAD_REQUEST)


class SupplierBidViewSet(viewsets.ModelViewSet):
    """ViewSet pour les soumissions fournisseurs"""

    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['supplier__name', 'sourcing_event__event_number']
    ordering_fields = ['created_at', 'submitted_at', 'total_amount', 'evaluation_score']
    ordering = ['-submitted_at', '-created_at']

    def get_queryset(self):
        queryset = SupplierBid.objects.all()

        # Filtrer par événement
        event_id = self.request.query_params.get('sourcing_event')
        if event_id:
            queryset = queryset.filter(sourcing_event_id=event_id)

        # Filtrer par fournisseur
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Filtrer par statut
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.select_related('sourcing_event', 'supplier', 'evaluated_by').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'list':
            return SupplierBidListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SupplierBidCreateSerializer
        return SupplierBidDetailSerializer

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumet la soumission"""
        bid = self.get_object()

        if bid.submit():
            return Response({
                'status': 'success',
                'message': "La soumission a été envoyée avec succès",
                'data': SupplierBidDetailSerializer(bid).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "La soumission ne peut pas être envoyée"
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Retire la soumission"""
        bid = self.get_object()

        if bid.status in ['draft', 'submitted']:
            bid.status = 'withdrawn'
            bid.save(update_fields=['status'])

            return Response({
                'status': 'success',
                'message': "La soumission a été retirée",
                'data': SupplierBidDetailSerializer(bid).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "La soumission ne peut pas être retirée"
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Évalue la soumission"""
        bid = self.get_object()
        serializer = BidEvaluationSerializer(data=request.data)

        if serializer.is_valid():
            bid.evaluation_score = serializer.validated_data['evaluation_score']
            bid.evaluation_notes = serializer.validated_data.get('evaluation_notes', '')
            bid.evaluated_by = request.user
            bid.evaluated_at = timezone.now()

            if 'status' in serializer.validated_data:
                bid.status = serializer.validated_data['status']

            bid.save(update_fields=[
                'evaluation_score', 'evaluation_notes', 'evaluated_by',
                'evaluated_at', 'status'
            ])

            return Response({
                'status': 'success',
                'message': "La soumission a été évaluée",
                'data': SupplierBidDetailSerializer(bid).data
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def award(self, request, pk=None):
        """Attribue le contrat à cette soumission"""
        bid = self.get_object()

        if bid.status in ['submitted', 'under_review', 'shortlisted']:
            # Marque cette soumission comme gagnante
            bid.status = 'awarded'
            bid.save(update_fields=['status'])

            # Rejette les autres soumissions de cet événement
            other_bids = bid.sourcing_event.bids.exclude(id=bid.id).filter(
                status__in=['submitted', 'under_review', 'shortlisted']
            )
            other_bids.update(status='rejected')

            # Met à jour le statut de l'événement
            bid.sourcing_event.status = 'awarded'
            bid.sourcing_event.save(update_fields=['status'])

            return Response({
                'status': 'success',
                'message': "Le contrat a été attribué à cette soumission",
                'data': SupplierBidDetailSerializer(bid).data
            })
        else:
            return Response({
                'status': 'error',
                'message': "Le contrat ne peut pas être attribué à cette soumission"
            }, status=status.HTTP_400_BAD_REQUEST)


class BidItemViewSet(viewsets.ModelViewSet):
    """ViewSet pour les articles de soumission"""

    permission_classes = [IsAuthenticated]
    serializer_class = BidItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product_reference', 'description']
    ordering_fields = ['created_at', 'total_price']
    ordering = ['created_at']

    def get_queryset(self):
        queryset = BidItem.objects.all()

        # Filtrer par soumission
        bid_id = self.request.query_params.get('bid')
        if bid_id:
            queryset = queryset.filter(bid_id=bid_id)

        return queryset.select_related('bid')
