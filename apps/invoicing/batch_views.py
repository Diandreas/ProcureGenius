"""
Batch/Lot management API views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta, date

from .models import ProductBatch, Product, StockMovement
from .batch_serializers import ProductBatchSerializer, ProductBatchCreateSerializer


def _corriger_peremption(batch, valeur, utilisateur):
    """Applique une nouvelle date de peremption imprimee a un lot.

    Renvoie (liste_des_champs_modifies, erreur). La correction est tracee dans
    les notes du lot : la peremption imprimee est une donnee que l'on relit sur
    le flacon, il faut pouvoir savoir qui l'a changee et depuis quoi.
    """
    if valeur in (None, ''):
        return [], None
    try:
        nouvelle = date.fromisoformat(str(valeur)[:10])
    except ValueError:
        return [], "Date de péremption invalide."
    if nouvelle.year < 2000 or nouvelle.year > date.today().year + 30:
        return [], "Date de péremption invalide."
    if nouvelle == batch.expiry_date:
        return [], None
    qui = utilisateur.get_full_name() or utilisateur.username
    trace = "Péremption corrigée le %s par %s : %s → %s" % (
        date.today().strftime('%d/%m/%Y'), qui,
        batch.expiry_date.strftime('%d/%m/%Y') if batch.expiry_date else '(absente)',
        nouvelle.strftime('%d/%m/%Y'))
    batch.notes = chr(10).join(x for x in [(batch.notes or '').strip(), trace] if x)
    batch.expiry_date = nouvelle
    return ['expiry_date', 'notes'], None


class ProductBatchListCreateView(APIView):
    """List and create batches for a product"""
    permission_classes = [IsAuthenticated]

    def get(self, request, product_id):
        organization = request.user.organization
        batches = ProductBatch.objects.filter(
            organization=organization,
            product_id=product_id
        ).select_related('product')
        serializer = ProductBatchSerializer(batches, many=True)
        return Response(serializer.data)

    def post(self, request, product_id):
        organization = request.user.organization
        product = get_object_or_404(Product, id=product_id, organization=organization)

        serializer = ProductBatchCreateSerializer(data=request.data)
        if serializer.is_valid():
            batch = serializer.save(
                organization=organization,
                product=product,
                created_by=request.user
            )

            # Créer un mouvement de stock "réception" lié au lot
            if product.product_type == 'physical' and batch.quantity > 0:
                try:
                    # stock_quantity a deja ete recale par le signal ProductBatch
                    # sur la somme des lots : on relit, on n'ecrit pas. Ecrire
                    # ici comptait la reception deux fois pour le compteur.
                    old_stock = (product.stock_quantity or 0) - batch.quantity
                    product.refresh_from_db()
                    new_stock = product.total_stock
                    StockMovement.objects.create(
                        product=product,
                        batch=batch,
                        movement_type='reception',
                        quantity=batch.quantity,
                        quantity_before=old_stock,
                        quantity_after=new_stock,
                        reference_type='manual',
                        notes=f"Réception lot {batch.batch_number} — péremption {batch.expiry_date}",
                        created_by=request.user,
                    )
                except Exception as e:
                    # Ne pas bloquer la création du lot si le mouvement échoue
                    import traceback
                    traceback.print_exc()

            return Response(
                ProductBatchSerializer(batch).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductBatchDetailView(APIView):
    """Update a batch"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, batch_id):
        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)

        allowed_fields = ['quantity_remaining', 'notes', 'shelf_life_after_opening_days', 'lot_number']
        for field in allowed_fields:
            if field in request.data:
                setattr(batch, field, request.data[field])

        # La peremption imprimee passe par un chemin a part : elle est validee
        # et sa modification est tracee.
        if 'expiry_date' in request.data:
            _, erreur = _corriger_peremption(batch, request.data.get('expiry_date'), request.user)
            if erreur:
                return Response({'error': erreur}, status=status.HTTP_400_BAD_REQUEST)

        batch.save()
        batch.update_status()
        return Response(ProductBatchSerializer(batch).data)


class BatchOpenView(APIView):
    """Mark a batch as opened"""
    permission_classes = [IsAuthenticated]

    def post(self, request, batch_id):
        """
        Ouvre un lot. La date d'ouverture est SAISIE et obligatoire : un flacon
        est souvent ouvert a la paillasse et enregistre plus tard, la date du
        clic ne dit pas la verite.

        Corps : {"opened_at": "AAAA-MM-JJ", "shelf_life_after_opening_days": 30,
                 "save_as_product_default": true, "storage_conditions": "2-8 °C",
                 "expiry_date": "AAAA-MM-JJ"}

        expiry_date est facultatif : c'est l'occasion de corriger la peremption
        imprimee, qu'on relit sur le flacon au moment de l'ouvrir.
        """
        from datetime import datetime, time as dtime
        from .models import Product

        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)

        if batch.status not in ('available',):
            return Response(
                {'error': 'Ce lot ne peut pas être ouvert (statut actuel: {})'.format(batch.get_status_display())},
                status=status.HTTP_400_BAD_REQUEST
            )

        brut = str(request.data.get('opened_at') or '').strip()
        if not brut:
            return Response({'error': "La date d'ouverture est obligatoire."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            jour = date.fromisoformat(brut[:10])
        except ValueError:
            return Response({'error': "Date d'ouverture invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if jour > date.today():
            return Response({'error': "La date d'ouverture ne peut pas être dans le futur."},
                            status=status.HTTP_400_BAD_REQUEST)

        stabilite = request.data.get('shelf_life_after_opening_days')
        if stabilite in (None, ''):
            stabilite = batch.shelf_life_after_opening_days or batch.product.default_shelf_life_after_opening
        else:
            try:
                stabilite = int(stabilite)
                if stabilite <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response({'error': "La stabilité après ouverture doit être un nombre de jours positif."},
                                status=status.HTTP_400_BAD_REQUEST)

        # Parametres du reactif, memorises sur le produit. update() plutot que
        # save() : Product.save() lance une validation complete qui peut buter
        # sur d'anciennes donnees sans rapport avec l'ouverture.
        maj_produit = {}
        if request.data.get('save_as_product_default') and stabilite:
            maj_produit['default_shelf_life_after_opening'] = stabilite
        if request.data.get('storage_conditions') is not None:
            maj_produit['storage_conditions'] = str(request.data.get('storage_conditions')).strip()[:100]
        tests_saisis = request.data.get('tests_per_unit')
        if tests_saisis not in (None, ''):
            try:
                tests_saisis = int(tests_saisis)
                if tests_saisis <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response({'error': 'Le nombre de tests par flacon doit être un entier positif.'},
                                status=status.HTTP_400_BAD_REQUEST)
            maj_produit['tests_per_unit'] = tests_saisis
        if maj_produit:
            Product.objects.filter(pk=batch.product_id).update(**maj_produit)

        champs_peremption, erreur = _corriger_peremption(
            batch, request.data.get('expiry_date'), request.user)
        if erreur:
            return Response({'error': erreur}, status=status.HTTP_400_BAD_REQUEST)

        batch.opened_at = timezone.make_aware(datetime.combine(jour, dtime(8, 0)))
        batch.opened_by = request.user
        batch.shelf_life_after_opening_days = stabilite
        batch.status = 'opened'
        batch.save(update_fields=['opened_at', 'opened_by', 'shelf_life_after_opening_days',
                                  'status'] + champs_peremption)

        # Reactif compte en tests : le flacon ouvert demarre plein, puis on
        # rattrape les examens faits pendant qu'aucun flacon n'etait ouvert.
        produit = Product.objects.get(pk=batch.product_id)
        if produit.tests_per_unit:
            batch.tests_remaining = produit.tests_per_unit
            batch.save(update_fields=['tests_remaining'])
            en_attente = produit.untracked_tests or 0
            if en_attente:
                Product.objects.filter(pk=produit.pk).update(untracked_tests=0)
                produit.refresh_from_db()
                produit.consommer_tests(en_attente, user=request.user,
                                        notes="Rattrapage d'examens faits sans flacon ouvert")
            batch.refresh_from_db()
        return Response(ProductBatchSerializer(batch).data)


class BatchCloseView(APIView):
    """
    Cloture un lot : flacon termine, perime, contamine, CQ non conforme, autre.
    La quantite restante eventuelle sort du stock — perte tracee avec son motif,
    ou simple ajustement si le flacon est termine.
    """
    permission_classes = [IsAuthenticated]

    MOTIFS = {
        'depleted': ('adjustment', None, 'Flacon terminé'),
        'expired': ('loss', 'expired', 'Périmé'),
        'contaminated': ('loss', 'damaged', 'Contaminé / altéré'),
        'qc_failed': ('loss', 'quality_issue', 'Contrôle qualité non conforme'),
        'other': ('loss', 'other', 'Autre'),
    }

    def post(self, request, batch_id):
        from django.db import transaction

        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)
        if batch.closed_at:
            return Response({'error': 'Ce lot est déjà clôturé.'}, status=status.HTTP_400_BAD_REQUEST)

        motif = request.data.get('reason')
        if motif not in self.MOTIFS:
            return Response({'error': 'Motif de clôture invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        note = str(request.data.get('notes') or '').strip()
        type_mouvement, raison_perte, libelle = self.MOTIFS[motif]

        with transaction.atomic():
            restant = batch.quantity_remaining or 0
            if restant > 0:
                mouvement = batch.product.adjust_stock(
                    quantity=-restant,
                    movement_type=type_mouvement,
                    reference_type='manual',
                    notes="Clôture lot %s — %s%s" % (batch.batch_number, libelle, (' : ' + note) if note else ''),
                    user=request.user,
                    batch=batch,
                )
                if mouvement and raison_perte:
                    mouvement.loss_reason = raison_perte
                    mouvement.loss_description = note
                    if batch.product.cost_price:
                        mouvement.loss_value = batch.product.cost_price * restant
                    mouvement.save(update_fields=['loss_reason', 'loss_description', 'loss_value'])
                batch.refresh_from_db()

            batch.closed_at = timezone.now()
            batch.closed_by = request.user
            batch.closure_reason = motif
            batch.closure_notes = note
            batch.status = 'expired' if motif == 'expired' else 'depleted'
            batch.tests_remaining = 0 if batch.tests_remaining is not None else None
            batch.save(update_fields=['closed_at', 'closed_by', 'closure_reason', 'closure_notes', 'status',
                                      'tests_remaining'])

        return Response(ProductBatchSerializer(batch).data)


class BatchOpeningLabelView(APIView):
    """Etiquette d'ouverture (PDF 60 x 40 mm) a coller sur le flacon."""
    permission_classes = [IsAuthenticated]

    def get(self, request, batch_id):
        from django.http import HttpResponse
        from django.utils.html import escape
        from weasyprint import HTML

        batch = get_object_or_404(ProductBatch, id=batch_id, organization=request.user.organization)
        if not batch.opened_at:
            return Response({'error': "Ce lot n'est pas ouvert."}, status=status.HTTP_400_BAD_REQUEST)

        ouvert_le = timezone.localtime(batch.opened_at).strftime('%d/%m/%Y')
        limite = batch.effective_expiry.strftime('%d/%m/%Y') if batch.effective_expiry else '-'
        par = batch.opened_by
        nom = (par.get_full_name() or par.username) if par else ''
        initiales = ''.join(m[0] for m in nom.split() if m).upper()[:3]
        conservation = batch.product.storage_conditions or ''
        stabilite = ('%s j après ouverture' % batch.shelf_life_after_opening_days
                     if batch.shelf_life_after_opening_days else '')

        lignes = [
            "<div class='nom'>%s</div>" % escape(batch.product.name),
            "<div>Lot <b>%s</b></div>" % escape(batch.batch_number),
            "<div>Ouvert le <b>%s</b>%s</div>" % (ouvert_le, (' par <b>%s</b>' % escape(initiales)) if initiales else ''),
            "<div class='limite'>À utiliser avant : %s</div>" % limite,
        ]
        if stabilite or conservation:
            lignes.append("<div class='petit'>%s</div>" % escape(' · '.join(x for x in (stabilite, conservation) if x)))

        html = (
            "<!DOCTYPE html><html><head><meta charset='utf-8'><style>"
            "@page { size: 60mm 40mm; margin: 2mm; }"
            "body { font-family: Helvetica, Arial, sans-serif; font-size: 7.5pt; line-height: 1.3; margin: 0; }"
            ".nom { font-weight: bold; font-size: 8.5pt; margin-bottom: 1mm; }"
            ".limite { font-weight: bold; font-size: 9pt; margin-top: 1mm; border-top: 0.3mm solid #000; padding-top: 1mm; }"
            ".petit { font-size: 6.5pt; color: #333; margin-top: 0.5mm; }"
            "</style></head><body>" + ''.join(lignes) + "</body></html>"
        )
        pdf = HTML(string=html).write_pdf()
        reponse = HttpResponse(pdf, content_type='application/pdf')
        reponse['Content-Disposition'] = 'inline; filename="etiquette-ouverture-%s.pdf"' % batch.batch_number
        return reponse


class ExpiringBatchesView(APIView):
    """Get batches expiring within N days"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        days = int(request.query_params.get('days', 30))

        cutoff_date = date.today() + timedelta(days=days)

        batches = ProductBatch.objects.filter(
            organization=organization,
            status__in=['available', 'opened'],
            expiry_date__lte=cutoff_date,
            quantity_remaining__gt=0
        ).select_related('product').order_by('expiry_date')

        results = []
        for batch in batches:
            results.append({
                'id': str(batch.id),
                'product_id': str(batch.product_id),
                'product_name': batch.product.name,
                'batch_number': batch.batch_number,
                'quantity_remaining': batch.quantity_remaining,
                'expiry_date': batch.expiry_date.isoformat(),
                'effective_expiry': batch.effective_expiry.isoformat(),
                'days_until_expiry': batch.days_until_expiry,
                'status': batch.status,
                'is_expired': batch.is_expired,
            })

        return Response({
            'batches': results,
            'total': len(results),
            'expired_count': sum(1 for b in results if b['is_expired']),
            'expiring_soon_count': sum(1 for b in results if 0 < b['days_until_expiry'] <= 7),
        })


class OpenedReagentsView(APIView):
    """Get all opened batches (reagents) with their effective expiry tracking"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        show_all = request.query_params.get('all', 'false') == 'true'

        filters = {
            'organization': organization,
            'quantity_remaining__gt': 0,
        }

        if show_all:
            filters['status__in'] = ['available', 'opened']
        else:
            filters['status'] = 'opened'

        # Uniquement les categories « laboratoire » ou « reactif » : sans ce
        # filtre, l'ecran listait aussi les medicaments et le materiel medical.
        from django.db.models import Q
        categorie_reactif = (
            Q(product__category__name__icontains='labo')
            | Q(product__category__name__icontains='réactif')
            | Q(product__category__name__icontains='reactif')
        )
        batches = ProductBatch.objects.filter(
            categorie_reactif, **filters
        ).select_related('product', 'opened_by').order_by('expiry_date')

        results = []
        for batch in batches:
            eff_expiry = batch.effective_expiry
            days_left = (eff_expiry - date.today()).days if eff_expiry else batch.days_until_expiry

            results.append({
                'id': str(batch.id),
                'product_id': str(batch.product_id),
                'product_name': batch.product.name,
                'product_reference': batch.product.reference,
                'batch_number': batch.batch_number,
                'lot_number': batch.lot_number or '',
                'quantity': batch.quantity,
                'quantity_remaining': batch.quantity_remaining,
                'expiry_date': batch.expiry_date.isoformat() if batch.expiry_date else None,
                'opened_at': batch.opened_at.isoformat() if batch.opened_at else None,
                'shelf_life_after_opening_days': batch.shelf_life_after_opening_days,
                'effective_expiry': eff_expiry.isoformat() if eff_expiry else None,
                'days_until_expiry': days_left,
                'status': batch.status,
                'is_expired': batch.is_expired,
                'default_shelf_life': getattr(batch.product, 'default_shelf_life_after_opening', None),
                'storage_conditions': batch.product.storage_conditions,
                'opened_by_name': (batch.opened_by.get_full_name() or batch.opened_by.username) if batch.opened_by_id else None,
                'qc_status': batch.qc_status,
                'qc_last_on': batch.qc_last.performed_on.isoformat() if batch.qc_last else None,
                'tests_per_unit': batch.product.tests_per_unit,
                'tests_remaining': batch.tests_remaining,
                # Tests encore disponibles sur tout le lot : flacon en cours + flacons fermes.
                'tests_total_left': (
                    (batch.tests_remaining or 0)
                    + max(0, batch.quantity_remaining - 1) * batch.product.tests_per_unit
                ) if (batch.product.tests_per_unit and batch.status == 'opened') else None,
                'low_tests': bool(
                    batch.product.tests_per_unit and batch.status == 'opened'
                    and batch.tests_remaining is not None
                    and batch.tests_remaining <= max(5, batch.product.tests_per_unit // 10)
                ),
            })

        return Response({
            'batches': results,
            'total': len(results),
            'opened_count': sum(1 for b in results if b['status'] == 'opened'),
            'expired_count': sum(1 for b in results if b['is_expired']),
            # Flacons ouverts presque vides (<= 10 % des tests, au moins 5).
            'low_tests_count': sum(1 for b in results if b.get('low_tests')),
            # Lots ouverts utilises sans controle qualite enregistre.
            'qc_pending_count': sum(1 for b in results
                                    if b['status'] == 'opened' and b.get('qc_status') == 'pending'),
            'qc_failed_count': sum(1 for b in results if b.get('qc_status') == 'non_conform'),
            # Reactifs dont des examens ont ete faits sans flacon ouvert.
            'untracked': [
                {'product_id': str(p.id), 'name': p.name, 'untracked_tests': p.untracked_tests}
                for p in Product.objects.filter(
                    organization=organization, untracked_tests__gt=0
                ).filter(
                    Q(category__name__icontains='labo')
                    | Q(category__name__icontains='réactif')
                    | Q(category__name__icontains='reactif')
                ).order_by('-untracked_tests')
            ],
            # Jamais renvoye jusqu'ici : la carte « Expirent bientot » restait vide.
            'expiring_soon_count': sum(
                1 for b in results
                if not b['is_expired'] and b['days_until_expiry'] is not None
                and b['days_until_expiry'] <= 3
            ),
            'expiring_soon_count': sum(1 for b in results if b['days_until_expiry'] is not None and 0 < b['days_until_expiry'] <= 3),
        })

class BatchDeleteView(APIView):
    """
    DELETE /api/batches/<uuid>/delete/
    Supprime un lot uniquement dans les 30 minutes suivant sa creation.
    Inverse le mouvement de reception et met a jour le stock.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, batch_id):
        organization = request.user.organization
        batch = get_object_or_404(ProductBatch, id=batch_id, organization=organization)

        # Verifier la fenetre de 30 minutes
        elapsed_seconds = (timezone.now() - batch.received_at).total_seconds()
        if elapsed_seconds > 1800:
            minutes_elapsed = int(elapsed_seconds / 60)
            return Response(
                {'error': f'Suppression impossible : le lot a ete cree il y a {minutes_elapsed} min (limite : 30 min).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Interdire si des mouvements autres que reception existent (lot deja utilise)
        non_reception_count = batch.movements.exclude(movement_type='reception').count()
        if non_reception_count > 0:
            return Response(
                {'error': 'Ce lot a des mouvements de sortie. Suppression impossible.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = batch.product

        # Calculer la quantite recue via les mouvements de reception
        reception_qty = batch.movements.filter(
            movement_type='reception'
        ).aggregate(total=Sum('quantity'))['total'] or batch.quantity

        # Inverser le stock
        product.stock_quantity = max(0, (product.stock_quantity or 0) - reception_qty)
        product.save(update_fields=['stock_quantity'])

        # Supprimer les mouvements puis le lot
        batch.movements.all().delete()
        batch_number = batch.batch_number
        batch.delete()

        return Response({
            'message': f'Lot {batch_number} supprime. Stock remis a {product.stock_quantity}.',
            'product_stock': product.stock_quantity,
        })
