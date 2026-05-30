"""
Tests du mécanisme de confirmation par token signé (services/confirmation.py).

Garantit que la confirmation d'actions sensibles repose sur un token signé +
un choix explicite, et NON sur une interprétation de langage naturel.
"""
import time
import pytest

from apps.ai_assistant.services.confirmation import (
    PendingAction,
    ConfirmationOption,
    issue_token,
    resolve_token,
    build_creation_confirmation,
)


def _sample_pending():
    return PendingAction(
        action="create_client",
        original_params={"name": "Acme", "email": "a@acme.com"},
        entity_type="client",
        summary="Créer ce client ?",
        choices={"force_create": {"force_create": True}},
        options=[ConfirmationOption("Créer", "force_create", "primary"),
                 ConfirmationOption("Annuler", "cancel", "danger")],
    )


def test_token_roundtrip_force_create():
    token = issue_token(_sample_pending())
    resolved = resolve_token(token, "force_create")
    assert resolved is not None
    assert resolved["action"] == "create_client"
    assert resolved["params"]["force_create"] is True
    assert resolved["params"]["name"] == "Acme"      # params d'origine conservés
    assert resolved["cancelled"] is False


def test_token_cancel():
    token = issue_token(_sample_pending())
    resolved = resolve_token(token, "cancel")
    assert resolved["cancelled"] is True


def test_token_invalid_signature_returns_none():
    assert resolve_token("not-a-valid-token", "force_create") is None


def test_token_tampered_returns_none():
    token = issue_token(_sample_pending())
    tampered = token[:-3] + ("AAA" if not token.endswith("AAA") else "BBB")
    assert resolve_token(tampered, "force_create") is None


def test_token_expired_returns_none():
    token = issue_token(_sample_pending())
    # max_age=0 => immédiatement expiré (>= 1s d'âge garanti)
    time.sleep(1.1)
    assert resolve_token(token, "force_create", max_age=1) is None


def test_frontend_representation_has_options_and_token():
    pending = _sample_pending()
    token = issue_token(pending)
    fe = pending.to_frontend(token)
    assert fe["token"] == token
    assert fe["action"] == "create_client"
    assert fe["summary"]
    assert [o["choice"] for o in fe["options"]] == ["force_create", "cancel"]


def test_build_creation_confirmation_with_similar():
    similar = [{"id": "1", "name": "Acme Corp"}, {"id": "2", "name": "Acme Corporation"}]
    pending = build_creation_confirmation("create_client", {"name": "Acme"}, "client", similar=similar)
    choices = [o.choice for o in pending.options]
    assert "use_existing" in choices and "force_create" in choices and "cancel" in choices

    token = issue_token(pending)
    resolved = resolve_token(token, "use_existing")
    assert resolved["params"]["use_existing"] is True
    assert resolved["params"]["existing_id"] == "1"


def test_build_creation_confirmation_without_similar():
    pending = build_creation_confirmation("create_client", {"name": "Acme"}, "client", similar=None)
    choices = [o.choice for o in pending.options]
    assert choices == ["force_create", "cancel"]
