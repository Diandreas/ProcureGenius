"""
Templates de prompts de démarrage pour conversations proactives
L'IA utilise ces templates pour initier des conversations basées sur l'analyse des données
"""
from typing import Dict, Any


def get_conversation_starter_templates() -> Dict[str, Dict[str, Any]]:
    """
    Retourne les templates de démarrage de conversation par type d'analyse
    
    Returns:
        Dict avec clés = type d'analyse, valeurs = template config
    """
    return {
        'sales_increase': {
            'title_template': 'Vos ventes ont augmenté de {percentage}%',
            'message_template': (
                "J'ai remarqué que vos ventes ont augmenté de {percentage}% {period}. "
                "C'est une excellente nouvelle ! Voulez-vous que nous analysions ensemble "
                "les facteurs qui ont contribué à cette croissance ? Je peux vous aider à "
                "identifier les produits les plus performants, les clients clés, ou les "
                "périodes de pic de vente."
            ),
            'priority': 8,
        },
        'overdue_invoices': {
            'title_template': '{count} factures en retard de paiement',
            'message_template': (
                "J'ai détecté {count} facture(s) en retard de paiement pour un montant total "
                "de {total_amount}€. Cela peut impacter votre trésorerie. "
                "Souhaitez-vous que je vous aide à les gérer ? Je peux vous proposer des "
                "relances automatiques ou analyser les clients concernés."
            ),
            'priority': 9,
        },
        'supplier_concentration': {
            'title_template': 'Concentration de vos fournisseurs',
            'message_template': (
                "Votre fournisseur principal ({supplier_name}) représente {percentage}% de "
                "vos achats. Bien que cela puisse être avantageux en termes de négociation, "
                "cela crée aussi une dépendance. Voulez-vous que nous explorions des options "
                "pour diversifier vos sources d'approvisionnement et réduire les risques ?"
            ),
            'priority': 7,
        },
        'low_stock_alert': {
            'title_template': 'Alerte de stock faible',
            'message_template': (
                "Plusieurs de vos produits ({product_count} produit(s)) sont en stock faible "
                "ou proches de la rupture. Je peux vous aider à créer des bons de commande "
                "pour réapprovisionner ces articles avant qu'ils ne soient épuisés. "
                "Souhaitez-vous que je prépare ces commandes ?"
            ),
            'priority': 8,
        },
        'profitability_decrease': {
            'title_template': 'Baisse de rentabilité détectée',
            'message_template': (
                "J'ai remarqué une baisse de {percentage}% de votre marge bénéficiaire "
                "{period}. Cela peut être dû à plusieurs facteurs : augmentation des coûts, "
                "changement de mix produits, ou pression concurrentielle. "
                "Voulez-vous que nous analysions ensemble les causes et identifiions des "
                "opportunités d'optimisation ?"
            ),
            'priority': 9,
        },
        'client_growth_opportunity': {
            'title_template': 'Opportunité de croissance client',
            'message_template': (
                "Votre client {client_name} a augmenté ses commandes de {percentage}% "
                "{period}. C'est un excellent signe ! Voulez-vous que nous analysions "
                "comment renforcer cette relation et identifier d'autres opportunités "
                "similaires avec vos autres clients ?"
            ),
            'priority': 7,
        },
        'seasonal_pattern': {
            'title_template': 'Pattern saisonnier détecté',
            'message_template': (
                "J'ai identifié un pattern saisonnier dans vos ventes. {description}. "
                "Cela peut vous aider à mieux planifier vos stocks et vos campagnes. "
                "Souhaitez-vous que nous approfondissions cette analyse pour optimiser "
                "votre préparation aux périodes de forte demande ?"
            ),
            'priority': 6,
        },
        'new_feature_suggestion': {
            'title_template': 'Fonctionnalité non utilisée',
            'message_template': (
                "Je remarque que vous n'utilisez pas encore la fonctionnalité '{feature_name}'. "
                "Cette fonctionnalité pourrait vous faire gagner du temps en automatisant "
                "{benefit_description}. Voulez-vous que je vous montre comment l'utiliser ?"
            ),
            'priority': 5,
        },
        'invoices_to_send': {
            'title_template': '{count} facture(s) à envoyer',
            'message_template': (
                "Vous avez {count} facture(s) en brouillon depuis plus de 3 jours qui n'ont pas encore été envoyées. "
                "Souhaitez-vous que je vous aide à les envoyer maintenant ? Je peux vous proposer d'envoyer "
                "les factures suivantes : {invoice_numbers}. Vous pouvez personnaliser le message pour chaque client."
            ),
            'priority': 7,
        },
        'invoices_followup': {
            'title_template': 'Relancer {count} facture(s) en attente',
            'message_template': (
                "Vous avez {count} facture(s) envoyées depuis plus d'une semaine qui n'ont pas encore été payées, "
                "pour un montant total de {total_amount}€. Il serait judicieux de relancer ces clients. "
                "Souhaitez-vous que je vous aide à préparer des emails de relance personnalisés ?"
            ),
            'priority': 8,
        },
        'purchase_orders_to_send': {
            'title_template': '{count} bon(s) de commande à envoyer',
            'message_template': (
                "Vous avez {count} bon(s) de commande approuvé(s) depuis plus de 2 jours qui n'ont pas encore été "
                "envoyés aux fournisseurs. Souhaitez-vous que je vous aide à les envoyer maintenant ? "
                "Les bons de commande suivants sont prêts : {po_numbers}. Vous pouvez personnaliser le message pour chaque fournisseur."
            ),
            'priority': 7,
        },
    }


def format_conversation_starter(template_key: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Formate un template de démarrage de conversation avec les données contextuelles
    
    Args:
        template_key: Clé du template (ex: 'sales_increase')
        context: Données contextuelles pour remplir le template
        
    Returns:
        Dict avec 'title' et 'message' formatés
    """
    templates = get_conversation_starter_templates()
    
    if template_key not in templates:
        raise ValueError(f"Template '{template_key}' not found")
    
    template = templates[template_key]
    
    try:
        title = template['title_template'].format(**context)
        message = template['message_template'].format(**context)
    except KeyError as e:
        raise ValueError(f"Missing context key for template '{template_key}': {e}")
    
    return {
        'title': title,
        'message': message,
        'priority': template.get('priority', 5),
        'template_key': template_key,
    }

