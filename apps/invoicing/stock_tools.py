"""
Outils de stock : lecture d'un code scanné, inventaire physique, réception de marchandise.

Toutes les variations de stock passent par Product.adjust_stock (mouvement tracé, alertes de stock
bas), et chaque fonction travaille dans une seule transaction : un inventaire ou une réception ne
reste jamais à moitié enregistré.
"""
import calendar
import re
from datetime import date

from django.db import transaction
from django.utils import timezone

from .models import InventoryLine, InventorySession, Product, ProductBatch, StockMovement


# ------------------------------------------------------------------ lecture d'un code

def parse_gs1(code):
    """
    Découpe un code GS1 (DataMatrix ou GS1-128 des boîtes de médicaments, de nombreux produits
    emballés) en identifiants : 01 GTIN, 10 lot, 17 péremption AAMMJJ, 21 série.
    Accepte « (01)…(17)…(10)… » et l'écriture brute avec séparateur FNC1. {} si ce n'est pas du GS1.
    """
    if not code:
        return {}
    texte = code.strip()
    if texte[:3] in (']d2', ']Q3', ']C1'):
        texte = texte[3:]
    if texte.startswith('('):
        return {ai: val for ai, val in re.findall(r'\((\d{2,4})\)([^(]+)', texte)}
    fixes = {'01': 14, '11': 6, '15': 6, '17': 6}
    variables = {'10', '21', '240', '91'}
    if not texte.startswith('01') or len(texte) < 16:
        return {}
    res, i = {}, 0
    while i < len(texte):
        if texte[i] == '\x1d':
            i += 1
            continue
        ai2, ai3 = texte[i:i + 2], texte[i:i + 3]
        if ai2 in fixes:
            res[ai2] = texte[i + 2:i + 2 + fixes[ai2]]
            i += 2 + fixes[ai2]
        elif ai2 in variables or ai3 in variables:
            ai = ai3 if ai3 in variables else ai2
            fin = texte.find('\x1d', i + len(ai))
            fin = len(texte) if fin == -1 else fin
            res[ai] = texte[i + len(ai):fin]
            i = fin
        else:
            break
    return res if res.get('01') else {}


def _gs1_date(raw):
    if not raw or len(raw) != 6 or not raw.isdigit():
        return None
    an, mois, jour = 2000 + int(raw[:2]), int(raw[2:4]), int(raw[4:6])
    if not 1 <= mois <= 12:
        return None
    if jour == 0:  # GS1 : jour 00 = dernier jour du mois
        jour = calendar.monthrange(an, mois)[1]
    try:
        return date(an, mois, jour)
    except ValueError:
        return None


def resolve_code(organization, code):
    """
    Produit (et lot) correspondant à un code scanné ou tapé :
    code-barres fournisseur (EAN/UPC), GS1 (GTIN + lot), étiquette Procura « REFERENCE|LOT »,
    référence interne, ou numéro de lot seul. Retourne (produit, lot, infos_gs1) ; produit None si inconnu.
    """
    code = (code or '').strip()
    base = Product.objects.filter(organization=organization)
    gs1 = parse_gs1(code)
    lot_number = None
    candidats = []
    if gs1.get('01'):
        gtin = gs1['01']
        candidats = [gtin, gtin.lstrip('0'), gtin[1:] if gtin.startswith('0') else gtin]
        reference, lot_number = gtin, gs1.get('10')
    elif '|' in code:
        reference, lot_number = [p.strip() for p in code.split('|', 1)]
    else:
        reference = code

    produit = None
    for c in candidats:
        if c:
            produit = base.filter(barcode=c).first()
            if produit:
                break
    produit = produit or base.filter(barcode=reference).first() or base.filter(reference__iexact=reference).first()

    lot = None
    if produit is None:
        lot = ProductBatch.objects.filter(product__organization=organization, batch_number__iexact=reference) \
            .select_related('product').first()
        produit = lot.product if lot else None
    elif lot_number:
        lot = produit.batches.filter(batch_number__iexact=lot_number).first()

    infos = None
    if gs1:
        exp = _gs1_date(gs1.get('17'))
        infos = {'gtin': gs1.get('01'), 'lot': gs1.get('10'), 'serial': gs1.get('21'),
                 'expiry_date': exp.isoformat() if exp else None}
    return produit, lot, infos


# ------------------------------------------------------------------ inventaire

def next_reference(organization):
    base = f"INV-{timezone.localdate():%Y%m%d}"
    n = InventorySession.objects.filter(organization=organization, reference__startswith=base).count() + 1
    return f"{base}-{n}"


def _physical_products(organization, warehouse=None):
    qs = Product.objects.filter(organization=organization, product_type='physical', is_active=True)
    if warehouse is not None:
        qs = qs.filter(warehouse=warehouse) | qs.filter(batches__warehouse=warehouse, batches__is_active=True)
    return qs.distinct().prefetch_related('batches')


def start_inventory(organization, user, warehouse=None, notes=''):
    """
    Ouvre un inventaire : une ligne par produit physique ; pour un produit suivi par lots, une ligne
    par lot actif (chaque lot a sa quantité et sa péremption). Le stock attendu est figé maintenant.
    """
    with transaction.atomic():
        session = InventorySession.objects.create(
            organization=organization, reference=next_reference(organization), warehouse=warehouse,
            created_by=user, notes=notes or '')
        lines = []
        for p in _physical_products(organization, warehouse):
            lots = [b for b in p.batches.all() if b.is_active and (warehouse is None or b.warehouse_id == warehouse.pk)]
            if lots:
                lines += [InventoryLine(session=session, product=p, batch=b, expected=b.current_quantity) for b in lots]
            else:
                lines.append(InventoryLine(session=session, product=p, expected=p.stock_quantity))
        InventoryLine.objects.bulk_create(lines)
    return session


def current_quantity(line):
    """Stock théorique actuel de la ligne (il peut avoir bougé depuis l'ouverture : ventes, réceptions)."""
    if line.batch_id:
        line.batch.refresh_from_db(fields=['current_quantity'])
        return line.batch.current_quantity
    line.product.refresh_from_db(fields=['stock_quantity'])
    return line.product.stock_quantity


def apply_inventory(session, user):
    """
    Applique les quantités comptées. Écart = compté − stock théorique ACTUEL (ce qui a été vendu ou
    reçu entre l'ouverture et l'application est ainsi respecté). Lignes non comptées : ignorées.
    Retourne le rapport {'adjusted': [...], 'unchanged': n, 'not_counted': n, 'value': écart en valeur}.
    """
    if session.status != 'draft':
        raise ValueError("Cet inventaire n'est plus en cours.")
    rapport = {'adjusted': [], 'unchanged': 0, 'not_counted': 0, 'value': 0}
    with transaction.atomic():
        session = InventorySession.objects.select_for_update().get(pk=session.pk)
        if session.status != 'draft':
            raise ValueError("Cet inventaire n'est plus en cours.")
        for line in session.lines.select_related('product', 'batch').order_by('product__name'):
            if line.counted is None:
                rapport['not_counted'] += 1
                continue
            avant = current_quantity(line)
            delta = line.counted - avant
            line.applied_delta = delta
            line.save(update_fields=['applied_delta'])
            if delta == 0:
                rapport['unchanged'] += 1
                continue
            note = f"Inventaire {session.reference}" + (f" — lot {line.batch.batch_number}" if line.batch_id else '') + \
                   f" : compté {line.counted}, théorique {avant}"
            mvt = line.product.adjust_stock(delta, 'adjustment', reference_type='manual', reference_id=session.pk,
                                            notes=note, user=user, batch=line.batch if line.batch_id else None)
            if mvt is not None:
                StockMovement.objects.filter(pk=mvt.pk).update(reference_number=session.reference)
            valeur = float(delta * (line.product.cost_price or 0))
            rapport['value'] += valeur
            rapport['adjusted'].append({'product': line.product.name, 'batch': line.batch.batch_number if line.batch_id else None,
                                        'before': avant, 'counted': line.counted, 'delta': delta, 'value': valeur})
        session.status = 'applied'
        session.applied_by = user
        session.applied_at = timezone.now()
        session.save(update_fields=['status', 'applied_by', 'applied_at'])
    return rapport


# ------------------------------------------------------------------ réception

def receive_goods(organization, user, product, quantity, batch_number='', expiration_date=None, warehouse=None,
                  unit_cost=None, reference=''):
    """
    Entrée de marchandise hors bon de commande (achat au marché, retour fournisseur, stock initial).
    Avec un numéro de lot : le lot est créé ou complété. Sans lot : le stock du produit augmente.
    """
    if product.organization_id != organization.pk or product.product_type != 'physical':
        raise ValueError("Produit introuvable.")
    if quantity <= 0:
        raise ValueError("La quantité doit être positive.")
    with transaction.atomic():
        lot = None
        if batch_number:
            batch_number = batch_number.strip()
            # Premier lot d'un produit déjà en stock sans lot : le stock existant est d'abord rangé dans un
            # lot « INITIAL ». À faire AVANT de créer le nouveau lot : la création d'un lot recalcule le stock
            # du produit comme la somme de ses lots (signal), ce qui effacerait ce stock.
            if (product.stock_quantity > 0 and not product.batches.filter(is_active=True).exists()
                    and not product.batches.filter(batch_number=batch_number).exists()):
                ProductBatch.objects.get_or_create(
                    product=product, batch_number='INITIAL',
                    defaults={'initial_quantity': product.stock_quantity, 'current_quantity': product.stock_quantity,
                              'warehouse': product.warehouse, 'is_active': True})
            lot, created = ProductBatch.objects.get_or_create(
                product=product, batch_number=batch_number,
                defaults={'expiration_date': expiration_date, 'initial_quantity': 0, 'current_quantity': 0,
                          'warehouse': warehouse or product.warehouse, 'is_active': True})
            product.refresh_from_db(fields=['stock_quantity'])
            if not created and expiration_date and not lot.expiration_date:
                lot.expiration_date = expiration_date
            lot.initial_quantity += quantity
            lot.is_active = True
            lot.save()
        if unit_cost is not None and unit_cost > 0:
            product.cost_price = unit_cost
            product.save(update_fields=['cost_price'])
        mvt = product.adjust_stock(quantity, 'reception', reference_type='manual',
                                   notes=f"Réception{(' ' + reference) if reference else ''}", user=user, batch=lot)
        if mvt is not None and reference:
            StockMovement.objects.filter(pk=mvt.pk).update(reference_number=reference[:100])
    product.refresh_from_db()
    return product, lot, mvt
