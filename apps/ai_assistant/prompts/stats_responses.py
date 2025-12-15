"""
Templates de réponses fluides pour les statistiques
L'IA utilise ces templates pour générer des réponses contextuelles et naturelles
"""
from typing import Dict, Any, Optional
from decimal import Decimal


def format_currency(amount: float, currency: str = '€') -> str:
    """Formate un montant en devise"""
    if amount is None:
        return "0" + currency
    return f"{amount:,.2f}".replace(',', ' ').replace('.', ',') + currency


def format_percentage(value: float) -> str:
    """Formate un pourcentage"""
    if value is None:
        return "0%"
    return f"{value:.1f}%"


def get_stats_response_template(stats_type: str, data: Dict[str, Any]) -> str:
    """
    Génère une réponse fluide basée sur le type de statistiques demandé
    
    Args:
        stats_type: Type de stats (general, invoices, suppliers, clients, products)
        data: Données statistiques réelles
        
    Returns:
        Réponse formatée et contextuelle
    """
    templates = {
        'general': _generate_general_stats_response,
        'invoices': _generate_invoices_stats_response,
        'suppliers': _generate_suppliers_stats_response,
        'clients': _generate_clients_stats_response,
        'products': _generate_products_stats_response,
    }
    
    generator = templates.get(stats_type, _generate_general_stats_response)
    return generator(data)


def _generate_general_stats_response(data: Dict[str, Any]) -> str:
    """Génère une réponse pour les statistiques générales"""
    response_parts = []
    
    # Introduction
    response_parts.append("Voici un aperçu de votre activité :\n\n")
    
    # Factures
    if 'total_invoices' in data:
        total = data['total_invoices']
        response_parts.append(f"📄 **Factures** : {total} facture(s)")
        
        if 'pending_invoices' in data and data['pending_invoices'] > 0:
            response_parts.append(f" ({data['pending_invoices']} en attente)")
        
        if 'total_revenue' in data:
            response_parts.append(f"\n   💰 Chiffre d'affaires : {format_currency(data['total_revenue'])}")
        
        response_parts.append("\n")
    
    # Fournisseurs
    if 'total_suppliers' in data:
        total = data['total_suppliers']
        active = data.get('active_suppliers', total)
        response_parts.append(f"🏢 **Fournisseurs** : {total} fournisseur(s) ({active} actif(s))\n")
    
    # Clients
    if 'total_clients' in data:
        total = data['total_clients']
        response_parts.append(f"👥 **Clients** : {total} client(s)\n")
    
    # Bons de commande
    if 'total_purchase_orders' in data:
        total = data['total_purchase_orders']
        pending = data.get('pending_purchase_orders', 0)
        response_parts.append(f"🛒 **Bons de commande** : {total} bon(s) de commande")
        
        if pending > 0:
            response_parts.append(f" ({pending} en attente)")
        
        if 'total_expenses' in data:
            response_parts.append(f"\n   💸 Dépenses totales : {format_currency(data['total_expenses'])}")
        
        response_parts.append("\n")
    
    # Analyse et suggestions
    response_parts.append("\n💡 **Insights** :\n")
    
    if 'total_invoices' in data and 'total_revenue' in data:
        avg_invoice = data['total_revenue'] / data['total_invoices'] if data['total_invoices'] > 0 else 0
        response_parts.append(f"- Panier moyen : {format_currency(avg_invoice)}\n")
    
    if 'total_suppliers' in data and data['total_suppliers'] > 0:
        if data.get('total_purchase_orders', 0) > 0:
            po_per_supplier = data['total_purchase_orders'] / data['total_suppliers']
            response_parts.append(f"- Moyenne de {po_per_supplier:.1f} commandes par fournisseur\n")
    
    return "".join(response_parts)


def _generate_invoices_stats_response(data: Dict[str, Any]) -> str:
    """Génère une réponse pour les statistiques de factures"""
    response_parts = []
    
    total = data.get('total_invoices', 0)
    response_parts.append(f"📄 Vous avez **{total} facture(s)** au total.\n\n")
    
    # Par statut
    if 'pending_invoices' in data and data['pending_invoices'] > 0:
        response_parts.append(f"⏳ {data['pending_invoices']} en attente de paiement\n")
    
    if 'paid_invoices' in data and data['paid_invoices'] > 0:
        response_parts.append(f"✅ {data['paid_invoices']} payée(s)\n")
    
    if 'overdue_invoices' in data and data['overdue_invoices'] > 0:
        response_parts.append(f"⚠️ {data['overdue_invoices']} en retard\n")
    
    # Revenus
    if 'total_revenue' in data:
        response_parts.append(f"\n💰 **Chiffre d'affaires total** : {format_currency(data['total_revenue'])}\n")
        
        if 'this_month_revenue' in data:
            response_parts.append(f"   Ce mois : {format_currency(data['this_month_revenue'])}\n")
        
        if 'last_month_revenue' in data and 'this_month_revenue' in data:
            if data['last_month_revenue'] > 0:
                change = ((data['this_month_revenue'] - data['last_month_revenue']) / data['last_month_revenue']) * 100
                trend = "📈" if change > 0 else "📉"
                response_parts.append(f"   {trend} Évolution : {format_percentage(change)} vs mois dernier\n")
    
    # Panier moyen
    if total > 0 and 'total_revenue' in data:
        avg = data['total_revenue'] / total
        response_parts.append(f"\n📊 **Panier moyen** : {format_currency(avg)}\n")
    
    return "".join(response_parts)


def _generate_suppliers_stats_response(data: Dict[str, Any]) -> str:
    """Génère une réponse pour les statistiques de fournisseurs"""
    response_parts = []
    
    total = data.get('total_suppliers', 0)
    active = data.get('active_suppliers', total)
    
    response_parts.append(f"🏢 Vous travaillez avec **{total} fournisseur(s)**.\n\n")
    response_parts.append(f"✅ {active} actif(s)\n")
    
    if 'inactive_suppliers' in data and data['inactive_suppliers'] > 0:
        response_parts.append(f"⏸️ {data['inactive_suppliers']} inactif(s)\n")
    
    # Ratings
    if 'suppliers_by_rating' in data:
        ratings = data['suppliers_by_rating']
        response_parts.append("\n⭐ **Répartition par note** :\n")
        
        for rating, count in ratings.items():
            if count > 0:
                stars = rating.replace('_stars', ' étoiles')
                response_parts.append(f"   {stars} : {count} fournisseur(s)\n")
    
    # Top fournisseurs
    if 'top_suppliers' in data and data['top_suppliers']:
        response_parts.append("\n🏆 **Top fournisseurs** :\n")
        for i, supplier in enumerate(data['top_suppliers'][:5], 1):
            name = supplier.get('name', 'N/A')
            amount = supplier.get('total_amount', 0)
            response_parts.append(f"   {i}. {name} : {format_currency(amount)}\n")
    
    return "".join(response_parts)


def _generate_clients_stats_response(data: Dict[str, Any]) -> str:
    """Génère une réponse pour les statistiques de clients"""
    response_parts = []
    
    total = data.get('total_clients', 0)
    response_parts.append(f"👥 Vous avez **{total} client(s)**.\n\n")
    
    # Top clients
    if 'top_clients' in data and data['top_clients']:
        response_parts.append("🏆 **Top clients** :\n")
        for i, client in enumerate(data['top_clients'][:5], 1):
            name = client.get('name', 'N/A')
            amount = client.get('total_amount', 0)
            percentage = client.get('percentage', 0)
            response_parts.append(f"   {i}. {name} : {format_currency(amount)} ({format_percentage(percentage)})\n")
    
    # Analyse
    if 'total_clients' in data and 'total_revenue' in data and data['total_clients'] > 0:
        revenue_per_client = data['total_revenue'] / data['total_clients']
        response_parts.append(f"\n📊 **Revenu moyen par client** : {format_currency(revenue_per_client)}\n")
    
    return "".join(response_parts)


def _generate_products_stats_response(data: Dict[str, Any]) -> str:
    """Génère une réponse pour les statistiques de produits"""
    response_parts = []
    
    total = data.get('total_products', 0)
    response_parts.append(f"📦 Vous avez **{total} produit(s)** dans votre catalogue.\n\n")
    
    # Par catégorie
    if 'products_by_category' in data and data['products_by_category']:
        response_parts.append("📂 **Par catégorie** :\n")
        for category, count in data['products_by_category'].items():
            response_parts.append(f"   {category} : {count} produit(s)\n")
    
    # Produits les plus vendus
    if 'top_products' in data and data['top_products']:
        response_parts.append("\n🏆 **Produits les plus vendus** :\n")
        for i, product in enumerate(data['top_products'][:5], 1):
            name = product.get('name', 'N/A')
            quantity = product.get('quantity_sold', 0)
            response_parts.append(f"   {i}. {name} : {quantity} unité(s) vendue(s)\n")
    
    # Stock
    if 'low_stock_products' in data and data['low_stock_products'] > 0:
        response_parts.append(f"\n⚠️ **Alerte stock** : {data['low_stock_products']} produit(s) en stock faible\n")
    
    return "".join(response_parts)


def enrich_stats_response_with_insights(response: str, data: Dict[str, Any]) -> str:
    """
    Enrichit une réponse de stats avec des insights intelligents
    
    Args:
        response: Réponse de base
        data: Données statistiques
        
    Returns:
        Réponse enrichie avec insights
    """
    insights = []
    
    # Détecter des patterns intéressants
    if 'overdue_invoices' in data and data['overdue_invoices'] > 0:
        insights.append(f"⚠️ Vous avez {data['overdue_invoices']} facture(s) en retard. Pensez à relancer vos clients.")
    
    if 'total_suppliers' in data and data['total_suppliers'] == 1:
        insights.append("💡 Vous ne travaillez qu'avec un seul fournisseur. La diversification pourrait réduire vos risques.")
    
    if 'low_stock_products' in data and data['low_stock_products'] > 0:
        insights.append(f"📦 {data['low_stock_products']} produit(s) nécessitent un réapprovisionnement.")
    
    if insights:
        response += "\n\n💡 **Suggestions** :\n"
        for insight in insights:
            response += f"- {insight}\n"
    
    return response

