"""
Patient merge service — Reassigns all related records from a secondary
patient to a primary patient, then soft-deletes the secondary.

Usage:
    from apps.patients.services import merge_patients
    result = merge_patients(primary_id, secondary_id, user, dry_run=False)
"""
import logging
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

# All (model_path, fk_field) pairs that reference accounts.Client as patient/client
_RELATED_MODELS = [
    # Invoicing
    ('apps.invoicing.models', 'Invoice', 'client'),
    # Laboratory
    ('apps.laboratory.models', 'LabOrder', 'patient'),
    ('apps.laboratory.models', 'LabOrder', 'client'),
    # Consultations
    ('apps.consultations.models', 'Consultation', 'patient'),
    ('apps.consultations.models', 'Prescription', 'patient'),
    # Patients sub-models
    ('apps.patients.models', 'PatientVisit', 'patient'),
    ('apps.patients.models_care', 'PatientCare', 'patient'),
    ('apps.patients.models_documents', 'PatientDocument', 'patient'),
    ('apps.patients.models_followup', 'PatientFollowup', 'patient'),
    # Pharmacy
    ('apps.pharmacy.models', 'PharmacyDispensing', 'patient'),
]


def _import_model(module_path, class_name):
    """Dynamically import a model class."""
    import importlib
    mod = importlib.import_module(module_path)
    return getattr(mod, class_name, None)


def merge_patients(primary_id, secondary_id, user=None, dry_run=False):
    """
    Merge two patient records: move all related data from secondary → primary,
    then soft-delete the secondary patient.

    Args:
        primary_id: UUID of the patient to keep
        secondary_id: UUID of the patient to merge into primary
        user: The user performing the merge (for audit logging)
        dry_run: If True, only report what would change without committing

    Returns:
        dict with merge summary
    """
    from apps.accounts.models import Client

    primary = Client.objects.get(id=primary_id)
    secondary = Client.objects.get(id=secondary_id)

    if primary.id == secondary.id:
        raise ValueError("Cannot merge a patient with itself.")

    if primary.organization_id != secondary.organization_id:
        raise ValueError("Cannot merge patients from different organizations.")

    summary = {
        'primary': {'id': str(primary.id), 'name': primary.name},
        'secondary': {'id': str(secondary.id), 'name': secondary.name},
        'reassigned': {},
        'dry_run': dry_run,
    }

    with transaction.atomic():
        for module_path, class_name, fk_field in _RELATED_MODELS:
            model_cls = _import_model(module_path, class_name)
            if model_cls is None:
                logger.warning(f"Model {module_path}.{class_name} not found, skipping.")
                continue

            qs = model_cls.objects.filter(**{fk_field: secondary})
            count = qs.count()
            if count > 0:
                label = f"{class_name}.{fk_field}"
                summary['reassigned'][label] = count
                logger.info(f"[merge_patients] {'DRY-RUN ' if dry_run else ''}Reassigning {count} {label} records")

                if not dry_run:
                    qs.update(**{fk_field: primary})

        # Soft-delete secondary patient
        if not dry_run:
            secondary.is_active = False
            secondary.name = f"[FUSIONNÉ → {primary.name}] {secondary.name}"
            secondary.save(update_fields=['is_active', 'name', 'updated_at'])
            logger.info(f"[merge_patients] Secondary patient {secondary.id} soft-deleted.")

        # Merge notes / special fields
        if not dry_run:
            notes_parts = []
            if primary.notes:
                notes_parts.append(primary.notes)
            notes_parts.append(
                f"--- Fusionné le {timezone.now().strftime('%d/%m/%Y %H:%M')} "
                f"avec {secondary.name} (ID: {secondary.id}) ---"
            )
            if secondary.notes:
                notes_parts.append(secondary.notes)
            primary.notes = "\n".join(notes_parts)

            # Merge phone / email if primary is missing them
            if not primary.phone and secondary.phone:
                primary.phone = secondary.phone
            if not primary.email and secondary.email:
                primary.email = secondary.email
            if not primary.address and secondary.address:
                primary.address = secondary.address

            primary.save()
            logger.info(f"[merge_patients] Primary patient {primary.id} updated with merged data.")

        if dry_run:
            # Rollback the atomic block
            transaction.set_rollback(True)

    total_reassigned = sum(summary['reassigned'].values())
    summary['total_reassigned'] = total_reassigned

    logger.info(
        f"[merge_patients] {'DRY-RUN: ' if dry_run else ''}Merge complete. "
        f"{total_reassigned} records reassigned from {secondary.name} → {primary.name}"
    )

    return summary
