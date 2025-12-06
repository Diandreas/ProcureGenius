"""
Organization-based filtering mixin for ViewSets
Ensures data isolation between organizations (multi-tenancy)
"""
from rest_framework.exceptions import PermissionDenied


class OrganizationFilterMixin:
    """
    Mixin to filter querysets by user's organization.
    
    Add this mixin to ViewSets to ensure users only see data from their organization.
    
    By default, it filters on 'organization' field. Override organization_field
    to use a different field name (e.g., 'organization' or traverse relations with '__').
    
    Usage:
        class MyViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
            queryset = MyModel.objects.all()
            organization_field = 'organization'  # Default
    """
    
    organization_field = 'organization'
    
    def get_queryset(self):
        """Filter queryset by user's organization"""
        queryset = super().get_queryset()
        
        user = self.request.user
        
        # Superusers can see all data
        if user.is_superuser:
            return queryset
        
        # Get user's organization
        organization = getattr(user, 'organization', None)
        
        if not organization:
            # User has no organization - return empty queryset for safety
            return queryset.none()
        
        # Build filter dynamically
        filter_kwargs = {self.organization_field: organization}
        return queryset.filter(**filter_kwargs)
    
    def perform_create(self, serializer):
        """Automatically set organization when creating objects"""
        user = self.request.user
        organization = getattr(user, 'organization', None)
        
        if organization:
            # Check if the serializer's model has an organization field
            model = serializer.Meta.model
            if hasattr(model, 'organization'):
                serializer.save(organization=organization)
                return
        
        # Fallback to default behavior
        serializer.save()


class OrganizationUserFilterMixin:
    """
    Mixin for models related to users (like invoices) that filter by created_by__organization
    """
    
    organization_field = 'created_by__organization'
    
    def get_queryset(self):
        """Filter queryset by user's organization through created_by"""
        queryset = super().get_queryset()
        
        user = self.request.user
        
        # Superusers can see all data
        if user.is_superuser:
            return queryset
        
        organization = getattr(user, 'organization', None)
        
        if not organization:
            return queryset.none()
        
        filter_kwargs = {self.organization_field: organization}
        return queryset.filter(**filter_kwargs)


class OrganizationClientFilterMixin:
    """
    Mixin for models related to clients
    Filters by client__organization
    """
    
    def get_queryset(self):
        """Filter by client's organization"""
        queryset = super().get_queryset()
        
        user = self.request.user
        
        if user.is_superuser:
            return queryset
        
        organization = getattr(user, 'organization', None)
        
        if not organization:
            return queryset.none()
        
        # Filter by client's organization OR created_by's organization
        from django.db.models import Q
        return queryset.filter(
            Q(client__organization=organization) |
            Q(created_by__organization=organization)
        ).distinct()
