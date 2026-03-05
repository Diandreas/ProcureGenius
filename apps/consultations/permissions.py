from rest_framework import permissions

class CanModifyConsultation(permissions.BasePermission):
    """
    Seul la personne qui a terminé (validé) la consultation peut modifier les informations
    une fois qu'elle est en statut 'completed'.
    """
    def has_object_permission(self, request, view, obj):
        # Les permissions de lecture sont autorisées pour tout utilisateur authentifié (géré par IsAuthenticated)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Si la consultation est terminée, seul celui qui l'a terminée peut la modifier
        if obj.status == 'completed':
            return obj.completed_by == request.user

        # Si elle n'est pas terminée, les règles standards s'appliquent (ici on laisse passer, 
        # le filtrage par organisation est déjà fait dans le queryset de la vue)
        return True
