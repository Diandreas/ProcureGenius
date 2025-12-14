from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.shortcuts import get_object_or_404
from .models import SourcingEvent, SupplierInvitation, SupplierBid, BidItem, BidderAuth
from .serializers import (
    SourcingEventListSerializer, SourcingEventDetailSerializer,
    SourcingEventCreateSerializer, SupplierInvitationSerializer,
    SupplierBidListSerializer, SupplierBidDetailSerializer,
    SupplierBidCreateSerializer, BidItemSerializer,
    BidEvaluationSerializer, BidComparisonSerializer,
    PublicSourcingEventSerializer, PublicBidSubmitSerializer
)
from .services import EmailService


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
    
    @action(detail=True, methods=['get'], url_path='pdf-report')
    def generate_pdf_report(self, request, pk=None):
        """Générer un rapport PDF pour un événement de sourcing"""
        from django.http import HttpResponse
        
        try:
            event = self.get_object()
            
            # Générer le PDF avec WeasyPrint
            from apps.api.services.report_generator_weasy import generate_sourcing_event_report_pdf
            pdf_buffer = generate_sourcing_event_report_pdf(event, request.user)
            
            # Créer la réponse HTTP
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )
            
            filename = f"rapport-sourcing-{event.id}.pdf"
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


# ===== VUES PUBLIQUES POUR SOUMISSION VIA TOKEN =====

@api_view(['GET'])
@permission_classes([AllowAny])
def public_sourcing_event(request, token):
    """
    Récupère les détails d'un événement de sourcing via token public
    URL: /api/e-sourcing/public/{token}/
    """
    event = get_object_or_404(SourcingEvent, public_token=token)

    # Vérifie si l'événement accepte encore des soumissions
    can_submit = event.can_submit_bid()

    return Response({
        'event': PublicSourcingEventSerializer(event).data,
        'can_submit': can_submit
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def public_submit_bid(request, token):
    """
    Soumet une offre via token public (avec création automatique du fournisseur)
    URL: /api/e-sourcing/public/{token}/submit/
    """
    from apps.suppliers.models import Supplier

    event = get_object_or_404(SourcingEvent, public_token=token)

    # Vérifie si l'événement accepte encore des soumissions
    if not event.can_submit_bid():
        return Response({
            'status': 'error',
            'message': "La date limite de soumission est dépassée"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Valide les données
    serializer = PublicBidSubmitSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'status': 'error',
            'message': "Données invalides",
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Cherche ou crée le fournisseur
    supplier, created = Supplier.objects.get_or_create(
        email=data['supplier_email'],
        defaults={
            'name': data['supplier_name'],
            'phone': data.get('supplier_phone', ''),
            'address': data.get('supplier_address', ''),
        }
    )

    # Vérifie si ce fournisseur a déjà soumis
    existing_bid = SupplierBid.objects.filter(
        sourcing_event=event,
        supplier=supplier
    ).first()

    if existing_bid and existing_bid.status != 'draft':
        return Response({
            'status': 'error',
            'message': "Vous avez déjà soumis une offre pour cet événement"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Crée ou met à jour la soumission
    bid_data = {
        'cover_letter': data.get('cover_letter', ''),
        'technical_response': data.get('technical_response', ''),
        'terms_accepted': data['terms_accepted'],
        'tax_amount': data.get('tax_amount', 0),
        'delivery_time_days': data.get('delivery_time_days'),
    }

    if existing_bid:
        bid = existing_bid
        for attr, value in bid_data.items():
            setattr(bid, attr, value)
        bid.save()
        bid.items.all().delete()
    else:
        bid = SupplierBid.objects.create(
            sourcing_event=event,
            supplier=supplier,
            **bid_data
        )

    # Crée les items
    items_data = data.get('items', [])
    for item_data in items_data:
        BidItem.objects.create(bid=bid, **item_data)

    # Soumet la soumission
    bid.submit()

    return Response({
        'status': 'success',
        'message': "Votre offre a été soumise avec succès",
        'bid_id': str(bid.id)
    }, status=status.HTTP_201_CREATED)


# ===== ENDPOINTS POUR ENVOI D'EMAILS =====

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invitations(request, event_id):
    """
    Envoie les invitations par email pour un événement e-sourcing
    URL: /api/e-sourcing/events/{event_id}/send-invitations/
    """
    event = get_object_or_404(SourcingEvent, id=event_id)

    # Récupère les invitations en attente
    invitations = event.invitations.filter(status='pending')

    if not invitations.exists():
        return Response({
            'status': 'error',
            'message': "Aucune invitation en attente"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Envoie les emails
    sent_count = 0
    failed_count = 0
    errors = []

    for invitation in invitations:
        success = EmailService.send_supplier_invitation(invitation)
        if success:
            sent_count += 1
        else:
            failed_count += 1
            errors.append(f"Échec pour {invitation.supplier.name}")

    return Response({
        'status': 'success' if failed_count == 0 else 'partial',
        'message': f"{sent_count} invitations envoyées, {failed_count} échecs",
        'sent': sent_count,
        'failed': failed_count,
        'errors': errors
    })


# ===== ENDPOINTS POUR PROTECTION DDOS (OTP) =====

@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request, event_id):
    """
    Demande un code OTP pour soumettre une offre
    URL: /api/e-sourcing/events/{event_id}/request-otp/
    Body: { "email": "bidder@example.com" }
    """
    event = get_object_or_404(SourcingEvent, id=event_id)

    # Vérifie si l'événement accepte encore des soumissions
    if not event.can_submit_bid():
        return Response({
            'status': 'error',
            'message': "La date limite de soumission est dépassée"
        }, status=status.HTTP_400_BAD_REQUEST)

    email = request.data.get('email')
    if not email:
        return Response({
            'status': 'error',
            'message': "L'email est requis"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Récupère l'adresse IP et le user agent
    ip_address = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    try:
        # Crée l'OTP
        auth = BidderAuth.create_otp_for_email(
            email=email,
            sourcing_event=event,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Envoie l'email
        EmailService.send_otp_email(email, auth.otp_code, event)

        return Response({
            'status': 'success',
            'message': f"Un code de vérification a été envoyé à {email}",
            'auth_id': str(auth.id),
            'expires_in_minutes': 10
        })

    except ValueError as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    except Exception as e:
        return Response({
            'status': 'error',
            'message': "Erreur lors de l'envoi du code"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request, event_id):
    """
    Vérifie le code OTP et retourne un token de session
    URL: /api/e-sourcing/events/{event_id}/verify-otp/
    Body: { "email": "bidder@example.com", "otp_code": "123456" }
    """
    event = get_object_or_404(SourcingEvent, id=event_id)

    email = request.data.get('email')
    otp_code = request.data.get('otp_code')

    if not email or not otp_code:
        return Response({
            'status': 'error',
            'message': "L'email et le code OTP sont requis"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Recherche l'authentification la plus récente non expirée
    auth = BidderAuth.objects.filter(
        email=email,
        sourcing_event=event,
        verified_at__isnull=True
    ).order_by('-created_at').first()

    if not auth:
        return Response({
            'status': 'error',
            'message': "Aucun code OTP trouvé pour cet email"
        }, status=status.HTTP_404_NOT_FOUND)

    # Vérifie si bloqué
    if auth.is_blocked():
        return Response({
            'status': 'error',
            'message': "Trop de tentatives. Compte temporairement bloqué",
            'blocked_until': auth.blocked_until
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Vérifie le code OTP
    if auth.verify_otp(otp_code):
        return Response({
            'status': 'success',
            'message': "Code vérifié avec succès",
            'session_token': auth.session_token,
            'email': email
        })
    else:
        remaining_attempts = 3 - auth.attempts
        return Response({
            'status': 'error',
            'message': "Code OTP invalide ou expiré",
            'remaining_attempts': max(remaining_attempts, 0)
        }, status=status.HTTP_400_BAD_REQUEST)
