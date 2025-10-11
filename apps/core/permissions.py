"""
Permission classes and decorators for module access control
"""

from functools import wraps
from django.http import JsonResponse
from django.shortcuts import redirect
from django.contrib import messages
from rest_framework import permissions
from apps.core.modules import user_has_module_access


class HasModuleAccess(permissions.BasePermission):
    """
    Permission class for DRF viewsets to check module access
    
    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [HasModuleAccess]
            required_module = 'suppliers'
    """
    
    def has_permission(self, request, view):
        # First check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Get required module from view
        required_module = getattr(view, 'required_module', None)
        
        if not required_module:
            # If no module specified, allow access
            return True
        
        # Check if user has access to the module
        return user_has_module_access(request.user, required_module)
    
    def has_object_permission(self, request, view, obj):
        # Same logic for object-level permissions
        return self.has_permission(request, view)


class IsModuleEnabled(permissions.BasePermission):
    """
    Alternative permission class that gets module from kwargs
    
    Usage in URLConf:
        Works when view explicitly sets the module
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Try to get module from view kwargs or class attribute
        required_module = view.kwargs.get('module') or getattr(view, 'required_module', None)
        
        if not required_module:
            return True
        
        return user_has_module_access(request.user, required_module)


def require_module(module_code):
    """
    Decorator for views to require specific module access
    
    Usage:
        @require_module('suppliers')
        def my_view(request):
            ...
    
    For API views (returns JSON):
        @require_module('suppliers')
        @api_view(['GET'])
        def my_api_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Check authentication
            if not request.user or not request.user.is_authenticated:
                if request.path.startswith('/api/'):
                    return JsonResponse(
                        {'error': 'Authentication required'},
                        status=401
                    )
                return redirect('login')
            
            # Check module access
            if not user_has_module_access(request.user, module_code):
                if request.path.startswith('/api/'):
                    return JsonResponse(
                        {'error': f'Module {module_code} is not enabled for your organization'},
                        status=403
                    )
                messages.error(request, f'Module {module_code} is not available.')
                return redirect('dashboard')
            
            # Access granted
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def require_any_module(*module_codes):
    """
    Decorator requiring access to at least one of the specified modules
    
    Usage:
        @require_any_module('suppliers', 'purchase-orders')
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                if request.path.startswith('/api/'):
                    return JsonResponse({'error': 'Authentication required'}, status=401)
                return redirect('login')
            
            # Check if user has access to any of the modules
            has_access = any(
                user_has_module_access(request.user, module)
                for module in module_codes
            )
            
            if not has_access:
                if request.path.startswith('/api/'):
                    return JsonResponse(
                        {'error': 'Required module access not available'},
                        status=403
                    )
                messages.error(request, 'Required module is not available.')
                return redirect('dashboard')
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def require_all_modules(*module_codes):
    """
    Decorator requiring access to all specified modules
    
    Usage:
        @require_all_modules('suppliers', 'purchase-orders')
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                if request.path.startswith('/api/'):
                    return JsonResponse({'error': 'Authentication required'}, status=401)
                return redirect('login')
            
            # Check if user has access to all modules
            missing_modules = [
                module for module in module_codes
                if not user_has_module_access(request.user, module)
            ]
            
            if missing_modules:
                if request.path.startswith('/api/'):
                    return JsonResponse(
                        {'error': f'Missing required modules: {", ".join(missing_modules)}'},
                        status=403
                    )
                messages.error(request, 'Some required modules are not available.')
                return redirect('dashboard')
            
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


