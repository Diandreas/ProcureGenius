#!/usr/bin/env python
"""
Script de diagnostic pour vérifier les problèmes de clients dans les factures
Usage: python manage.py shell < diagnostic_clients_data.py
Ou: python diagnostic_clients_data.py (si exécuté avec Django)
"""

print("=" * 80)
print("DIAGNOSTIC DES CLIENTS ET FACTURES")
print("=" * 80)
print()

# Import des modèles
from apps.invoicing.models import Invoice, InvoiceItem, Product
from apps.accounts.models import Client

# 1. Vérifier les factures sans client
print("1. FACTURES SANS CLIENT ASSOCIÉ")
print("-" * 80)
factures_sans_client = Invoice.objects.filter(client__isnull=True)
count_sans_client = factures_sans_client.count()
print(f"Nombre de factures sans client: {count_sans_client}")

if count_sans_client > 0:
    print("\nDétail des factures sans client:")
    for inv in factures_sans_client[:10]:  # Limiter à 10
        print(f"  ⚠️  {inv.invoice_number} - {inv.title} (Créée le: {inv.created_at.strftime('%d/%m/%Y')})")
    if count_sans_client > 10:
        print(f"  ... et {count_sans_client - 10} autres")
else:
    print("  ✅ Toutes les factures ont un client associé")
print()

# 2. Vérifier les clients sans nom
print("2. CLIENTS SANS NOM")
print("-" * 80)
from django.db.models import Q
clients_sans_nom = Client.objects.filter(Q(name__isnull=True) | Q(name=''))
count_clients_sans_nom = clients_sans_nom.count()
print(f"Nombre de clients sans nom: {count_clients_sans_nom}")

if count_clients_sans_nom > 0:
    print("\nDétail des clients sans nom:")
    for client in clients_sans_nom[:10]:
        factures_count = client.invoices.count()
        print(f"  ⚠️  ID: {str(client.id)[:8]}... | Email: {client.email or 'N/A'} | Factures: {factures_count}")
    if count_clients_sans_nom > 10:
        print(f"  ... et {count_clients_sans_nom - 10} autres")
else:
    print("  ✅ Tous les clients ont un nom")
print()

# 3. Vérifier les items de facture et leurs clients
print("3. ANALYSE DES ITEMS DE FACTURE")
print("-" * 80)
total_items = InvoiceItem.objects.count()
items_avec_facture_sans_client = InvoiceItem.objects.filter(invoice__client__isnull=True).count()
print(f"Total d'items de facture: {total_items}")
print(f"Items dont la facture n'a pas de client: {items_avec_facture_sans_client}")

if items_avec_facture_sans_client > 0:
    print(f"  ⚠️  {items_avec_facture_sans_client} items affecté(s)")
else:
    print("  ✅ Tous les items ont une facture avec client")
print()

# 4. Vérifier un échantillon de produits et leurs factures
print("4. ÉCHANTILLON PRODUITS → FACTURES → CLIENTS")
print("-" * 80)
produits_avec_factures = Product.objects.filter(invoice_items__isnull=False).distinct()[:5]

if produits_avec_factures:
    for product in produits_avec_factures:
        print(f"\nProduit: {product.name} ({product.reference})")
        items = product.invoice_items.select_related('invoice', 'invoice__client').all()[:3]
        for item in items:
            invoice = item.invoice
            if invoice.client:
                client_info = f"✅ {invoice.client.name}"
            else:
                client_info = "⚠️  PAS DE CLIENT"
            print(f"  └─ Facture {invoice.invoice_number}: {client_info}")
else:
    print("  ℹ️  Aucun produit avec factures trouvé")
print()

# 5. Statistiques générales
print("5. STATISTIQUES GÉNÉRALES")
print("-" * 80)
total_factures = Invoice.objects.count()
total_clients = Client.objects.count()
factures_avec_client = Invoice.objects.filter(client__isnull=False).count()
pourcentage_avec_client = (factures_avec_client / total_factures * 100) if total_factures > 0 else 0

print(f"Total factures: {total_factures}")
print(f"Total clients: {total_clients}")
print(f"Factures avec client: {factures_avec_client} ({pourcentage_avec_client:.1f}%)")
print(f"Factures sans client: {count_sans_client} ({100-pourcentage_avec_client:.1f}%)")
print()

# 6. Recommandations
print("6. RECOMMANDATIONS")
print("-" * 80)

if count_sans_client > 0:
    print(f"⚠️  {count_sans_client} facture(s) sans client détectée(s)")
    print("   Action: Exécuter le script de correction pour associer un client par défaut")
    print("   Commande: python manage.py correction_factures_sans_client")
    print()

if count_clients_sans_nom > 0:
    print(f"⚠️  {count_clients_sans_nom} client(s) sans nom détecté(s)")
    print("   Action: Mettre à jour les noms des clients")
    print("   Script Python disponible dans DIAGNOSTIC_CLIENTS.md")
    print()

if count_sans_client == 0 and count_clients_sans_nom == 0:
    print("✅ Aucun problème détecté!")
    print("   Les données semblent cohérentes.")
    print()
    print("   Si vous voyez encore 'N/A' dans l'interface:")
    print("   1. Vérifiez que le serveur backend est redémarré")
    print("   2. Rafraîchissez le cache du navigateur (Ctrl+Shift+R)")
    print("   3. Vérifiez les logs: tail -f logs/django.log")

print()
print("=" * 80)
print("FIN DU DIAGNOSTIC")
print("=" * 80)

