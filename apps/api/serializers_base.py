"""
Serializers de base avec conversion automatique camelCase ↔ snake_case
"""
from rest_framework import serializers
import re


def snake_to_camel(snake_str):
    """Convertit snake_case en camelCase"""
    if not snake_str:
        return snake_str

    # Ne pas convertir les champs spéciaux qui contiennent des underscores au début
    if snake_str.startswith('_'):
        return snake_str

    components = snake_str.split('_')
    # Premier composant reste en minuscule, les autres avec majuscule
    return components[0] + ''.join(x.title() for x in components[1:])


def camel_to_snake(camel_str):
    """Convertit camelCase en snake_case"""
    if not camel_str:
        return camel_str

    # Ne pas convertir les champs spéciaux
    if camel_str.startswith('_'):
        return camel_str

    # Insère un underscore avant chaque majuscule et convertit en minuscules
    snake_str = re.sub('([A-Z])', r'_\1', camel_str)
    return snake_str.lower().lstrip('_')


class CamelCaseSerializer(serializers.ModelSerializer):
    """
    Serializer de base qui convertit automatiquement:
    - snake_case (backend/database) → camelCase (frontend/API)
    - camelCase (frontend/API) → snake_case (backend/database)
    """

    def to_representation(self, instance):
        """Convertit les noms de champs de snake_case en camelCase pour le frontend"""
        data = super().to_representation(instance)

        # Convertir tous les champs en camelCase
        camel_case_data = {}
        for key, value in data.items():
            camel_key = snake_to_camel(key)
            camel_case_data[camel_key] = value

        return camel_case_data

    def to_internal_value(self, data):
        """Convertit les noms de champs de camelCase en snake_case pour le backend"""
        # Convertir tous les champs en snake_case
        snake_case_data = {}
        for key, value in data.items():
            snake_key = camel_to_snake(key)
            snake_case_data[snake_key] = value

        return super().to_internal_value(snake_case_data)


class CamelCaseSerializerMixin:
    """
    Mixin pour ajouter la conversion camelCase ↔ snake_case à n'importe quel serializer

    Usage:
        class MySerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
            class Meta:
                model = MyModel
                fields = '__all__'
    """

    def to_representation(self, instance):
        """Convertit les noms de champs de snake_case en camelCase pour le frontend"""
        data = super().to_representation(instance)

        # Convertir tous les champs en camelCase
        camel_case_data = {}
        for key, value in data.items():
            camel_key = snake_to_camel(key)
            camel_case_data[camel_key] = value

        return camel_case_data

    def to_internal_value(self, data):
        """Convertit les noms de champs de camelCase en snake_case pour le backend"""
        # Convertir tous les champs en snake_case
        snake_case_data = {}
        for key, value in data.items():
            snake_key = camel_to_snake(key)
            snake_case_data[snake_key] = value

        return super().to_internal_value(snake_case_data)
