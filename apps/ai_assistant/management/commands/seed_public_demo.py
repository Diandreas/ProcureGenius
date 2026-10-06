"""Crée (ou rafraîchit) l'organisation de démonstration publique de l'assistant IA.

Les visiteurs non connectés de la page d'accueil interrogent l'IA sur CES
données fictives, jamais sur celles d'un client. L'organisation est isolée et
son utilisateur ne peut pas se connecter (mot de passe inutilisable).

    python manage.py seed_public_demo            # crée si absente, sinon rafraîchit les dates
    python manage.py seed_public_demo --refresh  # rafraîchit seulement (cron hebdomadaire)

Rafraîchir = décaler toutes les dates pour que la dernière facture date d'hier :
les questions « ce mois-ci » gardent des réponses, sans rien supprimer.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.ai_assistant.public_demo import DEMO_ORG_NAME, DEMO_USERNAME

FOURNISSEURS = [
    ('Comptoir Commercial du Littoral', 'contact@ccl-demo.cm'),
    ('Distribution Centrale CEMAC', 'ventes@dcc-demo.cm'),
    ('Import Export Wouri', 'commandes@iew-demo.cm'),
    ('TechDistrib Afrique', 'pro@techdistrib-demo.cm'),
    ('Papeterie Générale de Yaoundé', 'achats@pgy-demo.cm'),
]

# (nom, catégorie, prix de vente, prix d'achat, stock, seuil d'alerte, indice fournisseur)
PRODUITS = [
    ('Ramette papier A4 80 g', 'Papeterie', 3500, 2400, 140, 40, 4),
    ('Classeur à levier', 'Papeterie', 1800, 1100, 9, 25, 4),
    ('Stylo bille bleu (boîte de 50)', 'Papeterie', 4500, 2900, 32, 10, 4),
    ('Cartouche encre HP 305 noire', 'Consommables', 14500, 10200, 3, 8, 3),
    ('Toner Canon 737', 'Consommables', 52000, 38500, 6, 4, 3),
    ('Clé USB 64 Go', 'Informatique', 6500, 4100, 48, 15, 3),
    ('Souris sans fil', 'Informatique', 7500, 4600, 2, 10, 3),
    ('Clavier AZERTY USB', 'Informatique', 9000, 5800, 21, 8, 3),
    ('Écran 24 pouces', 'Informatique', 115000, 86000, 5, 3, 3),
    ('Onduleur 1000 VA', 'Énergie', 78000, 56000, 4, 5, 1),
    ('Multiprise parafoudre', 'Énergie', 8500, 5200, 27, 10, 1),
    ('Câble HDMI 2 m', 'Informatique', 4000, 2300, 0, 10, 3),
    ('Chaise de bureau ergonomique', 'Mobilier', 85000, 61000, 7, 3, 0),
    ('Bureau 140 cm', 'Mobilier', 145000, 104000, 3, 2, 0),
    ('Armoire métallique 2 portes', 'Mobilier', 165000, 118000, 2, 2, 0),
    ('Climatiseur split 1,5 CV', 'Énergie', 265000, 198000, 1, 2, 1),
    ('Gel hydroalcoolique 500 ml', 'Hygiène', 2500, 1500, 75, 20, 2),
    ('Rouleau essuie-tout (lot de 6)', 'Hygiène', 3800, 2400, 11, 15, 2),
    ('Eau minérale 1,5 L (pack de 6)', 'Fournitures', 2700, 2000, 60, 20, 2),
    ('Café moulu 250 g', 'Fournitures', 3200, 2100, 18, 10, 2),
]

# (nom, contact, téléphone)
CLIENTS = [
    ('Boulangerie Moderne de Bonamoussadi', 'M. Ndzana', '690000101'),
    ('Clinique Les Palmiers', 'Dr Ekane', '690000102'),
    ('Hôtel Akwa Plaza', 'Mme Tchoua', '690000103'),
    ('Pharmacie du Rond-Point', 'M. Fotso', '690000104'),
    ('École Bilingue Excellence', 'Mme Mbarga', '690000105'),
    ('Garage Auto Logpom', 'M. Kamga', '690000106'),
    ('Cabinet Comptable Nkoa', 'M. Nkoa', '690000107'),
    ('Supermarché Le Panier', 'Mme Ewane', '690000108'),
    ('Restaurant Chez Tantine', 'Mme Ngo Bayiha', '690000109'),
    ('BTP Construction Wouri', 'M. Essomba', '690000110'),
]


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument('--refresh', action='store_true', help='décaler les dates seulement')

    def handle(self, *args, **options):
        from apps.accounts.models import Organization
        org = Organization.objects.filter(name=DEMO_ORG_NAME).first()
        if org is None:
            if options['refresh']:
                raise CommandError("Organisation de démonstration absente : lancez la commande sans --refresh.")
            self._creer()
        self._rafraichir()

    # ------------------------------------------------------------------ création
    @transaction.atomic
    def _creer(self):
        from apps.accounts.models import Client, Organization, User
        from apps.core.models import OrganizationSettings
        from apps.core.modules import get_modules_for_plan
        from apps.invoicing.models import Invoice, InvoiceItem, Product
        from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
        from apps.suppliers.models import Supplier

        rnd = random.Random(2026)  # données identiques à chaque création
        maintenant = timezone.now()

        org = Organization.objects.create(name=DEMO_ORG_NAME)
        org.enabled_modules = get_modules_for_plan('business')
        org.save(update_fields=['enabled_modules'])
        try:
            reglages, _ = OrganizationSettings.objects.get_or_create(organization=org)
            reglages.company_name = DEMO_ORG_NAME
            reglages.default_currency = 'XAF'
            reglages.save()
        except Exception as exc:  # réglages facultatifs pour la démo
            self.stderr.write(f'Réglages non appliqués : {exc}')

        user = User.objects.create_user(
            username=DEMO_USERNAME, email='demo-public@procura.invalid', password=None,
            organization=org, first_name='Démo', last_name='Procura',
        )
        user.set_unusable_password()  # personne ne peut se connecter à ce compte
        if hasattr(user, 'role'):
            user.role = 'admin'
        user.save()

        fournisseurs = [
            Supplier.objects.create(organization=org, name=n, email=e, city='Douala')
            for n, e in FOURNISSEURS
        ]
        produits = []
        for nom, cat, prix, achat, stock, seuil, f in PRODUITS:
            produits.append(Product.objects.create(
                organization=org, name=nom, price=Decimal(prix), cost_price=Decimal(achat),
                stock_quantity=stock, low_stock_threshold=seuil, supplier=fournisseurs[f],
                description=cat,
            ))
        clients = [
            Client.objects.create(organization=org, name=n, contact_person=c, phone=t,
                                  email=f'contact{i}@client-demo.cm')
            for i, (n, c, t) in enumerate(CLIENTS, start=1)
        ]

        # Factures sur les 120 derniers jours : surtout payées, quelques-unes
        # envoyées ou en retard pour que les relances aient un sens.
        for i in range(48):
            jours = rnd.randint(1, 120)
            cree = maintenant - timedelta(days=jours, hours=rnd.randint(0, 9))
            if jours > 45:
                statut = rnd.choice(['paid'] * 8 + ['overdue'] * 2)
            elif jours > 15:
                statut = rnd.choice(['paid'] * 6 + ['sent'] * 2 + ['overdue'])
            else:
                statut = rnd.choice(['paid'] * 4 + ['sent'] * 2)
            client = rnd.choice(clients[:6] * 3 + clients)  # quelques gros clients
            facture = Invoice.objects.create(
                organization=org, client=client, created_by=user,
                invoice_number=f'DEMO-FAC-{i + 1:04d}', title=f'Fournitures {client.name}',
                subtotal=Decimal(0), total_amount=Decimal(0), currency='XAF',
                status='sent' if statut == 'overdue' else statut,
                due_date=(cree + timedelta(days=30)).date(),
                payment_method='mobile_money' if rnd.random() < 0.4 else 'cash',
            )
            for p in rnd.sample(produits, rnd.randint(1, 4)):
                q = rnd.randint(1, 6) if p.price > 50000 else rnd.randint(2, 25)
                InvoiceItem.objects.create(
                    invoice=facture, product=p, description=p.name, quantity=q,
                    unit_price=p.price, total_price=p.price * q,
                )
            Invoice.objects.filter(pk=facture.pk).update(
                created_at=cree, status=statut,
                due_date=(cree + timedelta(days=30 if statut != 'overdue' else 15)).date(),
            )

        # Bons de commande auprès des fournisseurs.
        for i in range(8):
            cree = maintenant - timedelta(days=rnd.randint(2, 90))
            f = rnd.choice(fournisseurs)
            bc = PurchaseOrder.objects.create(
                po_number=f'DEMO-BC-{i + 1:04d}', title=f'Réapprovisionnement {f.name}',
                supplier=f, created_by=user, subtotal=Decimal(0), total_amount=Decimal(0),
                status=rnd.choice(['received', 'received', 'approved', 'sent']),
                required_date=(cree + timedelta(days=10)).date(),
            )
            total = Decimal(0)
            for p in [p for p in produits if p.supplier_id == f.id][:3] or produits[:2]:
                q = rnd.randint(5, 40)
                PurchaseOrderItem.objects.create(
                    purchase_order=bc, product=p, description=p.name, quantity=q,
                    unit_price=p.cost_price, total_price=p.cost_price * q,
                )
                total += p.cost_price * q
            PurchaseOrder.objects.filter(pk=bc.pk).update(created_at=cree, subtotal=total, total_amount=total)

        # Les ventes ont pu modifier les stocks via les signaux : on remet les
        # niveaux voulus (dont des ruptures et des stocks bas, pour la démo).
        for p, (_, _, _, _, stock, _, _) in zip(produits, PRODUITS):
            Product.objects.filter(pk=p.pk).update(stock_quantity=stock)

        self.stdout.write(self.style.SUCCESS(
            f'Démo créée : {len(produits)} produits, {len(clients)} clients, '
            f'{len(fournisseurs)} fournisseurs, 48 factures, 8 bons de commande.'))

    # --------------------------------------------------------------- rafraîchir
    def _rafraichir(self):
        from apps.accounts.models import Organization
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder

        org = Organization.objects.get(name=DEMO_ORG_NAME)
        derniere = Invoice.objects.filter(organization=org).order_by('-created_at').values_list('created_at', flat=True).first()
        if not derniere:
            self.stdout.write('Aucune facture à décaler.')
            return
        decalage = (timezone.now() - timedelta(days=1)) - derniere
        if decalage < timedelta(days=1):
            self.stdout.write('Données déjà à jour.')
            return
        jours = timedelta(days=decalage.days)
        with transaction.atomic():
            for f in Invoice.objects.filter(organization=org):
                Invoice.objects.filter(pk=f.pk).update(
                    created_at=f.created_at + jours,
                    due_date=(f.due_date + jours) if f.due_date else None,
                )
            for bc in PurchaseOrder.objects.filter(created_by__organization=org):
                PurchaseOrder.objects.filter(pk=bc.pk).update(
                    created_at=bc.created_at + jours,
                    required_date=(bc.required_date + jours) if bc.required_date else None,
                )
        self.stdout.write(self.style.SUCCESS(f'Dates décalées de {jours.days} jour(s).'))
