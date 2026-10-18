"""Entreprise de démonstration allemande (vidéo de présentation, essais en allemand).

    python manage.py seed_demo_de            # crée « Weber Bürotechnik GmbH » si absente
    python manage.py seed_demo_de --reset    # supprime puis recrée

Données fictives : un revendeur berlinois de matériel de bureau et de services informatiques,
en euros, TVA allemande (19 % et 7 %), plan comptable SKR03, interface en allemand.
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

ORG = 'Weber Bürotechnik GmbH'
EMAIL = 'anna.weber@weber-buerotechnik.example'

LIEFERANTEN = [
    ('Nordpapier GmbH', 'bestellung@nordpapier.example', 'Hamburg'),
    ('TechHandel Krause KG', 'vertrieb@techhandel-krause.example', 'Leipzig'),
    ('Büromöbel Fischer AG', 'service@moebel-fischer.example', 'München'),
    ('Rösterei Hansen', 'kontakt@roesterei-hansen.example', 'Bremen'),
]

# (Name, Typ, Verkaufspreis, Einkaufspreis, Bestand, Mindestbestand, Lieferant, MwSt.)
ARTIKEL = [
    ('Druckerpapier A4, 80 g (500 Blatt)', 'physical', '5.90', '3.20', 240, 60, 0, 19),
    ('Ordner A4 breit (10 Stück)', 'physical', '19.90', '9.80', 34, 20, 0, 19),
    ('Toner-Kartusche schwarz', 'physical', '49.90', '27.00', 6, 10, 1, 19),
    ('Kabellose Maus', 'physical', '24.90', '11.50', 42, 15, 1, 19),
    ('Monitor 27 Zoll', 'physical', '239.00', '158.00', 9, 4, 1, 19),
    ('Bürostuhl ergonomisch', 'physical', '289.00', '165.00', 5, 3, 2, 19),
    ('Schreibtisch höhenverstellbar', 'physical', '549.00', '320.00', 3, 2, 2, 19),
    ('Kaffeebohnen 1 kg', 'physical', '18.90', '10.50', 28, 12, 3, 7),
    ('Fachbuch „Buchhaltung für Einsteiger“', 'physical', '29.90', '18.00', 14, 5, 3, 7),
    ('IT-Service (Stunde)', 'service', '85.00', '0', 0, 0, None, 19),
    ('Einrichtung Arbeitsplatz', 'service', '120.00', '0', 0, 0, None, 19),
    ('Wartungsvertrag Drucker (Monat)', 'service', '49.00', '0', 0, 0, None, 19),
]

KUNDEN = [
    ('Kanzlei Schmidt & Partner', 'Dr. Lena Schmidt', 'Berlin'),
    ('Praxis Dr. Becker', 'Dr. Jonas Becker', 'Potsdam'),
    ('Hotel Spreeblick GmbH', 'Markus Vogel', 'Berlin'),
    ('Café Lindner', 'Sabine Lindner', 'Berlin'),
    ('Architekturbüro Wagner', 'Thomas Wagner', 'Berlin'),
    ('Autohaus Krüger GmbH', 'Petra Krüger', 'Cottbus'),
    ('Steuerberatung Hoffmann', 'Michael Hoffmann', 'Berlin'),
    ('Grundschule am Park (Förderverein)', 'Julia Neumann', 'Berlin'),
]

# Monatliche Ausgaben : (Beschreibung, Kategorie, Brutto, MwSt.-Satz, Lieferant)
AUSGABEN = [
    ('Miete Büro und Lager', 'exp_rent', '1725.50', 19, 'Hausverwaltung Berg'),
    ('Strom', 'exp_utilities', '214.20', 19, 'Stadtwerke Berlin'),
    ('Telefon und Internet', 'exp_telecom', '59.90', 19, 'Telekommunikation Nord'),
    ('Tanken Lieferwagen', 'exp_transport', '178.40', 19, 'Tankstelle'),
]

C = Decimal('0.01')


def eur(v):
    return Decimal(str(v)).quantize(C, rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true')

    def handle(self, *args, **opts):
        from apps.accounts.models import Organization
        org = Organization.objects.filter(name=ORG).first()
        if org and opts['reset']:
            self._supprimer(org)
            org = None
        if org:
            self.stdout.write(f'{ORG} existe déjà (--reset pour recréer).')
            return
        self._creer()

    def _supprimer(self, org):
        from django.db import connection
        from apps.accounts.models import CustomUser
        from apps.accounting.models import JournalEntry, Expense
        from apps.invoicing.models import Invoice, Product
        from apps.purchase_orders.models import PurchaseOrder
        with transaction.atomic():
            if connection.vendor == 'sqlite':
                connection.cursor().execute('PRAGMA defer_foreign_keys=ON')
            Invoice.objects.filter(created_by__organization=org).delete()
            PurchaseOrder.objects.filter(created_by__organization=org).delete()
            Expense.objects.filter(organization=org).delete()
            JournalEntry.objects.filter(organization=org).delete()
            Product.objects.filter(organization=org).delete()
            CustomUser.objects.filter(organization=org).delete()
            org.delete()
        self.stdout.write('Ancienne démo supprimée.')

    @transaction.atomic
    def _creer(self):
        from apps.accounts.models import Client, CustomUser, Organization, UserPreferences
        from apps.accounting.expenses import create_expense
        from apps.accounting.setup_utils import adopt_country_chart
        from apps.core.models import OrganizationSettings
        from apps.invoicing.models import Invoice, InvoiceItem, Payment, Product
        from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
        from apps.subscriptions.models import Subscription, SubscriptionPlan
        from apps.suppliers.models import Supplier

        rnd = random.Random(1990)
        jetzt = timezone.now()

        org = Organization.objects.create(name=ORG)
        reglages, _ = OrganizationSettings.objects.get_or_create(organization=org)
        reglages.company_name = ORG
        reglages.company_address = 'Friedrichstraße 112, 10117 Berlin'
        reglages.company_phone = '+49 30 1234 5678'
        reglages.company_email = 'info@weber-buerotechnik.example'
        reglages.company_vat_number = 'DE312456789'
        reglages.company_tax_number = '37/123/45678'
        reglages.country = 'DE'
        reglages.default_currency = 'EUR'
        reglages.default_tax_rate = 19
        reglages.timezone = 'Europe/Berlin'
        reglages.tax_region = 'eu'
        reglages.vat_filing_period = 'monthly'
        reglages.language = 'de'
        reglages.save()
        adopt_country_chart(org, 'skr03')

        user = CustomUser.objects.create_user(
            username=EMAIL, email=EMAIL, password='Weber-Demo-2026!', organization=org,
            first_name='Anna', last_name='Weber', role='admin',
        )
        UserPreferences.objects.update_or_create(user=user, defaults={'preferred_language': 'de', 'onboarding_completed': True})

        plan = SubscriptionPlan.objects.filter(code='business').first()
        if plan:
            sub, _ = Subscription.objects.get_or_create(organization=org, defaults={'plan': plan})
            sub.plan, sub.status, sub.billing_period = plan, 'active', 'yearly'
            sub.current_period_start = jetzt
            sub.current_period_end = timezone.make_aware(datetime(2099, 12, 31))
            sub.trial_ends_at = None
            sub.save()

        lieferanten = [Supplier.objects.create(organization=org, name=n, email=e, city=c) for n, e, c in LIEFERANTEN]
        artikel = []
        for nom, typ, prix, achat, stock, seuil, f, mwst in ARTIKEL:
            p = Product.objects.create(
                organization=org, name=nom, product_type=typ, price=Decimal(prix), cost_price=Decimal(achat),
                stock_quantity=stock, low_stock_threshold=seuil,
                supplier=lieferanten[f] if f is not None else None,
            )
            p._mwst = mwst
            artikel.append(p)
        kunden = [
            Client.objects.create(organization=org, name=n, contact_person=c, address=f'{v}, Deutschland',
                                  email=f'buchhaltung{i}@kunde.example', phone=f'+49 30 5550 {100 + i}')
            for i, (n, c, v) in enumerate(KUNDEN, start=1)
        ]

        # Rechnungen der letzten 4 Monate (19 % und 7 % gemischt)
        anzahl = 0
        for i in range(40):
            tage = rnd.randint(1, 115)
            datum = jetzt - timedelta(days=tage, hours=rnd.randint(0, 8))
            status = 'paid' if tage > 40 and rnd.random() < 0.85 else rnd.choice(['paid', 'paid', 'sent', 'sent'])
            if tage > 30 and status == 'sent' and rnd.random() < 0.5:
                status = 'overdue'
            kunde = rnd.choice(kunden)
            rechnung = Invoice.objects.create(
                organization=org, client=kunde, created_by=user, invoice_number=f'RE-2026-{i + 1:04d}',
                title=f'Lieferung {kunde.name}', subtotal=Decimal(0), total_amount=Decimal(0),
                currency='EUR', status='draft', due_date=(datum + timedelta(days=14)).date(),
                payment_method='bank_transfer',
            )
            positionen = rnd.sample(artikel, rnd.randint(1, 4))
            netto, steuer = Decimal(0), Decimal(0)
            for p in positionen:
                menge = rnd.randint(1, 3) if p.price > 100 else rnd.randint(2, 20)
                if p.product_type == 'service':
                    menge = rnd.randint(1, 8)
                zeile = eur(p.price * menge)
                InvoiceItem.objects.create(
                    invoice=rechnung, product=p, description=p.name, quantity=menge,
                    unit_price=p.price, total_price=zeile, tax_rate=Decimal(p._mwst),
                )
                netto += zeile
                steuer += eur(zeile * p._mwst / 100)
            rechnung.subtotal = netto
            rechnung.tax_amount = steuer
            rechnung.total_amount = netto + steuer
            rechnung.status = 'sent' if status == 'overdue' else status
            rechnung.save()
            if status == 'paid':
                Payment.objects.create(
                    invoice=rechnung, created_by=user, amount=rechnung.total_amount,
                    payment_date=(datum + timedelta(days=rnd.randint(2, 12))).date(), payment_method='bank_transfer',
                )
            Invoice.objects.filter(pk=rechnung.pk).update(
                created_at=datum, status=status,
                due_date=(datum + timedelta(days=14)).date(),
            )
            anzahl += 1

        # Bestellungen bei Lieferanten (Vorsteuer 19 % bzw. 7 %)
        for i in range(10):
            datum = jetzt - timedelta(days=rnd.randint(3, 110))
            f = lieferanten[i % len(lieferanten)]
            waren = [p for p in artikel if p.supplier_id == f.id]
            bestellung = PurchaseOrder.objects.create(
                po_number=f'BE-2026-{i + 1:04d}', title=f'Nachbestellung {f.name}', supplier=f,
                created_by=user, subtotal=Decimal(0), total_amount=Decimal(0),
                status=rnd.choice(['received', 'received', 'approved', 'sent']),
                required_date=(datum + timedelta(days=7)).date(),
            )
            netto, steuer = Decimal(0), Decimal(0)
            for p in waren[:3]:
                menge = rnd.randint(5, 30) if p.cost_price < 50 else rnd.randint(2, 6)
                zeile = eur(p.cost_price * menge)
                PurchaseOrderItem.objects.create(
                    purchase_order=bestellung, product=p, description=p.name, quantity=menge,
                    unit_price=p.cost_price, total_price=zeile,
                )
                netto += zeile
                steuer += eur(zeile * p._mwst / 100)
            PurchaseOrder.objects.filter(pk=bestellung.pk).update(
                created_at=datum, subtotal=netto, tax_gst_hst=steuer, tax_qst=0, total_amount=netto + steuer,
            )

        # Laufende Ausgaben (Miete, Strom, Telefon, Tanken) für die letzten 4 Monate
        for m in range(4):
            for text, kat, brutto, satz, an in AUSGABEN:
                tag = (jetzt - timedelta(days=30 * m + 3)).date()
                b = Decimal(brutto)
                create_expense(org, user, amount=b, description=text, category=kat, date=tag,
                               tax_amount=eur(b * satz / (100 + satz)), payment_method='bank_transfer',
                               supplier_name=an)

        # Gewünschte Lagerbestände (Verkäufe haben sie über die Signale verändert)
        for p, row in zip(artikel, ARTIKEL):
            Product.objects.filter(pk=p.pk).update(stock_quantity=row[4])

        # Benachrichtigungen, die das Anlegen ausgelöst hat (Lagerwarnungen…), entfernen
        from apps.ai_assistant.models import AINotification
        AINotification.objects.filter(user=user).delete()

        self.stdout.write(self.style.SUCCESS(
            f'{ORG} : {len(artikel)} Artikel, {len(kunden)} Kunden, {len(lieferanten)} Lieferanten, '
            f'{anzahl} Rechnungen, 10 Bestellungen, {4 * len(AUSGABEN)} Ausgaben. Login : {EMAIL}'))
