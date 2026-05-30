from apps.laboratory.signals import set_current_user


class ClearThreadLocalUserMiddleware:
    """
    Nettoie le thread-local 'current_user' avant chaque requête.
    Évite la contamination entre requêtes successives sur le même thread
    (ex: KELL fait une action labo, puis Gertrude crée une facture — sans
    ce middleware, le journal d'audit attribuerait la facture à KELL).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        set_current_user(None)
        return self.get_response(request)
