"""
Authentification de l'API avec un garde-fou sur les donnees de sante.

Probleme constate : les points d'acces de sante (fiches patients, consultations,
laboratoire, imagerie, hospitalisations...) ne verifient que « utilisateur
connecte », pas ses modules. Un compte restreint a un module sans rapport avec
la sante — par exemple le Suivi patients d'une commerciale — etait bloque a
l'ecran mais pouvait lire ces donnees en appelant directement le serveur.

Ici, on refuse l'acces aux donnees de sante a un compte dont AUCUN module ne
justifie d'y toucher. Le garde-fou est volontairement etroit : il ne change rien
pour un compte qui a au moins un module de sante, de facturation, de clients ou
d'analyse (c'est le cas de tous les comptes existants), ni pour un
super-utilisateur.
"""
from rest_framework import exceptions
from rest_framework.authentication import SessionAuthentication, TokenAuthentication

from apps.core.modules import Modules, get_user_accessible_modules

# Prefixes de l'API qui portent des donnees de sante.
PREFIXES_SANTE = (
    '/api/v1/healthcare/',
    '/api/v1/analytics/healthcare',
)

# Un compte qui a l'un de ces modules garde l'acces actuel. Les modules de
# facturation, de clients et d'analyse sont inclus parce que leurs ecrans
# interrogent aussi les patients (choix du patient sur une facture, tableaux de
# bord financiers) : ne pas les inclure casserait ces comptes.
MODULES_AUTORISES = {
    Modules.PATIENTS, Modules.CONSULTATIONS, Modules.LABORATORY, Modules.IMAGING,
    Modules.MATERNITY, Modules.VACCINATION, Modules.PHARMACY, 'visits',
    Modules.INVOICES, Modules.CLIENTS, Modules.ANALYTICS, Modules.DASHBOARD,
}


def doit_refuser(user, chemin):
    """Vrai si ce compte ne doit pas atteindre ce chemin (donnees de sante)."""
    if not chemin.startswith(PREFIXES_SANTE):
        return False
    if user.is_superuser:
        return False
    try:
        accessibles = set(get_user_accessible_modules(user))
    except Exception:
        # Un garde-fou ne doit jamais couper tout le monde par une erreur de
        # calcul : en cas de doute on laisse passer, comme avant.
        return False
    return not (accessibles & MODULES_AUTORISES)


def _controler(resultat, requete):
    if resultat is not None:
        user, _ = resultat
        # Retient l'utilisateur de la requête pour les journaux (auteur d'une fiche patient,
        # audit du laboratoire). Remis à zéro avant chaque requête par
        # ClearThreadLocalUserMiddleware.
        try:
            from apps.laboratory.signals import set_current_user
            set_current_user(user)
        except Exception:  # noqa: BLE001 — ne doit jamais bloquer l'authentification
            pass
        if doit_refuser(user, requete.path):
            raise exceptions.PermissionDenied(
                "Votre compte n'a pas accès aux données de santé.")
    return resultat


class ModuleAwareTokenAuthentication(TokenAuthentication):
    def authenticate(self, request):
        return _controler(super().authenticate(request), request)


class ModuleAwareSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        return _controler(super().authenticate(request), request)
