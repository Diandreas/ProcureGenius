"""
Commande pour charger les lots (batches) de médicaments avec leurs dates de péremption.

Chaque ligne = 1 lot distinct avec sa date de péremption.
Les produits sont liés par correspondance de nom (insensible à la casse).

Usage:
    python manage.py load_pharmacy_batches            # dry-run (aperçu)
    python manage.py load_pharmacy_batches --execute  # crée vraiment les lots
    python manage.py load_pharmacy_batches --execute --clear  # efface d'abord les lots existants
"""
import calendar
from datetime import date
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q


# ---------------------------------------------------------------------------
# Données : (nom_produit, quantité, unité_vente, prix_fcfa, 'mois-aa')
# Chaque ligne = 1 lot avec sa propre date de péremption
# ---------------------------------------------------------------------------
BATCHES_DATA = [
    ("Phloroglucinol 80 mg",                                                    1,  "1 plaquette de 10 comprimés",     1500, "nov-26"),
    ("Ibuprofène",                                                               1,  "1 plaquette de 10 comprimés",      500, "juil-28"),
    ("Doliprane 300 mg - 12 sachets-dose poudre",                               1,  "1 boîte",                         1500, "mars-26"),
    ("Doliprane 100 ml - Flacon",                                                4,  "1 flacon",                        1500, "avr-26"),
    ("Paracétamol 500mg - 16 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "juin-27"),
    ("Loperamide 2mg",                                                           1,  "1 plaquette de 10 comprimés",     1500, "juil-27"),
    ("Doliprane 200 mg - 12 sachets-dose poudre",                               2,  "1 boîte",                         1500, "mai-26"),
    ("Macrogol 4000 - 24 sachets de 4g",                                        1,  "1 sachet",                         500, "août-26"),
    ("Paracétamol 500mg - 16 comprimés",                                         3,  "1 plaquette de 8 comprimés",      1500, "avr-26"),
    ("Paracétamol 1000mg - 8 comprimés",                                         2,  "1 plaquette de 8 comprimés",      1500, "sept-26"),
    ("Doliprane 300 mg - 12 sachets-dose poudre",                               2,  "1 boîte",                         1500, "sept-26"),
    ("Doliprane 300 mg - 12 sachets-dose poudre",                               1,  "1 boîte",                         1500, "nov-26"),
    ("Esoméprazole 20 mg - 28 gélules gastrorésistantes",                       2,  "1 boîte",                         5000, "nov-26"),
    ("Dafalgan codéine 500 mg/30 mg - 16 comprimés pélliculés",                 1,  "1 plaquette de 8 comprimés",      1500, "déc-26"),
    ("Locoïd 0,1%",                                                             1,  "1 tube de crème",                 3000, "janv-27"),
    ("Paracétamol 500mg - 16 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "août-26"),
    ("Paracétamol 500mg - 16 comprimés",                                         2,  "1 plaquette de 8 comprimés",      1500, "févr-27"),
    ("Paracétamol 500mg - 16 comprimés",                                         6,  "1 plaquette de 8 comprimés",      1500, "mars-27"),
    ("Paracétamol 1g - 8 comprimés",                                            27,  "1 plaquette de 8 comprimés",      1500, "mars-27"),
    ("Diclofénac Gel en flacon pressurisé",                                      1,  "1 tube de gel",                   1500, "mars-27"),
    ("Tixocortol Suspension nasal 1%",                                           2,  "1 boîte",                         1500, "mars-27"),
    ("Acide borique 12mg/18mg par ml - 20 unidoses",                            2,  "1 boîte",                         3000, "mars-27"),
    ("Paracétamol 1g - 8 comprimés",                                             9,  "1 plaquette de 8 comprimés",      1500, "avr-27"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         5,  "2 sachets",                        500, "avr-27"),
    ("Paracétamol 1g - 8 comprimés",                                             1,  "1 plaquette de 8 comprimés",      1500, "mai-27"),
    ("Amoxiciline 500Mg - 12 gélules",                                           2,  "1 boîte",                         2000, "mai-27"),
    ("Paracétamol 1g - 8 comprimés",                                            11,  "1 plaquette de 8 comprimés",      1500, "juil-27"),
    ("Paracétamol 1g - 8 comprimés",                                             4,  "1 plaquette de 8 comprimés",      1500, "sept-27"),
    ("Paracétamol 1g - 8 comprimés",                                             9,  "1 plaquette de 8 comprimés",      1500, "févr-28"),
    ("Paracétamol 1g - 8 comprimés",                                             1,  "1 plaquette de 8 comprimés",      1500, "nov-27"),
    ("Acide borique 12mg/18mg par ml - 20 unidoses",                            1,  "1 boîte",                         3000, "févr-27"),
    ("Acide borique 12mg/18mg par ml - 20 unidoses",                            2,  "1 boîte",                         3000, "juil-27"),
    ("Mono sept 30 unidoses de 0,4 ml",                                         1,  "2 doses",                          500, "juil-27"),
    ("Doliprane 1000 mg - 8 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "déc-27"),
    ("Amoxiciline 1g - 6 comprimés",                                            1,  "1 plaquette de 6 comprimés",      2000, "août-27"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         3,  "2 sachets",                        500, "août-28"),
    ("Paracétamol 1g - 8 comprimés",                                             3,  "1 plaquette de 8 comprimés",      1500, "mars-28"),
    ("Tixocortol Suspension nasal 1%",                                           1,  "1 boîte",                         1500, "sept-27"),
    ("Amoxiciline 500mg",                                                        1,  "1 boîte",                         2000, "oct-27"),
    ("Tardyferon 50 mg - 30 comprimés pelliculés",                               1,  "1 plaquette de 15 comprimés",     2000, "oct-27"),
    ("Tardyferon 50 mg - 30 comprimés pelliculés",                               1,  "1 plaquette de 15 comprimés",     2000, "mai-28"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "déc-27"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "nov-28"),
    ("Paracétamol 1g - 8 comprimés",                                             6,  "1 plaquette de 8 comprimés",      1500, "janv-28"),
    ("Doliprane 1000 mg - 8 comprimés",                                         4,  "1 plaquette de 8 comprimés",      1500, "févr-28"),
    ("Doliprane 1000 mg - 8 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "mars-28"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "mars-28"),
    ("Tardyferon 50 mg - 30 comprimés pelliculés",                               2,  "1 plaquette de 15 comprimés",     2000, "avr-28"),
    ("Tardyferon 50 mg - 30 comprimés pelliculés",                               1,  "1 plaquette de 15 comprimés",     2000, "avr-28"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "avr-28"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         4,  "2 sachets",                        500, "mai-28"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "déc-28"),
    ("Locoïd 0,1%",                                                             1,  "1 tube de crème",                 3000, "avr-28"),
    ("Compresses de Gaze stériles 10 cm x 10 cm - 50 sachets",                  1,  "5 compresses",                     500, "déc-28"),
    ("Paracetamol/codéine - 500 mg/30 mg - 16 comprimés",                      29,  "1 plaquette de 8 comprimés",      1500, "janv-29"),
    ("Compresses de Gaze stériles 17 fils 8 plis - 10 cm x 10 cm - 10 sachets", 1,  "5 compresses",                     500, "mars-29"),
    ("Compresses de Gaze stériles 10 cm x 10 cm - 50 sachets",                  1,  "5 compresses",                     500, "févr-30"),
    ("Acide folique 0,4 mg - 30 comprimés",                                     1,  "1 plaquette de 10 comprimés",     2000, "janv-28"),
    ("Gynositol Plus Myo-inositol Vitamine B9 - 30 sachets",                    2,  "2 sachets",                        500, "mars-27"),
    ("Eau oxygénée Stabilisée 10 volumes",                                      1,  "1 bouteille",                     2000, "mai-28"),
    ("Betadine Scrub 4%",                                                       4,  "1 bouteille",                     2000, "oct-26"),
    ("Betadine Dermique 10%",                                                   3,  "1 bouteille",                     3000, "juin-27"),
    ("Betadine Alcoolique 5%",                                                  4,  "1 bouteille",                     4000, "mai-28"),
    ("Doliprane 1000 mg - 8 comprimés",                                         4,  "1 plaquette de 8 comprimés",      1500, "mai-28"),
    ("Doliprane 1000 mg - 8 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "juil-28"),
    ("Doliprane 1000 mg - 8 comprimés",                                         6,  "1 plaquette de 8 comprimés",      1500, "mai-28"),
    ("Doliprane 1000 mg - 8 comprimés",                                        14,  "1 plaquette de 8 comprimés",      1500, "août-28"),
    ("Spafon 80mg - 30 comprimés",                                              1,  "1 plaquette de 10 comprimés",     1500, "janv-30"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "août-27"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         2,  "2 sachets",                        500, "nov-27"),
    ("Doliprane 1000 mg - 8 comprimés",                                         9,  "1 plaquette de 8 comprimés",      1500, "oct-28"),
    ("Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets",         1,  "2 sachets",                        500, "mai-26"),
    ("Doliprane 1000 mg - 8 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "mars-26"),
    ("Doliprane 1000 mg - 8 comprimés",                                         2,  "1 plaquette de 8 comprimés",      1500, "mai-26"),
    ("Lactulose 10g/15ml - 20 sachets",                                         1,  "2 sachets",                        500, "juil-26"),
    ("Doliprane 1000 mg - 8 comprimés",                                         2,  "1 plaquette de 8 comprimés",      1500, "août-26"),
    ("Lactulose 10g/15ml - 20 sachets",                                         5,  "2 sachets",                        500, "sept-26"),
    ("Meteospasmyl - 20 capsules",                                              2,  "1 boîte",                         2000, "nov-26"),
    ("Carbosylane 45 mg - 140mg / 48 doses",                                    1,  "1 boîte",                         5000, "nov-26"),
    ("Lactulose 10g/15ml - 20 sachets",                                         2,  "2 sachets",                        500, "déc-26"),
    ("Paracetamol/codéine - 500 mg/30 mg - 16 comprimés",                       2,  "1 plaquette de 8 comprimés",      1500, "janv-27"),
    ("Nicopatch 28 dispositifs de 21mg/24h",                                    1,  "1 boîte",                         2000, "févr-27"),
    ("Nicopatch 28 dispositifs de 21mg/24h",                                    1,  "1 boîte",                         2000, "sept-27"),
    ("Laroxyl 40 mg/ml",                                                        2,  "1 boîte",                         2000, "oct-26"),
    ("Tixocortol Suspension nasal 1%",                                           1,  "1 boîte",                         1500, "déc-26"),
    ("Spafon 80mg - 30 comprimés",                                              1,  "1 plaquette de 10 comprimés",     1500, "déc-28"),
    ("Spafon 80mg - 30 comprimés",                                              1,  "1 plaquette de 10 comprimés",     1500, "déc-26"),
    ("Doliprane 1000 mg - 8 comprimés",                                         1,  "1 plaquette de 8 comprimés",      1500, "déc-26"),
    ("Diclofénac 50 mg - B/1000",                                             100,  "1 plaquette de 10 comprimés",      500, "mars-28"),
    ("Perfuseurs P/22 - Paquet de 25",                                         25,  "1 perfuseur",                      500, "août-26"),
    ("Metronidazole 500 mg - B/100",                                           10,  "1 plaquette de 10 comprimés",      500, "juin-28"),
    ("Ibuprofène comp 480 mg - B/100",                                          1,  "1 plaquette de 10 comprimés",      500, "mars-28"),
    ("Epicranien 23G - B/100",                                                  1,  "1 épicranien",                     500, "mars-30"),
    ("Diclofénac Injection Sodium 75 mg/5 ml",                                 50,  "1 ampoule",                        500, "mai-28"),
    ("Paracetamol 125 mg sirop",                                                1,  "1 boîte",                         1500, "mai-28"),
    ("Paracetamol 125 mg sirop",                                                4,  "1 boîte",                         1500, "janv-28"),
    ("Amoxiciline 250 mg sirop",                                                5,  "1 boîte",                         1500, "nov-26"),
    ("Catheter 24 G Jaune - B/100",                                           100,  "1 cathéter",                       500, "mars-30"),
    ("Catheter 22 G Bleu - B/100",                                            100,  "1 cathéter",                       500, "janv-28"),
    ("Artémether 80 mg injection - B/6",                                        1,  "1 boîte",                         2500, "avr-28"),
    ("Artémether comprimé 20/120 - B/24",                                       5,  "1 plaquette de 24 comprimés",     1500, "nov-27"),
    ("Albendazole sirop - B/1",                                                 5,  "1 boîte",                         1000, "janv-27"),
    ("Albendazole 400 mg comprimé - B/20",                                      1,  "1 boîte",                          500, "févr-28"),
    ("Artesunate 60 mg injection - B/1",                                        5,  "1 boîte d'injection",             1000, "oct-27"),
    ("Ceftriaxon 1g sans eau - B/10",                                          10,  "1 injection",                     1000, "oct-27"),
    ("Vitamines B complex comprimés - B/100",                                  10,  "1 ampoule",                        500, "juin-28"),
]

# Correspondances de noms alternatifs (si le nom exact n'est pas dans la BD)
NAME_ALIASES = {
    "Alginate de sodium (générique Gaviscon) 500mg/267mg - 24 sachets": [
        "Alginate de sodium",
        "Gaviscon",
        "Alginate de sodium (générique Gaviscon)",
    ],
    "Paracétamol 500mg - 16 comprimés": [
        "Paracétamol 500mg",
        "Paracetamol 500mg",
    ],
    "Paracétamol 1g - 8 comprimés": [
        "Paracétamol 1g",
        "Paracetamol 1g",
        "Paracétamol 1000mg",
        "Paracetamol 1000mg",
    ],
    "Paracétamol 1000mg - 8 comprimés": [
        "Paracétamol 1000mg",
        "Paracetamol 1000mg",
    ],
    "Dafalgan codéine 500 mg/30 mg - 16 comprimés pélliculés": [
        "Dafalgan codéine",
        "Dafalgan codeïne",
    ],
    "Paracetamol/codéine - 500 mg/30 mg - 16 comprimés": [
        "Paracetamol/codéine",
        "Paracétamol codéine",
        "Paracetamol codeine",
    ],
    "Diclofénac 50 mg - B/1000": [
        "Diclofénac 50 mg",
        "Diclofenac 50mg",
    ],
    "Nicopatch 28 dispositifs de 21mg/24h": [
        "Nicopatch",
        "Nicopatch 28",
    ],
    "Gynositol Plus Myo-inositol Vitamine B9 - 30 sachets": [
        "Gynositol",
        "Myo-inositol",
    ],
}


def parse_french_expiry(expiry_str):
    """Convertit 'nov-26' → date(2026, 11, 30) (dernier jour du mois)."""
    MONTHS = {
        'janv': 1, 'jan': 1,
        'févr': 2, 'fév': 2, 'fevr': 2,
        'mars': 3,
        'avr': 4,
        'mai': 5,
        'juin': 6,
        'juil': 7,
        'août': 8, 'aout': 8,
        'sept': 9,
        'oct': 10,
        'nov': 11,
        'déc': 12, 'dec': 12,
    }
    parts = expiry_str.lower().strip().split('-')
    if len(parts) != 2:
        raise ValueError(f"Format de date invalide : {expiry_str}")
    month_str, year_str = parts
    month = MONTHS.get(month_str)
    if not month:
        raise ValueError(f"Mois inconnu : {month_str}")
    year = 2000 + int(year_str)
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, last_day)


def find_product(org, name):
    """Cherche un produit par nom exact, puis par alias, puis par icontains."""
    from apps.invoicing.models import Product

    # 1. Exact (insensible à la casse)
    p = Product.objects.filter(organization=org, name__iexact=name, is_active=True).first()
    if p:
        return p, 'exact'

    # 2. Aliases définis
    aliases = NAME_ALIASES.get(name, [])
    for alias in aliases:
        p = Product.objects.filter(organization=org, name__icontains=alias, is_active=True).first()
        if p:
            return p, f'alias:{alias}'

    # 3. Correspondance partielle sur les 30 premiers caractères
    partial = name[:30].strip()
    p = Product.objects.filter(organization=org, name__icontains=partial, is_active=True).first()
    if p:
        return p, f'partial:{partial}'

    return None, None


class Command(BaseCommand):
    help = "Charge les lots de médicaments avec leurs dates de péremption"

    def add_arguments(self, parser):
        parser.add_argument('--execute', action='store_true',
                            help='Crée réellement les lots (sinon : dry-run)')
        parser.add_argument('--clear', action='store_true',
                            help='Efface les lots existants des produits matchés avant de créer les nouveaux')

    def handle(self, *args, **options):
        from apps.invoicing.models import Product, ProductBatch
        from apps.accounts.models import Organization

        execute = options['execute']
        clear = options['clear']

        org = Organization.objects.first()
        if not org:
            raise CommandError("Aucune organisation trouvée.")

        if not execute:
            self.stdout.write(self.style.WARNING(
                "\n[DRY-RUN] Aucun lot ne sera créé. Ajoutez --execute pour créer.\n"
            ))

        self.stdout.write(f"Organisation : {org.name}")
        self.stdout.write(f"Lots à traiter : {len(BATCHES_DATA)}\n")

        created = 0
        skipped = 0
        not_found = []
        lot_counter = {}  # product_id → counter

        for row in BATCHES_DATA:
            name, qty, unit, price_fcfa, expiry_str = row

            # Parser la date
            try:
                expiry_date = parse_french_expiry(expiry_str)
            except ValueError as e:
                self.stdout.write(self.style.ERROR(f"  Erreur date '{expiry_str}' : {e}"))
                skipped += 1
                continue

            # Trouver le produit
            product, match_type = find_product(org, name)
            if not product:
                not_found.append(name)
                self.stdout.write(self.style.ERROR(f"  [INTROUVABLE] {name}"))
                skipped += 1
                continue

            # Générer un numéro de lot unique
            pid = str(product.id)
            lot_counter[pid] = lot_counter.get(pid, 0) + 1
            batch_number = f"LOT-{expiry_date.strftime('%Y%m')}-{str(lot_counter[pid]).zfill(3)}-{product.name[:8].replace(' ', '').upper()}"

            # Vérifier si ce lot exact existe déjà (même produit + même expiry)
            exists = ProductBatch.objects.filter(
                organization=org,
                product=product,
                expiry_date=expiry_date,
            ).exists()

            match_info = f"[{match_type}]" if match_type != 'exact' else ""
            self.stdout.write(
                f"  {'→' if not exists else '⚠'} {name[:45]:<45} | {qty:>3} u. | "
                f"exp: {expiry_date.strftime('%d/%m/%Y')} "
                f"{'→ DÉJÀ EXISTANT' if exists else ''} {match_info}"
            )

            if execute:
                if clear and not exists:
                    # --clear : on efface les lots existants du produit avant d'en créer
                    pass  # on ne clear que si on va créer ce lot

                if exists and not clear:
                    skipped += 1
                    continue

                if clear:
                    # Effacer les lots existants pour ce produit avec cette date
                    ProductBatch.objects.filter(
                        organization=org, product=product, expiry_date=expiry_date
                    ).delete()

                ProductBatch.objects.create(
                    organization=org,
                    product=product,
                    batch_number=batch_number,
                    lot_number=batch_number,
                    quantity=qty,
                    quantity_remaining=qty,
                    expiry_date=expiry_date,
                    status='available',
                    notes=f"Chargé le {date.today().strftime('%d/%m/%Y')} — {unit}",
                )
                created += 1
            else:
                if not exists:
                    created += 1
                else:
                    skipped += 1

        # ---- Résumé ----
        self.stdout.write("\n" + "=" * 60)
        if execute:
            self.stdout.write(self.style.SUCCESS(f"✓ {created} lot(s) créé(s)"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✓ {created} lot(s) seraient créés"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"⚠ {skipped} ignoré(s) (déjà existant ou erreur)"))

        if not_found:
            unique_not_found = list(dict.fromkeys(not_found))
            self.stdout.write(self.style.ERROR(
                f"\n{len(unique_not_found)} produit(s) introuvable(s) dans la BD :"
            ))
            for n in unique_not_found:
                self.stdout.write(f"  - {n}")
            self.stdout.write(
                "\nVérifiez les noms dans l'interface ou ajoutez des alias dans NAME_ALIASES."
            )

        if not execute:
            self.stdout.write(self.style.WARNING(
                "\nLancez avec --execute pour créer les lots :\n"
                "  python manage.py load_pharmacy_batches --execute"
            ))
