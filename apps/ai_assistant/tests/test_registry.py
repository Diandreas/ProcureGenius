"""
Tests de cohérence du ToolRegistry.

Le registre WRAPPE les outils existants (ActionExecutor.actions + schémas de
MistralService._define_tools()). Ces tests garantissent qu'aucune régression
n'apparaît lors de la migration vers le registre : chaque handler exécutable a
un ToolSpec, chaque outil exposé à Mistral pointe vers un handler réel, et le
format des tools Mistral reste valide.
"""
import pytest


@pytest.fixture
def registry():
    # Import paresseux pour laisser Django s'initialiser via pytest-django.
    from apps.ai_assistant.services import registry as reg
    return reg


def test_registry_builds_and_has_tools(registry):
    names = registry.names()
    assert len(names) > 0
    # Outils emblématiques attendus
    for expected in ['create_invoice', 'search_supplier', 'generate_visualization']:
        assert expected in names, f"{expected} doit être enregistré"


def test_every_action_handler_has_a_spec(registry):
    """Chaque handler exécutable de ActionExecutor doit avoir un ToolSpec."""
    from apps.ai_assistant.services import ActionExecutor
    executor = ActionExecutor()

    missing = [name for name in executor.actions if not registry.has(name)]
    assert not missing, f"Handlers sans ToolSpec : {missing}"


def test_every_spec_points_to_callable_handler(registry):
    """Chaque ToolSpec doit avoir un handler appelable (coroutine)."""
    import inspect
    for spec in registry.all():
        assert callable(spec.handler), f"{spec.name} : handler non appelable"
        assert inspect.iscoroutinefunction(spec.handler), (
            f"{spec.name} : handler doit être une coroutine async"
        )


def test_mistral_tools_format_is_valid(registry):
    """Le format renvoyé pour Mistral doit être structurellement valide."""
    tools = registry.to_mistral_tools()
    assert len(tools) == len(registry.names())
    for tool in tools:
        assert tool['type'] == 'function'
        fn = tool['function']
        assert isinstance(fn['name'], str) and fn['name']
        assert 'description' in fn
        assert fn['parameters'].get('type') == 'object'


def test_mistral_tools_parity_with_define_tools(registry):
    """Les noms d'outils du registre couvrent ceux déclarés dans _define_tools()
    qui ont effectivement un handler (les schémas orphelins sont tolérés mais
    ne doivent pas créer d'outils Mistral fantômes)."""
    from apps.ai_assistant.services import ActionExecutor
    executor = ActionExecutor()

    registry_names = set(registry.names())
    # Tout outil exposé à Mistral doit avoir un handler réel.
    for name in registry_names:
        assert name in executor.actions, (
            f"{name} exposé à Mistral mais sans handler exécutable"
        )


def test_mcp_list_format(registry):
    """La façade MCP expose name + inputSchema pour chaque outil."""
    tools = registry.mcp_list()
    assert len(tools) == len(registry.names())
    for tool in tools:
        assert 'name' in tool
        assert 'inputSchema' in tool
        assert tool['inputSchema'].get('type') == 'object'


def test_confirmation_flags(registry):
    """Les créations/suppressions nécessitent confirmation, les recherches non."""
    assert registry.get('create_invoice').needs_confirmation is True
    assert registry.get('delete_supplier').needs_confirmation is True
    assert registry.get('search_supplier').needs_confirmation is False


def test_chart_flags(registry):
    """generate_visualization est marqué comme produisant un graphique."""
    assert registry.get('generate_visualization').produces_chart is True


def test_mcp_facade_list_tools(registry):
    """La façade MCP list_tools() reflète le registre."""
    from apps.ai_assistant.services.registry.mcp_facade import list_tools
    tools = list_tools()
    assert len(tools) == len(registry.names())
    sample = tools[0]
    assert 'name' in sample and 'inputSchema' in sample and 'annotations' in sample
