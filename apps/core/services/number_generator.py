"""
Centralized service for generating sequential numbers across the application.

This service provides a consistent way to generate unique sequential numbers
with format: PREFIX-YYYYMMDD-XXXX for various entities like consultations,
prescriptions, lab orders, etc.
"""
from django.utils import timezone


class NumberGeneratorService:
    """Service centralisé pour générer des numéros séquentiels"""

    @staticmethod
    def generate_number(prefix, organization, model_class, field_name='number'):
        """
        Génère un numéro unique avec format: PREFIX-YYYYMMDD-XXXX

        Args:
            prefix (str): Préfixe du numéro (ex: 'CONS', 'RX', 'LAB', 'DISP')
            organization: Instance de l'organisation
            model_class: Classe du modèle Django
            field_name (str): Nom du champ contenant le numéro (défaut: 'number')

        Returns:
            str: Numéro généré au format PREFIX-YYYYMMDD-XXXX

        Example:
            >>> from apps.consultations.models import Consultation
            >>> number = NumberGeneratorService.generate_number(
            ...     prefix='CONS',
            ...     organization=org,
            ...     model_class=Consultation,
            ...     field_name='consultation_number'
            ... )
            >>> print(number)
            'CONS-20260208-0001'
        """
        today = timezone.now().strftime('%Y%m%d')
        prefix_with_date = f"{prefix}-{today}"

        # Build filter kwargs dynamically
        filter_kwargs = {
            'organization': organization,
            f'{field_name}__startswith': prefix_with_date
        }

        # Get the last record with this prefix and date
        last_record = (model_class.objects
                      .filter(**filter_kwargs)
                      .order_by(f'-{field_name}')
                      .first())

        if last_record:
            # Extract the sequence number from the last record
            last_number = getattr(last_record, field_name).split('-')[-1]
            new_sequence = int(last_number) + 1
        else:
            # First record for this date
            new_sequence = 1

        # Format: PREFIX-YYYYMMDD-XXXX (4 digits with leading zeros)
        return f"{prefix_with_date}-{new_sequence:04d}"

    @staticmethod
    def generate_patient_number(organization, model_class, field_name='patient_number'):
        """
        Génère un numéro de patient unique avec format: PAT-XXXXXXX

        Args:
            organization: Instance de l'organisation
            model_class: Classe du modèle Django (Client/Patient)
            field_name (str): Nom du champ contenant le numéro

        Returns:
            str: Numéro de patient au format PAT-XXXXXXX

        Example:
            >>> from apps.accounts.models import Client
            >>> number = NumberGeneratorService.generate_patient_number(
            ...     organization=org,
            ...     model_class=Client
            ... )
            >>> print(number)
            'PAT-0000001'
        """
        prefix = 'PAT'

        # Build filter kwargs
        filter_kwargs = {
            'organization': organization,
            f'{field_name}__startswith': prefix
        }

        # Get the last patient number
        last_record = (model_class.objects
                      .filter(**filter_kwargs)
                      .order_by(f'-{field_name}')
                      .first())

        if last_record:
            # Extract the sequence number
            last_number = getattr(last_record, field_name).split('-')[-1]
            new_sequence = int(last_number) + 1
        else:
            # First patient
            new_sequence = 1

        # Format: PAT-XXXXXXX (7 digits with leading zeros)
        return f"{prefix}-{new_sequence:07d}"
