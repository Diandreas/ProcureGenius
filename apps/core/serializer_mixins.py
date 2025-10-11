"""
Serializer mixins for module-aware field filtering
"""

from rest_framework import serializers
from apps.core.modules import user_has_module_access


class ModuleAwareSerializerMixin:
    """
    Mixin for serializers to dynamically exclude fields based on module access
    
    Usage:
        class MySerializer(ModuleAwareSerializerMixin, serializers.ModelSerializer):
            module_dependent_fields = {
                'suppliers': ['supplier', 'supplier_name', 'supplier_id'],
                'purchase-orders': ['purchase_order', 'po_number'],
            }
            
            class Meta:
                model = MyModel
                fields = '__all__'
    """
    
    module_dependent_fields = {}  # Override in subclass: {module: [field_names]}
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Get user from context
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return
        
        user = request.user
        if not user or not user.is_authenticated:
            return
        
        # Remove fields for disabled modules
        fields_to_remove = []
        for module, field_names in self.module_dependent_fields.items():
            if not user_has_module_access(user, module):
                fields_to_remove.extend(field_names)
        
        # Remove the fields from the serializer
        for field_name in fields_to_remove:
            self.fields.pop(field_name, None)


def get_module_dependent_fields(user, module_field_map):
    """
    Helper to get list of available fields based on user's module access
    
    Args:
        user: The user to check access for
        module_field_map: Dict mapping modules to field lists
        
    Returns:
        List of field names that should be excluded
    """
    if not user or not user.is_authenticated:
        return []
    
    fields_to_exclude = []
    for module, fields in module_field_map.items():
        if not user_has_module_access(user, module):
            fields_to_exclude.extend(fields)
    
    return fields_to_exclude


