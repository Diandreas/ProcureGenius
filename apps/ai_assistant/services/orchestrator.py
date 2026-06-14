"""
Orchestrateur IA — flux à DEUX appels LLM (cœur de la robustesse).

Principe directeur : l'IA ne devine jamais une réponse, elle répond sur la base
des données réellement récupérées.

  Appel 1 (planification / récupération)
      L'IA reçoit le message + les outils disponibles (registry) et décide
      QUELLES fonctions appeler pour récupérer les données utiles. tool_choice=auto.

  Exécution
      On exécute les tool_calls via le registry et on récupère les données réelles.

  Appel 2 (synthèse couplée aux données)
      On renvoie les résultats d'outils (rôle 'tool') + la question d'origine au
      LLM pour produire la réponse finale, analysée. Si l'appel 2 est indisponible
      (circuit breaker / erreur), on retombe sur un résumé déterministe.

Court-circuits (économie de tokens / sûreté) :
  - Pure statistique  -> réponse directe via StatsResponseService (aucun appel LLM tool).
  - Aucun tool_call   -> la réponse de l'appel 1 EST la réponse finale (1 seul appel).
  - Confirmation requise -> on s'arrête AVANT l'appel 2 et on renvoie un token
    de confirmation (PendingAction) ; l'action sera ré-exécutée après le choix
    explicite de l'utilisateur (voir services/confirmation.py).

Cet orchestrateur remplace la logique éparpillée de ChatView (détection par
mots-clés, concaténation manuelle des résultats) et le `process_user_request`
historique resté inutilisé.

----------------------------------------------------------------------------
MODE AGENT STREAMING (`run_stream`)

En plus du flux à 2 appels (`run`, conservé pour la compatibilité), l'orchestrateur
expose une boucle agentique streamée : le LLM enchaîne librement
narration -> appels d'outils -> lecture des résultats -> nouveaux appels, jusqu'à
produire la réponse finale (max AGENT_MAX_STEPS itérations). Chaque étape est
émise en temps réel sous forme d'événements consommés par la vue SSE
(ChatStreamView) puis par le frontend :

    {'type': 'status',     'message': str}                    # phase en cours
    {'type': 'text_delta', 'content': str}                    # texte au fil de l'eau
    {'type': 'thought',    'content': str}                    # le texte streamé était
                                                              # une narration -> timeline
    {'type': 'tool_start', 'id', 'name', 'label': str}        # début d'un outil
    {'type': 'tool_result','id', 'name', 'success', 'summary'}# fin d'un outil
    {'type': 'chart',      'chart': {...}}                    # graphique produit
    {'type': 'final',      'reply', 'tokens', 'steps', ...}   # TOUJOURS en dernier
                                                              # (consommé par la vue,
                                                              # jamais relayé au client)

Les résultats d'outils sont renvoyés au modèle au format natif Mistral
(message assistant avec tool_calls + messages role='tool'), ce qui permet le
chaînage : « cherche les stats -> génère le graphique -> commente-le ».
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# Indices de contexte par page (améliore la pertinence — anti-gadget).
PAGE_HINTS = {
    "/dashboard": "L'utilisateur consulte son tableau de bord (vue d'ensemble de l'activité).",
    "/invoices": "L'utilisateur est sur la page Factures.",
    "/purchase-orders": "L'utilisateur est sur la page Bons de commande.",
    "/contracts": "L'utilisateur est sur la page Contrats.",
    "/products": "L'utilisateur est sur la page Produits / Stock.",
    "/clients": "L'utilisateur est sur la page Clients.",
    "/suppliers": "L'utilisateur est sur la page Fournisseurs.",
}

# Descriptions de repli pour la synthèse déterministe (réutilise l'esprit des
# action_descriptions historiques de MistralService.chat).
_ACTION_LABELS = {
    "create_supplier": "fournisseur créé",
    "create_client": "client créé",
    "create_invoice": "facture créée",
    "create_purchase_order": "bon de commande créé",
    "create_product": "produit créé",
    "adjust_stock": "stock ajusté",
    "send_invoice": "facture envoyée",
    "send_purchase_order": "bon de commande envoyé",
}

# Nombre maximum d'itérations LLM de la boucle agentique (garde-fou tokens).
AGENT_MAX_STEPS = 6


def _agent_max_request_tokens() -> int:
    """Plafond de tokens consommables par UNE requête agentique.

    Garde-fou anti-emballement : sans cap, une boucle de 6 étapes qui renvoie à
    chaque tour le schéma des ~50 outils + un contexte qui grossit pourrait
    consommer ~60K tokens sur une seule requête (soit >50% du budget journalier
    org par défaut de 100K). Dès que le cumul dépasse ce plafond, on FORCE la
    synthèse finale (plus d'appels d'outils) : la boucle atterrit en douceur au
    lieu d'être tuée brutalement. Worst case réel par requête ≈ plafond + une
    dernière synthèse (~3K) ; avec 40K -> ~43K max.

    Configurable via settings.AI_MAX_REQUEST_TOKENS.
    """
    from django.conf import settings
    return int(getattr(settings, "AI_MAX_REQUEST_TOKENS", 40000))

# Addendum au prompt système en mode agent streaming : le modèle annonce ses
# étapes (narration visible dans la timeline) et enchaîne les outils librement.
AGENT_PROMPT_ADDENDUM = """

MODE AGENT — MÉTHODE DE TRAVAIL :
- Tu travailles par étapes VISIBLES par l'utilisateur, comme un assistant qui raisonne à voix haute.
- Avant d'appeler un ou plusieurs outils, annonce en UNE phrase courte ce que tu vas faire et pourquoi (ex : « Je recherche d'abord vos statistiques de ventes du mois dernier. »).
- Enchaîne autant d'appels d'outils que nécessaire : recherche des données, puis analyse, puis génération de graphique, etc. N'invente JAMAIS une donnée : récupère-la.
- Si un outil ne retourne rien d'utile, essaie une autre approche (autre outil, autre recherche) avant d'abandonner.
- Quand tu as tout ce qu'il faut, donne la réponse finale : claire, structurée, basée UNIQUEMENT sur les données récupérées, avec les chiffres clés et une courte interprétation.
- La réponse finale ne doit PAS répéter la narration des étapes."""

# Libellés français affichés dans la timeline du frontend pendant l'exécution.
_TOOL_LABELS = {
    "get_statistics": "Récupération des statistiques",
    "get_stats": "Récupération des statistiques",
    "generate_visualization": "Génération du graphique",
    "analyze_business": "Analyse de l'activité",
    "predict_cashflow": "Prédiction de trésorerie",
    "search_entity": "Recherche dans la base",
    "get_account_list": "Lecture du plan comptable",
    "create_journal_entry": "Création de l'écriture comptable",
    "three_way_match": "Rapprochement facture / commande / réception",
}

_ENTITY_FR = {
    "supplier": "fournisseur", "client": "client", "invoice": "facture",
    "purchase_order": "bon de commande", "product": "produit", "stock": "stock",
    "journal_entry": "écriture comptable", "report": "rapport",
}

_VERB_FR = [
    ("search_", "Recherche"), ("get_", "Récupération"), ("list_", "Lecture"),
    ("create_", "Création"), ("update_", "Mise à jour"), ("delete_", "Suppression"),
    ("send_", "Envoi"), ("analyze_", "Analyse"), ("predict_", "Prédiction"),
    ("generate_", "Génération"), ("adjust_", "Ajustement"), ("verify_", "Vérification"),
]


def _tool_label(name: str, args: Dict[str, Any]) -> str:
    """Libellé humain (français) d'un appel d'outil, enrichi du paramètre clé."""
    label = _TOOL_LABELS.get(name)
    if label is None:
        for prefix, verb in _VERB_FR:
            if name.startswith(prefix):
                rest = name[len(prefix):]
                entity = _ENTITY_FR.get(rest, rest.replace("_", " "))
                label = f"{verb} {entity}" if entity else verb
                break
        else:
            label = name.replace("_", " ").capitalize()

    subject = None
    if isinstance(args, dict):
        for key in ("query", "name", "client_name", "supplier_name", "product_name",
                    "invoice_number", "po_number", "concept"):
            value = args.get(key)
            if value and isinstance(value, str):
                subject = value
                break
    if subject:
        label = f"{label} « {subject[:60]} »"
    return label


def _tool_result_summary(result: Dict[str, Any]) -> str:
    """Résumé court d'un résultat d'outil pour la timeline du frontend."""
    if not isinstance(result, dict):
        return ""
    if not result.get("success"):
        return (result.get("error") or "échec")[:200]
    data = result.get("data")
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        n = len(data["items"])
        return f"{n} résultat{'s' if n > 1 else ''}"
    message = result.get("message") or ""
    # Première ligne seulement (les messages outils peuvent être verbeux)
    return message.split("\n", 1)[0][:200]


@dataclass
class OrchestratorResult:
    """Résultat structuré renvoyé à la vue."""
    reply: str
    tool_results: List[Dict[str, Any]] = field(default_factory=list)
    charts: List[Dict[str, Any]] = field(default_factory=list)
    pending_action: Optional[Dict[str, Any]] = None   # représentation front d'un PendingAction
    tokens: int = 0
    success: bool = True
    used_tool_calls: List[Dict[str, Any]] = field(default_factory=list)


class Orchestrator:
    """Point d'entrée unique de l'orchestration IA."""

    def __init__(self, provider=None, tool_registry=None):
        # Injection optionnelle pour les tests (provider/registry mockés).
        self._provider = provider
        self._registry = tool_registry

    # ------------------------------------------------------------- lazy deps
    @property
    def provider(self):
        if self._provider is None:
            from apps.ai_assistant.services.llm.provider import MistralProvider
            self._provider = MistralProvider()
        return self._provider

    @property
    def registry(self):
        if self._registry is None:
            from apps.ai_assistant.services.registry.tool_registry import registry
            self._registry = registry
        return self._registry

    def _system_prompt(self, page: Optional[str]) -> str:
        from apps.ai_assistant._services_core import MistralService
        base = MistralService.create_system_prompt(MistralService.__new__(MistralService))
        hint = _page_hint(page)
        prompt = f"{base}\n\n{hint}" if hint else base
        # Règle produit : aucun emoji dans les réponses (positionnement premium).
        return prompt + "\n\nRÈGLE DE STYLE : n'utilise jamais d'emoji dans tes réponses."

    # ------------------------------------------------------------------ run
    async def run(
        self,
        message: str,
        user_ctx: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        page: Optional[str] = None,
        user=None,
    ) -> OrchestratorResult:
        """Exécute le flux complet pour un message utilisateur."""
        start = time.time()
        conversation_history = conversation_history or []
        total_tokens = 0

        # 0) Court-circuit statistiques pures (aucun appel LLM nécessaire).
        stats_reply = await self._try_stats_shortcut(message, user)
        if stats_reply:
            return OrchestratorResult(reply=stats_reply, tokens=0, success=True)

        # 1) Appel 1 — planification / récupération.
        messages = self._build_messages(message, conversation_history, page)
        first = await _acomplete(
            self.provider, messages, tools=self.registry.to_mistral_tools(), tool_choice="auto"
        )
        total_tokens += first["usage"]["total_tokens"]

        if first.get("circuit_open"):
            from apps.ai_assistant.resilience import FALLBACK_RESPONSE_FR
            return OrchestratorResult(reply=FALLBACK_RESPONSE_FR, tokens=total_tokens, success=True)

        tool_calls = first.get("tool_calls")

        # 1b) Aucun tool_call -> la réponse de l'appel 1 est la réponse finale.
        if not tool_calls:
            reply = first["content"] or "Je n'ai pas de réponse à fournir pour le moment."
            return OrchestratorResult(reply=reply, tokens=total_tokens, success=True)

        # 2) Exécution des tool_calls -> données réelles.
        tool_results = []
        charts = []
        for tc in tool_calls:
            name = tc.get("function", "")
            args = tc.get("arguments", {})
            result = await self.registry.call(name, args, user_ctx)
            tool_results.append({"tool_call_id": tc.get("id"), "function": name, "result": result})

            # 2b) Confirmation requise -> on s'arrête avant l'appel 2.
            pending = self._maybe_pending_action(name, args, result)
            if pending is not None:
                from apps.ai_assistant.services.confirmation import issue_token
                token = issue_token(pending)
                return OrchestratorResult(
                    reply=pending.summary,
                    tool_results=tool_results,
                    pending_action=pending.to_frontend(token),
                    tokens=total_tokens,
                    success=True,
                    used_tool_calls=tool_calls,
                )

            chart = _extract_chart(result)
            if chart:
                charts.extend(chart)

        # 3) Appel 2 — synthèse couplée aux données réelles.
        reply, synth_tokens = await self._synthesize(messages, first, tool_results)
        total_tokens += synth_tokens

        return OrchestratorResult(
            reply=reply,
            tool_results=tool_results,
            charts=charts,
            tokens=total_tokens,
            success=True,
            used_tool_calls=tool_calls,
        )

    # ------------------------------------------------------------ run_stream
    def run_stream(
        self,
        message: str,
        user_ctx: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        page: Optional[str] = None,
        user=None,
    ):
        """Boucle agentique streamée (générateur SYNCHRONE d'événements).

        Voir le protocole d'événements dans la docstring du module. L'événement
        'final' est toujours émis en dernier et porte tout ce qui doit être
        persisté (reply, steps, tool_results, charts, pending_action, tokens).
        """
        from asgiref.sync import async_to_sync

        conversation_history = conversation_history or []
        total_tokens = 0
        steps: List[Dict[str, Any]] = []          # trace persistée (timeline)
        all_tool_results: List[Dict[str, Any]] = []
        all_charts: List[Dict[str, Any]] = []

        def final(reply, pending_action=None, success=True):
            return {
                "type": "final",
                "reply": reply,
                "steps": steps,
                "tool_results": all_tool_results,
                "charts": all_charts,
                "pending_action": pending_action,
                "tokens": total_tokens,
                "success": success,
            }

        yield {"type": "status", "message": "Analyse de votre demande"}

        # 0) Court-circuit statistiques pures (aucun appel LLM).
        stats_reply = self._try_stats_shortcut_sync(message, user)
        if stats_reply:
            yield {"type": "text_delta", "content": stats_reply}
            yield final(stats_reply)
            return

        messages = self._build_messages(message, conversation_history, page, agent_mode=True)
        tools = self.registry.to_mistral_tools()
        max_request_tokens = _agent_max_request_tokens()

        for step_index in range(AGENT_MAX_STEPS):
            # On force la synthèse (plus d'outils) à la dernière itération OU
            # quand le plafond de tokens de la requête est atteint : la boucle
            # atterrit proprement avec une réponse finale au lieu de boucler.
            budget_exhausted = total_tokens >= max_request_tokens
            is_last = step_index == AGENT_MAX_STEPS - 1 or budget_exhausted
            if budget_exhausted:
                yield {"type": "status", "message": "Finalisation de la réponse"}
            call_text_parts: List[str] = []
            llm_final = None

            for event in self.provider.stream(
                messages, tools=None if is_last else tools, tool_choice="auto"
            ):
                if event["type"] == "delta":
                    call_text_parts.append(event["content"])
                    yield {"type": "text_delta", "content": event["content"]}
                elif event["type"] == "final":
                    llm_final = event

            if llm_final is None:  # défensif : le provider émet toujours 'final'
                llm_final = {"success": False, "usage": {}, "content": ""}

            call_text = "".join(call_text_parts) or (llm_final.get("content") or "")
            total_tokens += llm_final.get("usage", {}).get("total_tokens", 0)

            if llm_final.get("circuit_open"):
                from apps.ai_assistant.resilience import FALLBACK_RESPONSE_FR
                reply = FALLBACK_RESPONSE_FR if not all_tool_results else _deterministic_summary(all_tool_results)
                yield {"type": "text_delta", "content": reply}
                yield final(reply)
                return

            if not llm_final.get("success"):
                # Erreur LLM : on retombe sur le résumé déterministe des données déjà
                # récupérées plutôt que de tout perdre.
                reply = call_text or _deterministic_summary(all_tool_results)
                if not call_text:
                    yield {"type": "text_delta", "content": reply}
                yield final(reply, success=bool(all_tool_results))
                return

            tool_calls = llm_final.get("tool_calls")

            # Réponse finale : plus aucun outil demandé. Si le texte est vide mais
            # que des données ont été récupérées, résumé déterministe plutôt que rien.
            if not tool_calls:
                reply = call_text or (
                    _deterministic_summary(all_tool_results) if all_tool_results
                    else "Je n'ai pas de réponse à fournir pour le moment."
                )
                if not call_text:
                    yield {"type": "text_delta", "content": reply}
                yield final(reply)
                return

            # Le texte streamé accompagnant des tool_calls est une narration :
            # le frontend le déplace dans la timeline.
            if call_text.strip():
                yield {"type": "thought", "content": call_text.strip()}
                steps.append({"kind": "thought", "content": call_text.strip()})

            # Message assistant au format natif Mistral (permet le chaînage).
            import json as _json
            import uuid as _uuid
            assistant_tool_calls = []
            for tc in tool_calls:
                if not tc.get("id"):
                    tc["id"] = _uuid.uuid4().hex[:9]
                assistant_tool_calls.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["function"],
                        "arguments": tc.get("arguments_json") or _json.dumps(tc.get("arguments", {})),
                    },
                })
            messages.append({
                "role": "assistant",
                "content": call_text or "",
                "tool_calls": assistant_tool_calls,
            })

            # Exécution des outils, un à un, étapes visibles côté client.
            for tc in tool_calls:
                name = tc.get("function", "")
                args = tc.get("arguments", {})
                label = _tool_label(name, args)
                yield {"type": "tool_start", "id": tc["id"], "name": name, "label": label}

                result = async_to_sync(self.registry.call)(name, args, user_ctx)
                all_tool_results.append({"tool_call_id": tc["id"], "function": name, "result": result})

                # Confirmation requise -> on suspend la boucle et on rend la main.
                pending = self._maybe_pending_action(name, args, result)
                if pending is not None:
                    from apps.ai_assistant.services.confirmation import issue_token
                    token = issue_token(pending)
                    steps.append({
                        "kind": "tool", "name": name, "label": label,
                        "success": True, "summary": "Confirmation requise",
                    })
                    yield {"type": "tool_result", "id": tc["id"], "name": name,
                           "success": True, "summary": "Confirmation requise"}
                    yield final(pending.summary, pending_action=pending.to_frontend(token))
                    return

                summary = _tool_result_summary(result)
                success = bool(result.get("success"))
                steps.append({
                    "kind": "tool", "name": name, "label": label,
                    "success": success, "summary": summary,
                })
                yield {"type": "tool_result", "id": tc["id"], "name": name,
                       "success": success, "summary": summary}

                for chart in _extract_chart(result):
                    all_charts.append(chart)
                    yield {"type": "chart", "chart": chart}

                messages.append({
                    "role": "tool",
                    "name": name,
                    "tool_call_id": tc["id"],
                    "content": _tool_message_content(result),
                })

            yield {"type": "status", "message": "Analyse des résultats"}

        # AGENT_MAX_STEPS épuisé sans synthèse : repli déterministe.
        reply = _deterministic_summary(all_tool_results)
        yield {"type": "text_delta", "content": reply}
        yield final(reply)

    # --------------------------------------------------------- confirmation
    async def run_confirmation(
        self,
        token: str,
        choice: str,
        user_ctx: Dict[str, Any],
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> OrchestratorResult:
        """Ré-exécute une action confirmée à partir d'un token signé + un choix."""
        from apps.ai_assistant.services.confirmation import resolve_token

        resolved = resolve_token(token, choice)
        if resolved is None:
            return OrchestratorResult(
                reply="Cette demande de confirmation a expiré. Pouvez-vous reformuler votre demande ?",
                success=False,
            )

        if resolved.get("cancelled"):
            return OrchestratorResult(reply="Opération annulée.", success=True)

        params = {**resolved["params"], **(extra_params or {})}
        result = await self.registry.call(resolved["action"], params, user_ctx)

        tool_results = [{"function": resolved["action"], "result": result}]
        charts = _extract_chart(result) or []

        if result.get("success"):
            reply = result.get("message") or "Action exécutée avec succès."
        else:
            reply = f"L'action n'a pas pu être exécutée : {result.get('error', 'erreur inconnue')}"

        return OrchestratorResult(
            reply=reply, tool_results=tool_results, charts=charts, success=result.get("success", False),
        )

    # ------------------------------------------------------------- helpers
    def _build_messages(self, message, history, page, agent_mode=False):
        system = self._system_prompt(page)
        if agent_mode:
            system += AGENT_PROMPT_ADDENDUM
        msgs = [{"role": "system", "content": system}]
        for m in _compress_history(history):
            entry = {"role": m.get("role", "user"), "content": m.get("content") or ""}
            msgs.append(entry)
        msgs.append({"role": "user", "content": message})
        return msgs

    async def _try_stats_shortcut(self, message, user) -> Optional[str]:
        if user is None:
            return None
        try:
            from asgiref.sync import sync_to_async
            from apps.ai_assistant.services.stats_response_service import StatsResponseService
            if not StatsResponseService.is_stats_request(message):
                return None
            return await sync_to_async(StatsResponseService.generate_stats_response)(message, user)
        except Exception as exc:  # pragma: no cover - robustesse
            logger.warning("Court-circuit stats indisponible : %s", exc)
            return None

    def _try_stats_shortcut_sync(self, message, user) -> Optional[str]:
        """Variante synchrone du court-circuit stats (pour run_stream)."""
        if user is None:
            return None
        try:
            from apps.ai_assistant.services.stats_response_service import StatsResponseService
            if not StatsResponseService.is_stats_request(message):
                return None
            return StatsResponseService.generate_stats_response(message, user)
        except Exception as exc:  # pragma: no cover - robustesse
            logger.warning("Court-circuit stats indisponible : %s", exc)
            return None

    def _maybe_pending_action(self, name, args, result):
        """Détecte les deux formes de confirmation renvoyées par les handlers."""
        if result.get("success"):
            return None

        from apps.ai_assistant.services.confirmation import build_creation_confirmation

        entity_type = result.get("entity_type")

        # Forme 1 : confirmation simple (force_create absent).
        if result.get("needs_confirmation"):
            return build_creation_confirmation(name, args, entity_type, similar=None)

        # Forme 2 : doublons détectés.
        if result.get("error") == "similar_entities_found":
            return build_creation_confirmation(
                name, args, entity_type, similar=result.get("similar_entities", [])
            )

        return None

    async def _synthesize(self, base_messages, first, tool_results):
        """Appel 2 : produire la réponse finale à partir des données récupérées."""
        # Construire le contexte : message assistant (tool_calls) + messages 'tool'.
        synthesis_messages = list(base_messages)
        synthesis_messages.append({
            "role": "assistant",
            "content": first.get("content") or "",
        })
        # Résumé compact et lisible des résultats pour le LLM.
        results_blob = _format_results_for_llm(tool_results)
        synthesis_messages.append({
            "role": "user",
            "content": (
                "Voici les données récupérées via les outils. Réponds à ma demande "
                "précédente en te basant UNIQUEMENT sur ces données, de façon claire "
                "et concise :\n\n" + results_blob
            ),
        })

        second = await _acomplete(self.provider, synthesis_messages, tools=None)
        if second.get("circuit_open") or not second.get("success") or not second.get("content"):
            # Fallback déterministe : la réponse reste correcte sans le 2e LLM.
            return _deterministic_summary(tool_results), second.get("usage", {}).get("total_tokens", 0)

        return second["content"], second["usage"]["total_tokens"]


# ----------------------------------------------------------------- module utils
def _page_hint(page: Optional[str]) -> str:
    if not page:
        return ""
    for prefix, hint in PAGE_HINTS.items():
        if page.startswith(prefix):
            return hint
    return ""


def _compress_history(history: List[Dict[str, Any]], max_recent: int = 8) -> List[Dict[str, Any]]:
    """Garde les messages récents (réutilise l'esprit de _compress_conversation_history)."""
    if len(history) <= max_recent:
        return history
    return history[-max_recent:]


def _extract_chart(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extrait les spécifications de graphique d'un résultat d'outil.

    Contrat préservé : les charts vivent dans result['data'], soit directement
    ({chart_type, chart_data, chart_config}), soit dans data['charts'] (liste).
    """
    if not isinstance(result, dict):
        return []
    data = result.get("data")
    if not isinstance(data, dict):
        return []
    charts = []
    if data.get("chart_type") and data.get("chart_data") is not None:
        charts.append({
            "chart_type": data.get("chart_type"),
            "chart_title": data.get("chart_title", ""),
            "chart_data": data.get("chart_data"),
            "chart_config": data.get("chart_config", {}),
        })
    if isinstance(data.get("charts"), list):
        for c in data["charts"]:
            if isinstance(c, dict) and c.get("chart_type"):
                charts.append(c)
    return charts


def _tool_message_content(result: Dict[str, Any], max_chars: int = 3000) -> str:
    """Sérialise un résultat d'outil pour un message role='tool' (compact).

    Même esprit que _format_results_for_llm : on transmet message + données
    tronquées, pas les chart_data volumineux (déjà envoyés au front).
    """
    import json
    payload = {
        "success": result.get("success"),
        "message": result.get("message"),
        "data": _truncate_data(result.get("data")),
        "error": result.get("error"),
    }
    return json.dumps(payload, ensure_ascii=False, default=str)[:max_chars]


def _format_results_for_llm(tool_results: List[Dict[str, Any]]) -> str:
    import json
    lines = []
    for tr in tool_results:
        fn = tr.get("function", "?")
        res = tr.get("result", {})
        ok = res.get("success")
        # On transmet le message + les données (tronquées) — pas les specs de chart
        # volumineuses qui sont déjà gérées côté front.
        payload = {
            "success": ok,
            "message": res.get("message"),
            "data": _truncate_data(res.get("data")),
            "error": res.get("error"),
        }
        lines.append(f"[{fn}] " + json.dumps(payload, ensure_ascii=False, default=str)[:2000])
    return "\n".join(lines)


def _truncate_data(data, max_items: int = 20):
    """Évite d'envoyer des payloads énormes (et retire les chart_data lourds)."""
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if k in ("chart_data", "chart_config"):
                out[k] = "<chart>"
            elif isinstance(v, list):
                out[k] = v[:max_items]
            else:
                out[k] = v
        return out
    if isinstance(data, list):
        return data[:max_items]
    return data


def _deterministic_summary(tool_results: List[Dict[str, Any]]) -> str:
    """Résumé de repli si l'appel 2 (synthèse) est indisponible."""
    parts = []
    for tr in tool_results:
        fn = tr.get("function", "")
        res = tr.get("result", {})
        if res.get("success"):
            parts.append("✓ " + (res.get("message") or _ACTION_LABELS.get(fn, f"{fn} exécuté")))
        else:
            parts.append("✗ " + (res.get("error") or f"échec de {fn}"))
    return "\n".join(parts) if parts else "Aucune donnée n'a pu être récupérée."


async def _acomplete(provider, messages, tools=None, tool_choice="auto"):
    """Appelle provider.complete dans un thread (le SDK Mistral est synchrone)."""
    from asgiref.sync import sync_to_async
    return await sync_to_async(provider.complete)(
        messages=messages, tools=tools, tool_choice=tool_choice
    )


# Instance partagée (légère ; provider/registry construits paresseusement).
def get_orchestrator() -> Orchestrator:
    return Orchestrator()
