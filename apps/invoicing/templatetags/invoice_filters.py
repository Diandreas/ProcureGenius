from django import template

register = template.Library()


@register.filter
def mul(value, arg):
    """Multiplie deux valeurs"""
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return 0


@register.filter
def div(value, arg):
    """Divise deux valeurs"""
    try:
        return float(value) / float(arg) if float(arg) != 0 else 0
    except (ValueError, TypeError, ZeroDivisionError):
        return 0
