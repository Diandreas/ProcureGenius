"""
API Views for Support (SAV) app
"""
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportTicket, SupportTicketAttachment
from .serializers import (
    SupportTicketSerializer,
    SupportTicketCreateSerializer,
    SupportTicketUpdateSerializer,
)

SUPPORT_ADMIN_ROLES = ('admin', 'manager')


class IsSupportAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.role in SUPPORT_ADMIN_ROLES or request.user.is_superuser)
        )


class SupportTicketCreateView(APIView):
    """POST /support/tickets/ — créer un ticket, avec captures d'écran optionnelles"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = SupportTicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket = serializer.save(
            organization=request.user.organization,
            reported_by=request.user,
        )

        for uploaded_file in request.FILES.getlist('screenshots'):
            SupportTicketAttachment.objects.create(ticket=ticket, file=uploaded_file)

        return Response(SupportTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class MySupportTicketsView(generics.ListAPIView):
    """GET /support/tickets/mine/ — tickets créés par l'utilisateur courant"""
    permission_classes = [IsAuthenticated]
    serializer_class = SupportTicketSerializer

    def get_queryset(self):
        return SupportTicket.objects.filter(
            organization=self.request.user.organization,
            reported_by=self.request.user,
        )


class SupportTicketListView(generics.ListAPIView):
    """GET /support/tickets/ — liste admin, filtrable par statut/module/priorité"""
    permission_classes = [IsSupportAdmin]
    serializer_class = SupportTicketSerializer

    def get_queryset(self):
        qs = SupportTicket.objects.filter(organization=self.request.user.organization)
        status_param = self.request.query_params.get('status')
        module_param = self.request.query_params.get('module')
        priority_param = self.request.query_params.get('priority')
        if status_param:
            qs = qs.filter(status=status_param)
        if module_param:
            qs = qs.filter(module=module_param)
        if priority_param:
            qs = qs.filter(priority=priority_param)
        return qs


class SupportTicketDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /support/tickets/<id>/ — admin uniquement (changer statut, répondre)"""
    permission_classes = [IsSupportAdmin]

    def get_queryset(self):
        return SupportTicket.objects.filter(organization=self.request.user.organization)

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return SupportTicketUpdateSerializer
        return SupportTicketSerializer

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        instance = self.get_object()
        return Response(SupportTicketSerializer(instance).data)
