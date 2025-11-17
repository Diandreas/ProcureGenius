from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage

from apps.core.models import OrganizationSettings
from apps.invoicing.models import PrintTemplate, PrintConfiguration
from .serializers_settings import (
    OrganizationSettingsSerializer,
    PrintTemplateSerializer,
    PrintConfigurationSerializer
)


class OrganizationSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet pour les paramètres d'organisation"""
    serializer_class = OrganizationSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtre les settings par organisation de l'utilisateur"""
        if self.request.user.organization:
            return OrganizationSettings.objects.filter(
                organization=self.request.user.organization
            )
        return OrganizationSettings.objects.none()

    @action(detail=False, methods=['get', 'patch'], url_path='all')
    def all_settings(self, request):
        """
        GET: Récupère tous les paramètres de l'organisation
        PATCH: Met à jour les paramètres
        """
        # Si l'utilisateur n'a pas d'organisation, créer une organisation par défaut
        if not request.user.organization:
            from apps.accounts.models import Organization

            # Créer une organisation par défaut pour cet utilisateur
            org = Organization.objects.create(
                name=f"Organisation de {request.user.get_full_name() or request.user.username}",
                subscription_type='free'
            )
            request.user.organization = org
            request.user.save()

        # Créer les settings si ils n'existent pas
        settings, created = OrganizationSettings.objects.get_or_create(
            organization=request.user.organization
        )

        if request.method == 'GET':
            serializer = self.get_serializer(settings)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = self.get_serializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='organization/upload_logo')
    def upload_logo(self, request):
        """Upload du logo de l'entreprise"""
        print(f"\n{'='*60}")
        print(f"📤 UPLOAD LOGO - User: {request.user.username}")
        print(f"{'='*60}")

        if not request.user.organization:
            print("✗ Utilisateur sans organisation")
            return Response(
                {'error': 'Aucune organisation associée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        print(f"✓ Organisation: {request.user.organization.name}")

        settings, created = OrganizationSettings.objects.get_or_create(
            organization=request.user.organization
        )
        print(f"✓ OrganizationSettings: {'created' if created else 'exists'} (ID: {settings.id})")

        if 'logo' not in request.FILES:
            print("✗ Aucun fichier dans request.FILES")
            print(f"  FILES keys: {list(request.FILES.keys())}")
            return Response(
                {'error': 'Aucun fichier fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logo_file = request.FILES['logo']
        print(f"✓ Fichier reçu: {logo_file.name} ({logo_file.size} bytes)")

        # Valider la taille (max 2MB)
        if logo_file.size > 2 * 1024 * 1024:
            print(f"✗ Fichier trop volumineux: {logo_file.size} bytes")
            return Response(
                {'error': 'Fichier trop volumineux (max 2MB)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Supprimer l'ancien logo si existe
        if settings.company_logo:
            old_logo = settings.company_logo.name
            print(f"✓ Suppression ancien logo: {old_logo}")
            settings.company_logo.delete(save=False)

        settings.company_logo = logo_file
        settings.save()
        print(f"✓ Logo sauvegardé: {settings.company_logo.name}")
        print(f"✓ Path: {settings.company_logo.path if settings.company_logo else 'None'}")
        print(f"{'='*60}\n")

        serializer = self.get_serializer(settings)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'], url_path='organization/delete_logo')
    def delete_logo(self, request):
        """Supprime le logo de l'entreprise"""
        if not request.user.organization:
            return Response(
                {'error': 'Aucune organisation associée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        settings = get_object_or_404(
            OrganizationSettings,
            organization=request.user.organization
        )

        if settings.company_logo:
            settings.company_logo.delete(save=True)

        serializer = self.get_serializer(settings)
        return Response(serializer.data)


class PrintTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet pour les modèles d'impression"""
    serializer_class = PrintTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtre les templates par organisation"""
        if self.request.user.organization:
            return PrintTemplate.objects.filter(
                organization=self.request.user.organization
            )
        return PrintTemplate.objects.none()

    def perform_create(self, serializer):
        """Associe le template à l'organisation de l'utilisateur"""
        serializer.save(organization=self.request.user.organization)

    @action(detail=False, methods=['get'], url_path='default')
    def get_default(self, request):
        """Récupère le template par défaut"""
        # Auto-créer l'organisation si nécessaire
        if not request.user.organization:
            from apps.accounts.models import Organization
            org = Organization.objects.create(
                name=f"Organisation de {request.user.get_full_name() or request.user.username}",
                subscription_type='free'
            )
            request.user.organization = org
            request.user.save()

        template = PrintTemplate.objects.filter(
            organization=request.user.organization,
            is_default=True
        ).first()

        if not template:
            # Créer un template par défaut si aucun n'existe
            template = PrintTemplate.objects.create(
                organization=request.user.organization,
                name='Template par défaut',
                template_type='invoice',
                is_default=True
            )

        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set_default')
    def set_default(self, request, pk=None):
        """Définit ce template comme défaut"""
        template = self.get_object()

        # Retirer le flag is_default des autres templates
        PrintTemplate.objects.filter(
            organization=request.user.organization,
            is_default=True
        ).exclude(pk=template.pk).update(is_default=False)

        template.is_default = True
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='upload_header')
    def upload_header(self, request, pk=None):
        """Upload du logo d'en-tête (header_logo)"""
        template = self.get_object()

        if 'header_image' not in request.FILES and 'logo' not in request.FILES:
            return Response(
                {'error': 'Aucun fichier fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Accepter 'header_image' ou 'logo' comme nom de champ
        header_file = request.FILES.get('header_image') or request.FILES.get('logo')

        # Valider la taille (max 5MB)
        if header_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'Fichier trop volumineux (max 5MB)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Supprimer l'ancien logo si existe
        if template.header_logo:
            template.header_logo.delete(save=False)

        template.header_logo = header_file
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='upload_footer')
    def upload_footer(self, request, pk=None):
        """Upload de l'image de pied de page (non implémenté dans le modèle)"""
        return Response(
            {'error': 'Footer image upload not implemented yet'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )

    @action(detail=True, methods=['post'], url_path='upload_logo')
    def upload_logo(self, request, pk=None):
        """Upload du logo pour le template"""
        template = self.get_object()

        if 'logo' not in request.FILES:
            return Response(
                {'error': 'Aucun fichier fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logo_file = request.FILES['logo']

        if logo_file.size > 2 * 1024 * 1024:
            return Response(
                {'error': 'Fichier trop volumineux (max 2MB)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if template.logo:
            template.logo.delete(save=False)

        template.logo = logo_file
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data)


class PrintConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les configurations d'impression"""
    serializer_class = PrintConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtre les configurations par organisation"""
        if self.request.user.organization:
            return PrintConfiguration.objects.filter(
                organization=self.request.user.organization
            )
        return PrintConfiguration.objects.none()

    def perform_create(self, serializer):
        """Associe la configuration à l'organisation"""
        serializer.save(organization=self.request.user.organization)

    @action(detail=False, methods=['get'], url_path='default')
    def get_default(self, request):
        """Récupère la configuration par défaut"""
        # Auto-créer l'organisation si nécessaire
        if not request.user.organization:
            from apps.accounts.models import Organization
            org = Organization.objects.create(
                name=f"Organisation de {request.user.get_full_name() or request.user.username}",
                subscription_type='free'
            )
            request.user.organization = org
            request.user.save()

        config = PrintConfiguration.objects.filter(
            organization=request.user.organization,
            is_default=True
        ).first()

        if not config:
            # Créer une config par défaut
            config = PrintConfiguration.objects.create(
                organization=request.user.organization,
                name='Configuration par défaut',
                is_default=True
            )

        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set_default')
    def set_default(self, request, pk=None):
        """Définit cette configuration comme défaut"""
        config = self.get_object()

        # Retirer le flag is_default des autres configs
        PrintConfiguration.objects.filter(
            organization=request.user.organization,
            is_default=True
        ).exclude(pk=config.pk).update(is_default=False)

        config.is_default = True
        config.save()

        serializer = self.get_serializer(config)
        return Response(serializer.data)
