"""
Système générique de recherche d'entités similaires
Permet de détecter les doublons potentiels avant création
"""
from django.db.models import Q
from difflib import SequenceMatcher
import re


class EntityMatcher:
    """Classe pour rechercher des entités similaires"""

    def __init__(self, threshold=0.75):
        """
        Args:
            threshold: Seuil de similarité (0-1). 0.75 = 75% de similarité
        """
        self.threshold = threshold

    def normalize_string(self, text):
        """Normalise une chaîne pour la comparaison"""
        if not text:
            return ""
        # Minuscules, suppression accents, caractères spéciaux
        text = text.lower().strip()
        text = re.sub(r'[^a-z0-9\s]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text

    def calculate_similarity(self, str1, str2):
        """Calcule la similarité entre deux chaînes (0-1)"""
        str1_norm = self.normalize_string(str1)
        str2_norm = self.normalize_string(str2)

        if not str1_norm or not str2_norm:
            return 0.0

        return SequenceMatcher(None, str1_norm, str2_norm).ratio()

    def find_similar_suppliers(self, name, email=None, phone=None, exclude_id=None):
        """
        Recherche des fournisseurs similaires

        Args:
            name: Nom du fournisseur
            email: Email (optionnel)
            phone: Téléphone (optionnel)
            exclude_id: ID à exclure de la recherche

        Returns:
            Liste de tuples (supplier, similarity_score, match_reason)
        """
        from apps.suppliers.models import Supplier

        results = []

        # Recherche par email exact
        if email:
            exact_email = Supplier.objects.filter(email__iexact=email)
            if exclude_id:
                exact_email = exact_email.exclude(id=exclude_id)

            for supplier in exact_email:
                results.append((supplier, 1.0, 'email_exact'))

        # Recherche par téléphone exact
        if phone:
            # Normaliser le téléphone (enlever espaces, tirets, etc.)
            phone_clean = re.sub(r'[^\d+]', '', phone)

            all_suppliers = Supplier.objects.all()
            if exclude_id:
                all_suppliers = all_suppliers.exclude(id=exclude_id)

            for supplier in all_suppliers:
                if supplier.phone:
                    supplier_phone_clean = re.sub(r'[^\d+]', '', supplier.phone)
                    if phone_clean == supplier_phone_clean:
                        results.append((supplier, 1.0, 'phone_exact'))

        # Recherche par nom similaire
        all_suppliers = Supplier.objects.all()
        if exclude_id:
            all_suppliers = all_suppliers.exclude(id=exclude_id)

        for supplier in all_suppliers:
            # Éviter les doublons déjà trouvés
            if any(s[0].id == supplier.id for s in results):
                continue

            similarity = self.calculate_similarity(name, supplier.name)

            if similarity >= self.threshold:
                results.append((supplier, similarity, 'name_similar'))

        # Trier par score de similarité décroissant
        results.sort(key=lambda x: x[1], reverse=True)

        return results

    def find_similar_clients(self, first_name, last_name=None, email=None, company=None, exclude_id=None):
        """
        Recherche des clients similaires

        Args:
            first_name: Prénom
            last_name: Nom (optionnel)
            email: Email (optionnel)
            company: Société (optionnel)
            exclude_id: ID à exclure

        Returns:
            Liste de tuples (client, similarity_score, match_reason)
        """
        from apps.accounts.models import CustomUser

        results = []

        # Recherche par email exact
        if email:
            exact_email = CustomUser.objects.filter(email__iexact=email)
            if exclude_id:
                exact_email = exact_email.exclude(id=exclude_id)

            for client in exact_email:
                results.append((client, 1.0, 'email_exact'))

        # Recherche par nom complet similaire
        full_name = f"{first_name} {last_name}" if last_name else first_name

        all_clients = CustomUser.objects.all()
        if exclude_id:
            all_clients = all_clients.exclude(id=exclude_id)

        for client in all_clients:
            # Éviter les doublons
            if any(c[0].id == client.id for c in results):
                continue

            client_full_name = client.get_full_name() or client.username
            similarity = self.calculate_similarity(full_name, client_full_name)

            if similarity >= self.threshold:
                results.append((client, similarity, 'name_similar'))

        # Recherche par société similaire
        if company:
            for client in all_clients:
                if any(c[0].id == client.id for c in results):
                    continue

                if client.company:
                    similarity = self.calculate_similarity(company, client.company)
                    if similarity >= self.threshold:
                        results.append((client, similarity, 'company_similar'))

        # Trier par score
        results.sort(key=lambda x: x[1], reverse=True)

        return results

    def find_similar_products(self, name, reference=None, barcode=None, exclude_id=None):
        """
        Recherche des produits similaires

        Args:
            name: Nom du produit
            reference: Référence (optionnel)
            barcode: Code-barres (optionnel)
            exclude_id: ID à exclure

        Returns:
            Liste de tuples (product, similarity_score, match_reason)
        """
        from apps.invoicing.models import Product

        results = []

        # Recherche par référence exacte
        if reference:
            exact_ref = Product.objects.filter(reference__iexact=reference)
            if exclude_id:
                exact_ref = exact_ref.exclude(id=exclude_id)

            for product in exact_ref:
                results.append((product, 1.0, 'reference_exact'))

        # Recherche par code-barres exact
        if barcode:
            exact_barcode = Product.objects.filter(barcode=barcode)
            if exclude_id:
                exact_barcode = exact_barcode.exclude(id=exclude_id)

            for product in exact_barcode:
                results.append((product, 1.0, 'barcode_exact'))

        # Recherche par nom similaire
        all_products = Product.objects.all()
        if exclude_id:
            all_products = all_products.exclude(id=exclude_id)

        for product in all_products:
            if any(p[0].id == product.id for p in results):
                continue

            similarity = self.calculate_similarity(name, product.name)

            if similarity >= self.threshold:
                results.append((product, similarity, 'name_similar'))

        results.sort(key=lambda x: x[1], reverse=True)

        return results

    def format_match_reason(self, reason):
        """Formate la raison de la correspondance en français"""
        reasons = {
            'email_exact': 'Email identique',
            'phone_exact': 'Téléphone identique',
            'name_similar': 'Nom similaire',
            'company_similar': 'Société similaire',
            'reference_exact': 'Référence identique',
            'barcode_exact': 'Code-barres identique',
        }
        return reasons.get(reason, 'Correspondance trouvée')

    def create_similarity_message(self, entity_type, similar_entities):
        """
        Crée un message formaté pour l'IA décrivant les entités similaires

        Args:
            entity_type: Type d'entité ('supplier', 'client', 'product')
            similar_entities: Liste de tuples (entity, score, reason)

        Returns:
            str: Message formaté
        """
        if not similar_entities:
            return None

        entity_names = {
            'supplier': 'fournisseur',
            'client': 'client',
            'product': 'produit'
        }

        entity_name = entity_names.get(entity_type, 'entité')

        message = f"⚠️ **Attention**: J'ai trouvé {len(similar_entities)} {entity_name}(s) similaire(s) :\n\n"

        for i, (entity, score, reason) in enumerate(similar_entities[:3], 1):  # Max 3
            if entity_type == 'supplier':
                entity_info = f"**{entity.name}**"
                if entity.email:
                    entity_info += f" - {entity.email}"
                if entity.phone:
                    entity_info += f" - {entity.phone}"
            elif entity_type == 'client':
                entity_info = f"**{entity.get_full_name() or entity.username}**"
                if entity.email:
                    entity_info += f" - {entity.email}"
                if entity.company:
                    entity_info += f" ({entity.company})"
            elif entity_type == 'product':
                entity_info = f"**{entity.name}**"
                if entity.reference:
                    entity_info += f" - Réf: {entity.reference}"
            else:
                entity_info = str(entity)

            similarity_percent = int(score * 100)
            reason_text = self.format_match_reason(reason)

            message += f"{i}. {entity_info}\n"
            message += f"   - Similarité: {similarity_percent}%\n"
            message += f"   - Raison: {reason_text}\n\n"

        message += "**Voulez-vous utiliser un de ces éléments existants ou créer un nouveau ?**"

        return message


# Instance globale
entity_matcher = EntityMatcher(threshold=0.75)
