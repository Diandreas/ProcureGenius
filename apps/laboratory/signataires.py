"""Noms affichés sur les résultats de laboratoire : techniciens et biologiste.

Réglés une fois par organisation dans Paramètres > Laboratoire. Quand ils sont renseignés, ils
remplacent le nom du compte qui a saisi ou validé, sur TOUS les résultats, anciens compris : le
centre veut une équipe fixe sur ses documents. Le détail de qui a fait quoi reste dans le journal
des modifications. Rien de réglé : on garde le nom du compte, comme avant.
"""


def signataires(organization):
    """(liste des techniciens, biologiste) réglés pour l'organisation ; ([], '') sinon."""
    if organization is None:
        return [], ''
    from apps.core.models import OrganizationSettings
    reglages = (OrganizationSettings.objects.filter(organization=organization)
                .values('lab_technician_names', 'lab_biologist_name').first()) or {}
    techniciens = [n.strip() for n in (reglages.get('lab_technician_names') or '').splitlines() if n.strip()]
    return techniciens, (reglages.get('lab_biologist_name') or '').strip()


def nom_compte(user):
    """Nom affichable d'un compte, ou None."""
    if not user:
        return None
    return user.get_full_name() or user.username
