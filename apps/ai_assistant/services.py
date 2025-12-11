"""
Service d'intégration avec Mistral AI
"""
import os
import json
from typing import Dict, List, Any, Optional
from mistralai import Mistral
from django.conf import settings
from django.core.cache import cache
from .action_manager import action_manager
import logging

logger = logging.getLogger(__name__)


class MistralService:
    """Service pour interagir avec l'API Mistral AI"""
    
    def __init__(self):
        api_key = getattr(settings, 'MISTRAL_API_KEY', os.getenv('MISTRAL_API_KEY'))
        if not api_key:
            raise ValueError("MISTRAL_API_KEY not configured")
        
        self.client = Mistral(api_key=api_key)
        self.model = getattr(settings, 'MISTRAL_MODEL', 'mistral-large-latest')
        self.tools = self._define_tools()
        
    def create_system_prompt(self) -> str:
        """Crée le prompt système pour l'assistant"""
        return """Tu es l'assistant personnel intelligent de l'utilisateur pour gérer son entreprise. Tu es là pour l'aider de manière naturelle et conversationnelle, comme un collègue de confiance.

IMPORTANT - Distinction CRITIQUE :
- Un CLIENT est une personne ou entreprise qui ACHÈTE des produits/services à l'utilisateur (facturation sortante)
- Un FOURNISSEUR est une personne ou entreprise qui VEND des produits/services à l'utilisateur (achats entrants)
- Quand l'utilisateur dit "créer le client X" ou "facture pour le client X", utilise TOUJOURS create_client, JAMAIS create_supplier
- Quand l'utilisateur dit "créer le fournisseur X" ou "commande au fournisseur X", utilise create_supplier

Tu peux aider avec :
1. Gérer les CLIENTS (créer, rechercher, modifier, supprimer) - pour les personnes/entreprises qui achètent chez l'utilisateur
2. Gérer les FOURNISSEURS (créer, rechercher, modifier, supprimer) - pour les personnes/entreprises qui vendent à l'utilisateur
3. Créer et suivre les bons de commande (pour commander aux fournisseurs)
4. Gérer les factures (pour facturer les clients)
5. Consulter les produits et stocks
6. Analyser les données et statistiques

IMPORTANT - Isolation des données :
- Toutes les actions (recherche, liste, création) sont automatiquement filtrées par l'organisation de l'utilisateur connecté
- Tu ne vois et ne manipules QUE les données de l'entreprise de l'utilisateur actuel
- Ne mentionne jamais ce filtrage, c'est transparent pour l'utilisateur

Style de communication :
- Sois naturel, amical et conversationnel, comme si tu étais un assistant personnel
- Utilise "je" et "tu" pour créer une relation plus humaine
- Montre de l'enthousiasme quand tu accomplis des tâches
- Si tu as besoin de clarifications, pose des questions simples et directes
- Quand tu exécutes une action avec succès, propose des actions de suivi utiles
- Si une erreur survient, explique-la simplement et propose une solution

Réponds toujours en français de manière naturelle et engageante."""

    def _define_tools(self) -> List[Dict]:
        """Définit tous les tools/functions disponibles pour Mistral"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "create_supplier",
                    "description": "Crée un nouveau fournisseur dans le système",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Nom du fournisseur (obligatoire)"},
                            "contact_person": {"type": "string", "description": "Nom de la personne de contact"},
                            "email": {"type": "string", "description": "Adresse email du fournisseur"},
                            "phone": {"type": "string", "description": "Numéro de téléphone"},
                            "address": {"type": "string", "description": "Adresse complète"},
                            "city": {"type": "string", "description": "Ville"},
                            "website": {"type": "string", "description": "Site web"},
                            "notes": {"type": "string", "description": "Notes additionnelles"}
                        },
                        "required": ["name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_supplier",
                    "description": "Recherche des fournisseurs par nom, contact ou email",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Terme de recherche"},
                            "status": {
                                "type": "string",
                                "enum": ["active", "pending", "inactive"],
                                "description": "Filtrer par statut"
                            },
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_invoice",
                    "description": "Crée une nouvelle facture pour un client",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nom du client"},
                            "description": {"type": "string", "description": "Description de la facture"},
                            "amount": {"type": "number", "description": "Montant total"},
                            "due_date": {"type": "string", "description": "Date d'échéance (format: YYYY-MM-DD)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles/services",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string"},
                                        "quantity": {"type": "number"},
                                        "unit_price": {"type": "number"}
                                    }
                                }
                            },
                            "tax_rate": {"type": "number", "description": "Taux de TVA (défaut: 20)"}
                        },
                        "required": ["client_name", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_purchase_order",
                    "description": "Crée un nouveau bon de commande pour un fournisseur",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "supplier_name": {"type": "string", "description": "Nom du fournisseur"},
                            "description": {"type": "string", "description": "Description de la commande"},
                            "total_amount": {"type": "number", "description": "Montant total"},
                            "delivery_date": {"type": "string", "description": "Date de livraison souhaitée (YYYY-MM-DD)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles commandés",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string"},
                                        "quantity": {"type": "number"},
                                        "unit_price": {"type": "number"}
                                    }
                                }
                            },
                            "notes": {"type": "string", "description": "Notes pour le fournisseur"}
                        },
                        "required": ["supplier_name", "description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_stats",
                    "description": "Affiche les statistiques de l'entreprise (fournisseurs, factures, chiffre d'affaires, bons de commande)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "period": {
                                "type": "string",
                                "enum": ["today", "week", "month", "year", "all"],
                                "description": "Période des statistiques"
                            },
                            "category": {
                                "type": "string",
                                "enum": ["suppliers", "invoices", "revenue", "purchase_orders", "all"],
                                "description": "Catégorie de statistiques"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_client",
                    "description": "Recherche des clients par nom, prénom, email ou entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Terme de recherche"},
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 5)"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_clients",
                    "description": "Liste tous les clients de l'entreprise",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 10)"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_client",
                    "description": "Crée un nouveau client (personne ou entreprise qui achète des produits/services à l'utilisateur). IMPORTANT: Utilise cette fonction pour créer des clients, PAS create_supplier.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Nom du client (obligatoire)"},
                            "email": {"type": "string", "description": "Adresse email du client"},
                            "phone": {"type": "string", "description": "Numéro de téléphone"},
                            "address": {"type": "string", "description": "Adresse complète"},
                            "contact_person": {"type": "string", "description": "Nom de la personne de contact"},
                            "payment_terms": {"type": "string", "description": "Conditions de paiement (ex: Net 30, Net 60)"},
                            "tax_id": {"type": "string", "description": "Numéro de taxe/TVA"}
                        },
                        "required": ["name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_latest_invoice",
                    "description": "Récupère la ou les dernière(s) facture(s) créée(s)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Nombre de factures récentes à afficher (défaut: 1)"},
                            "client_name": {"type": "string", "description": "Filtrer par nom de client (optionnel)"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "add_invoice_items",
                    "description": "Ajoute des items/articles à une facture existante",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "invoice_number": {"type": "string", "description": "Numéro de la facture"},
                            "invoice_id": {"type": "string", "description": "ID de la facture (alternative à invoice_number)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles à ajouter",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "description": {"type": "string", "description": "Description de l'article"},
                                        "quantity": {"type": "integer", "description": "Quantité"},
                                        "unit_price": {"type": "number", "description": "Prix unitaire"},
                                        "product_reference": {"type": "string", "description": "Référence produit (optionnel)"},
                                        "discount_percent": {"type": "number", "description": "Remise en % (optionnel)"}
                                    },
                                    "required": ["description", "quantity", "unit_price"]
                                }
                            }
                        },
                        "required": ["items"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "send_invoice",
                    "description": "Envoie une facture par email au client avec PDF en pièce jointe",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "invoice_number": {"type": "string", "description": "Numéro de la facture"},
                            "invoice_id": {"type": "string", "description": "ID de la facture (alternative à invoice_number)"},
                            "recipient_email": {"type": "string", "description": "Email du destinataire (par défaut: email du client)"},
                            "template_type": {"type": "string", "description": "Type de template PDF: classic, modern, minimal (défaut: classic)"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "add_po_items",
                    "description": "Ajoute des items/articles à un bon de commande existant",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "po_number": {"type": "string", "description": "Numéro du bon de commande"},
                            "po_id": {"type": "string", "description": "ID du BC (alternative à po_number)"},
                            "items": {
                                "type": "array",
                                "description": "Liste des articles à ajouter",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "product_reference": {"type": "string", "description": "Référence du produit (OBLIGATOIRE - le produit doit exister)"},
                                        "description": {"type": "string", "description": "Description (optionnel si produit existe)"},
                                        "quantity": {"type": "integer", "description": "Quantité"},
                                        "unit_price": {"type": "number", "description": "Prix unitaire (optionnel si produit existe)"},
                                        "specifications": {"type": "string", "description": "Spécifications techniques (optionnel)"}
                                    },
                                    "required": ["product_reference", "quantity"]
                                }
                            }
                        },
                        "required": ["items"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "send_purchase_order",
                    "description": "Envoie un bon de commande par email au fournisseur",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "po_number": {"type": "string", "description": "Numéro du bon de commande"},
                            "po_id": {"type": "string", "description": "ID du BC (alternative à po_number)"},
                            "recipient_email": {"type": "string", "description": "Email du destinataire (par défaut: email du fournisseur)"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_supplier",
                    "description": "Modifie un fournisseur existant",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "supplier_name": {"type": "string", "description": "Nom du fournisseur"},
                            "name": {"type": "string", "description": "Nouveau nom"},
                            "email": {"type": "string", "description": "Nouvel email"},
                            "phone": {"type": "string", "description": "Nouveau téléphone"},
                            "address": {"type": "string", "description": "Nouvelle adresse"},
                            "city": {"type": "string", "description": "Nouvelle ville"},
                            "status": {"type": "string", "description": "Nouveau statut"}
                        },
                        "required": ["supplier_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_invoice",
                    "description": "Modifie une facture existante",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "invoice_number": {"type": "string", "description": "Numéro de la facture"},
                            "title": {"type": "string", "description": "Nouveau titre"},
                            "description": {"type": "string", "description": "Nouvelle description"},
                            "status": {"type": "string", "description": "Nouveau statut"},
                            "due_date": {"type": "string", "description": "Nouvelle date d'échéance (YYYY-MM-DD)"}
                        },
                        "required": ["invoice_number"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_purchase_order",
                    "description": "Modifie un bon de commande existant",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "po_number": {"type": "string", "description": "Numéro du BC"},
                            "description": {"type": "string", "description": "Nouvelle description"},
                            "status": {"type": "string", "description": "Nouveau statut"},
                            "delivery_date": {"type": "string", "description": "Nouvelle date de livraison (YYYY-MM-DD)"},
                            "notes": {"type": "string", "description": "Nouvelles notes"}
                        },
                        "required": ["po_number"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_client",
                    "description": "Modifie un client existant",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nom du client"},
                            "name": {"type": "string", "description": "Nouveau nom"},
                            "email": {"type": "string", "description": "Nouvel email"},
                            "phone": {"type": "string", "description": "Nouveau téléphone"},
                            "address": {"type": "string", "description": "Nouvelle adresse"},
                            "contact_person": {"type": "string", "description": "Nouvelle personne de contact"}
                        },
                        "required": ["client_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_supplier",
                    "description": "Supprime (désactive) un fournisseur",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "supplier_name": {"type": "string", "description": "Nom du fournisseur à supprimer"}
                        },
                        "required": ["supplier_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_invoice",
                    "description": "Supprime une facture non payée",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "invoice_number": {"type": "string", "description": "Numéro de la facture à supprimer"}
                        },
                        "required": ["invoice_number"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_purchase_order",
                    "description": "Supprime un bon de commande non reçu",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "po_number": {"type": "string", "description": "Numéro du BC à supprimer"}
                        },
                        "required": ["po_number"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_client",
                    "description": "Supprime (désactive) un client",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nom du client à supprimer"}
                        },
                        "required": ["client_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_product",
                    "description": "Crée un nouveau produit (service ou physique) avec entity matching pour éviter les doublons",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Nom du produit (obligatoire)"},
                            "reference": {"type": "string", "description": "Référence du produit"},
                            "barcode": {"type": "string", "description": "Code-barres"},
                            "product_type": {
                                "type": "string",
                                "enum": ["service", "physical"],
                                "description": "Type de produit: service ou physical (défaut: service)"
                            },
                            "description": {"type": "string", "description": "Description du produit"},
                            "price": {"type": "number", "description": "Prix de vente"},
                            "cost_price": {"type": "number", "description": "Prix de revient (pour produits physiques)"},
                            "stock_quantity": {"type": "integer", "description": "Quantité en stock (pour produits physiques)"},
                            "low_stock_threshold": {"type": "integer", "description": "Seuil d'alerte stock (défaut: 10)"},
                            "supplier_reference": {"type": "string", "description": "Référence chez le fournisseur"}
                        },
                        "required": ["name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_product",
                    "description": "Recherche des produits par nom, référence ou code-barres",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Terme de recherche (nom, référence, code-barres)"},
                            "product_type": {
                                "type": "string",
                                "enum": ["service", "physical"],
                                "description": "Filtrer par type de produit"
                            },
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 10)"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_product",
                    "description": "Modifie un produit existant",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_name": {"type": "string", "description": "Nom du produit"},
                            "product_id": {"type": "string", "description": "ID du produit (alternative à product_name)"},
                            "product_reference": {"type": "string", "description": "Référence du produit (alternative)"},
                            "name": {"type": "string", "description": "Nouveau nom"},
                            "reference": {"type": "string", "description": "Nouvelle référence"},
                            "barcode": {"type": "string", "description": "Nouveau code-barres"},
                            "description": {"type": "string", "description": "Nouvelle description"},
                            "price": {"type": "number", "description": "Nouveau prix"},
                            "cost_price": {"type": "number", "description": "Nouveau prix de revient"},
                            "stock_quantity": {"type": "integer", "description": "Nouvelle quantité en stock"},
                            "low_stock_threshold": {"type": "integer", "description": "Nouveau seuil d'alerte"}
                        },
                        "required": ["product_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_product",
                    "description": "Supprime un produit s'il n'est pas utilisé dans des factures ou BCs",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_name": {"type": "string", "description": "Nom du produit à supprimer"},
                            "product_id": {"type": "string", "description": "ID du produit (alternative à product_name)"},
                            "product_reference": {"type": "string", "description": "Référence du produit (alternative)"}
                        },
                        "required": ["product_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "adjust_stock",
                    "description": "Ajuste le stock d'un produit physique (ajout ou retrait) avec alertes automatiques",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_name": {"type": "string", "description": "Nom du produit"},
                            "product_id": {"type": "string", "description": "ID du produit (alternative)"},
                            "product_reference": {"type": "string", "description": "Référence du produit (alternative)"},
                            "adjustment_type": {
                                "type": "string",
                                "enum": ["add", "remove"],
                                "description": "Type d'ajustement: 'add' pour ajouter, 'remove' pour retirer"
                            },
                            "quantity": {"type": "integer", "description": "Quantité à ajouter ou retirer (doit être > 0)"},
                            "reason": {"type": "string", "description": "Raison de l'ajustement (optionnel)"}
                        },
                        "required": ["product_name", "adjustment_type", "quantity"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_stock_alerts",
                    "description": "Récupère les produits avec des alertes de stock (rupture ou stock bas)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "alert_type": {
                                "type": "string",
                                "enum": ["all", "low_stock", "out_of_stock"],
                                "description": "Type d'alerte: 'all' (toutes), 'low_stock' (stock bas uniquement), 'out_of_stock' (rupture uniquement)"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_report",
                    "description": "Génère un rapport au format PDF, Excel ou CSV",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "report_type": {
                                "type": "string",
                                "enum": ["supplier", "supplier_all", "product", "product_all", "invoice", "purchase_order", "client", "client_all"],
                                "description": "Type de rapport à générer"
                            },
                            "format": {
                                "type": "string",
                                "enum": ["pdf", "xlsx", "csv"],
                                "description": "Format du rapport (défaut: pdf)"
                            },
                            "date_start": {"type": "string", "description": "Date de début (format ISO: YYYY-MM-DD)"},
                            "date_end": {"type": "string", "description": "Date de fin (format ISO: YYYY-MM-DD)"},
                            "supplier_id": {"type": "string", "description": "ID du fournisseur (pour rapport supplier)"},
                            "client_id": {"type": "string", "description": "ID du client (pour rapport client)"}
                        },
                        "required": ["report_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_report",
                    "description": "Recherche parmi les rapports déjà générés",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "report_type": {
                                "type": "string",
                                "description": "Filtrer par type de rapport"
                            },
                            "format": {
                                "type": "string",
                                "enum": ["pdf", "xlsx", "csv"],
                                "description": "Filtrer par format"
                            },
                            "status": {
                                "type": "string",
                                "enum": ["pending", "processing", "completed", "failed"],
                                "description": "Filtrer par statut"
                            },
                            "limit": {"type": "integer", "description": "Nombre maximum de résultats (défaut: 10)"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_report_status",
                    "description": "Vérifie le statut de génération d'un rapport",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "report_id": {"type": "string", "description": "ID du rapport"}
                        },
                        "required": ["report_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_report",
                    "description": "Supprime un rapport généré",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "report_id": {"type": "string", "description": "ID du rapport à supprimer"}
                        },
                        "required": ["report_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "undo_last_action",
                    "description": "Annule la dernière action effectuée par l'utilisateur",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
        ]

    def parse_ai_response(self, response: str) -> tuple[str, Optional[Dict]]:
        """Parse la réponse de l'IA pour extraire le texte et les actions"""
        # Chercher du JSON dans la réponse
        try:
            # Essayer de trouver un bloc JSON dans la réponse
            import re
            json_pattern = r'\{[^{}]*\}'
            matches = re.findall(json_pattern, response)
            
            for match in matches:
                try:
                    action_data = json.loads(match)
                    if 'action' in action_data:
                        # Retirer le JSON du texte de réponse
                        clean_response = response.replace(match, '').strip()
                        return clean_response, action_data
                except json.JSONDecodeError:
                    continue
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
        
        return response, None

    async def chat(self,
                   message: str,
                   conversation_history: List[Dict] = None,
                   user_context: Dict = None) -> Dict[str, Any]:
        """
        Envoie un message à Mistral avec function calling et retourne la réponse
        """
        try:
            # Construire les messages
            messages = [
                {"role": "system", "content": self.create_system_prompt()}
            ]

            # Ajouter l'historique si disponible
            if conversation_history:
                for msg in conversation_history[-10:]:
                    messages.append({
                        "role": msg.get('role', 'user'),
                        "content": msg.get('content', '') if msg.get('content') else None,
                        "tool_calls": msg.get('tool_calls') if msg.get('tool_calls') else None
                    })

            # Ajouter le message actuel
            messages.append({"role": "user", "content": message})

            # Appeler Mistral avec tools
            response = self.client.chat.complete(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1500
            )

            # Extraire la réponse
            choice = response.choices[0]
            message_response = choice.message

            result = {
                'success': True,
                'response': message_response.content if message_response.content else "",
                'tool_calls': None,
                'finish_reason': choice.finish_reason
            }

            # Si l'IA a décidé d'appeler des fonctions
            if message_response.tool_calls:
                tool_calls_list = []
                for tool_call in message_response.tool_calls:
                    try:
                        # Parser les arguments JSON
                        arguments = {}
                        if tool_call.function.arguments:
                            try:
                                arguments = json.loads(tool_call.function.arguments)
                            except json.JSONDecodeError as e:
                                logger.warning(f"Failed to parse tool call arguments: {e}")
                                # Essayer de récupérer au moins le nom de la fonction
                                arguments = {}
                        
                        tool_calls_list.append({
                            'id': tool_call.id,
                            'function': tool_call.function.name,
                            'arguments': arguments
                        })
                    except Exception as e:
                        logger.error(f"Error processing tool call: {e}")
                        # Continuer avec les autres tool calls
                        continue
                
                result['tool_calls'] = tool_calls_list

                # Si pas de contenu textuel, générer un message par défaut
                if not result['response']:
                    # Créer un message descriptif basé sur les tool_calls
                    action_descriptions = {
                        'create_supplier': "Je vais créer le fournisseur",
                        'create_client': "Je vais créer le client",
                        'create_invoice': "Je vais créer la facture",
                        'create_purchase_order': "Je vais créer le bon de commande",
                        'create_product': "Je vais créer le produit",
                        'search_supplier': "Je recherche les fournisseurs",
                        'search_client': "Je recherche les clients",
                        'search_product': "Je recherche les produits",
                        'list_clients': "Je liste les clients",
                        'get_stats': "Je récupère les statistiques",
                        'get_latest_invoice': "Je récupère les dernières factures",
                        'search_invoice': "Je recherche les factures",
                        'search_purchase_order': "Je recherche les bons de commande",
                        'update_supplier': "Je modifie le fournisseur",
                        'update_client': "Je modifie le client",
                        'update_invoice': "Je modifie la facture",
                        'update_purchase_order': "Je modifie le bon de commande",
                        'update_product': "Je modifie le produit",
                        'delete_supplier': "Je supprime le fournisseur",
                        'delete_client': "Je supprime le client",
                        'delete_invoice': "Je supprime la facture",
                        'delete_purchase_order': "Je supprime le bon de commande",
                        'delete_product': "Je supprime le produit",
                        'add_invoice_items': "J'ajoute des articles à la facture",
                        'add_po_items': "J'ajoute des articles au bon de commande",
                        'send_invoice': "J'envoie la facture",
                        'send_purchase_order': "J'envoie le bon de commande",
                        'adjust_stock': "J'ajuste le stock",
                        'get_stock_alerts': "Je consulte les alertes de stock",
                        'generate_report': "Je génère le rapport",
                        'search_report': "Je recherche les rapports",
                        'get_report_status': "Je vérifie le statut du rapport",
                        'delete_report': "Je supprime le rapport",
                        'undo_last_action': "J'annule la dernière action"
                    }

                    actions = [action_descriptions.get(tc['function'], f"J'exécute {tc['function']}")
                              for tc in result['tool_calls']]
                    result['response'] = " et ".join(actions) + "..."

            return result

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Mistral API error: {e}")
            logger.error(f"Full traceback: {error_details}")
            return {
                'response': f"Désolé, j'ai rencontré une erreur: {str(e)}",
                'tool_calls': None,
                'success': False,
                'error': str(e),
                'error_details': error_details
            }
    
    def analyze_document(self, text: str, document_type: str) -> Dict[str, Any]:
        """
        Analyse un document scanné pour extraire les informations
        
        Args:
            text: Texte extrait par OCR
            document_type: Type de document (invoice, purchase_order, etc.)
            
        Returns:
            Dict avec les données extraites
        """
        prompts = {
            'invoice': """Analyse cette facture et extrais les informations suivantes au format JSON:
            - invoice_number: numéro de facture
            - date: date de la facture
            - client_name: nom du client
            - items: liste des articles avec description, quantité, prix unitaire
            - subtotal: sous-total
            - tax: taxes
            - total: total
            
            Texte de la facture:
            """,
            'purchase_order': """Analyse ce bon de commande et extrais les informations suivantes au format JSON:
            - po_number: numéro du bon de commande
            - date: date
            - supplier_name: nom du fournisseur
            - items: liste des articles avec description, quantité, prix
            - total: montant total
            
            Texte du bon de commande:
            """,
            'supplier_list': """Analyse cette liste de fournisseurs et extrais les informations au format JSON:
            - suppliers: liste avec pour chaque fournisseur:
              - name: nom
              - contact: personne contact
              - email: email
              - phone: téléphone
              - address: adresse
            
            Texte:
            """
        }
        
        prompt = prompts.get(document_type, prompts['invoice'])
        
        try:
            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un expert en extraction de données de documents. Retourne uniquement du JSON valide."
                    },
                    {"role": "user", "content": prompt + text}
                ],
                temperature=0.3,  # Plus déterministe pour l'extraction
                max_tokens=1000
            )
            
            # Extraire et parser le JSON
            json_str = response.choices[0].message.content
            # Nettoyer le JSON si nécessaire
            json_str = json_str.strip()
            if json_str.startswith('```json'):
                json_str = json_str[7:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]
            
            data = json.loads(json_str)
            
            return {
                'success': True,
                'data': data,
                'document_type': document_type
            }
            
        except Exception as e:
            logger.error(f"Document analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_type': document_type
            }


class AsyncSafeUserContext:
    """
    Helper to pre-fetch user data synchronously for safe async access.

    This class solves the "You cannot call this from an async context" error
    by extracting all user attributes that might trigger lazy-loading database
    queries before entering an async context.
    """

    @staticmethod
    def from_user(user) -> Dict[str, Any]:
        """
        Extract user data synchronously before entering async context.

        Args:
            user: Django User object from sync context

        Returns:
            Dict with all necessary user attributes pre-fetched

        Example:
            user_context = AsyncSafeUserContext.from_user(request.user)
            result = await executor.execute(action, params, user_context)
        """
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            # Pre-fetch the organization to avoid lazy-loading
            'organization': getattr(user, 'organization', None),
            'organization_id': getattr(user, 'organization_id', None),
            # Additional user attributes that might be accessed
            'role': getattr(user, 'role', None),
        }


class ActionExecutor:
    """Exécute les actions demandées par l'IA"""
    
    def __init__(self):
        self.actions = {
            'create_supplier': self.create_supplier,
            'search_supplier': self.search_supplier,
            'create_invoice': self.create_invoice,
            'search_invoice': self.search_invoice,
            'create_purchase_order': self.create_purchase_order,
            'search_purchase_order': self.search_purchase_order,
            'get_stats': self.get_stats,
            'search_client': self.search_client,
            'list_clients': self.list_clients,
            'create_client': self.create_client,
            'get_latest_invoice': self.get_latest_invoice,
            'add_invoice_items': self.add_invoice_items,
            'send_invoice': self.send_invoice,
            'add_po_items': self.add_po_items,
            'send_purchase_order': self.send_purchase_order,
            'update_supplier': self.update_supplier,
            'update_invoice': self.update_invoice,
            'update_purchase_order': self.update_purchase_order,
            'update_client': self.update_client,
            'delete_supplier': self.delete_supplier,
            'delete_invoice': self.delete_invoice,
            'delete_purchase_order': self.delete_purchase_order,
            'delete_client': self.delete_client,
            'create_product': self.create_product,
            'search_product': self.search_product,
            'update_product': self.update_product,
            'delete_product': self.delete_product,
            'adjust_stock': self.adjust_stock,
            'get_stock_alerts': self.get_stock_alerts,
            'generate_report': self.generate_report,
            'search_report': self.search_report,
            'get_report_status': self.get_report_status,
            'delete_report': self.delete_report,
            'undo_last_action': self.undo_last_action,
            'search_entity': self.search_entity,
        }
    
    async def execute(self, action: str, params: Dict, user) -> Dict[str, Any]:
        """Exécute une action avec les paramètres donnés"""
        # Normaliser params si nécessaire
        if not isinstance(params, dict):
            logger.warning(f"Params is not a dict: {type(params)} - {params}")
            if isinstance(params, list):
                params = {}
            else:
                try:
                    import json
                    if isinstance(params, str):
                        params = json.loads(params)
                    else:
                        params = {}
                except:
                    params = {}

        # User should already be converted to dict in the calling code (views.py)
        # to avoid "You cannot call this from an async context" errors
        if not isinstance(user, dict):
            # If user is not a dict, it means the calling code didn't convert it
            # This should not happen - log a warning and try to provide a helpful error
            logger.error(f"execute() received user object instead of dict. This will cause async context errors. "
                        f"Convert user to dict using AsyncSafeUserContext.from_user() before calling execute().")
            return {
                'success': False,
                'error': 'Configuration error: user context not properly initialized'
            }

        user_context = user

        # Vérifier d'abord si l'action existe dans les handlers
        if action not in self.actions:
            return {
                'success': False,
                'error': f"Action '{action}' non reconnue. Actions disponibles: {', '.join(sorted(self.actions.keys()))}"
            }
        
        # Valider l'action et ses paramètres (mais ne pas bloquer si la config n'existe pas)
        is_valid, errors = action_manager.validate_action_params(action, params)
        if not is_valid:
            # Si l'action existe dans les handlers mais pas dans la config, on continue quand même
            # mais on log un avertissement
            config = action_manager.get_action_config(action)
            if not config:
                logger.warning(f"Action '{action}' exécutée sans configuration dans actions_config.json")
            else:
                # Si la config existe mais les params sont invalides, on retourne l'erreur
                return {
                    'success': False,
                    'error': '; '.join(errors)
                }

        try:
            handler = self.actions[action]
            result = await handler(params, user_context)

            # S'assurer que le résultat est un dict
            if not isinstance(result, dict):
                logger.error(f"Handler returned non-dict result: {type(result)}")
                return {
                    'success': False,
                    'error': 'Le handler a retourné un format invalide'
                }

            # Si l'action a réussi, générer les actions de suivi
            if result.get('success'):
                success_actions = action_manager.generate_success_actions(action, result.get('data', {}))
                if success_actions:
                    result['success_actions'] = success_actions

            return result
        except Exception as e:
            import traceback
            logger.error(f"Action execution error: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_supplier(self, params: Dict, user_context: Dict) -> Dict:
        """
        Crée un nouveau fournisseur après vérification des doublons

        Args:
            params: Paramètres de création du fournisseur
            user_context: Contexte utilisateur (dict with id, organization, etc.)

        Returns:
            Dict avec success, message, et data
        """
        from apps.suppliers.models import Supplier
        from asgiref.sync import sync_to_async
        from .entity_matcher import entity_matcher

        try:
            name = params.get('name')
            email = params.get('email', '')
            phone = params.get('phone', '')
            organization = user_context.get('organization')

            # Vérifier les doublons potentiels
            @sync_to_async
            def check_similar():
                return entity_matcher.find_similar_suppliers(
                    name=name,
                    email=email if email else None,
                    phone=phone if phone else None
                )

            similar_suppliers = await check_similar()

            # Si des fournisseurs similaires sont trouvés
            if similar_suppliers:
                # Filtrer par organisation si nécessaire
                if organization:
                    similar_suppliers = [(s, sc, r) for s, sc, r in similar_suppliers if s.organization == organization]
                
                if similar_suppliers:
                    # Retourner les similarités pour confirmation
                    return {
                        'success': False,
                        'error': 'similar_entities_found',
                        'similar_entities': [
                            {
                                'id': str(supplier.id),
                                'name': supplier.name,
                                'email': supplier.email,
                                'phone': supplier.phone,
                                'similarity': score,
                                'reason': entity_matcher.format_match_reason(reason)
                            }
                            for supplier, score, reason in similar_suppliers[:3]
                        ],
                        'message': entity_matcher.create_similarity_message('supplier', similar_suppliers)
                    }

            # Aucun doublon, créer le fournisseur
            @sync_to_async
            def create_supplier_sync():
                return Supplier.objects.create(
                    name=name,
                    contact_person=params.get('contact_person', ''),
                    email=email,
                    phone=phone,
                    address=params.get('address', ''),
                    city=params.get('city', ''),
                    organization=organization,
                    status='pending'
                )

            supplier = await create_supplier_sync()

            return {
                'success': True,
                'message': f"Fournisseur '{supplier.name}' créé avec succès",
                'data': {
                    'id': str(supplier.id),
                    'name': supplier.name,
                    'contact_person': supplier.contact_person,
                    'email': supplier.email,
                    'entity_type': 'supplier',
                    'url': f'/suppliers/{supplier.id}'
                }
            }
        except Exception as e:
            import traceback
            logger.error(f"Error creating supplier: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_supplier(self, params: Dict, user_context: Dict) -> Dict:
        """
        Recherche des fournisseurs avec fuzzy matching ultra-robuste.
        Gère les fautes d'orthographe et variations automatiquement.
        """
        from .entity_matcher import entity_matcher
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_suppliers_sync():
            query = params.get('query', '')
            min_score = params.get('min_score', 0.60)
            limit = params.get('limit', 10)
            organization = user_context.get('organization')

            if not query:
                return []

            # Utiliser le fuzzy matching
            matches = entity_matcher.find_similar_suppliers(
                name=query,
                min_score=min_score
            )

            # Filtrer par organisation
            if organization:
                matches = [(s, score, details) for s, score, details in matches if s.organization == organization]
            elif not user_context.get('is_superuser', False):
                matches = []

            return [
                {
                    'id': str(supplier.id),
                    'name': supplier.name,
                    'contact': supplier.contact_person or '',
                    'email': supplier.email or '',
                    'phone': supplier.phone or '',
                    'status': supplier.status,
                    'score': score * 100,
                    'match_reason': entity_matcher.format_match_reason(details),
                    'url': f'/suppliers/{supplier.id}'
                }
                for supplier, score, details in matches[:limit]
            ]

        results = await search_suppliers_sync()

        # Construire un message détaillé
        if results:
            message = f"J'ai trouvé {len(results)} fournisseur(s) correspondant à '{params.get('query')}' :\n\n"

            for i, result in enumerate(results, 1):
                message += f"**{i}. {result['name']}**"
                message += f" [Voir](/suppliers/{result['id']})\n"

                if result.get('email'):
                    message += f"   - Email: {result['email']}\n"
                if result.get('phone'):
                    message += f"   - Téléphone: {result['phone']}\n"
                if result.get('contact'):
                    message += f"   - Contact: {result['contact']}\n"
                if result.get('status'):
                    message += f"   - Statut: {result['status']}\n"

                # Score de correspondance
                message += f"   - Correspondance: {result['score']:.0f}% - {result['match_reason']}\n\n"
        else:
            message = f"Aucun fournisseur trouvé pour '{params.get('query', '')}'"

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': message
        }
    
    async def create_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """
        Crée une nouvelle facture avec entity matching pour clients et produits

        Args:
            params: Paramètres de création de la facture
            user_context: Contexte utilisateur (dict with id, organization, etc.)

        Returns:
            Dict avec success, message, et data
        """
        from apps.invoicing.models import Invoice, InvoiceItem, Product
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async
        from datetime import datetime, timedelta
        from decimal import Decimal
        from .entity_matcher import entity_matcher

        try:
            @sync_to_async
            def create_invoice_sync():
                organization = user_context.get('organization')
                
                # 1. TROUVER OU CRÉER CLIENT avec entity matching
                client_name = params.get('client_name')
                client_email = params.get('client_email', '')
                client_phone = params.get('client_phone', '')

                # Entity matching pour clients
                similar_clients = entity_matcher.find_similar_clients(
                    first_name=client_name,
                    last_name='',
                    email=client_email if client_email else None,
                    company=client_name
                )

                # Filtrer par organisation DANS le contexte sync
                if similar_clients and organization:
                    similar_clients = [(c, s, r) for c, s, r in similar_clients if c.organization == organization]

                # IMPORTANT: Ne PAS auto-sélectionner - demander confirmation à l'utilisateur
                if similar_clients and not params.get('force_create_client', False):
                    # RETOURNER ERREUR POUR CONFIRMATION
                    return {
                        'success': False,
                        'error': 'similar_entities_found',
                        'entity_type': 'client',
                        'similar_entities': [
                            {
                                'id': str(c.id),
                                'name': c.name,
                                'email': c.email or '',
                                'phone': c.phone or '',
                                'similarity': score * 100,  # Convertir en pourcentage
                                'reason': entity_matcher.format_match_reason(reason)
                            }
                            for c, score, reason in similar_clients[:3]  # Top 3 matches
                        ],
                        'message': f'Client similaire trouvé : "{similar_clients[0][0].name}" ({int(similar_clients[0][1]*100)}% de similarité). Voulez-vous utiliser le client existant ou en créer un nouveau ?',
                        'suggested_action': {
                            'use_existing': str(similar_clients[0][0].id),  # Best match ID
                            'create_new': 'force_create_client'
                        }
                    }
                elif similar_clients and params.get('use_existing_client_id'):
                    # Utiliser le client existant spécifié par l'utilisateur
                    client_id = params.get('use_existing_client_id')
                    client = Client.objects.get(id=client_id, organization=organization)
                else:
                    # Créer nouveau client (pas de match OU force_create_client=True)
                    client = Client.objects.create(
                        name=client_name,
                        email=client_email,
                        phone=client_phone,
                        contact_person=params.get('contact_person', ''),
                        address=params.get('client_address', ''),
                        payment_terms=params.get('payment_terms', 'Net 30'),
                        organization=organization,
                        is_active=True
                    )

                # Créer la facture
                title = params.get('title', f'Facture pour {client_name}')
                description = params.get('description', '')
                amount = params.get('amount', 0)
                due_date = params.get('due_date')

                # Parser la date d'échéance
                if due_date:
                    if isinstance(due_date, str):
                        try:
                            # Essayer plusieurs formats
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                                try:
                                    due_date = datetime.strptime(due_date, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            due_date = (datetime.now() + timedelta(days=30)).date()
                else:
                    due_date = (datetime.now() + timedelta(days=30)).date()

                # Get user object for created_by field
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=user_context.get('id'))

                invoice = Invoice.objects.create(
                    title=title,
                    client=client,
                    description=description,
                    created_by=user,
                    due_date=due_date,
                    subtotal=amount,
                    total_amount=amount,
                    status='draft'
                )

                # 2. AJOUTER ITEMS avec création auto des produits
                items = params.get('items', [])
                if items:
                    for item_data in items:
                        product_name = item_data.get('description', '')
                        product_ref = item_data.get('product_reference', '')

                        # Entity matching pour produits
                        similar_products = entity_matcher.find_similar_products(
                            name=product_name,
                            reference=product_ref if product_ref else None
                        )

                        # Filtrer par organisation DANS le contexte sync
                        if similar_products and organization:
                            similar_products = [(p, s, r) for p, s, r in similar_products if p.organization == organization]

                        product = None
                        if similar_products:
                            # Utiliser produit existant
                            product = similar_products[0][0]
                        elif product_name:
                            # Créer nouveau produit (type service par défaut)
                            product = Product.objects.create(
                                name=product_name,
                                reference=product_ref or f"PROD-{Product.objects.count() + 1:04d}",
                                product_type='service',
                                price=Decimal(str(item_data.get('unit_price', 0))),
                                organization=organization,
                                is_active=True,
                                # Les services ne gèrent pas de stock - mettre à 0 explicitement
                                stock_quantity=0,
                                low_stock_threshold=0,
                                warehouse=None
                            )

                        # Créer l'item facture
                        InvoiceItem.objects.create(
                            invoice=invoice,
                            product=product,
                            service_code=item_data.get('service_code', 'SVC-001'),
                            description=product_name,
                            quantity=item_data.get('quantity', 1),
                            unit_price=Decimal(str(item_data.get('unit_price', 0))),
                            unit_of_measure=item_data.get('unit_of_measure', 'unité')
                        )

                    # Recalculer les totaux
                    invoice.recalculate_totals()

                return {
                    'id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'client_name': client.name,
                    'url': f'/invoices/{invoice.id}'
                }

            result = await create_invoice_sync()

            # Si c'est une erreur (similar_entities_found), retourner directement
            if isinstance(result, dict) and result.get('success') == False:
                return result

            return {
                'success': True,
                'message': f"Facture '{result['invoice_number']}' créée avec succès pour {result['client_name']}",
                'data': {
                    **result,
                    'entity_type': 'invoice'
                }
            }
        except Exception as e:
            import traceback
            logger.error(f"Error creating invoice: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """Recherche des factures"""
        from apps.invoicing.models import Invoice
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_invoices_sync():
            query = params.get('query', '')
            status_filter = params.get('status')
            limit = params.get('limit', 5)
            organization = user_context.get('organization')

            invoices_qs = Invoice.objects.filter(
                Q(invoice_number__icontains=query) |
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(client__name__icontains=query) |
                Q(client__email__icontains=query) |
                Q(client__contact_person__icontains=query)
            )

            # Filtrer par organisation de l'utilisateur
            if organization:
                invoices_qs = invoices_qs.filter(created_by__organization=organization)
            elif not user_context.get('is_superuser', False):
                invoices_qs = invoices_qs.filter(created_by_id=user_context.get('id'))

            if status_filter:
                invoices_qs = invoices_qs.filter(status=status_filter)

            invoices = invoices_qs.order_by('-created_at')[:limit]

            return [{
                'id': str(i.id),
                'invoice_number': i.invoice_number,
                'title': i.title,
                'client_name': i.client.name if i.client else 'N/A',
                'total_amount': float(i.total_amount),
                'status': i.status,
                'due_date': str(i.due_date) if i.due_date else None,
                'url': f'/invoices/{i.id}'
            } for i in invoices]

        results = await search_invoices_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"J'ai trouvé {len(results)} facture(s)" if results else f"Aucune facture trouvée pour '{params.get('query', '')}'"
        }
    
    async def create_purchase_order(self, params: Dict, user_context: Dict) -> Dict:
        """
        Crée un bon de commande avec entity matching pour fournisseur et produits

        Args:
            params: Paramètres de création du bon de commande
            user_context: Contexte utilisateur (dict with id, organization, etc.)

        Returns:
            Dict avec success, message, et data
        """
        from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
        from apps.suppliers.models import Supplier
        from apps.invoicing.models import Product
        from asgiref.sync import sync_to_async
        from datetime import datetime, timedelta
        from decimal import Decimal
        from .entity_matcher import entity_matcher

        try:
            @sync_to_async
            def create_po_sync():
                organization = user_context.get('organization')
                
                # 1. TROUVER OU CRÉER FOURNISSEUR avec entity matching
                supplier_name = params.get('supplier_name')
                supplier_email = params.get('supplier_email', '')
                supplier_phone = params.get('supplier_phone', '')

                # Entity matching pour fournisseurs
                similar_suppliers = entity_matcher.find_similar_suppliers(
                    name=supplier_name,
                    email=supplier_email if supplier_email else None,
                    phone=supplier_phone if supplier_phone else None
                )

                # Filtrer par organisation si nécessaire
                if similar_suppliers and organization:
                    similar_suppliers = [(s, sc, r) for s, sc, r in similar_suppliers if s.organization == organization]

                # IMPORTANT: Ne PAS auto-sélectionner - demander confirmation à l'utilisateur
                if similar_suppliers and not params.get('force_create_supplier', False):
                    # RETOURNER ERREUR POUR CONFIRMATION
                    return {
                        'success': False,
                        'error': 'similar_entities_found',
                        'entity_type': 'supplier',
                        'similar_entities': [
                            {
                                'id': str(s.id),
                                'name': s.name,
                                'email': s.email or '',
                                'phone': s.phone or '',
                                'similarity': score * 100,  # Convertir en pourcentage
                                'reason': entity_matcher.format_match_reason(reason)
                            }
                            for s, score, reason in similar_suppliers[:3]  # Top 3 matches
                        ],
                        'message': f'Fournisseur similaire trouvé : "{similar_suppliers[0][0].name}" ({int(similar_suppliers[0][1]*100)}% de similarité). Voulez-vous utiliser le fournisseur existant ou en créer un nouveau ?',
                        'suggested_action': {
                            'use_existing': str(similar_suppliers[0][0].id),  # Best match ID
                            'create_new': 'force_create_supplier'
                        }
                    }
                elif similar_suppliers and params.get('use_existing_supplier_id'):
                    # Utiliser le fournisseur existant spécifié par l'utilisateur
                    supplier_id = params.get('use_existing_supplier_id')
                    supplier = Supplier.objects.get(id=supplier_id, organization=organization)
                else:
                    # Créer nouveau fournisseur (pas de match OU force_create_supplier=True)
                    supplier = Supplier.objects.create(
                        name=supplier_name,
                        email=supplier_email,
                        phone=supplier_phone,
                        organization=organization,
                        status='pending',
                        is_active=True
                    )

                # Préparer les données
                description = params.get('description', '')
                total_amount = params.get('total_amount', 0)
                delivery_date = params.get('delivery_date')

                # Parser la date de livraison
                if delivery_date:
                    if isinstance(delivery_date, str):
                        try:
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                                try:
                                    delivery_date = datetime.strptime(delivery_date, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except:
                            delivery_date = (datetime.now() + timedelta(days=30)).date()
                else:
                    delivery_date = (datetime.now() + timedelta(days=30)).date()

                # Get user object for created_by field
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=user_context.get('id'))

                # Créer le bon de commande
                po = PurchaseOrder.objects.create(
                    supplier=supplier,
                    title=f"BC {supplier.name}",
                    description=description,
                    created_by=user,
                    delivery_date=delivery_date,
                    total_amount=total_amount,
                    status='draft'
                )

                # 2. AJOUTER ITEMS avec création auto des produits
                items = params.get('items', [])
                if items:
                    for item_data in items:
                        product_name = item_data.get('description', '')
                        product_ref = item_data.get('product_reference', '')

                        # Entity matching pour produits
                        similar_products = entity_matcher.find_similar_products(
                            name=product_name,
                            reference=product_ref if product_ref else None
                        )

                        # Filtrer par organisation DANS le contexte sync
                        if similar_products and organization:
                            similar_products = [(p, s, r) for p, s, r in similar_products if p.organization == organization]

                        product = None
                        if similar_products:
                            # Utiliser produit existant
                            product = similar_products[0][0]
                        elif product_name:
                            # Créer nouveau produit (type physical par défaut pour BC)
                            product = Product.objects.create(
                                name=product_name,
                                reference=product_ref or f"PROD-{Product.objects.count() + 1:04d}",
                                product_type='physical',
                                cost_price=Decimal(str(item_data.get('unit_price', 0))),
                                price=Decimal(str(item_data.get('unit_price', 0))) * Decimal('1.3'),  # Marge 30%
                                organization=organization,
                                stock_quantity=0,
                                low_stock_threshold=10,
                                is_active=True
                            )

                        # Créer l'item BC (requiert produit)
                        if product:
                            PurchaseOrderItem.objects.create(
                                purchase_order=po,
                                product=product,
                                product_reference=product.reference,
                                description=product_name,
                                quantity=item_data.get('quantity', 1),
                                unit_price=Decimal(str(item_data.get('unit_price', 0)))
                            )

                    # Recalculer totaux
                    po.recalculate_totals()

                return {
                    'id': str(po.id),
                    'po_number': po.po_number,
                    'supplier_name': supplier.name,
                    'url': f'/purchase-orders/{po.id}'
                }

            result = await create_po_sync()

            return {
                'success': True,
                'message': f"Bon de commande '{result['po_number']}' créé avec succès",
                'data': {
                    **result,
                    'entity_type': 'purchase_order'
                }
            }
        except Exception as e:
            import traceback
            logger.error(f"Error creating purchase order: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }
    
    async def search_purchase_order(self, params: Dict, user_context: Dict) -> Dict:
        """Recherche des bons de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_pos_sync():
            query = params.get('query', '')
            limit = params.get('limit', 5)
            organization = user_context.get('organization')

            pos_qs = PurchaseOrder.objects.filter(
                Q(po_number__icontains=query) |
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(supplier__name__icontains=query)
            )

            # Filtrer par organisation de l'utilisateur
            if organization:
                pos_qs = pos_qs.filter(created_by__organization=organization)
            elif not user_context.get('is_superuser', False):
                pos_qs = pos_qs.filter(created_by_id=user_context.get('id'))

            pos = pos_qs.order_by('-created_at')[:limit]

            return [{
                'id': str(po.id),
                'po_number': po.po_number,
                'title': po.title,
                'supplier_name': po.supplier.name if po.supplier else 'N/A',
                'total_amount': float(po.total_amount),
                'status': po.status,
                'delivery_date': str(po.delivery_date) if po.delivery_date else None,
                'url': f'/purchase-orders/{po.id}'
            } for po in pos]

        results = await search_pos_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"J'ai trouvé {len(results)} bon(s) de commande" if results else f"Aucun bon de commande trouvé pour '{params.get('query', '')}'"
        }

    async def search_entity(self, params: Dict, user_context: Dict) -> Dict:
        """
        Recherche des entités en utilisant le matching flou ultra-robuste.
        Gère les fautes d'orthographe et variations automatiquement.

        Args:
            params: {
                'entity_type': 'client' | 'supplier' | 'product',
                'query': 'Texte de recherche (peut contenir des fautes)',
                'min_score': Score minimum de similarité (0.0-1.0, défaut: 0.60)
            }
            user_context: Contexte utilisateur (dict with id, organization, etc.)

        Returns:
            Dict avec success, results (top 10 matches avec scores de confiance)
        """
        from .entity_matcher import entity_matcher
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_sync():
            entity_type = params.get('entity_type')
            query = params.get('query')
            min_score = params.get('min_score', 0.60)
            organization = user_context.get('organization')

            if not entity_type or not query:
                return []

            entity_names = {
                'client': 'clients',
                'supplier': 'fournisseurs',
                'product': 'produits'
            }

            if entity_type == 'client':
                matches = entity_matcher.find_similar_clients(
                    first_name=query,
                    last_name='',
                    company=query,
                    min_score=min_score
                )
                # Filtrer par organisation
                if organization:
                    matches = [(c, score, details) for c, score, details in matches if c.organization == organization]

                return [
                    {
                        'id': str(client.id),
                        'name': client.name,
                        'email': client.email or '',
                        'phone': client.phone or '',
                        'score': score * 100,  # Pourcentage
                        'match_reason': entity_matcher.format_match_reason(details),
                        'confidence': details.get('algorithms', {}).get('name', {}).get('confidence', 'low')
                    }
                    for client, score, details in matches[:10]  # Top 10 résultats
                ]

            elif entity_type == 'supplier':
                matches = entity_matcher.find_similar_suppliers(
                    name=query,
                    min_score=min_score
                )
                # Filtrer par organisation
                if organization:
                    matches = [(s, score, details) for s, score, details in matches if s.organization == organization]

                return [
                    {
                        'id': str(supplier.id),
                        'name': supplier.name,
                        'email': supplier.email or '',
                        'phone': supplier.phone or '',
                        'score': score * 100,  # Pourcentage
                        'match_reason': entity_matcher.format_match_reason(details),
                        'confidence': details.get('algorithms', {}).get('name', {}).get('confidence', 'low')
                    }
                    for supplier, score, details in matches[:10]  # Top 10 résultats
                ]

            elif entity_type == 'product':
                matches = entity_matcher.find_similar_products(
                    name=query,
                    min_score=min_score
                )
                # Filtrer par organisation
                if organization:
                    matches = [(p, score, details) for p, score, details in matches if p.organization == organization]

                return [
                    {
                        'id': str(product.id),
                        'name': product.name,
                        'reference': product.reference or '',
                        'price': float(product.price),
                        'score': score * 100,  # Pourcentage
                        'match_reason': entity_matcher.format_match_reason(details),
                        'confidence': details.get('algorithms', {}).get('name', {}).get('confidence', 'low')
                    }
                    for product, score, details in matches[:10]  # Top 10 résultats
                ]

            return []

        results = await search_sync()

        entity_names = {
            'client': 'clients',
            'supplier': 'fournisseurs',
            'product': 'produits'
        }
        entity_name = entity_names.get(params.get('entity_type'), 'entités')

        # Formater un message détaillé avec les résultats
        if results:
            logger.info(f"[search_entity] Found {len(results)} results for query '{params.get('query')}'")
            logger.info(f"[search_entity] Results: {results}")

            message = f"J'ai trouvé {len(results)} {entity_name} correspondant à '{params.get('query')}' :\n\n"

            # Déterminer l'URL de base selon le type d'entité
            url_base = {
                'client': '/clients',
                'supplier': '/suppliers',
                'product': '/products'
            }.get(params.get('entity_type'), '')

            try:
                for i, result in enumerate(results[:10], 1):  # Max 10 résultats
                    logger.info(f"[search_entity] Processing result {i}: {result.get('name')}")
                    message += f"**{i}. {result['name']}**"

                    # Ajouter lien cliquable
                    if url_base:
                        message += f" [Voir]({url_base}/{result['id']})"

                    message += f"\n"

                    # Ajouter détails selon le type
                    if params.get('entity_type') == 'client':
                        if result.get('email'):
                            message += f"   - Email: {result['email']}\n"
                        if result.get('phone'):
                            message += f"   - Téléphone: {result['phone']}\n"
                        if result.get('company'):
                            message += f"   - Entreprise: {result['company']}\n"
                    elif params.get('entity_type') == 'supplier':
                        if result.get('email'):
                            message += f"   - Email: {result['email']}\n"
                        if result.get('phone'):
                            message += f"   - Téléphone: {result['phone']}\n"
                    elif params.get('entity_type') == 'product':
                        if result.get('reference'):
                            message += f"   - Référence: {result['reference']}\n"
                        if result.get('price'):
                            message += f"   - Prix: {result['price']}€\n"

                    # Score de correspondance
                    message += f"   - Correspondance: {result['score']:.0f}% - {result['match_reason']}\n\n"

                logger.info(f"[search_entity] Final message length: {len(message)} chars")
            except Exception as e:
                logger.error(f"[search_entity] Error building message: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            message = f"Aucun {entity_name[:-1]} trouvé pour '{params.get('query')}'"

        logger.info(f"[search_entity] Returning message: {message[:200]}...")

        return {
            'success': True,
            'results': results,
            'count': len(results),
            'message': message
        }

    async def get_stats(self, params: Dict, user_context: Dict) -> Dict:
        """
        Récupère les statistiques

        Args:
            params: Paramètres de la requête
            user_context: Contexte utilisateur (dict with id, organization, etc.)

        Returns:
            Dict avec success, message, et data
        """
        from apps.suppliers.models import Supplier
        from apps.invoicing.models import Invoice
        from apps.purchase_orders.models import PurchaseOrder
        from apps.accounts.models import Client
        from django.db.models import Sum
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_stats_sync():
            organization = user_context.get('organization')
            user_id = user_context.get('id')
            is_superuser = user_context.get('is_superuser', False)

            # Filtrer par organisation si l'utilisateur en a une
            if organization:
                suppliers_qs = Supplier.objects.filter(organization=organization)
                clients_qs = Client.objects.filter(organization=organization, is_active=True)
                invoices_qs = Invoice.objects.filter(created_by__organization=organization)
                pos_qs = PurchaseOrder.objects.filter(created_by__organization=organization)
            elif is_superuser:
                suppliers_qs = Supplier.objects.all()
                clients_qs = Client.objects.filter(is_active=True)
                invoices_qs = Invoice.objects.all()
                pos_qs = PurchaseOrder.objects.all()
            else:
                suppliers_qs = Supplier.objects.none()
                clients_qs = Client.objects.none()
                invoices_qs = Invoice.objects.filter(created_by_id=user_id)
                pos_qs = PurchaseOrder.objects.filter(created_by_id=user_id)
            
            return {
                'total_suppliers': suppliers_qs.count(),
                'active_suppliers': suppliers_qs.filter(status='active').count(),
                'total_clients': clients_qs.count(),
                'total_invoices': invoices_qs.count(),
                'paid_invoices': invoices_qs.filter(status='paid').count(),
                'unpaid_invoices': invoices_qs.filter(status='sent').count(),
                'overdue_invoices': invoices_qs.filter(status='overdue').count(),
                'total_revenue': float(invoices_qs.filter(status='paid').aggregate(
                    Sum('total_amount')
                )['total_amount__sum'] or 0),
                'total_purchase_orders': pos_qs.count(),
                'pending_purchase_orders': pos_qs.filter(status='sent').count()
            }

        stats = await get_stats_sync()

        return {
            'success': True,
            'data': stats,
            'message': f"Statistiques récupérées: {stats['total_invoices']} facture(s), {stats['total_suppliers']} fournisseur(s), {stats['total_clients']} client(s)"
        }

    async def search_client(self, params: Dict, user_context: Dict) -> Dict:
        """
        Recherche des clients avec fuzzy matching ultra-robuste.
        Gère les fautes d'orthographe et variations automatiquement.
        """
        from .entity_matcher import entity_matcher
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_clients_sync():
            query = params.get('query', '')
            min_score = params.get('min_score', 0.60)
            limit = params.get('limit', 10)
            organization = user_context.get('organization')

            if not query:
                return []

            # Utiliser le fuzzy matching
            matches = entity_matcher.find_similar_clients(
                first_name=query,
                last_name='',
                company=query,
                min_score=min_score
            )

            # Filtrer par organisation
            if organization:
                matches = [(c, score, details) for c, score, details in matches if c.organization == organization]
            elif not user_context.get('is_superuser', False):
                matches = []

            return [
                {
                    'id': str(client.id),
                    'name': client.name,
                    'email': client.email or '',
                    'phone': client.phone or '',
                    'contact_person': client.contact_person or '',
                    'payment_terms': client.payment_terms,
                    'score': score * 100,
                    'match_reason': entity_matcher.format_match_reason(details),
                    'url': f'/clients/{client.id}'
                }
                for client, score, details in matches[:limit]
            ]

        results = await search_clients_sync()

        # Construire un message détaillé
        if results:
            message = f"J'ai trouvé {len(results)} client(s) correspondant à '{params.get('query')}' :\n\n"

            for i, result in enumerate(results, 1):
                message += f"**{i}. {result['name']}**"
                message += f" [Voir](/clients/{result['id']})\n"

                if result.get('email'):
                    message += f"   - Email: {result['email']}\n"
                if result.get('phone'):
                    message += f"   - Téléphone: {result['phone']}\n"
                if result.get('contact_person'):
                    message += f"   - Contact: {result['contact_person']}\n"

                # Score de correspondance
                message += f"   - Correspondance: {result['score']:.0f}% - {result['match_reason']}\n\n"
        else:
            message = f"Aucun client trouvé pour '{params.get('query', '')}'"

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': message
        }

    async def list_clients(self, params: Dict, user_context: Dict) -> Dict:
        """Liste tous les clients de l'entreprise"""
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async

        @sync_to_async
        def list_clients_sync():
            limit = params.get('limit', 10)
            organization = user_context.get('organization')

            # Récupérer tous les clients actifs de l'organisation de l'utilisateur
            clients_qs = Client.objects.filter(is_active=True)

            # Filtrer par organisation si l'utilisateur en a une
            if organization:
                clients_qs = clients_qs.filter(organization=organization)
            elif not user_context.get('is_superuser', False):
                # Si pas d'organisation et pas superuser, retourner vide
                clients_qs = clients_qs.none()

            clients = clients_qs.order_by('-created_at')[:limit]

            return [{
                'id': str(c.id),
                'name': c.name,
                'email': c.email,
                'phone': c.phone or '',
                'contact_person': c.contact_person or '',
                'payment_terms': c.payment_terms,
                'created_at': str(c.created_at.date()) if c.created_at else None
            } for c in clients]

        results = await list_clients_sync()

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"Voici les {len(results)} dernier(s) client(s)" if results else "Aucun client trouvé"
        }

    async def create_client(self, params: Dict, user_context: Dict) -> Dict:
        """
        Crée un nouveau client après vérification des doublons

        Args:
            params: Paramètres de création du client
            user_context: Contexte utilisateur (dict with id, organization, etc.)

        Returns:
            Dict avec success, message, et data
        """
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async
        from .entity_matcher import entity_matcher

        try:
            name = params.get('name')
            email = params.get('email', '')
            phone = params.get('phone', '')
            organization = user_context.get('organization')

            if not name:
                return {
                    'success': False,
                    'error': 'Le nom du client est obligatoire'
                }

            # Vérifier les doublons potentiels
            @sync_to_async
            def check_similar():
                matches = entity_matcher.find_similar_clients(
                    first_name=name,
                    last_name='',
                    email=email if email else None,
                    company=name
                )
                # Filtrer par organisation DANS le contexte sync
                if organization and matches:
                    matches = [(c, s, r) for c, s, r in matches if c.organization == organization]
                return matches

            similar_clients = await check_similar()

            # Si des clients similaires sont trouvés
            if similar_clients:
                    return {
                        'success': False,
                        'error': 'similar_entities_found',
                        'similar_entities': [
                            {
                                'id': str(client.id),
                                'name': client.name,
                                'email': client.email,
                                'phone': client.phone,
                                'similarity': score,
                                'reason': entity_matcher.format_match_reason(reason)
                            }
                            for client, score, reason in similar_clients[:3]
                        ],
                        'message': entity_matcher.create_similarity_message('client', similar_clients)
                    }

            # Aucun doublon, créer le client
            @sync_to_async
            def create_client_sync():
                return Client.objects.create(
                    name=name,
                    email=email,
                    phone=phone,
                    address=params.get('address', ''),
                    contact_person=params.get('contact_person', ''),
                    payment_terms=params.get('payment_terms', 'Net 30'),
                    tax_id=params.get('tax_id', ''),
                    organization=organization,
                    is_active=True
                )

            client = await create_client_sync()

            return {
                'success': True,
                'message': f"Client '{client.name}' créé avec succès",
                'data': {
                    'id': str(client.id),
                    'name': client.name,
                    'email': client.email,
                    'phone': client.phone,
                    'entity_type': 'client',
                    'url': f'/clients/{client.id}'
                }
            }
        except Exception as e:
            import traceback
            logger.error(f"Error creating client: {e}")
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }

    async def get_latest_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """Récupère la ou les dernière(s) facture(s) créée(s)"""
        from apps.invoicing.models import Invoice
        from django.db.models import Q
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_latest_invoices_sync():
            limit = params.get('limit', 1)
            client_name = params.get('client_name')
            organization = user_context.get('organization')

            invoices_qs = Invoice.objects.all()

            # Filtrer par organisation de l'utilisateur
            if organization:
                invoices_qs = invoices_qs.filter(created_by__organization=organization)
            elif not user_context.get('is_superuser', False):
                invoices_qs = invoices_qs.filter(created_by_id=user_context.get('id'))

            # Filtrer par client si spécifié (utilise le modèle Client)
            if client_name:
                invoices_qs = invoices_qs.filter(
                    Q(client__name__icontains=client_name) |
                    Q(client__email__icontains=client_name) |
                    Q(client__contact_person__icontains=client_name)
                )

            # Trier par date de création (plus récent en premier)
            invoices = invoices_qs.order_by('-created_at')[:limit]

            return [{
                'id': str(i.id),
                'invoice_number': i.invoice_number,
                'title': i.title,
                'client_name': i.client.name if i.client else 'N/A',
                'total_amount': float(i.total_amount),
                'status': i.status,
                'created_at': str(i.created_at.date()) if i.created_at else None,
                'due_date': str(i.due_date) if i.due_date else None,
                'url': f'/invoices/{i.id}'
            } for i in invoices]

        results = await get_latest_invoices_sync()

        if not results:
            return {
                'success': True,
                'data': [],
                'count': 0,
                'message': "Aucune facture trouvée"
            }

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': f"Voici {'la dernière facture' if len(results) == 1 else f'les {len(results)} dernières factures'}"
        }

    async def add_invoice_items(self, params: Dict, user_context: Dict) -> Dict:
        """Ajoute des items à une facture existante"""
        from apps.invoicing.models import Invoice, InvoiceItem, Product
        from asgiref.sync import sync_to_async
        from decimal import Decimal

        @sync_to_async
        def add_items_sync():
            # Récupérer la facture
            invoice_number = params.get('invoice_number')
            invoice_id = params.get('invoice_id')

            if invoice_id:
                invoice = Invoice.objects.get(id=invoice_id)
            elif invoice_number:
                invoice = Invoice.objects.get(invoice_number=invoice_number)
            else:
                raise ValueError("Vous devez fournir invoice_id ou invoice_number")

            # Vérifier que la facture est modifiable
            if invoice.status in ['paid', 'cancelled']:
                raise ValueError(f"La facture {invoice.invoice_number} est {invoice.status} et ne peut pas être modifiée")

            items_data = params.get('items', [])
            if not items_data:
                raise ValueError("Vous devez fournir au moins un item à ajouter")

            created_items = []
            for item_data in items_data:
                # Chercher le produit si product_reference fourni
                product = None
                product_ref = item_data.get('product_reference')
                if product_ref:
                    try:
                        product = Product.objects.get(reference=product_ref)
                    except Product.DoesNotExist:
                        pass

                # Créer l'item
                item = InvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    service_code=item_data.get('service_code', 'SVC-001'),
                    product_reference=item_data.get('product_reference', ''),
                    description=item_data.get('description', ''),
                    detailed_description=item_data.get('detailed_description', ''),
                    quantity=item_data.get('quantity', 1),
                    unit_price=Decimal(str(item_data.get('unit_price', 0))),
                    unit_of_measure=item_data.get('unit_of_measure', 'unité'),
                    discount_percent=Decimal(str(item_data.get('discount_percent', 0))),
                    tax_rate=Decimal(str(item_data.get('tax_rate', 0))),
                    notes=item_data.get('notes', '')
                )
                created_items.append(item)

            # Rafraîchir la facture pour obtenir les totaux mis à jour
            invoice.refresh_from_db()

            return {
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'items_added': len(created_items),
                'new_total': float(invoice.total_amount)
            }

        try:
            result = await add_items_sync()

            return {
                'success': True,
                'message': f"{result['items_added']} item(s) ajouté(s) à la facture {result['invoice_number']}. Nouveau total: {result['new_total']}$",
                'data': {
                    **result,
                    'entity_type': 'invoice'
                }
            }
        except Invoice.DoesNotExist:
            return {
                'success': False,
                'error': "Facture non trouvée"
            }
        except ValueError as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error adding invoice items: {e}")
            return {
                'success': False,
                'error': f"Erreur lors de l'ajout des items: {str(e)}"
            }

    async def send_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """Envoie une facture par email au client"""
        from apps.invoicing.models import Invoice
        from apps.api.services.email_service import InvoiceEmailService
        from asgiref.sync import sync_to_async
        from django.utils import timezone

        @sync_to_async
        def send_invoice_sync():
            # Récupérer la facture
            invoice_number = params.get('invoice_number')
            invoice_id = params.get('invoice_id')

            if invoice_id:
                invoice = Invoice.objects.get(id=invoice_id)
            elif invoice_number:
                invoice = Invoice.objects.get(invoice_number=invoice_number)
            else:
                raise ValueError("Vous devez fournir invoice_id ou invoice_number")

            # Email du destinataire (par défaut celui du client)
            recipient_email = params.get('recipient_email')

            # Template PDF (par défaut 'classic')
            template_type = params.get('template_type', 'classic')

            # Envoyer via le service existant
            email_result = InvoiceEmailService.send_invoice_email(
                invoice=invoice,
                recipient_email=recipient_email,
                template_type=template_type
            )

            if not email_result['success']:
                raise ValueError(email_result['message'])

            # Marquer la facture comme envoyée
            invoice.sent_at = timezone.now()
            if invoice.status == 'draft':
                invoice.status = 'sent'
            invoice.save(update_fields=['sent_at', 'status'])

            return {
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'sent_to': recipient_email or (invoice.client.email if invoice.client else None),
                'sent_at': invoice.sent_at.isoformat()
            }

        try:
            result = await send_invoice_sync()

            return {
                'success': True,
                'message': f"Facture {result['invoice_number']} envoyée avec succès à {result['sent_to']}",
                'data': {
                    **result,
                    'entity_type': 'invoice'
                }
            }
        except Invoice.DoesNotExist:
            return {
                'success': False,
                'error': "Facture non trouvée"
            }
        except ValueError as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error sending invoice: {e}")
            return {
                'success': False,
                'error': f"Erreur lors de l'envoi de la facture: {str(e)}"
            }

    async def add_po_items(self, params: Dict, user_context: Dict) -> Dict:
        """Ajoute des items à un bon de commande existant"""
        from apps.purchase_orders.models import PurchaseOrder, PurchaseOrderItem
        from apps.invoicing.models import Product
        from asgiref.sync import sync_to_async
        from decimal import Decimal

        @sync_to_async
        def add_items_sync():
            # Récupérer le bon de commande
            po_number = params.get('po_number')
            po_id = params.get('po_id')

            if po_id:
                purchase_order = PurchaseOrder.objects.get(id=po_id)
            elif po_number:
                purchase_order = PurchaseOrder.objects.get(po_number=po_number)
            else:
                raise ValueError("Vous devez fournir po_id ou po_number")

            # Vérifier que le BC est modifiable
            if purchase_order.status in ['received', 'cancelled']:
                raise ValueError(f"Le bon de commande {purchase_order.po_number} est {purchase_order.status} et ne peut pas être modifié")

            items_data = params.get('items', [])
            if not items_data:
                raise ValueError("Vous devez fournir au moins un item à ajouter")

            created_items = []
            for item_data in items_data:
                # IMPORTANT: PurchaseOrderItem REQUIERT un produit associé
                product_ref = item_data.get('product_reference')
                if not product_ref:
                    raise ValueError("product_reference est requis pour chaque item")

                try:
                    product = Product.objects.get(reference=product_ref)
                except Product.DoesNotExist:
                    raise ValueError(f"Produit avec référence '{product_ref}' introuvable. Créez d'abord le produit.")

                # Créer l'item
                item = PurchaseOrderItem.objects.create(
                    purchase_order=purchase_order,
                    product=product,
                    product_reference=product_ref,
                    product_code=item_data.get('product_code', ''),
                    description=item_data.get('description', product.name),
                    specifications=item_data.get('specifications', ''),
                    quantity=item_data.get('quantity', 1),
                    unit_price=Decimal(str(item_data.get('unit_price', product.cost_price or product.price))),
                    unit_of_measure=item_data.get('unit_of_measure', 'unité'),
                    expected_delivery_date=item_data.get('expected_delivery_date'),
                    notes=item_data.get('notes', '')
                )
                created_items.append(item)

            # Rafraîchir le BC pour obtenir les totaux mis à jour
            purchase_order.refresh_from_db()

            return {
                'po_id': str(purchase_order.id),
                'po_number': purchase_order.po_number,
                'items_added': len(created_items),
                'new_total': float(purchase_order.total_amount)
            }

        try:
            result = await add_items_sync()

            return {
                'success': True,
                'message': f"{result['items_added']} item(s) ajouté(s) au BC {result['po_number']}. Nouveau total: {result['new_total']}$",
                'data': {
                    **result,
                    'entity_type': 'purchase_order'
                }
            }
        except PurchaseOrder.DoesNotExist:
            return {
                'success': False,
                'error': "Bon de commande non trouvé"
            }
        except ValueError as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error adding PO items: {e}")
            return {
                'success': False,
                'error': f"Erreur lors de l'ajout des items: {str(e)}"
            }

    async def send_purchase_order(self, params: Dict, user_context: Dict) -> Dict:
        """Envoie un bon de commande par email au fournisseur"""
        from apps.purchase_orders.models import PurchaseOrder
        from django.core.mail import EmailMessage
        from django.conf import settings
        from asgiref.sync import sync_to_async
        from django.utils import timezone

        @sync_to_async
        def send_po_sync():
            # Récupérer le bon de commande
            po_number = params.get('po_number')
            po_id = params.get('po_id')

            if po_id:
                purchase_order = PurchaseOrder.objects.get(id=po_id)
            elif po_number:
                purchase_order = PurchaseOrder.objects.get(po_number=po_number)
            else:
                raise ValueError("Vous devez fournir po_id ou po_number")

            # Email du destinataire (fournisseur)
            recipient_email = params.get('recipient_email')
            if not recipient_email:
                if purchase_order.supplier and purchase_order.supplier.email:
                    recipient_email = purchase_order.supplier.email
                else:
                    raise ValueError("Le fournisseur n'a pas d'email renseigné. Spécifiez recipient_email.")

            # Préparer le contenu de l'email
            supplier_name = purchase_order.supplier.name if purchase_order.supplier else "Fournisseur"

            # Corps de l'email HTML
            items_html = ""
            if purchase_order.items.exists():
                items_html = "<h3>Articles commandés:</h3><ul>"
                for item in purchase_order.items.all():
                    items_html += f"<li><strong>{item.description}</strong> - Qté: {item.quantity} - Prix unitaire: {item.unit_price}$ = Total: {item.total_price}$</li>"
                items_html += "</ul>"

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ padding: 30px; background: white; border: 1px solid #eee; border-radius: 0 0 8px 8px; }}
                    .footer {{ margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee; color: #666; font-size: 0.9em; }}
                    ul {{ padding-left: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">Bon de Commande</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">ProcureGenius</p>
                    </div>
                    <div class="content">
                        <p>Bonjour <strong>{supplier_name}</strong>,</p>
                        <p>Veuillez trouver ci-dessous notre bon de commande <strong>{purchase_order.po_number}</strong>.</p>
                        <p><strong>Montant total:</strong> {purchase_order.total_amount}$</p>
                        <p><strong>Date de livraison souhaitée:</strong> {purchase_order.delivery_date.strftime('%d/%m/%Y') if purchase_order.delivery_date else 'À définir'}</p>
                        {items_html}
                        <p>Pour toute question, n'hésitez pas à nous contacter.</p>
                        <div class="footer">
                            <p><strong>ProcureGenius</strong></p>
                            <p>Système de gestion des achats</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Version texte simple
            items_text = ""
            if purchase_order.items.exists():
                items_text = "\n\nArticles commandés:\n"
                for item in purchase_order.items.all():
                    items_text += f"- {item.description} - Qté: {item.quantity} - {item.unit_price}$ = {item.total_price}$\n"

            text_body = f"""
Bonjour {supplier_name},

Veuillez trouver ci-dessous notre bon de commande {purchase_order.po_number}.

Montant total: {purchase_order.total_amount}$
Date de livraison souhaitée: {purchase_order.delivery_date.strftime('%d/%m/%Y') if purchase_order.delivery_date else 'À définir'}
{items_text}

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
ProcureGenius
            """

            # Créer et envoyer l'email
            email = EmailMessage(
                subject=f"Bon de Commande {purchase_order.po_number} - ProcureGenius",
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@procuregenius.com',
                to=[recipient_email],
            )
            email.content_subtype = "html"
            email.body = html_body
            email.send(fail_silently=False)

            # Marquer le BC comme envoyé
            purchase_order.sent_at = timezone.now()
            if purchase_order.status == 'draft':
                purchase_order.status = 'sent'
            purchase_order.save(update_fields=['sent_at', 'status'])

            return {
                'po_id': str(purchase_order.id),
                'po_number': purchase_order.po_number,
                'sent_to': recipient_email,
                'sent_at': purchase_order.sent_at.isoformat()
            }

        try:
            result = await send_po_sync()

            return {
                'success': True,
                'message': f"Bon de commande {result['po_number']} envoyé avec succès à {result['sent_to']}",
                'data': {
                    **result,
                    'entity_type': 'purchase_order'
                }
            }
        except PurchaseOrder.DoesNotExist:
            return {
                'success': False,
                'error': "Bon de commande non trouvé"
            }
        except ValueError as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            logger.error(f"Error sending purchase order: {e}")
            return {
                'success': False,
                'error': f"Erreur lors de l'envoi du bon de commande: {str(e)}"
            }

    async def update_supplier(self, params: Dict, user_context: Dict) -> Dict:
        """Modifie un fournisseur existant"""
        from apps.suppliers.models import Supplier
        from asgiref.sync import sync_to_async

        @sync_to_async
        def update_supplier_sync():
            supplier_id = params.get('supplier_id')
            supplier_name = params.get('supplier_name')

            if supplier_id:
                supplier = Supplier.objects.get(id=supplier_id)
            elif supplier_name:
                supplier = Supplier.objects.get(name__iexact=supplier_name)
            else:
                raise ValueError("Vous devez fournir supplier_id ou supplier_name")

            previous_state = {
                'name': supplier.name,
                'email': supplier.email,
                'phone': supplier.phone
            }

            if 'name' in params:
                supplier.name = params['name']
            if 'contact_person' in params:
                supplier.contact_person = params['contact_person']
            if 'email' in params:
                supplier.email = params['email']
            if 'phone' in params:
                supplier.phone = params['phone']
            if 'address' in params:
                supplier.address = params['address']
            if 'city' in params:
                supplier.city = params['city']
            if 'status' in params:
                supplier.status = params['status']

            supplier.save()

            return {
                'id': str(supplier.id),
                'name': supplier.name,
                'previous_state': previous_state
            }

        try:
            result = await update_supplier_sync()
            return {
                'success': True,
                'message': f"Fournisseur '{result['name']}' modifié avec succès",
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'entity_type': 'supplier',
                    'previous_state': result['previous_state']
                }
            }
        except Supplier.DoesNotExist:
            return {'success': False, 'error': "Fournisseur non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error updating supplier: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def update_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """Modifie une facture existante"""
        from apps.invoicing.models import Invoice
        from asgiref.sync import sync_to_async
        from datetime import datetime

        @sync_to_async
        def update_invoice_sync():
            invoice_id = params.get('invoice_id')
            invoice_number = params.get('invoice_number')

            if invoice_id:
                invoice = Invoice.objects.get(id=invoice_id)
            elif invoice_number:
                invoice = Invoice.objects.get(invoice_number=invoice_number)
            else:
                raise ValueError("Vous devez fournir invoice_id ou invoice_number")

            if invoice.status == 'paid':
                raise ValueError(f"La facture {invoice.invoice_number} est payée et ne peut pas être modifiée")

            was_sent = invoice.sent_at is not None
            previous_state = {
                'title': invoice.title,
                'description': invoice.description,
                'status': invoice.status
            }

            if 'title' in params:
                invoice.title = params['title']
            if 'description' in params:
                invoice.description = params['description']
            if 'status' in params:
                invoice.status = params['status']
            if 'due_date' in params:
                invoice.due_date = datetime.strptime(params['due_date'], '%Y-%m-%d').date()

            invoice.save()

            return {
                'id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'was_sent': was_sent,
                'previous_state': previous_state
            }

        try:
            result = await update_invoice_sync()
            message = f"Facture '{result['invoice_number']}' modifiée"
            if result['was_sent']:
                message += " (déjà envoyée)"
            return {
                'success': True,
                'message': message,
                'data': {
                    'id': result['id'],
                    'invoice_number': result['invoice_number'],
                    'entity_type': 'invoice',
                    'previous_state': result['previous_state']
                }
            }
        except Invoice.DoesNotExist:
            return {'success': False, 'error': "Facture non trouvée"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error updating invoice: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def update_purchase_order(self, params: Dict, user_context: Dict) -> Dict:
        """Modifie un bon de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        from asgiref.sync import sync_to_async
        from datetime import datetime

        @sync_to_async
        def update_po_sync():
            po_id = params.get('po_id')
            po_number = params.get('po_number')

            if po_id:
                po = PurchaseOrder.objects.get(id=po_id)
            elif po_number:
                po = PurchaseOrder.objects.get(po_number=po_number)
            else:
                raise ValueError("Vous devez fournir po_id ou po_number")

            if po.status in ['received', 'cancelled']:
                raise ValueError(f"Le BC {po.po_number} est {po.status} et ne peut pas être modifié")

            previous_state = {
                'description': po.description,
                'status': po.status
            }

            if 'description' in params:
                po.description = params['description']
            if 'status' in params:
                po.status = params['status']
            if 'delivery_date' in params:
                po.delivery_date = datetime.strptime(params['delivery_date'], '%Y-%m-%d').date()
            if 'notes' in params:
                po.notes = params['notes']

            po.save()

            return {
                'id': str(po.id),
                'po_number': po.po_number,
                'previous_state': previous_state
            }

        try:
            result = await update_po_sync()
            return {
                'success': True,
                'message': f"BC '{result['po_number']}' modifié",
                'data': {
                    'id': result['id'],
                    'po_number': result['po_number'],
                    'entity_type': 'purchase_order',
                    'previous_state': result['previous_state']
                }
            }
        except PurchaseOrder.DoesNotExist:
            return {'success': False, 'error': "BC non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error updating PO: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def update_client(self, params: Dict, user_context: Dict) -> Dict:
        """Modifie un client"""
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async

        @sync_to_async
        def update_client_sync():
            client_id = params.get('client_id')
            client_name = params.get('client_name')

            if client_id:
                client = Client.objects.get(id=client_id)
            elif client_name:
                client = Client.objects.get(name__iexact=client_name)
            else:
                raise ValueError("Vous devez fournir client_id ou client_name")

            previous_state = {
                'name': client.name,
                'email': client.email,
                'phone': client.phone
            }

            if 'name' in params:
                client.name = params['name']
            if 'email' in params:
                client.email = params['email']
            if 'phone' in params:
                client.phone = params['phone']
            if 'address' in params:
                client.address = params['address']
            if 'contact_person' in params:
                client.contact_person = params['contact_person']

            client.save()

            return {
                'id': str(client.id),
                'name': client.name,
                'previous_state': previous_state
            }

        try:
            result = await update_client_sync()
            return {
                'success': True,
                'message': f"Client '{result['name']}' modifié",
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'entity_type': 'client',
                    'previous_state': result['previous_state']
                }
            }
        except Client.DoesNotExist:
            return {'success': False, 'error': "Client non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error updating client: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def delete_supplier(self, params: Dict, user_context: Dict) -> Dict:
        """Supprime un fournisseur (soft delete)"""
        from apps.suppliers.models import Supplier
        from apps.purchase_orders.models import PurchaseOrder
        from asgiref.sync import sync_to_async

        @sync_to_async
        def delete_supplier_sync():
            supplier_id = params.get('supplier_id')
            supplier_name = params.get('supplier_name')

            if supplier_id:
                supplier = Supplier.objects.get(id=supplier_id)
            elif supplier_name:
                supplier = Supplier.objects.get(name__iexact=supplier_name)
            else:
                raise ValueError("Vous devez fournir supplier_id ou supplier_name")

            # Vérifier dépendances
            po_count = PurchaseOrder.objects.filter(supplier=supplier).count()
            if po_count > 0:
                raise ValueError(f"Ce fournisseur a {po_count} bon(s) de commande. Suppression impossible.")

            # Soft delete
            supplier.is_active = False
            supplier.status = 'inactive'
            supplier.save()

            return {
                'id': str(supplier.id),
                'name': supplier.name
            }

        try:
            result = await delete_supplier_sync()
            return {
                'success': True,
                'message': f"Fournisseur '{result['name']}' désactivé",
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'entity_type': 'supplier'
                }
            }
        except Supplier.DoesNotExist:
            return {'success': False, 'error': "Fournisseur non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error deleting supplier: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def delete_invoice(self, params: Dict, user_context: Dict) -> Dict:
        """Supprime une facture"""
        from apps.invoicing.models import Invoice
        from asgiref.sync import sync_to_async

        @sync_to_async
        def delete_invoice_sync():
            invoice_id = params.get('invoice_id')
            invoice_number = params.get('invoice_number')

            if invoice_id:
                invoice = Invoice.objects.get(id=invoice_id)
            elif invoice_number:
                invoice = Invoice.objects.get(invoice_number=invoice_number)
            else:
                raise ValueError("Vous devez fournir invoice_id ou invoice_number")

            if invoice.status == 'paid':
                raise ValueError(f"La facture {invoice.invoice_number} est payée. Suppression impossible.")

            invoice_number = invoice.invoice_number
            invoice.delete()

            return {'invoice_number': invoice_number}

        try:
            result = await delete_invoice_sync()
            return {
                'success': True,
                'message': f"Facture '{result['invoice_number']}' supprimée",
                'data': {
                    'invoice_number': result['invoice_number'],
                    'entity_type': 'invoice'
                }
            }
        except Invoice.DoesNotExist:
            return {'success': False, 'error': "Facture non trouvée"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error deleting invoice: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def delete_purchase_order(self, params: Dict, user_context: Dict) -> Dict:
        """Supprime un bon de commande"""
        from apps.purchase_orders.models import PurchaseOrder
        from asgiref.sync import sync_to_async

        @sync_to_async
        def delete_po_sync():
            po_id = params.get('po_id')
            po_number = params.get('po_number')

            if po_id:
                po = PurchaseOrder.objects.get(id=po_id)
            elif po_number:
                po = PurchaseOrder.objects.get(po_number=po_number)
            else:
                raise ValueError("Vous devez fournir po_id ou po_number")

            if po.status == 'received':
                raise ValueError(f"Le BC {po.po_number} est reçu. Suppression impossible.")

            po_number = po.po_number
            po.delete()

            return {'po_number': po_number}

        try:
            result = await delete_po_sync()
            return {
                'success': True,
                'message': f"BC '{result['po_number']}' supprimé",
                'data': {
                    'po_number': result['po_number'],
                    'entity_type': 'purchase_order'
                }
            }
        except PurchaseOrder.DoesNotExist:
            return {'success': False, 'error': "BC non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error deleting PO: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def delete_client(self, params: Dict, user_context: Dict) -> Dict:
        """Supprime un client (soft delete)"""
        from apps.accounts.models import Client
        from apps.invoicing.models import Invoice
        from asgiref.sync import sync_to_async

        @sync_to_async
        def delete_client_sync():
            client_id = params.get('client_id')
            client_name = params.get('client_name')

            if client_id:
                client = Client.objects.get(id=client_id)
            elif client_name:
                client = Client.objects.get(name__iexact=client_name)
            else:
                raise ValueError("Vous devez fournir client_id ou client_name")

            # Vérifier dépendances
            invoice_count = Invoice.objects.filter(client=client).count()
            if invoice_count > 0:
                raise ValueError(f"Ce client a {invoice_count} facture(s). Suppression impossible.")

            # Soft delete
            client.is_active = False
            client.save()

            return {
                'id': str(client.id),
                'name': client.name
            }

        try:
            result = await delete_client_sync()
            return {
                'success': True,
                'message': f"Client '{result['name']}' désactivé",
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'entity_type': 'client'
                }
            }
        except Client.DoesNotExist:
            return {'success': False, 'error': "Client non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error deleting client: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def undo_last_action(self, params: Dict, user_context: Dict) -> Dict:
        """Annule la dernière action effectuée"""
        from apps.ai_assistant.models import ActionHistory
        from apps.suppliers.models import Supplier
        from apps.invoicing.models import Invoice, Product
        from apps.purchase_orders.models import PurchaseOrder
        from apps.accounts.models import Client
        from asgiref.sync import sync_to_async
        from django.contrib.auth import get_user_model

        User = get_user_model()

        @sync_to_async
        def undo_sync():
            user_id = user_context.get('id')
            user = User.objects.get(id=user_id)

            # Récupérer la dernière action annulable
            last_action = ActionHistory.objects.filter(
                user=user,
                can_undo=True,
                is_undone=False
            ).first()

            if not last_action:
                raise ValueError("Aucune action à annuler")

            entity_type = last_action.entity_type
            entity_id = last_action.entity_id
            action_type = last_action.action_type

            # Annuler selon le type d'action
            if action_type == 'create':
                # Supprimer l'entité créée
                if entity_type == 'supplier':
                    Supplier.objects.filter(id=entity_id).update(is_active=False)
                elif entity_type == 'invoice':
                    Invoice.objects.filter(id=entity_id).delete()
                elif entity_type == 'purchase_order':
                    PurchaseOrder.objects.filter(id=entity_id).delete()
                elif entity_type == 'client':
                    Client.objects.filter(id=entity_id).update(is_active=False)
                elif entity_type == 'product':
                    Product.objects.filter(id=entity_id).delete()

            elif action_type == 'update':
                # Restaurer l'état précédent
                if not last_action.previous_state:
                    raise ValueError("Impossible de restaurer: état précédent non disponible")

                if entity_type == 'supplier':
                    Supplier.objects.filter(id=entity_id).update(**last_action.previous_state)
                elif entity_type == 'invoice':
                    Invoice.objects.filter(id=entity_id).update(**last_action.previous_state)
                elif entity_type == 'purchase_order':
                    PurchaseOrder.objects.filter(id=entity_id).update(**last_action.previous_state)
                elif entity_type == 'client':
                    Client.objects.filter(id=entity_id).update(**last_action.previous_state)
                elif entity_type == 'product':
                    Product.objects.filter(id=entity_id).update(**last_action.previous_state)

            elif action_type == 'delete':
                # Réactiver l'entité (soft delete uniquement)
                if entity_type == 'supplier':
                    Supplier.objects.filter(id=entity_id).update(is_active=True, status='active')
                elif entity_type == 'client':
                    Client.objects.filter(id=entity_id).update(is_active=True)
                else:
                    raise ValueError(f"Impossible d'annuler la suppression d'un(e) {entity_type}")

            # Marquer comme annulée
            last_action.mark_as_undone()

            return {
                'action_type': action_type,
                'entity_type': entity_type,
                'entity_id': entity_id
            }

        try:
            result = await undo_sync()
            action_fr = {'create': 'création', 'update': 'modification', 'delete': 'suppression'}
            entity_fr = {
                'supplier': 'fournisseur',
                'invoice': 'facture',
                'purchase_order': 'BC',
                'client': 'client',
                'product': 'produit'
            }

            return {
                'success': True,
                'message': f"{action_fr.get(result['action_type'], result['action_type'])} du {entity_fr.get(result['entity_type'], result['entity_type'])} annulée",
                'data': result
            }
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error undoing action: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    # ========== PRODUITS MODULE ==========

    async def create_product(self, params: Dict, user_context: Dict) -> Dict:
        """Crée un nouveau produit avec entity matching pour éviter les doublons"""
        from apps.invoicing.models import Product
        from .entity_matcher import entity_matcher
        from asgiref.sync import sync_to_async
        from decimal import Decimal

        @sync_to_async
        def create_product_sync():
            name = params.get('name')
            if not name:
                raise ValueError("Le nom du produit est requis")

            reference = params.get('reference', '')
            barcode = params.get('barcode', '')
            product_type = params.get('product_type', 'service')

            # Entity matching pour éviter les doublons
            similar_products = entity_matcher.find_similar_products(
                name=name,
                reference=reference if reference else None,
                barcode=barcode if barcode else None
            )

            if similar_products:
                existing_product = similar_products[0][0]
                similarity_score = similar_products[0][1]
                match_reason = similar_products[0][2]

                return {
                    'created': False,
                    'matched': True,
                    'product': existing_product,
                    'similarity_score': similarity_score,
                    'match_reason': match_reason
                }

            # Créer le nouveau produit
            product_data = {
                'name': name,
                'reference': reference,
                'barcode': barcode,
                'product_type': product_type,
                'description': params.get('description', ''),
            }

            # Champs spécifiques selon le type
            if product_type == 'physical':
                product_data.update({
                    'cost_price': Decimal(str(params.get('cost_price', 0))),
                    'price': Decimal(str(params.get('price', 0))),
                    'stock_quantity': params.get('stock_quantity', 0),
                    'low_stock_threshold': params.get('low_stock_threshold', 10),
                    'supplier_reference': params.get('supplier_reference', '')
                })
            else:  # service or digital
                product_data.update({
                    'price': Decimal(str(params.get('price', 0))),
                    # Les services ne gèrent pas de stock
                    'stock_quantity': 0,
                    'low_stock_threshold': 0,
                    'warehouse': None
                })

            product = Product.objects.create(**product_data)

            return {
                'created': True,
                'matched': False,
                'product': product
            }

        try:
            result = await create_product_sync()

            if result['matched']:
                # Produit existant trouvé
                product = result['product']
                return {
                    'success': True,
                    'matched': True,
                    'message': f"Produit similaire trouvé: '{product.name}' ({result['match_reason']})",
                    'data': {
                        'id': str(product.id),
                        'name': product.name,
                        'reference': product.reference,
                        'product_type': product.product_type,
                        'price': float(product.price) if product.price else 0,
                        'similarity_score': result['similarity_score'],
                        'entity_type': 'product'
                    }
                }
            else:
                # Nouveau produit créé
                product = result['product']
                return {
                    'success': True,
                    'created': True,
                    'message': f"Produit '{product.name}' créé avec succès",
                    'data': {
                        'id': str(product.id),
                        'name': product.name,
                        'reference': product.reference,
                        'product_type': product.product_type,
                        'price': float(product.price) if product.price else 0,
                        'entity_type': 'product'
                    }
                }

        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error creating product: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def search_product(self, params: Dict, user_context: Dict) -> Dict:
        """
        Recherche des produits avec fuzzy matching ultra-robuste.
        Gère les fautes d'orthographe et variations automatiquement.
        """
        from .entity_matcher import entity_matcher
        from asgiref.sync import sync_to_async

        @sync_to_async
        def search_products_sync():
            query = params.get('query', '')
            min_score = params.get('min_score', 0.60)
            product_type = params.get('product_type')
            limit = params.get('limit', 10)
            organization = user_context.get('organization')

            if not query:
                return []

            # Utiliser le fuzzy matching
            matches = entity_matcher.find_similar_products(
                name=query,
                min_score=min_score
            )

            # Filtrer par organisation
            if organization:
                matches = [(p, score, details) for p, score, details in matches if p.organization == organization]
            elif not user_context.get('is_superuser', False):
                matches = []

            # Filtrer par type si spécifié
            if product_type in ['service', 'physical']:
                matches = [(p, score, details) for p, score, details in matches if p.product_type == product_type]

            return [
                {
                    'id': str(product.id),
                    'name': product.name,
                    'reference': product.reference or '',
                    'barcode': product.barcode or '',
                    'product_type': product.product_type,
                    'description': product.description or '',
                    'price': float(product.price) if product.price else 0,
                    'stock_quantity': product.stock_quantity if product.product_type == 'physical' else None,
                    'low_stock_threshold': product.low_stock_threshold if product.product_type == 'physical' else None,
                    'score': score * 100,
                    'match_reason': entity_matcher.format_match_reason(details)
                }
                for product, score, details in matches[:limit]
            ]

        results = await search_products_sync()

        # Construire un message détaillé
        if results:
            message = f"J'ai trouvé {len(results)} produit(s) correspondant à '{params.get('query')}' :\n\n"

            for i, result in enumerate(results, 1):
                message += f"**{i}. {result['name']}**"
                message += f" [Voir](/products/{result['id']})\n"

                if result.get('reference'):
                    message += f"   - Référence: {result['reference']}\n"
                if result.get('product_type'):
                    type_label = 'Service' if result['product_type'] == 'service' else 'Produit physique'
                    message += f"   - Type: {type_label}\n"
                if result.get('price'):
                    message += f"   - Prix: {result['price']}€\n"
                if result.get('stock_quantity') is not None:
                    message += f"   - Stock: {result['stock_quantity']}\n"

                # Score de correspondance
                message += f"   - Correspondance: {result['score']:.0f}% - {result['match_reason']}\n\n"
        else:
            message = f"Aucun produit trouvé pour '{params.get('query', '')}'"

        return {
            'success': True,
            'data': results,
            'count': len(results),
            'message': message
        }

    async def update_product(self, params: Dict, user_context: Dict) -> Dict:
        """Modifie un produit existant"""
        from apps.invoicing.models import Product
        from asgiref.sync import sync_to_async
        from decimal import Decimal

        @sync_to_async
        def update_product_sync():
            product_id = params.get('product_id')
            product_name = params.get('product_name')
            product_ref = params.get('product_reference')

            # Trouver le produit
            if product_id:
                product = Product.objects.get(id=product_id)
            elif product_ref:
                product = Product.objects.get(reference=product_ref)
            elif product_name:
                product = Product.objects.get(name__iexact=product_name)
            else:
                raise ValueError("Vous devez fournir product_id, product_name ou product_reference")

            # Sauvegarder l'état précédent
            previous_state = {
                'name': product.name,
                'reference': product.reference,
                'price': float(product.price) if product.price else 0,
                'description': product.description
            }

            # Mettre à jour les champs fournis
            if 'name' in params:
                product.name = params['name']
            if 'reference' in params:
                product.reference = params['reference']
            if 'barcode' in params:
                product.barcode = params['barcode']
            if 'description' in params:
                product.description = params['description']
            if 'price' in params:
                product.price = Decimal(str(params['price']))
            if 'cost_price' in params and product.product_type == 'physical':
                product.cost_price = Decimal(str(params['cost_price']))
            if 'stock_quantity' in params and product.product_type == 'physical':
                product.stock_quantity = params['stock_quantity']
            if 'low_stock_threshold' in params and product.product_type == 'physical':
                product.low_stock_threshold = params['low_stock_threshold']

            product.save()

            return {
                'id': str(product.id),
                'name': product.name,
                'reference': product.reference,
                'previous_state': previous_state
            }

        try:
            result = await update_product_sync()
            return {
                'success': True,
                'message': f"Produit '{result['name']}' modifié avec succès",
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'reference': result['reference'],
                    'entity_type': 'product',
                    'previous_state': result['previous_state']
                }
            }
        except Product.DoesNotExist:
            return {'success': False, 'error': "Produit non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error updating product: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def delete_product(self, params: Dict, user_context: Dict) -> Dict:
        """Supprime un produit (hard delete si pas de dépendances)"""
        from apps.invoicing.models import Product, InvoiceItem
        from apps.purchase_orders.models import PurchaseOrderItem
        from asgiref.sync import sync_to_async

        @sync_to_async
        def delete_product_sync():
            product_id = params.get('product_id')
            product_name = params.get('product_name')
            product_ref = params.get('product_reference')

            # Trouver le produit
            if product_id:
                product = Product.objects.get(id=product_id)
            elif product_ref:
                product = Product.objects.get(reference=product_ref)
            elif product_name:
                product = Product.objects.get(name__iexact=product_name)
            else:
                raise ValueError("Vous devez fournir product_id, product_name ou product_reference")

            # Vérifier les dépendances
            invoice_items_count = InvoiceItem.objects.filter(product=product).count()
            po_items_count = PurchaseOrderItem.objects.filter(product=product).count()

            if invoice_items_count > 0 or po_items_count > 0:
                raise ValueError(
                    f"Ce produit est utilisé dans {invoice_items_count} facture(s) "
                    f"et {po_items_count} bon(s) de commande. Suppression impossible."
                )

            product_name = product.name
            product_id = str(product.id)
            product.delete()

            return {
                'id': product_id,
                'name': product_name
            }

        try:
            result = await delete_product_sync()
            return {
                'success': True,
                'message': f"Produit '{result['name']}' supprimé avec succès",
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'entity_type': 'product'
                }
            }
        except Product.DoesNotExist:
            return {'success': False, 'error': "Produit non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error deleting product: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    # ========== STOCK MANAGEMENT MODULE ==========

    async def adjust_stock(self, params: Dict, user_context: Dict) -> Dict:
        """Ajuste le stock d'un produit physique (ajout ou retrait)"""
        from apps.invoicing.models import Product
        from apps.invoicing.stock_alerts import check_stock_after_movement
        from asgiref.sync import sync_to_async

        @sync_to_async
        def adjust_stock_sync():
            product_id = params.get('product_id')
            product_name = params.get('product_name')
            product_ref = params.get('product_reference')

            # Trouver le produit
            if product_id:
                product = Product.objects.get(id=product_id)
            elif product_ref:
                product = Product.objects.get(reference=product_ref)
            elif product_name:
                product = Product.objects.get(name__iexact=product_name)
            else:
                raise ValueError("Vous devez fournir product_id, product_name ou product_reference")

            # Vérifier que c'est un produit physique
            if product.product_type != 'physical':
                raise ValueError(f"Le produit '{product.name}' est un service, pas un produit physique avec stock")

            adjustment_type = params.get('adjustment_type', 'add')  # 'add' ou 'remove'
            quantity = params.get('quantity', 0)
            reason = params.get('reason', '')

            if quantity <= 0:
                raise ValueError("La quantité doit être supérieure à 0")

            previous_stock = product.stock_quantity

            # Ajuster le stock
            if adjustment_type == 'add':
                product.stock_quantity += quantity
                action_description = f"Ajout de {quantity} unité(s)"
            elif adjustment_type == 'remove':
                if product.stock_quantity < quantity:
                    raise ValueError(f"Stock insuffisant. Stock actuel: {product.stock_quantity}, demandé: {quantity}")
                product.stock_quantity -= quantity
                action_description = f"Retrait de {quantity} unité(s)"
            else:
                raise ValueError("adjustment_type doit être 'add' ou 'remove'")

            product.save()

            # Vérifier si alerte nécessaire
            check_stock_after_movement(product)

            return {
                'id': str(product.id),
                'name': product.name,
                'reference': product.reference,
                'previous_stock': previous_stock,
                'new_stock': product.stock_quantity,
                'adjustment_type': adjustment_type,
                'quantity': quantity,
                'reason': reason,
                'action_description': action_description,
                'is_low_stock': product.is_low_stock,
                'is_out_of_stock': product.is_out_of_stock
            }

        try:
            result = await adjust_stock_sync()

            # Construire le message
            message = f"{result['action_description']} pour '{result['name']}'. "
            message += f"Stock: {result['previous_stock']} → {result['new_stock']}"

            if result['is_out_of_stock']:
                message += " ⚠️ RUPTURE DE STOCK"
            elif result['is_low_stock']:
                message += " ⚠️ Stock bas"

            return {
                'success': True,
                'message': message,
                'data': {
                    'id': result['id'],
                    'name': result['name'],
                    'reference': result['reference'],
                    'previous_stock': result['previous_stock'],
                    'new_stock': result['new_stock'],
                    'adjustment_type': result['adjustment_type'],
                    'quantity': result['quantity'],
                    'reason': result['reason'],
                    'is_low_stock': result['is_low_stock'],
                    'is_out_of_stock': result['is_out_of_stock'],
                    'entity_type': 'stock'
                }
            }
        except Product.DoesNotExist:
            return {'success': False, 'error': "Produit non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error adjusting stock: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def get_stock_alerts(self, params: Dict, user_context: Dict) -> Dict:
        """Récupère les produits avec des alertes de stock (stock bas ou rupture)"""
        from apps.invoicing.models import Product
        from apps.invoicing.stock_alerts import StockAlertService
        from asgiref.sync import sync_to_async

        @sync_to_async
        def get_alerts_sync():
            alert_type = params.get('alert_type', 'all')  # 'all', 'low_stock', 'out_of_stock'

            if alert_type == 'out_of_stock':
                products = StockAlertService.get_out_of_stock_products()
            elif alert_type == 'low_stock':
                # Produits en stock bas mais pas rupture
                all_low = StockAlertService.check_low_stock_products()
                products = [p for p in all_low if p.stock_quantity > 0]
            else:  # 'all'
                out_of_stock = StockAlertService.get_out_of_stock_products()
                low_stock = [p for p in StockAlertService.check_low_stock_products()
                            if p.stock_quantity > 0]
                products = list(out_of_stock) + list(low_stock)

            # Formatter les résultats
            alerts = []
            for product in products:
                alert = {
                    'id': str(product.id),
                    'name': product.name,
                    'reference': product.reference or '',
                    'stock_quantity': product.stock_quantity,
                    'low_stock_threshold': product.low_stock_threshold,
                    'status': 'out_of_stock' if product.stock_quantity == 0 else 'low_stock',
                    'supplier': product.supplier.name if hasattr(product, 'supplier') and product.supplier else 'N/A'
                }
                alerts.append(alert)

            return alerts

        try:
            alerts = await get_alerts_sync()

            # Compter par type
            out_of_stock_count = sum(1 for a in alerts if a['status'] == 'out_of_stock')
            low_stock_count = sum(1 for a in alerts if a['status'] == 'low_stock')

            message = f"Alertes stock: "
            if out_of_stock_count > 0:
                message += f"{out_of_stock_count} rupture(s), "
            if low_stock_count > 0:
                message += f"{low_stock_count} stock(s) bas"
            if not alerts:
                message = "Aucune alerte de stock actuellement"

            return {
                'success': True,
                'message': message.rstrip(', '),
                'data': alerts,
                'count': len(alerts),
                'summary': {
                    'out_of_stock': out_of_stock_count,
                    'low_stock': low_stock_count,
                    'total': len(alerts)
                }
            }
        except Exception as e:
            logger.error(f"Error getting stock alerts: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    # ========== REPORTS MODULE ==========

    async def generate_report(self, params: Dict, user_context: Dict) -> Dict:
        """Génère un rapport (PDF, Excel ou CSV)"""
        from apps.reports.models import Report
        from apps.reports.services import SupplierReportService
        from asgiref.sync import sync_to_async
        from datetime import datetime
        from django.contrib.auth import get_user_model

        User = get_user_model()

        @sync_to_async
        def generate_report_sync():
            user_id = user_context.get('id')
            user = User.objects.get(id=user_id)

            report_type = params.get('report_type')
            format = params.get('format', 'pdf')  # pdf, xlsx, csv

            if report_type not in dict(Report._meta.get_field('report_type').choices):
                raise ValueError(f"Type de rapport invalide: {report_type}")

            if format not in ['pdf', 'xlsx', 'csv']:
                raise ValueError(f"Format invalide: {format}. Utilisez pdf, xlsx ou csv")

            # Parse date parameters
            date_start = params.get('date_start')
            date_end = params.get('date_end')

            if date_start and isinstance(date_start, str):
                date_start = datetime.fromisoformat(date_start.replace('Z', '+00:00'))
            if date_end and isinstance(date_end, str):
                date_end = datetime.fromisoformat(date_end.replace('Z', '+00:00'))

            # Créer l'enregistrement de rapport
            report = Report.objects.create(
                report_type=report_type,
                format=format,
                parameters={
                    'date_start': date_start.isoformat() if date_start else None,
                    'date_end': date_end.isoformat() if date_end else None,
                    **{k: v for k, v in params.items() if k not in ['report_type', 'format', 'date_start', 'date_end']}
                },
                generated_by=user,
                status='processing'
            )

            # Pour l'instant, on crée juste l'enregistrement
            # La génération réelle se fera en async via une tâche Celery ou similaire
            # Mais pour le MVP, on peut générer de manière synchrone pour les petits rapports

            if report_type == 'supplier' and params.get('supplier_id'):
                from apps.suppliers.models import Supplier
                service = SupplierReportService(user=user)
                supplier_id = params.get('supplier_id')

                try:
                    report = service.generate(
                        supplier_id=supplier_id,
                        format=format,
                        date_start=date_start,
                        date_end=date_end
                    )
                except Exception as e:
                    report.status = 'failed'
                    report.error_message = str(e)
                    report.save()
                    raise

            return {
                'id': str(report.id),
                'report_type': report.report_type,
                'format': report.format,
                'status': report.status,
                'generated_at': report.generated_at.isoformat(),
                'file_path': report.file_path.url if report.file_path else None
            }

        try:
            result = await generate_report_sync()

            message = f"Rapport {result['report_type']} ({result['format'].upper()}) "
            if result['status'] == 'completed':
                message += "généré avec succès"
            elif result['status'] == 'processing':
                message += "en cours de génération"
            else:
                message += f"statut: {result['status']}"

            return {
                'success': True,
                'message': message,
                'data': {
                    **result,
                    'entity_type': 'report'
                }
            }
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def search_report(self, params: Dict, user_context: Dict) -> Dict:
        """Recherche des rapports générés"""
        from apps.reports.models import Report
        from django.db.models import Q
        from asgiref.sync import sync_to_async
        from django.contrib.auth import get_user_model

        User = get_user_model()

        @sync_to_async
        def search_reports_sync():
            user_id = user_context.get('id')
            user = User.objects.get(id=user_id)

            report_type = params.get('report_type')
            format = params.get('format')
            status = params.get('status')
            limit = params.get('limit', 10)

            # Construire la requête
            reports = Report.objects.filter(generated_by=user)

            if report_type:
                reports = reports.filter(report_type=report_type)
            if format:
                reports = reports.filter(format=format)
            if status:
                reports = reports.filter(status=status)

            reports = reports.order_by('-generated_at')[:limit]

            return [{
                'id': str(r.id),
                'report_type': r.report_type,
                'report_type_display': r.get_report_type_display(),
                'format': r.format,
                'status': r.status,
                'generated_at': r.generated_at.isoformat(),
                'completed_at': r.completed_at.isoformat() if r.completed_at else None,
                'file_path': r.file_path.url if r.file_path else None,
                'file_size': r.file_size,
                'download_count': r.download_count
            } for r in reports]

        try:
            results = await search_reports_sync()

            return {
                'success': True,
                'data': results,
                'count': len(results),
                'message': f"J'ai trouvé {len(results)} rapport(s)"
            }
        except Exception as e:
            logger.error(f"Error searching reports: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def get_report_status(self, params: Dict, user_context: Dict) -> Dict:
        """Récupère le statut d'un rapport en cours de génération"""
        from apps.reports.models import Report
        from asgiref.sync import sync_to_async
        from django.contrib.auth import get_user_model

        User = get_user_model()

        @sync_to_async
        def get_status_sync():
            user_id = user_context.get('id')
            user = User.objects.get(id=user_id)

            report_id = params.get('report_id')
            if not report_id:
                raise ValueError("report_id est requis")

            report = Report.objects.get(id=report_id, generated_by=user)

            return {
                'id': str(report.id),
                'report_type': report.report_type,
                'format': report.format,
                'status': report.status,
                'generated_at': report.generated_at.isoformat(),
                'completed_at': report.completed_at.isoformat() if report.completed_at else None,
                'file_path': report.file_path.url if report.file_path else None,
                'error_message': report.error_message if report.status == 'failed' else None
            }

        try:
            result = await get_status_sync()

            status_messages = {
                'pending': "en attente",
                'processing': "en cours de génération",
                'completed': "terminé et prêt à télécharger",
                'failed': "échoué"
            }

            message = f"Rapport {result['report_type']} ({result['format'].upper()}): {status_messages.get(result['status'], result['status'])}"

            return {
                'success': True,
                'message': message,
                'data': result
            }
        except Report.DoesNotExist:
            return {'success': False, 'error': "Rapport non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error getting report status: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}

    async def delete_report(self, params: Dict, user_context: Dict) -> Dict:
        """Supprime un rapport généré"""
        from apps.reports.models import Report
        from asgiref.sync import sync_to_async
        from django.contrib.auth import get_user_model
        import os

        User = get_user_model()

        @sync_to_async
        def delete_report_sync():
            user_id = user_context.get('id')
            user = User.objects.get(id=user_id)

            report_id = params.get('report_id')
            if not report_id:
                raise ValueError("report_id est requis")

            report = Report.objects.get(id=report_id, generated_by=user)

            report_info = {
                'id': str(report.id),
                'report_type': report.report_type,
                'format': report.format
            }

            # Supprimer le fichier physique si existe
            if report.file_path:
                try:
                    if os.path.exists(report.file_path.path):
                        os.remove(report.file_path.path)
                except Exception as e:
                    logger.warning(f"Could not delete file: {e}")

            # Supprimer l'enregistrement
            report.delete()

            return report_info

        try:
            result = await delete_report_sync()

            return {
                'success': True,
                'message': f"Rapport {result['report_type']} ({result['format'].upper()}) supprimé",
                'data': {
                    **result,
                    'entity_type': 'report'
                }
            }
        except Report.DoesNotExist:
            return {'success': False, 'error': "Rapport non trouvé"}
        except ValueError as e:
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error deleting report: {e}")
            return {'success': False, 'error': f"Erreur: {str(e)}"}