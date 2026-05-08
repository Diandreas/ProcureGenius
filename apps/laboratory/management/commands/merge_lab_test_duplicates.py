"""
Détecte et fusionne les doublons de LabTest dans le catalogue.

Les doublons sont détectés par normalisation du nom (lower, strip accents,
strip espaces multiples). Pour chaque groupe de doublons, on conserve le
LabTest avec le plus de LabOrderItem associés (l'historique le plus riche),
et on réassigne toutes les références des autres LabTest vers celui-ci avant
de les supprimer.

Usage:
    python manage.py merge_lab_test_duplicates --dry-run
    python manage.py merge_lab_test_duplicates --organization <UUID>
    python manage.py merge_lab_test_duplicates --apply
    python manage.py merge_lab_test_duplicates --names "Électrophorèse de l'hémoglobine,Hémoglobine glyquée,Ionogramme complet,Ionogramme simple"
"""
import re
import unicodedata
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.laboratory.models import (
    LabTest,
    LabTestConsumable,
    LabTestParameter,
    LabTestPanel,
    LabOrderItem,
    SubcontractorPrice,
    SubcontractorDefaultPrice,
)


def normalize_name(name: str) -> str:
    """Normalise un nom pour comparaison: minuscule, sans accents, espaces simples."""
    if not name:
        return ''
    nfkd = unicodedata.normalize('NFKD', name)
    no_accents = ''.join(c for c in nfkd if not unicodedata.combining(c))
    lowered = no_accents.lower().strip()
    collapsed = re.sub(r'\s+', ' ', lowered)
    # Strip ponctuation non significative
    cleaned = re.sub(r"[\.,;:!\?\"'`´]", '', collapsed)
    return cleaned


class Command(BaseCommand):
    help = "Détecte et fusionne les LabTest dupliqués (par nom normalisé) au sein de chaque organisation."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=True,
            help="N'effectue aucune modification — affiche uniquement le rapport (défaut)."
        )
        parser.add_argument(
            '--apply',
            action='store_true',
            default=False,
            help="Applique réellement la fusion (désactive --dry-run)."
        )
        parser.add_argument(
            '--organization',
            type=str,
            default=None,
            help="UUID de l'organisation à traiter (par défaut: toutes)."
        )
        parser.add_argument(
            '--names',
            type=str,
            default=None,
            help="Limite la fusion aux groupes dont le nom normalisé matche un des noms fournis (séparés par virgule)."
        )

    def handle(self, *args, **opts):
        dry_run = not opts['apply']
        org_filter = opts['organization']
        name_filter = opts['names']
        targeted_norms = None
        if name_filter:
            targeted_norms = {normalize_name(n) for n in name_filter.split(',') if n.strip()}

        qs = LabTest.objects.all()
        if org_filter:
            qs = qs.filter(organization_id=org_filter)

        # Regrouper par (organization_id, nom_normalisé)
        groups = defaultdict(list)
        for test in qs.iterator():
            key = (str(test.organization_id), normalize_name(test.name))
            groups[key].append(test)

        # Filtrer les groupes ayant >1 entrée
        duplicates = {k: v for k, v in groups.items() if len(v) > 1}

        if targeted_norms:
            duplicates = {k: v for k, v in duplicates.items() if k[1] in targeted_norms}

        if not duplicates:
            self.stdout.write(self.style.SUCCESS("Aucun doublon détecté."))
            return

        self.stdout.write(self.style.WARNING(
            f"{len(duplicates)} groupe(s) de doublons détecté(s)."
        ))
        if dry_run:
            self.stdout.write(self.style.NOTICE(
                "[DRY-RUN] Aucune modification ne sera appliquée. Utilisez --apply pour exécuter."
            ))

        total_merged = 0
        for (org_id, norm_name), tests in duplicates.items():
            # Choisir le "gagnant": celui avec le plus de LabOrderItem
            tests_with_count = [
                (t, LabOrderItem.objects.filter(lab_test=t).count())
                for t in tests
            ]
            tests_with_count.sort(key=lambda x: (-x[1], x[0].created_at))
            primary, primary_count = tests_with_count[0]
            secondaries = [t for t, _ in tests_with_count[1:]]

            self.stdout.write("")
            self.stdout.write(self.style.HTTP_INFO(
                f"Groupe '{norm_name}' (org={org_id}) — {len(tests)} entrées:"
            ))
            self.stdout.write(
                f"  ✓ KEEP   {primary.test_code:<20} | {primary.name} "
                f"(id={primary.id}, {primary_count} commandes)"
            )
            for sec in secondaries:
                sec_count = LabOrderItem.objects.filter(lab_test=sec).count()
                self.stdout.write(
                    f"  ✗ MERGE  {sec.test_code:<20} | {sec.name} "
                    f"(id={sec.id}, {sec_count} commandes)"
                )

            if not dry_run:
                with transaction.atomic():
                    for sec in secondaries:
                        self._merge_secondary_into_primary(primary, sec)
                        total_merged += 1

        if dry_run:
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE(
                f"[DRY-RUN] {sum(len(v)-1 for v in duplicates.values())} test(s) seraient fusionnés. "
                "Relancez avec --apply pour exécuter."
            ))
        else:
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(
                f"{total_merged} test(s) fusionnés et supprimés avec succès."
            ))

    def _merge_secondary_into_primary(self, primary: LabTest, secondary: LabTest):
        """Réassigne toutes les références FK/M2M de `secondary` vers `primary`, puis supprime `secondary`."""
        # 1. LabOrderItem (FK PROTECT) — réassigner
        LabOrderItem.objects.filter(lab_test=secondary).update(lab_test=primary)

        # 2. LabTestConsumable (FK CASCADE) — fusionner par produit
        for consumable in LabTestConsumable.objects.filter(lab_test=secondary):
            existing = LabTestConsumable.objects.filter(
                lab_test=primary, product=consumable.product
            ).first()
            if existing:
                # Garder la plus haute quantity_per_test
                if consumable.quantity_per_test > existing.quantity_per_test:
                    existing.quantity_per_test = consumable.quantity_per_test
                    existing.save()
                consumable.delete()
            else:
                consumable.lab_test = primary
                consumable.save()

        # 3. LabTestParameter (FK CASCADE) — déplacer si pas déjà sur primary
        for param in LabTestParameter.objects.filter(test=secondary):
            existing = LabTestParameter.objects.filter(
                test=primary, code=param.code
            ).first()
            if existing:
                param.delete()  # primary a déjà ce paramètre
            else:
                param.test = primary
                param.save()

        # 4. SubcontractorPrice (FK CASCADE) — fusionner par sous-traitant
        for sp in SubcontractorPrice.objects.filter(lab_test=secondary):
            existing = SubcontractorPrice.objects.filter(
                subcontractor=sp.subcontractor, lab_test=primary
            ).first()
            if existing:
                sp.delete()  # garder le primary
            else:
                sp.lab_test = primary
                sp.save()

        # 5. SubcontractorDefaultPrice (FK CASCADE) — fusionner par organisation
        for sdp in SubcontractorDefaultPrice.objects.filter(lab_test=secondary):
            existing = SubcontractorDefaultPrice.objects.filter(
                organization=sdp.organization, lab_test=primary
            ).first()
            if existing:
                sdp.delete()
            else:
                sdp.lab_test = primary
                sdp.save()

        # 6. LabTestPanel.tests (M2M) — swap references
        for panel in LabTestPanel.objects.filter(tests=secondary):
            panel.tests.remove(secondary)
            panel.tests.add(primary)

        # 7. Suppression du secondary (toutes les références ont été déplacées)
        secondary_id = secondary.id
        secondary.delete()
        self.stdout.write(self.style.SUCCESS(
            f"  → fusionné {secondary_id} dans {primary.id}"
        ))
