"""
Validation des parametres d'outils retournes par Mistral.
Previent les erreurs dues aux hallucinations de types/parametres.
"""
import logging
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)

# Types attendus par parametre pour les outils principaux
# Format: {function_name: {param_name: {'type': str, 'required': bool}}}
TOOL_PARAM_SCHEMAS = {
    'create_supplier': {
        'name': {'type': 'string', 'required': True},
        'email': {'type': 'string', 'required': False},
        'phone': {'type': 'string', 'required': False},
        'address': {'type': 'string', 'required': False},
        'contact_person': {'type': 'string', 'required': False},
    },
    'create_client': {
        'name': {'type': 'string', 'required': True},
        'email': {'type': 'string', 'required': False},
        'phone': {'type': 'string', 'required': False},
        'address': {'type': 'string', 'required': False},
    },
    'create_invoice': {
        'client_name': {'type': 'string', 'required': True},
        'title': {'type': 'string', 'required': False},
        'due_date': {'type': 'string', 'required': False},
        'items': {'type': 'array', 'required': False},
    },
    'create_purchase_order': {
        'supplier_name': {'type': 'string', 'required': True},
        'title': {'type': 'string', 'required': False},
        'expected_delivery_date': {'type': 'string', 'required': False},
        'items': {'type': 'array', 'required': False},
    },
    'create_product': {
        'name': {'type': 'string', 'required': True},
        'reference': {'type': 'string', 'required': False},
        'price': {'type': 'number', 'required': False},
        'stock_quantity': {'type': 'number', 'required': False},
    },
    'adjust_stock': {
        'product_name': {'type': 'string', 'required': True},
        'quantity': {'type': 'number', 'required': True},
        'reason': {'type': 'string', 'required': False},
    },
    'update_supplier': {
        'name': {'type': 'string', 'required': True},
        'updates': {'type': 'object', 'required': True},
    },
    'update_client': {
        'name': {'type': 'string', 'required': True},
        'updates': {'type': 'object', 'required': True},
    },
    'update_invoice': {
        'invoice_number': {'type': 'string', 'required': True},
        'updates': {'type': 'object', 'required': False},
    },
    'update_purchase_order': {
        'po_number': {'type': 'string', 'required': True},
        'updates': {'type': 'object', 'required': False},
    },
    'analyze_business': {
        'focus_area': {'type': 'string', 'required': False},
        'include_charts': {'type': 'boolean', 'required': False},
        'priority_threshold': {'type': 'number', 'required': False},
    },
    'get_statistics': {
        'categories': {'type': 'array', 'required': False},
        'period': {'type': 'string', 'required': False},
        'include_charts': {'type': 'boolean', 'required': False},
    },
    'explain_accounting_concept': {
        'concept': {'type': 'string', 'required': True},
        'context': {'type': 'string', 'required': False},
    },
    'suggest_journal_entry': {
        'situation': {'type': 'string', 'required': True},
        'amount': {'type': 'number', 'required': False},
    },
    'get_accounting_summary': {
        'period': {'type': 'string', 'required': False},
    },
    'get_accounting_help': {
        'task': {'type': 'string', 'required': True},
    },
    'get_account_list': {
        'filter': {'type': 'string', 'required': False},
        'search': {'type': 'string', 'required': False},
    },
    'create_journal_entry': {
        'journal_code': {'type': 'string', 'required': True},
        'date': {'type': 'string', 'required': False},
        'description': {'type': 'string', 'required': True},
        'reference': {'type': 'string', 'required': False},
        'lines': {'type': 'array', 'required': True},
        'post_immediately': {'type': 'boolean', 'required': False},
    },
}


def _coerce_value(value, expected_type):
    """Tente de convertir une valeur au type attendu."""
    if value is None:
        return None

    if expected_type == 'string':
        return str(value)

    if expected_type == 'number':
        if isinstance(value, (int, float, Decimal)):
            return value
        if isinstance(value, str):
            try:
                # Essayer int d'abord, puis float
                cleaned = value.replace(',', '.').replace(' ', '')
                if '.' in cleaned:
                    return float(cleaned)
                return int(cleaned)
            except (ValueError, InvalidOperation):
                return None
        return None

    if expected_type == 'boolean':
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'yes', 'oui')
        return bool(value)

    if expected_type in ('array', 'object'):
        return value  # Pas de coercion pour les types complexes

    return value


def validate_tool_params(function_name, arguments):
    """
    Valide et nettoie les parametres d'un appel d'outil.

    Returns:
        (is_valid, cleaned_params, errors)
    """
    schema = TOOL_PARAM_SCHEMAS.get(function_name)
    if not schema:
        # Pas de schema defini pour cet outil — laisser passer
        return True, arguments, []

    errors = []
    cleaned = {}

    # Verifier les parametres requis
    for param_name, param_schema in schema.items():
        value = arguments.get(param_name)

        if param_schema.get('required') and (value is None or value == ''):
            errors.append(f"Parametre requis manquant: {param_name}")
            continue

        if value is not None:
            coerced = _coerce_value(value, param_schema['type'])
            if coerced is None and value is not None and value != '':
                errors.append(
                    f"Type invalide pour {param_name}: "
                    f"attendu {param_schema['type']}, recu {type(value).__name__}"
                )
                cleaned[param_name] = value  # Garder la valeur originale
            else:
                cleaned[param_name] = coerced

    # Garder les parametres non definis dans le schema (tolerance)
    for key, value in arguments.items():
        if key not in cleaned:
            cleaned[key] = value

    is_valid = len(errors) == 0

    if errors:
        logger.warning(
            f"Tool param validation errors for {function_name}: {errors}",
            extra={'function': function_name, 'errors': errors}
        )

    return is_valid, cleaned, errors
