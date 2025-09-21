from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission personnalisée pour permettre seulement au propriétaire
    de modifier ou supprimer un objet.
    """
    def has_object_permission(self, request, view, obj):
        # Lecture pour tous les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Écriture seulement pour le propriétaire
        return obj.created_by == request.user


class IsCompanyMember(permissions.BasePermission):
    """
    Permission pour vérifier que l'utilisateur fait partie
    de la même entreprise que l'objet.
    """
    def has_object_permission(self, request, view, obj):
        # Vérifier si l'utilisateur et l'objet appartiennent à la même entreprise
        if hasattr(obj, 'company'):
            return request.user.company == obj.company
        return True


class IsSuperuserOrReadOnly(permissions.BasePermission):
    """
    Permission pour permettre seulement aux superutilisateurs
    de modifier ou supprimer, mais lecture pour tous.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_superuser