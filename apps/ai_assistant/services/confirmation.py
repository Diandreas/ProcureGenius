"""
Confirmation d'actions sensibles par TOKEN SIGNÉ (round-trip structuré).

Remplace l'ancienne détection par mots-clés ('ok'/'oui'/'non') et l'heuristique
sur les clés du dict, qui étaient la principale source de bugs de l'orchestration.

Principe :
  - Quand l'IA veut exécuter une action sensible (création/suppression) ou qu'un
    doublon potentiel est détecté, l'Orchestrator émet un PendingAction sérialisé
    en token signé (django.core.signing, avec TTL).
  - Le front affiche des options explicites (ex: "Utiliser l'existant" /
    "Créer quand même" / "Annuler") portant chacune un `choice`.
  - Le front renvoie {token, choice} : aucune interprétation de langage naturel.
  - L'Orchestrator vérifie la signature + le TTL, fusionne les paramètres du choix,
    et ré-exécute l'action via le registry.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

from django.core import signing

logger = logging.getLogger(__name__)

SALT = "ai_assistant.pending_action"
DEFAULT_MAX_AGE = 1800  # 30 minutes


@dataclass
class ConfirmationOption:
    """Une option présentée à l'utilisateur (bouton)."""
    label: str
    choice: str                       # 'use_existing' | 'force_create' | 'cancel' | ...
    variant: str = "default"          # hint UI: 'primary' | 'default' | 'danger'


@dataclass
class PendingAction:
    """Action en attente de confirmation utilisateur."""
    action: str
    original_params: Dict[str, Any]
    entity_type: Optional[str] = None
    summary: str = ""
    # choices : par choix, les params supplémentaires à fusionner avant ré-exécution
    choices: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    options: List[ConfirmationOption] = field(default_factory=list)

    # ------------------------------------------------------------ (de)sérialisation
    def to_token(self, max_age: int = DEFAULT_MAX_AGE) -> str:  # noqa: ARG002 (TTL appliqué à la lecture)
        payload = {
            "action": self.action,
            "original_params": self.original_params,
            "entity_type": self.entity_type,
            "choices": self.choices,
        }
        return signing.dumps(payload, salt=SALT)

    def to_frontend(self, token: str) -> Dict[str, Any]:
        """Représentation envoyée au front dans `needs_confirmation`."""
        return {
            "token": token,
            "action": self.action,
            "entity_type": self.entity_type,
            "summary": self.summary,
            "options": [asdict(o) for o in self.options],
        }


def issue_token(pending: PendingAction) -> str:
    """Émet le token signé pour une action en attente."""
    return pending.to_token()


def resolve_token(token: str, choice: str, max_age: int = DEFAULT_MAX_AGE) -> Optional[Dict[str, Any]]:
    """Vérifie le token et retourne l'action + les params fusionnés pour le choix donné.

    Retour :
        {'action': str, 'params': dict, 'entity_type': str|None, 'cancelled': bool}
        ou None si le token est invalide / expiré.
    """
    try:
        payload = signing.loads(token, salt=SALT, max_age=max_age)
    except signing.SignatureExpired:
        logger.info("PendingAction token expiré.")
        return None
    except signing.BadSignature:
        logger.warning("PendingAction token invalide (signature).")
        return None

    if choice == "cancel":
        return {
            "action": payload.get("action"),
            "params": {},
            "entity_type": payload.get("entity_type"),
            "cancelled": True,
        }

    original = payload.get("original_params") or {}
    choice_params = (payload.get("choices") or {}).get(choice, {}) or {}
    merged = {**original, **choice_params}

    return {
        "action": payload.get("action"),
        "params": merged,
        "entity_type": payload.get("entity_type"),
        "cancelled": False,
    }


# ----------------------------------------------------------------------- helpers
def build_creation_confirmation(action: str, params: Dict[str, Any], entity_type: str,
                                similar: Optional[List[Dict[str, Any]]] = None) -> PendingAction:
    """Construit un PendingAction standard pour une création avec doublons potentiels.

    - Si `similar` est fourni (doublons détectés) : propose use_existing / force_create / cancel.
    - Sinon (simple confirmation de création) : propose force_create / cancel.
    """
    entity_labels = {
        "client": "client", "supplier": "fournisseur", "product": "produit",
        "invoice": "facture", "purchase_order": "bon de commande",
    }
    label = entity_labels.get(entity_type, entity_type or "élément")

    if similar:
        names = ", ".join(s.get("name", "?") for s in similar[:3])
        summary = (
            f"Un ou plusieurs {label}s similaires existent déjà ({names}). "
            f"Voulez-vous utiliser l'existant ou en créer un nouveau ?"
        )
        options = [
            ConfirmationOption("Utiliser l'existant", "use_existing", "primary"),
            ConfirmationOption("Créer quand même", "force_create", "default"),
            ConfirmationOption("Annuler", "cancel", "danger"),
        ]
        choices = {
            "use_existing": {"use_existing": True, "existing_id": similar[0].get("id")},
            "force_create": {"force_create": True},
        }
    else:
        summary = f"Confirmez-vous la création de ce {label} ?"
        options = [
            ConfirmationOption("Créer", "force_create", "primary"),
            ConfirmationOption("Annuler", "cancel", "danger"),
        ]
        choices = {"force_create": {"force_create": True}}

    return PendingAction(
        action=action,
        original_params=params,
        entity_type=entity_type,
        summary=summary,
        choices=choices,
        options=options,
    )
