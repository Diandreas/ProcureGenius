"""
Inventory Analytics Views
Provides detailed analytics for stock management, reorder quantities, and risk analysis
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, F, Max, Q, DecimalField, Value, CharField, Case, When
from django.db.models.functions import TruncDate, Coalesce
from datetime import date, timedelta, datetime
from apps.invoicing.models import Product, StockMovement, ProductCategory
from apps.analytics.wilson_service import get_wilson_analysis, calculate_eoq, calculate_reorder_point, calculate_product_score
from apps.analytics.predictive_restock import get_all_predictions


class ReorderQuantitiesView(APIView):
    """
    Calculate reorder quantities for low stock products
    Based on average daily usage and recommended stock levels
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        # Get products below threshold (PHYSICAL ONLY)
        low_stock_products = Product.objects.filter(
            organization=organization,
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold'),
            is_active=True
        )

        results = []
        total_recommended_value = 0

        for product in low_stock_products:
            # Calculate average daily usage (last 30 days)
            thirty_days_ago = date.today() - timedelta(days=30)
            # Use 'sale' movement_type (sales reduce stock)
            usage = StockMovement.objects.filter(
                product=product,
                movement_type='sale',
                created_at__gte=thirty_days_ago
            ).aggregate(total=Sum('quantity'))['total'] or 0
            # Quantity is negative for sales, so use absolute value
            usage = abs(usage) if usage else 0

            avg_daily_usage = usage / 30 if usage > 0 else 0
            days_until_stockout = (product.stock_quantity / avg_daily_usage) if avg_daily_usage > 0 else 999

            # Recommended order: 60 days supply (2 months)
            recommended_qty = int(avg_daily_usage * 60) if avg_daily_usage > 0 else product.low_stock_threshold * 2
            recommended_value = recommended_qty * (product.cost_price or 0)

            # Determine urgency
            if days_until_stockout <= 3:
                urgency = 'high'
            elif days_until_stockout <= 7:
                urgency = 'medium'
            else:
                urgency = 'low'

            results.append({
                'product_id': str(product.id),
                'product_name': product.name,
                'product_code': product.code or 'N/A',
                'current_stock': float(product.stock_quantity),
                'low_stock_threshold': float(product.low_stock_threshold) if product.low_stock_threshold else 0,
                'avg_daily_usage': round(avg_daily_usage, 2),
                'days_until_stockout': int(days_until_stockout) if days_until_stockout < 999 else None,
                'recommended_order_qty': recommended_qty,
                'recommended_order_value': float(recommended_value),
                'unit': product.unit or 'unité',
                'urgency': urgency
            })

            total_recommended_value += recommended_value

        # Sort by urgency then by days until stockout
        results.sort(key=lambda x: (
            {'high': 0, 'medium': 1, 'low': 2}[x['urgency']],
            x['days_until_stockout'] if x['days_until_stockout'] else 999
        ))

        return Response({
            'products_to_reorder': results,
            'summary': {
                'total_products_low': len(results),
                'total_recommended_order_value': float(total_recommended_value),
                'high_urgency_count': len([r for r in results if r['urgency'] == 'high']),
                'medium_urgency_count': len([r for r in results if r['urgency'] == 'medium']),
                'low_urgency_count': len([r for r in results if r['urgency'] == 'low'])
            }
        })


class StockoutRiskAnalysisView(APIView):
    """
    Analyze stockout risk for all products
    Categorized by high, medium, and low risk
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        products = Product.objects.filter(
            organization=organization,
            product_type='physical',
            is_active=True,
            stock_quantity__gt=0
        )

        high_risk = []
        medium_risk = []
        low_risk = []

        for product in products:
            # Calculate average daily usage (last 30 days)
            thirty_days_ago = date.today() - timedelta(days=30)
            # Use 'sale' movement_type (sales reduce stock)
            usage = StockMovement.objects.filter(
                product=product,
                movement_type='sale',
                created_at__gte=thirty_days_ago
            ).aggregate(total=Sum('quantity'))['total'] or 0
            # Quantity is negative for sales, so use absolute value
            usage = abs(usage) if usage else 0

            avg_daily_usage = usage / 30 if usage > 0 else 0
            days_until_stockout = (product.stock_quantity / avg_daily_usage) if avg_daily_usage > 0 else 999

            # Calculate risk score (0-100)
            # Factors: days until stockout, current vs threshold ratio
            if days_until_stockout < 999:
                days_score = max(0, 100 - (days_until_stockout * 10))  # Max score when days < 10
            else:
                days_score = 0

            threshold_ratio = (product.stock_quantity / product.low_stock_threshold) if product.low_stock_threshold else 1
            threshold_score = max(0, 100 - (threshold_ratio * 100))

            risk_score = int((days_score * 0.7) + (threshold_score * 0.3))

            product_data = {
                'product_name': product.name,
                'product_code': product.code or 'N/A',
                'current_stock': float(product.stock_quantity),
                'days_until_stockout': int(days_until_stockout) if days_until_stockout < 999 else None,
                'avg_daily_usage': round(avg_daily_usage, 2),
                'risk_score': risk_score,
                'unit': product.unit or 'unité'
            }

            # Categorize by risk
            if risk_score >= 70:
                high_risk.append(product_data)
            elif risk_score >= 40:
                medium_risk.append(product_data)
            else:
                low_risk.append(product_data)

        # Sort each category by risk score
        high_risk.sort(key=lambda x: x['risk_score'], reverse=True)
        medium_risk.sort(key=lambda x: x['risk_score'], reverse=True)
        low_risk.sort(key=lambda x: x['risk_score'], reverse=True)

        return Response({
            'high_risk': high_risk[:20],  # Limit to top 20
            'medium_risk': medium_risk[:20],
            'low_risk': low_risk[:20],
            'summary': {
                'total_high_risk': len(high_risk),
                'total_medium_risk': len(medium_risk),
                'total_low_risk': len(low_risk)
            }
        })


class AtRiskProductsView(APIView):
    """
    Identify at-risk products:
    - Expiring soon
    - Slow-moving (no movement in 60 days)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        # Expiring products (within 60 days)
        sixty_days = date.today() + timedelta(days=60)
        expiring = Product.objects.filter(
            organization=organization,
            expiry_date__lte=sixty_days,
            expiry_date__gte=date.today(),
            stock_quantity__gt=0
        ).values(
            'id', 'name', 'code', 'expiry_date', 'stock_quantity', 'cost_price', 'unit'
        )

        expiring_data = []
        for product in expiring:
            days_until_expiry = (product['expiry_date'] - date.today()).days
            estimated_value = product['stock_quantity'] * (product['cost_price'] or 0)

            expiring_data.append({
                'product_id': str(product['id']),
                'product_name': product['name'],
                'product_code': product['code'] or 'N/A',
                'expiry_date': product['expiry_date'].strftime('%Y-%m-%d'),
                'days_until_expiry': days_until_expiry,
                'stock_quantity': float(product['stock_quantity']),
                'estimated_value': float(estimated_value),
                'unit': product['unit'] or 'unité'
            })

        # Sort by days until expiry
        expiring_data.sort(key=lambda x: x['days_until_expiry'])

        # Slow moving products (no movement in 60 days)
        sixty_days_ago = date.today() - timedelta(days=60)
        all_products = Product.objects.filter(
            organization=organization,
            product_type='physical',
            stock_quantity__gt=0,
            is_active=True
        )

        slow_moving = []
        for product in all_products:
            last_movement = StockMovement.objects.filter(
                product=product
            ).aggregate(last_date=Max('created_at'))['last_date']

            if not last_movement or last_movement < sixty_days_ago:
                days_since = (date.today() - last_movement).days if last_movement else None
                slow_moving.append({
                    'product_id': str(product.id),
                    'product_name': product.name,
                    'product_code': product.code or 'N/A',
                    'last_created_at': last_movement.strftime('%Y-%m-%d') if last_movement else 'Jamais',
                    'days_since_movement': days_since,
                    'stock_quantity': float(product.stock_quantity),
                    'unit': product.unit or 'unité'
                })

        # Sort by days since movement
        slow_moving.sort(key=lambda x: x['days_since_movement'] if x['days_since_movement'] else 9999, reverse=True)

        return Response({
            'expired_or_expiring': expiring_data,
            'slow_moving': slow_moving[:50],  # Limit to 50
            'summary': {
                'total_expiring': len(expiring_data),
                'total_slow_moving': len(slow_moving)
            }
        })


class MovementAnalysisView(APIView):
    """
    Analyze stock movements over time
    Query params: start_date, end_date, movement_type, product_id
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        queryset = StockMovement.objects.filter(
            product__organization=organization
        )

        # Apply filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        movement_type = request.GET.get('movement_type')
        product_id = request.GET.get('product_id')

        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        # Summary by movement type
        # Use correct movement_type values: reception (in), sale (out), loss (wastage), adjustment
        total_reception = queryset.filter(movement_type__in=['reception', 'initial']).aggregate(total=Sum('quantity'))['total'] or 0
        total_sale = queryset.filter(movement_type='sale').aggregate(total=Sum('quantity'))['total'] or 0
        total_loss = queryset.filter(movement_type='loss').aggregate(total=Sum('quantity'))['total'] or 0
        total_adjustments = queryset.filter(movement_type='adjustment').aggregate(total=Sum('quantity'))['total'] or 0

        summary = {
            'total_in': abs(total_reception),  # reception quantities are positive
            'total_out': abs(total_sale),  # sale quantities are negative, use abs
            'total_adjustments': total_adjustments,  # can be positive or negative
            'total_wastage': abs(total_loss),  # loss quantities are negative, use abs
        }
        summary['net_movement'] = total_reception + total_sale + total_adjustments + total_loss

        # By product
        # Use correct movement_type values from the model
        by_product = queryset.values('product__name').annotate(
            reception_qty=Sum('quantity', filter=Q(movement_type__in=['reception', 'initial'])),
            sale_qty=Sum('quantity', filter=Q(movement_type='sale')),
            adjustment_qty=Sum('quantity', filter=Q(movement_type='adjustment')),
            loss_qty=Sum('quantity', filter=Q(movement_type='loss'))
        ).order_by('-sale_qty')[:20]

        product_data = []
        for p in by_product:
            reception = p['reception_qty'] or 0
            sale = p['sale_qty'] or 0
            adjustment = p['adjustment_qty'] or 0
            loss = p['loss_qty'] or 0
            # Calculate net: reception is positive, sale and loss are negative
            net = reception + sale + adjustment + loss

            product_data.append({
                'product_name': p['product__name'],
                'in': float(abs(reception)),
                'out': float(abs(sale)),
                'adjustment': float(adjustment),
                'wastage': float(abs(loss)),
                'net': float(net)
            })

        # Timeline (by date)
        timeline = queryset.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            reception_qty=Sum('quantity', filter=Q(movement_type__in=['reception', 'initial'])),
            sale_qty=Sum('quantity', filter=Q(movement_type='sale'))
        ).order_by('date')

        timeline_data = []
        for t in timeline:
            timeline_data.append({
                'date': t['date'].strftime('%Y-%m-%d'),
                'in': float(abs(t['reception_qty']) if t['reception_qty'] else 0),
                'out': float(abs(t['sale_qty']) if t['sale_qty'] else 0)
            })

        return Response({
            'summary': {
                'total_in': float(summary['total_in']),
                'total_out': float(summary['total_out']),
                'total_adjustments': float(summary['total_adjustments']),
                'total_wastage': float(summary['total_wastage']),
                'net_movement': float(summary['net_movement'])
            },
            'by_product': product_data,
            'timeline': timeline_data
        })


class InventoryDashboardStatsView(APIView):
    """
    Get quick dashboard stats for inventory module
    Supports date range filtering via start_date and end_date params
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        today = date.today()

        # Get date range from params (defaults to last 30 days)
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            start_date = today - timedelta(days=30)
            end_date = today

        # Low stock products count (current state - not affected by date)
        low_stock_count = Product.objects.filter(
            organization=organization,
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold'),
            is_active=True
        ).count()

        # Products needing reorder (very low stock)
        reorder_count = Product.objects.filter(
            organization=organization,
            product_type='physical',
            stock_quantity__lte=F('low_stock_threshold') * 0.5,  # Half of threshold
            is_active=True
        ).count()

        # Stock movements in period
        movements_period = StockMovement.objects.filter(
            product__organization=organization,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).count()

        # Today's stock movements
        movements_today = StockMovement.objects.filter(
            product__organization=organization,
            created_at__date=today
        ).count()

        # Total inventory value (current state)
        inventory_value = Product.objects.filter(
            organization=organization,
            product_type='physical',
            is_active=True
        ).aggregate(
            value=Sum(F('stock_quantity') * F('cost_price'))
        )['value'] or 0

        # Out of stock products (current state)
        out_of_stock = Product.objects.filter(
            organization=organization,
            product_type='physical',
            stock_quantity=0,
            is_active=True
        ).count()

        return Response({
            'low_stock_count': low_stock_count,
            'reorder_count': reorder_count,
            'movements_today': movements_today,
            'movements_period': movements_period,
            'inventory_value': float(inventory_value),
            'out_of_stock': out_of_stock,
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat()
        })


class StockValueAnalyticsView(APIView):
    """
    Comprehensive stock value analytics with filtering
    Query params: category_id, product_type, sort_by, search, warehouse_id
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization

        # Filters
        category_id = request.GET.get('category_id')
        product_type = request.GET.get('product_type', 'physical')
        search = request.GET.get('search', '')
        sort_by = request.GET.get('sort_by', 'stock_value')
        warehouse_id = request.GET.get('warehouse_id')

        # Base queryset - physical products with stock
        queryset = Product.objects.filter(
            organization=organization,
            is_active=True
        )

        if product_type:
            queryset = queryset.filter(product_type=product_type)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(reference__icontains=search)
            )

        # Annotate with computed values
        queryset = queryset.annotate(
            stock_value_cost=F('stock_quantity') * F('cost_price'),
            stock_value_sell=F('stock_quantity') * F('price'),
            potential_margin=F('stock_quantity') * (F('price') - F('cost_price'))
        )

        # Summary stats
        summary = queryset.aggregate(
            total_products=Count('id'),
            total_quantity=Sum('stock_quantity'),
            total_cost_value=Sum(F('stock_quantity') * F('cost_price')),
            total_sell_value=Sum(F('stock_quantity') * F('price')),
            total_potential_margin=Sum(F('stock_quantity') * (F('price') - F('cost_price'))),
            avg_margin_percent=Avg(
                Case(
                    When(cost_price__gt=0, then=(F('price') - F('cost_price')) * 100.0 / F('cost_price')),
                    default=Value(0),
                    output_field=DecimalField()
                )
            )
        )

        # By category breakdown
        by_category = queryset.values(
            'category__name', 'category__id'
        ).annotate(
            product_count=Count('id'),
            total_quantity=Sum('stock_quantity'),
            cost_value=Sum(F('stock_quantity') * F('cost_price')),
            sell_value=Sum(F('stock_quantity') * F('price')),
            margin=Sum(F('stock_quantity') * (F('price') - F('cost_price')))
        ).order_by('-cost_value')

        category_data = []
        for c in by_category:
            cost_val = float(c['cost_value'] or 0)
            sell_val = float(c['sell_value'] or 0)
            category_data.append({
                'category_id': str(c['category__id']) if c['category__id'] else None,
                'category_name': c['category__name'] or 'Non categorise',
                'product_count': c['product_count'],
                'total_quantity': c['total_quantity'] or 0,
                'cost_value': cost_val,
                'sell_value': sell_val,
                'margin': float(c['margin'] or 0),
                'margin_percent': round((sell_val - cost_val) / cost_val * 100, 1) if cost_val > 0 else 0
            })

        # Detailed product list (sorted)
        sort_map = {
            'stock_value': '-stock_value_cost',
            'quantity': '-stock_quantity',
            'margin': '-potential_margin',
            'name': 'name',
            'price': '-price',
        }
        order = sort_map.get(sort_by, '-stock_value_cost')
        products = queryset.select_related('category', 'warehouse').order_by(order)[:100]

        product_data = []
        for p in products:
            cost_val = float(p.stock_quantity * (p.cost_price or 0))
            sell_val = float(p.stock_quantity * (p.price or 0))
            margin = sell_val - cost_val
            product_data.append({
                'id': str(p.id),
                'name': p.name,
                'reference': p.reference or '',
                'category': p.category.name if p.category else 'N/A',
                'warehouse': p.warehouse.name if p.warehouse else 'N/A',
                'stock_quantity': p.stock_quantity,
                'cost_price': float(p.cost_price or 0),
                'sell_price': float(p.price or 0),
                'stock_value_cost': cost_val,
                'stock_value_sell': sell_val,
                'margin': margin,
                'margin_percent': round(margin / cost_val * 100, 1) if cost_val > 0 else 0,
                'low_stock_threshold': p.low_stock_threshold,
                'is_low_stock': p.stock_quantity <= p.low_stock_threshold,
                'is_out_of_stock': p.stock_quantity == 0,
            })

        # Products with 0 stock but active
        zero_stock_value = queryset.filter(stock_quantity=0).aggregate(
            count=Count('id')
        )

        # Top 10 most valuable products (by stock cost value)
        top_valuable = sorted(product_data, key=lambda x: x['stock_value_cost'], reverse=True)[:10]

        # Top 10 highest margin products
        top_margin = sorted(product_data, key=lambda x: x['margin'], reverse=True)[:10]

        # Get available categories for filters
        categories = ProductCategory.objects.filter(
            organization=organization,
            is_active=True
        ).values('id', 'name').order_by('name')

        # Get available warehouses for filters
        from apps.invoicing.models import Warehouse
        warehouses = Warehouse.objects.filter(
            organization=organization,
            is_active=True
        ).values('id', 'name').order_by('name')

        return Response({
            'summary': {
                'total_products': summary['total_products'] or 0,
                'total_quantity': summary['total_quantity'] or 0,
                'total_cost_value': float(summary['total_cost_value'] or 0),
                'total_sell_value': float(summary['total_sell_value'] or 0),
                'total_potential_margin': float(summary['total_potential_margin'] or 0),
                'avg_margin_percent': round(float(summary['avg_margin_percent'] or 0), 1),
                'zero_stock_count': zero_stock_value['count'] or 0,
            },
            'by_category': category_data,
            'products': product_data,
            'top_valuable': top_valuable,
            'top_margin': top_margin,
            'filters': {
                'categories': [{'id': str(c['id']), 'name': c['name']} for c in categories],
                'warehouses': [{'id': str(w['id']), 'name': w['name']} for w in warehouses],
            }
        })


class WilsonEOQView(APIView):
    """Wilson EOQ analysis for a specific product or all products"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        product_id = request.query_params.get('product_id')

        if product_id:
            try:
                product = Product.objects.get(id=product_id, organization=organization)
            except Product.DoesNotExist:
                return Response({'error': 'Produit non trouve'}, status=404)
            analysis = get_wilson_analysis(product)
            return Response(analysis)

        # All products
        products = Product.objects.filter(
            organization=organization,
            product_type='physical',
            is_active=True
        )

        results = []
        for product in products:
            try:
                analysis = get_wilson_analysis(product)
                results.append(analysis)
            except Exception:
                continue

        # Sort by score descending
        results.sort(key=lambda x: x['score']['total_score'], reverse=True)

        return Response({
            'products': results,
            'total': len(results),
            'should_order_count': sum(1 for r in results if r['should_order']),
        })


class ProductScoresView(APIView):
    """Product scores based on Wilson analysis"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        products = Product.objects.filter(
            organization=organization,
            product_type='physical',
            is_active=True
        )

        results = []
        for product in products:
            try:
                score = calculate_product_score(product)
                results.append({
                    'product_id': str(product.id),
                    'product_name': product.name,
                    'reference': product.reference or '',
                    'current_stock': product.stock_quantity,
                    'score': score,
                })
            except Exception:
                continue

        results.sort(key=lambda x: x['score']['total_score'], reverse=True)
        return Response({'products': results, 'total': len(results)})


class EOQDashboardView(APIView):
    """Dashboard overview of all products with EOQ calculations, sorted by urgency"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        products = Product.objects.filter(
            organization=organization,
            product_type='physical',
            is_active=True,
            stock_quantity__gt=0
        ).order_by('stock_quantity')

        results = []
        for product in products:
            try:
                analysis = get_wilson_analysis(product)
                # Calculate urgency
                rop = analysis['reorder_point']['reorder_point']
                daily = analysis['reorder_point']['daily_demand']
                lead_time = analysis['reorder_point']['lead_time_days']

                if daily > 0:
                    days_left = product.stock_quantity / daily
                    if days_left <= lead_time:
                        urgency = 'critical'
                    elif days_left <= lead_time * 1.5:
                        urgency = 'high'
                    elif days_left <= lead_time * 2:
                        urgency = 'medium'
                    else:
                        urgency = 'low'
                else:
                    days_left = 999
                    urgency = 'low'

                analysis['urgency'] = urgency
                analysis['days_until_stockout'] = round(days_left)
                results.append(analysis)
            except Exception:
                continue

        # Sort by urgency
        urgency_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        results.sort(key=lambda x: (urgency_order.get(x['urgency'], 4), x.get('days_until_stockout', 999)))

        return Response({
            'products': results,
            'total': len(results),
            'critical_count': sum(1 for r in results if r['urgency'] == 'critical'),
            'high_count': sum(1 for r in results if r['urgency'] == 'high'),
            'medium_count': sum(1 for r in results if r['urgency'] == 'medium'),
            'should_order_count': sum(1 for r in results if r['should_order']),
        })


class PredictiveRestockView(APIView):
    """Predictive restock analysis - products sorted by urgency"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        predictions = get_all_predictions(organization)

        return Response({
            'products': predictions,
            'total': len(predictions),
            'critical_count': sum(1 for p in predictions if p['urgency'] == 'critical'),
            'high_count': sum(1 for p in predictions if p['urgency'] == 'high'),
            'medium_count': sum(1 for p in predictions if p['urgency'] == 'medium'),
            'total_recommended_value': sum(p.get('recommended_order_value', 0) for p in predictions if p['urgency'] in ('critical', 'high')),
        })


class ConsumptionStatsView(APIView):
    """Consumption statistics for products"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        product_id = request.query_params.get('product_id')
        period = request.query_params.get('period', 'weekly')

        if not product_id:
            return Response({'error': 'product_id requis'}, status=400)

        try:
            product = Product.objects.get(id=product_id, organization=organization)
        except Product.DoesNotExist:
            return Response({'error': 'Produit non trouve'}, status=404)

        from django.db.models.functions import TruncWeek, TruncMonth

        one_year_ago = date.today() - timedelta(days=365)
        movements = StockMovement.objects.filter(
            product=product,
            movement_type='sale',
            created_at__gte=one_year_ago
        )

        if period == 'weekly':
            trunc_fn = TruncWeek
            periods_count = 52
        else:
            trunc_fn = TruncMonth
            periods_count = 12

        breakdown = movements.annotate(
            period=trunc_fn('created_at')
        ).values('period').annotate(
            total_qty=Sum('quantity')
        ).order_by('period')

        breakdown_data = [{
            'period': b['period'].strftime('%Y-%m-%d'),
            'quantity': abs(b['total_qty'] or 0)
        } for b in breakdown]

        quantities = [b['quantity'] for b in breakdown_data]
        avg_consumption = sum(quantities) / len(quantities) if quantities else 0

        # Trend detection
        if len(quantities) >= 4:
            recent_half = quantities[len(quantities)//2:]
            older_half = quantities[:len(quantities)//2]
            recent_avg = sum(recent_half) / len(recent_half) if recent_half else 0
            older_avg = sum(older_half) / len(older_half) if older_half else 0

            if recent_avg > older_avg * 1.1:
                trend = 'increasing'
            elif recent_avg < older_avg * 0.9:
                trend = 'decreasing'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        thirty_days = StockMovement.objects.filter(
            product=product, movement_type='sale',
            created_at__gte=date.today() - timedelta(days=30)
        ).aggregate(total=Sum('quantity'))['total'] or 0

        seven_days = StockMovement.objects.filter(
            product=product, movement_type='sale',
            created_at__gte=date.today() - timedelta(days=7)
        ).aggregate(total=Sum('quantity'))['total'] or 0

        return Response({
            'product_id': str(product.id),
            'product_name': product.name,
            'period': period,
            'avg_weekly_consumption': round(abs(seven_days), 1),
            'avg_monthly_consumption': round(abs(thirty_days), 1),
            'avg_per_period': round(avg_consumption, 1),
            'consumption_trend': trend,
            'breakdown': breakdown_data[-periods_count:],
            'current_stock': product.stock_quantity,
        })


class UnifiedDashboardView(APIView):
    """Unified dashboard - all KPIs in one call"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user.organization
        today = date.today()

        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if start_date_str and end_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            start_date = today - timedelta(days=30)
            end_date = today

        # Inventory stats
        low_stock_count = Product.objects.filter(
            organization=organization, product_type='physical',
            stock_quantity__lte=F('low_stock_threshold'), is_active=True
        ).count()

        out_of_stock = Product.objects.filter(
            organization=organization, product_type='physical',
            stock_quantity=0, is_active=True
        ).count()

        inventory_value = Product.objects.filter(
            organization=organization, product_type='physical', is_active=True
        ).aggregate(
            value=Sum(F('stock_quantity') * F('cost_price'))
        )['value'] or 0

        movements_today = StockMovement.objects.filter(
            product__organization=organization,
            created_at__date=today
        ).count()

        # Expiring batches
        from apps.invoicing.models import ProductBatch
        expiring_batches = ProductBatch.objects.filter(
            organization=organization,
            status__in=['available', 'opened'],
            expiry_date__lte=today + timedelta(days=30),
            quantity_remaining__gt=0
        ).count()

        # Predictive alerts count
        predictions = get_all_predictions(organization)
        critical_alerts = sum(1 for p in predictions if p['urgency'] in ('critical', 'high'))

        # Healthcare stats
        try:
            from apps.laboratory.models import LabOrder
            exams_today = LabOrder.objects.filter(
                organization=organization,
                created_at__date=today
            ).count()
            pending_results = LabOrder.objects.filter(
                organization=organization,
                status='pending'
            ).count()
        except Exception:
            exams_today = 0
            pending_results = 0

        # Consultation stats
        try:
            from apps.consultations.models import Consultation
            consultations_today = Consultation.objects.filter(
                organization=organization,
                created_at__date=today
            ).count()
        except Exception:
            consultations_today = 0

        # Revenue
        from apps.invoicing.models import Invoice
        revenue = Invoice.objects.filter(
            organization=organization,
            status='paid',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return Response({
            'overview': {
                'revenue_period': float(revenue),
                'consultations_today': consultations_today,
                'exams_today': exams_today,
                'low_stock_count': low_stock_count,
                'expiring_batches': expiring_batches,
                'critical_alerts': critical_alerts,
                'movements_today': movements_today,
            },
            'stock': {
                'low_stock_count': low_stock_count,
                'out_of_stock': out_of_stock,
                'inventory_value': float(inventory_value),
                'expiring_batches': expiring_batches,
                'critical_alerts': critical_alerts,
                'predictive_alerts': len([p for p in predictions if p['urgency'] in ('critical', 'high', 'medium')]),
            },
            'healthcare': {
                'exams_today': exams_today,
                'pending_results': pending_results,
                'consultations_today': consultations_today,
            },
            'finance': {
                'revenue_period': float(revenue),
            },
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
        })
