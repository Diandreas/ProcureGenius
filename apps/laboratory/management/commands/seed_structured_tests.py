"""
Management command to seed structured parameters for all compound lab tests.

Covers: NFS, Coagulation (TP/INR/TCA/Fibrinogène), Bilan lipidique,
        Transaminases (ASAT/ALAT), Ionogramme complet & simple,
        Électrophorèse protéines, Électrophorèse Hémoglobine,
        Spermogramme, Chimie urinaire.

Usage:
    python manage.py seed_structured_tests
    python manage.py seed_structured_tests --overwrite   # Delete & re-create
    python manage.py seed_structured_tests --codes HEM-TP,ION-CS  # Specific codes only
"""
from django.core.management.base import BaseCommand
from apps.laboratory.models import LabTest, LabTestParameter


# ─────────────────────────────────────────────────────────────────────────────
# Parameter catalog
# Each entry: (code, name, group, unit, order, value_type,
#              min_M, max_M, min_F, max_F,
#              min_general, max_general,
#              crit_low, crit_high, decimal_places)
# Use None where no specific range applies.
# ─────────────────────────────────────────────────────────────────────────────

STRUCTURED_TESTS = {

    # ─── NFS ──────────────────────────────────────────────────────────────────
    "HEM-NFS": [
        ("WBC",  "Leucocytes totaux",           "Leucocytes",   "10^9/L",  1, "numeric",  4.00,  10.00,  4.00,  10.00, None, None, 2.00,  30.00, 2),
        ("LYM#", "Lymphocytes (valeur abs.)",   "Leucocytes",   "10^9/L",  2, "numeric",  1.00,   4.00,  1.00,   4.00, None, None, None,  None,  2),
        ("MID#", "Monocytes/Basophiles (abs.)", "Leucocytes",   "10^9/L",  3, "numeric",  0.10,   1.00,  0.10,   1.00, None, None, None,  None,  2),
        ("GRA#", "Granulocytes (valeur abs.)",  "Leucocytes",   "10^9/L",  4, "numeric",  2.00,   7.00,  2.00,   7.00, None, None, None,  None,  2),
        ("LYM%", "Lymphocytes (%)",             "Leucocytes",   "%",       5, "numeric", 20.0,   40.0,  20.0,   40.0, None, None, None,  None,  1),
        ("MID%", "Monocytes/Baso (%)",          "Leucocytes",   "%",       6, "numeric",  2.0,   12.0,   2.0,   12.0, None, None, None,  None,  1),
        ("GRA%", "Granulocytes (%)",            "Leucocytes",   "%",       7, "numeric", 50.0,   70.0,  50.0,   70.0, None, None, None,  None,  1),
        ("RBC",  "Globules rouges",             "Erythrocytes", "10^12/L", 8, "numeric",  4.50,   6.00,  4.00,   5.50, None, None, 2.00,   7.00, 2),
        ("HGB",  "Hémoglobine",                "Erythrocytes", "g/L",     9, "numeric",130.0,  170.0,120.0,  160.0, None, None,70.00, 200.0, 1),
        ("HCT",  "Hématocrite",                "Erythrocytes", "%",      10, "numeric", 40.0,   52.0,  36.0,   47.0, None, None, None,  None,  1),
        ("MCV",  "Volume corpusculaire moyen", "Erythrocytes", "fL",     11, "numeric", 80.0,  100.0,  80.0,  100.0, None, None, None,  None,  1),
        ("MCH",  "Hémoglobine corpusculaire",  "Erythrocytes", "pg",     12, "numeric", 26.0,   34.0,  26.0,   34.0, None, None, None,  None,  1),
        ("MCHC", "Concentration CGMH",         "Erythrocytes", "g/L",    13, "numeric",310.0,  360.0,310.0,  360.0, None, None, None,  None,  0),
        ("RDWc", "Distribution ér. (CV)",      "Erythrocytes", "%",      14, "numeric", 11.7,   14.4,  11.7,   14.4, None, None, None,  None,  1),
        ("RDWs", "Distribution ér. (SD)",      "Erythrocytes", "fL",     15, "numeric", 36.4,   46.3,  36.4,   46.3, None, None, None,  None,  1),
        ("PLT",  "Plaquettes",                 "Plaquettes",   "10^9/L", 16, "numeric",150.0,  400.0,150.0,  400.0, None, None,50.00,1000.0, 0),
        ("MPV",  "Volume plaquettaire moyen",  "Plaquettes",   "fL",     17, "numeric",  7.6,   13.2,   7.6,   13.2, None, None, None,  None,  1),
        ("PDW",  "Distribution plaquettaire",  "Plaquettes",   "%",      18, "numeric",  9.0,   17.0,   9.0,   17.0, None, None, None,  None,  1),
        ("PCT",  "Plaquettocrite",             "Plaquettes",   "%",      19, "numeric",  0.120,  0.212,  0.120,  0.212, None, None, None, None, 3),
        ("PLCC", "Grandes plaquettes (abs.)",  "Plaquettes",   "10^9/L", 20, "numeric", 30.0,   90.0,  30.0,   90.0, None, None, None,  None,  0),
        ("PLCR", "Grandes plaquettes (%)",     "Plaquettes",   "%",      21, "numeric", 13.0,   43.0,  13.0,   43.0, None, None, None,  None,  1),
    ],

    # ─── COAGULATION ─────────────────────────────────────────────────────────
    "HEM-TP": [
        ("TP",    "Taux de Prothrombine",    "Coagulation", "%",     1, "numeric", 70.0, 100.0, 70.0, 100.0, None, None, 40.0,  None, 0),
        ("INR",   "INR",                    "Coagulation", "",       2, "numeric",  0.80,   1.20,  0.80,  1.20, None, None, None,   5.0, 2),
        ("TCA-P", "TCA patient",            "Coagulation", "sec",   3, "numeric", 25.0,  38.0,  25.0,  38.0, None, None, None,   80.0, 1),
        ("TCA-R", "TCA ratio (P/T)",        "Coagulation", "",       4, "numeric",  0.80,   1.20,  0.80,   1.20, None, None, None,   2.5, 2),
        ("FIB",   "Fibrinogène",            "Coagulation", "g/L",   5, "numeric",  2.0,   4.0,   2.0,   4.0, None, None,  1.0,   8.0, 1),
    ],

    # ─── BILAN LIPIDIQUE ─────────────────────────────────────────────────────
    "BIO-BLIP": [
        ("CT",    "Cholestérol Total",  "Bilan Lipidique", "g/L",  1, "numeric", None,  2.00, None,  2.00, None, 2.00, None, 3.50, 2),
        ("HDL",   "Cholestérol HDL",   "Bilan Lipidique", "g/L",  2, "numeric",  0.40,  None,  0.50,  None, None, None, None, None, 2),
        ("LDL",   "Cholestérol LDL",   "Bilan Lipidique", "g/L",  3, "numeric", None,  1.30, None,  1.30, None, 1.30, None, None, 2),
        ("TG",    "Triglycérides",     "Bilan Lipidique", "g/L",  4, "numeric", None,  1.50, None,  1.50, None, 1.50, None, 5.00, 2),
        ("CT-HDL","Rapport CT/HDL",    "Bilan Lipidique", "",      5, "numeric", None,  5.00, None,  4.50, None, None, None, None, 1),
    ],

    # ─── TRANSAMINASES ───────────────────────────────────────────────────────
    "BIO-TRANS": [
        ("ASAT", "ASAT (GOT/SGOT)", "Transaminases", "U/L", 1, "numeric", 10.0,  40.0, 10.0,  35.0, None, None, None, 500.0, 0),
        ("ALAT", "ALAT (GPT/SGPT)", "Transaminases", "U/L", 2, "numeric",  7.0,  56.0,  7.0,  45.0, None, None, None, 500.0, 0),
    ],

    # ─── IONOGRAMME COMPLET ──────────────────────────────────────────────────
    "ION-CS": [
        ("NA",  "Sodium Na+",        "Ionogramme", "mmol/L", 1, "numeric", 136.0, 145.0, 136.0, 145.0, None, None, 120.0, 160.0, 1),
        ("K",   "Potassium K+",      "Ionogramme", "mmol/L", 2, "numeric",   3.5,   5.0,   3.5,   5.0, None, None,   2.5,   6.5, 1),
        ("CL",  "Chlorures Cl-",     "Ionogramme", "mmol/L", 3, "numeric",  96.0, 106.0,  96.0, 106.0, None, None,  80.0, 120.0, 1),
        ("MG",  "Magnésium Mg++",    "Ionogramme", "mmol/L", 4, "numeric",  0.75,  1.00,  0.75,  1.00, None, None,  0.40,   1.5, 2),
        ("CA",  "Calcium Ca++",      "Ionogramme", "mmol/L", 5, "numeric",  2.20,  2.60,  2.20,  2.60, None, None,  1.75,   3.5, 2),
    ],

    # ─── IONOGRAMME SIMPLE ───────────────────────────────────────────────────
    "ION-SIMP": [
        ("NA",  "Sodium Na+",    "Ionogramme", "mmol/L", 1, "numeric", 136.0, 145.0, 136.0, 145.0, None, None, 120.0, 160.0, 1),
        ("K",   "Potassium K+",  "Ionogramme", "mmol/L", 2, "numeric",   3.5,   5.0,   3.5,   5.0, None, None,   2.5,   6.5, 1),
        ("CL",  "Chlorures Cl-", "Ionogramme", "mmol/L", 3, "numeric",  96.0, 106.0,  96.0, 106.0, None, None,  80.0, 120.0, 1),
    ],

    # ─── ÉLECTROPHORÈSE PROTÉINES ────────────────────────────────────────────
    "BIO-ELPROT": [
        ("PROT-T", "Protéines totales",  "Fractions (g/L)", "g/L", 1, "numeric",  64.0,  83.0,  64.0,  83.0, None, None, None, None, 1),
        ("ALB",    "Albumine",           "Fractions (g/L)", "g/L", 2, "numeric",  35.0,  52.0,  35.0,  52.0, None, None, 20.0, None, 1),
        ("A1G",    "Alpha-1 globulines", "Fractions (g/L)", "g/L", 3, "numeric",   1.4,   4.2,   1.4,   4.2, None, None, None, None, 1),
        ("A2G",    "Alpha-2 globulines", "Fractions (g/L)", "g/L", 4, "numeric",   3.9,   8.0,   3.9,   8.0, None, None, None, None, 1),
        ("BG",     "Bêta globulines",    "Fractions (g/L)", "g/L", 5, "numeric",   4.5,  10.0,   4.5,  10.0, None, None, None, None, 1),
        ("GG",     "Gamma globulines",   "Fractions (g/L)", "g/L", 6, "numeric",   6.0,  13.5,   6.0,  13.5, None, None, None, None, 1),
        ("ALB%",   "Albumine (%)",        "Fractions (%)",   "%",  7, "numeric",  55.0,  68.0,  55.0,  68.0, None, None, None, None, 1),
        ("A1G%",   "Alpha-1 (%)",         "Fractions (%)",   "%",  8, "numeric",   1.5,   4.5,   1.5,   4.5, None, None, None, None, 1),
        ("A2G%",   "Alpha-2 (%)",         "Fractions (%)",   "%",  9, "numeric",   7.0,  12.0,   7.0,  12.0, None, None, None, None, 1),
        ("BG%",    "Bêta (%)",            "Fractions (%)",   "%", 10, "numeric",   8.0,  14.0,   8.0,  14.0, None, None, None, None, 1),
        ("GG%",    "Gamma (%)",           "Fractions (%)",   "%", 11, "numeric",  10.0,  20.0,  10.0,  20.0, None, None, None, None, 1),
    ],

    # ─── ÉLECTROPHORÈSE HÉMOGLOBINE ──────────────────────────────────────────
    "HEM-ELPHB": [
        ("HbA",  "HbA (Hémoglobine A)",          "Electrophorèse Hb", "%", 1, "numeric", 95.5, 98.5, 95.5, 98.5, None, None, None, None, 1),
        ("HbA2", "HbA2 (Hémoglobine A2)",         "Electrophorèse Hb", "%", 2, "numeric",  2.0,  3.5,  2.0,  3.5, None, None, None, None, 1),
        ("HbS",  "HbS (Hémoglobine S/Drépanocyte)","Electrophorèse Hb", "%", 3, "numeric",  0.0,  0.5,  0.0,  0.5, None, None, None, None, 1),
        ("HbF",  "HbF (Hémoglobine Fœtale)",      "Electrophorèse Hb", "%", 4, "numeric",  0.0,  2.0,  0.0,  2.0, None, None, None, None, 1),
        ("HbC",  "HbC (Hémoglobine C)",            "Electrophorèse Hb", "%", 5, "numeric",  0.0,  0.5,  0.0,  0.5, None, None, None, None, 1),
    ],

    # ─── SPERMOGRAMME (OMS 2021) ─────────────────────────────────────────────
    "BACT-SPERMO-EXAM": [
        ("SPM-VOL",  "Volume",                    "Macroscopique", "mL",       1, "numeric",  1.4, None,  None, None,  1.4, None, None, None, 1),
        ("SPM-PH",   "pH",                        "Macroscopique", "",          2, "numeric",  7.2,  8.0,  None, None,  7.2,  8.0, None, None, 1),
        ("SPM-CONC", "Concentration",             "Microscopique", "×10^6/mL", 3, "numeric", 16.0, None, None, None, 16.0, None, None, None, 1),
        ("SPM-TOT",  "Nombre total de sptz",       "Microscopique", "×10^6",    4, "numeric", 39.0, None, None, None, 39.0, None, None, None, 0),
        ("SPM-MOB",  "Mobilité totale (PR+NP)",   "Mobilité",      "%",         5, "numeric", 42.0, None, None, None, 42.0, None, None, None, 1),
        ("SPM-MOPP", "Mobilité progressive (PR)", "Mobilité",      "%",         6, "numeric", 30.0, None, None, None, 30.0, None, None, None, 1),
        ("SPM-MORF", "Formes normales (morpho.)", "Morphologie",   "%",         7, "numeric",  4.0, None, None, None,  4.0, None, None, None, 1),
        ("SPM-VIT",  "Vitalité (sptz vivants)",   "Vitalité",      "%",         8, "numeric", 54.0, None, None, None, 54.0, None, None, None, 1),
    ],

    # ─── CHIMIE URINAIRE (BANDELETTE) ────────────────────────────────────────
    "URO-CHIM": [
        ("pH-U",   "pH",              "Chimie urinaire", "",        1, "numeric",  5.0, 8.0,  5.0, 8.0, None, None, None, None, 1),
        ("DENS-U", "Densité",         "Chimie urinaire", "",        2, "numeric",  1.010, 1.030, 1.010, 1.030, None, None, None, None, 3),
        ("PROT-U", "Protéines",       "Chimie urinaire", "mg/L",   3, "text",     None, None, None, None, None, None, None, None, 1),
        ("GLU-U",  "Glucose",         "Chimie urinaire", "",        4, "text",     None, None, None, None, None, None, None, None, 1),
        ("NIT-U",  "Nitrites",        "Chimie urinaire", "",        5, "pos_neg",  None, None, None, None, None, None, None, None, 0),
        ("LCT-U",  "Leucocytes",      "Chimie urinaire", "/mm³",   6, "text",     None, None, None, None, None, None, None, None, 0),
        ("SANG-U", "Sang / Hématies", "Chimie urinaire", "",        7, "text",     None, None, None, None, None, None, None, None, 0),
        ("URO-U",  "Urobilinogène",   "Chimie urinaire", "",        8, "text",     None, None, None, None, None, None, None, None, 0),
        ("BIL-U",  "Bilirubine",      "Chimie urinaire", "",        9, "pos_neg",  None, None, None, None, None, None, None, None, 0),
        ("CET-U",  "Corps cétoniques","Chimie urinaire", "",       10, "text",     None, None, None, None, None, None, None, None, 0),
    ],
}


class Command(BaseCommand):
    help = (
        "Seed structured parameters for compound lab tests "
        "(NFS, Coagulation, Bilan lipidique, Transaminases, Ionogrammes, "
        "Électrophorèses, Spermogramme, Chimie urinaire)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            default=False,
            help="Delete ALL existing parameters for each matched test before re-creating.",
        )
        parser.add_argument(
            '--codes',
            type=str,
            default=None,
            help="Comma-separated list of test_codes to process (e.g. HEM-TP,ION-CS). "
                 "If omitted, all defined tests are processed.",
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        only_codes = [c.strip() for c in options['codes'].split(',')] if options['codes'] else None

        catalog = STRUCTURED_TESTS
        if only_codes:
            catalog = {k: v for k, v in catalog.items() if k in only_codes}
            if not catalog:
                self.stdout.write(self.style.ERROR(f"No matching codes found in catalog. Available: {', '.join(STRUCTURED_TESTS.keys())}"))
                return

        total_created = 0
        total_skipped = 0
        tests_updated = 0

        for test_code, params in catalog.items():
            tests = LabTest.objects.filter(test_code=test_code)
            if not tests.exists():
                self.stdout.write(self.style.WARNING(f"  [NOT FOUND] {test_code} — skipped"))
                continue

            for test in tests:
                self.stdout.write(f"\n[{test_code}] {test.name} (org: {test.organization})")

                if overwrite:
                    deleted_count, _ = test.parameters.all().delete()
                    self.stdout.write(f"  → Deleted {deleted_count} existing parameters")

                created = 0
                skipped = 0

                for entry in params:
                    (code, name, group, unit, order, value_type,
                     min_m, max_m, min_f, max_f,
                     min_gen, max_gen,
                     crit_low, crit_high, decimal_places) = entry

                    _, was_created = LabTestParameter.objects.get_or_create(
                        test=test,
                        code=code,
                        defaults={
                            'name': name,
                            'group_name': group,
                            'unit': unit,
                            'display_order': order,
                            'value_type': value_type,
                            'decimal_places': decimal_places,
                            'is_required': True,
                            'adult_ref_min_male': min_m,
                            'adult_ref_max_male': max_m,
                            'adult_ref_min_female': min_f,
                            'adult_ref_max_female': max_f,
                            'adult_ref_min_general': min_gen,
                            'adult_ref_max_general': max_gen,
                            'critical_low': crit_low,
                            'critical_high': crit_high,
                        }
                    )
                    if was_created:
                        created += 1
                    else:
                        skipped += 1

                self.stdout.write(self.style.SUCCESS(
                    f"  OK: {created} created, {skipped} already existed"
                ))
                total_created += created
                total_skipped += skipped
                tests_updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n{'-'*50}\n"
            f"Done. {tests_updated} test(s) updated. "
            f"{total_created} parameter(s) created, {total_skipped} already existed.\n"
            f"Use --overwrite to replace existing parameters."
        ))
