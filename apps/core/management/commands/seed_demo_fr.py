"""Entreprise de démonstration française (vidéo de présentation, essais en français).

    python manage.py seed_demo_fr            # crée « Papeterie Martin SARL » si absente

Données fictives : une papeterie-librairie lyonnaise qui vend aussi des services (dépannage,
installation), en euros, TVA française (20 %, et 5,5 % sur les livres), plan comptable PCG.
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

ORG = 'Papeterie Martin SARL'
EMAIL = 'claire.martin@papeterie-martin.example'

FOURNISSEURS = [
    ('Papiers du Rhône', 'commandes@papiers-rhone.example', 'Villeurbanne'),
    ('Bureautique Leroy SAS', 'ventes@bureautique-leroy.example', 'Grenoble'),
    ('Mobilier Dubois', 'contact@mobilier-dubois.example', 'Saint-Étienne'),
    ('Éditions du Parc', 'diffusion@editions-parc.example', 'Paris'),
]

# (Nom, type, prix de vente HT, prix d'achat HT, stock, seuil, fournisseur, TVA)
ARTICLES = [
    ('Ramette papier A4 80 g (500 feuilles)', 'physical', '5.90', '3.10', 260, 60, 0, 20),
    ('Classeurs A4 dos large (lot de 10)', 'physical', '18.90', '9.40', 36, 20, 0, 20),
    ('Cartouche de toner noir', 'physical', '54.90', '29.00', 7, 10, 1, 20),
    ('Souris sans fil', 'physical', '22.90', '10.80', 40, 15, 1, 20),
    ('Écran 27 pouces', 'physical', '229.00', '151.00', 8, 4, 1, 20),
    ('Fauteuil de bureau ergonomique', 'physical', '279.00', '160.00', 5, 3, 2, 20),
    ('Bureau réglable en hauteur', 'physical', '529.00', '310.00', 3, 2, 2, 20),
    ('Agenda 2027', 'physical', '16.50', '7.90', 30, 10, 0, 20),
    ('Livre « La comptabilité pour les nuls »', 'physical', '24.90', '15.00', 15, 5, 3, 5.5),
    ('Dictionnaire Le Robert de poche', 'physical', '12.90', '7.80', 22, 8, 3, 5.5),
    ('Dépannage informatique (heure)', 'service', '75.00', '0', 0, 0, None, 20),
    ('Installation poste de travail', 'service', '110.00', '0', 0, 0, None, 20),
    ('Contrat maintenance imprimante (mois)', 'service', '45.00', '0', 0, 0, None, 20),
]

CLIENTS = [
    ('Cabinet Durand Avocats', 'Me Sophie Durand', 'Lyon'),
    ('Cabinet médical des Brotteaux', 'Dr Paul Moreau', 'Lyon'),
    ('Hôtel du Parc', 'Julien Lefèvre', 'Lyon'),
    ('Boulangerie Petit', 'Camille Petit', 'Villeurbanne'),
    ('Agence Archi Rousseau', 'Thomas Rousseau', 'Lyon'),
    ('Garage Fontaine', 'Isabelle Fontaine', 'Vénissieux'),
    ('Expert-comptable Girard', 'Michel Girard', 'Lyon'),
    ('École Jean Moulin (coopérative)', 'Nathalie Bernard', 'Lyon'),
]

# Dépenses mensuelles : (libellé, catégorie, TTC, taux, fournisseur)
DEPENSES = [
    ('Loyer boutique et réserve', 'exp_rent', '1680.00', 20, 'SCI Bellecour'),
    ('Électricité', 'exp_utilities', '198.60', 20, "Fournisseur d'énergie"),
    ('Téléphone et internet', 'exp_telecom', '54.00', 20, 'Opérateur télécom'),
    ('Carburant utilitaire', 'exp_transport', '162.30', 20, 'Station-service'),
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
        reglages.company_address = '14 rue de la République, 69002 Lyon'
        reglages.company_phone = '+33 4 78 12 34 56'
        reglages.company_email = 'contact@papeterie-martin.example'
        reglages.company_vat_number = 'FR32812345678'
        reglages.company_tax_number = '812 345 678 00021'
        reglages.country = 'FR'
        reglages.default_currency = 'EUR'
        reglages.default_tax_rate = 20
        reglages.timezone = 'Europe/Paris'
        reglages.tax_region = 'eu'
        reglages.vat_filing_period = 'monthly'
        reglages.language = 'fr'
        reglages.save()
        adopt_country_chart(org, 'pcg')

        user = CustomUser.objects.create_user(
            username=EMAIL, email=EMAIL, password='Martin-Demo-2026!', organization=org,
            first_name='Claire', last_name='Martin', role='admin',
        )
        UserPreferences.objects.update_or_create(user=user, defaults={'preferred_language': 'fr', 'onboarding_completed': True})

        plan = SubscriptionPlan.objects.filter(code='business').first()
        if plan:
            sub, _ = Subscription.objects.get_or_create(organization=org, defaults={'plan': plan})
            sub.plan, sub.status, sub.billing_period = plan, 'active', 'yearly'
            sub.current_period_start = jetzt
            sub.current_period_end = timezone.make_aware(datetime(2099, 12, 31))
            sub.trial_ends_at = None
            sub.save()

        lieferanten = [Supplier.objects.create(organization=org, name=n, email=e, city=c) for n, e, c in FOURNISSEURS]
        artikel = []
        for nom, typ, prix, achat, stock, seuil, f, mwst in ARTICLES:
            p = Product.objects.create(
                organization=org, name=nom, product_type=typ, price=Decimal(prix), cost_price=Decimal(achat),
                stock_quantity=stock, low_stock_threshold=seuil,
                supplier=lieferanten[f] if f is not None else None,
            )
            p._mwst = mwst
            artikel.append(p)
        kunden = [
            Client.objects.create(organization=org, name=n, contact_person=c, address=f'{v}, France',
                                  email=f'compta{i}@client.example', phone=f'+33 4 72 00 {10 + i:02d} {20 + i:02d}')
            for i, (n, c, v) in enumerate(CLIENTS, start=1)
        ]

        # Factures des 4 derniers mois (20 % et 5,5 % mélangés)
        anzahl = 0
        for i in range(40):
            tage = rnd.randint(1, 115)
            datum = jetzt - timedelta(days=tage, hours=rnd.randint(0, 8))
            status = 'paid' if tage > 40 and rnd.random() < 0.85 else rnd.choice(['paid', 'paid', 'sent', 'sent'])
            if tage > 30 and status == 'sent' and rnd.random() < 0.5:
                status = 'overdue'
            kunde = rnd.choice(kunden)
            rechnung = Invoice.objects.create(
                organization=org, client=kunde, created_by=user, invoice_number=f'FA-2026-{i + 1:04d}',
                title=f'Commande {kunde.name}', subtotal=Decimal(0), total_amount=Decimal(0),
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
                    unit_price=p.price, total_price=zeile, tax_rate=Decimal(str(p._mwst)),
                )
                netto += zeile
                steuer += eur(zeile * Decimal(str(p._mwst)) / 100)
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

        # Bons de commande aux fournisseurs (TVA déductible)
        for i in range(10):
            datum = jetzt - timedelta(days=rnd.randint(3, 110))
            f = lieferanten[i % len(lieferanten)]
            waren = [p for p in artikel if p.supplier_id == f.id]
            bestellung = PurchaseOrder.objects.create(
                po_number=f'BC-2026-{i + 1:04d}', title=f'Réassort {f.name}', supplier=f,
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
                steuer += eur(zeile * Decimal(str(p._mwst)) / 100)
            PurchaseOrder.objects.filter(pk=bestellung.pk).update(
                created_at=datum, subtotal=netto, tax_gst_hst=steuer, tax_qst=0, total_amount=netto + steuer,
            )

        # Dépenses courantes (loyer, électricité, téléphone, carburant) des 4 derniers mois
        for m in range(4):
            for text, kat, brutto, satz, an in DEPENSES:
                tag = (jetzt - timedelta(days=30 * m + 3)).date()
                b = Decimal(brutto)
                create_expense(org, user, amount=b, description=text, category=kat, date=tag,
                               tax_amount=eur(b * satz / (100 + satz)), payment_method='bank_transfer',
                               supplier_name=an)

        # Stocks voulus (les ventes les ont modifiés via les signaux)
        for p, row in zip(artikel, ARTICLES):
            Product.objects.filter(pk=p.pk).update(stock_quantity=row[4])

        # Notifications déclenchées par la création (alertes de stock…) : supprimées
        from apps.ai_assistant.models import AINotification
        AINotification.objects.filter(user=user).delete()

        self.stdout.write(self.style.SUCCESS(
            f'{ORG} : {len(artikel)} articles, {len(kunden)} clients, {len(lieferanten)} fournisseurs, '
            f'{anzahl} factures, 10 bons de commande, {4 * len(DEPENSES)} dépenses. Connexion : {EMAIL}'))
