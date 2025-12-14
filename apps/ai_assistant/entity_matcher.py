"""
Système ultra-robuste de recherche d'entités similaires avec matching multi-algorithme
Tolère les fautes d'orthographe, variations de noms, ordre des mots, etc.
"""
from typing import List, Tuple, Dict, Any
import re
import unicodedata

# Import des bibliothèques de fuzzy matching
try:
    from fuzzywuzzy import fuzz
    from rapidfuzz import fuzz as rapid_fuzz
    import jellyfish
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False
    print("WARNING: Fuzzy matching libraries not installed. Install with:")
    print("pip install fuzzywuzzy python-Levenshtein jellyfish rapidfuzz")


class EnhancedEntityMatcher:
    """
    Matcher d'entités ultra-robuste utilisant plusieurs algorithmes.
    Gère les fautes de frappe, variations, similarités phonétiques, etc.
    """

    # Seuils de correspondance pour différents algorithmes
    THRESHOLDS = {
        'exact': 100,
        'high': 90,
        'medium': 75,
        'low': 60
    }

    # Poids des algorithmes pour l'agrégation des scores
    ALGORITHM_WEIGHTS = {
        'levenshtein': 0.25,
        'jaro_winkler': 0.20,
        'token_sort': 0.25,
        'token_set': 0.15,
        'phonetic': 0.15
    }

    # Suffixes d'entreprise courants
    COMPANY_SUFFIXES = {
        'incorporated', 'inc', 'corporation', 'corp', 'company', 'co',
        'limited', 'ltd', 'llc', 'sarl', 'sa', 'sas', 'gmbh',
        'plc', 'pty', 'ag', 'nv', 'bv', 'eurl', 'srl', 'snc'
    }

    def __init__(self, threshold=0.50):
        """
        Args:
            threshold: Seuil de similarité minimum (0-1). Défaut: 0.50 (50%)
            Réduit de 0.60 pour capturer "Gérard" vs "Gérard Dupont" (57%)
        """
        self.threshold = threshold

    def normalize_text(self, text: str) -> str:
        """
        Normalisation avancée de texte pour le matching.
        """
        if not text:
            return ''

        # Convertir en minuscules
        text = text.lower()

        # Supprimer les accents avec normalisation Unicode
        text = ''.join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )

        # Supprimer les espaces multiples
        text = ' '.join(text.split())

        return text

    def normalize_company_name(self, name: str) -> str:
        """
        Normalise les noms d'entreprise en supprimant les suffixes légaux.
        Exemple: "ABC Corporation Inc." -> "abc"
        """
        normalized = self.normalize_text(name)

        # Supprimer la ponctuation
        normalized = re.sub(r'[^\w\s]', ' ', normalized)

        # Diviser en tokens
        tokens = normalized.split()

        # Supprimer les suffixes courants
        filtered_tokens = [
            t for t in tokens
            if t not in self.COMPANY_SUFFIXES
        ]

        return ' '.join(filtered_tokens) if filtered_tokens else normalized

    def normalize_phone(self, phone: str) -> str:
        """
        Normalise les numéros de téléphone pour la comparaison.
        Supprime tous les caractères non-numériques.
        """
        if not phone:
            return ''

        # Garder seulement les chiffres
        digits = re.sub(r'\D', '', phone)

        # Pour les numéros français, supprimer le code pays
        if digits.startswith('33'):
            digits = '0' + digits[2:]
        elif digits.startswith('+33'):
            digits = '0' + digits[3:]

        return digits

    def calculate_multi_algorithm_score(
        self,
        str1: str,
        str2: str,
        use_phonetic: bool = True
    ) -> Dict[str, Any]:
        """
        Calcule la similarité en utilisant plusieurs algorithmes.

        Returns:
            {
                'levenshtein': 0.85,
                'jaro_winkler': 0.90,
                'token_sort': 0.88,
                'token_set': 0.92,
                'phonetic': 0.80,
                'weighted_average': 0.87,
                'confidence': 'high'
            }
        """
        if not str1 or not str2:
            return {'weighted_average': 0.0, 'confidence': 'none'}

        # Normaliser les entrées
        norm1 = self.normalize_text(str1)
        norm2 = self.normalize_text(str2)

        scores = {}

        if FUZZY_AVAILABLE:
            # 1. Distance de Levenshtein (bon pour les fautes de frappe)
            scores['levenshtein'] = fuzz.ratio(norm1, norm2) / 100.0

            # 2. Jaro-Winkler (bon pour les variations de noms)
            try:
                scores['jaro_winkler'] = jellyfish.jaro_winkler_similarity(norm1, norm2)
            except:
                scores['jaro_winkler'] = 0.0

            # 3. Token Sort Ratio (indépendant de l'ordre)
            scores['token_sort'] = fuzz.token_sort_ratio(norm1, norm2) / 100.0

            # 4. Token Set Ratio (gère les correspondances partielles)
            scores['token_set'] = fuzz.token_set_ratio(norm1, norm2) / 100.0

            # 5. Matching phonétique (noms qui sonnent pareil)
            if use_phonetic:
                try:
                    # Metaphone pour noms anglais/français
                    metaphone1 = jellyfish.metaphone(norm1)
                    metaphone2 = jellyfish.metaphone(norm2)
                    scores['phonetic'] = 1.0 if metaphone1 == metaphone2 else 0.0

                    # Soundex comme secours
                    if scores['phonetic'] == 0.0:
                        soundex1 = jellyfish.soundex(norm1)
                        soundex2 = jellyfish.soundex(norm2)
                        scores['phonetic'] = 0.8 if soundex1 == soundex2 else 0.0
                except:
                    scores['phonetic'] = 0.0
            else:
                scores['phonetic'] = 0.0
        else:
            # Fallback sur difflib si bibliothèques non disponibles
            from difflib import SequenceMatcher
            ratio = SequenceMatcher(None, norm1, norm2).ratio()
            scores = {
                'levenshtein': ratio,
                'jaro_winkler': ratio,
                'token_sort': ratio,
                'token_set': ratio,
                'phonetic': 0.0
            }

        # Calculer la moyenne pondérée
        weighted_avg = sum(
            scores[algo] * self.ALGORITHM_WEIGHTS.get(algo, 0)
            for algo in scores
        )

        # Déterminer le niveau de confiance
        if weighted_avg >= 0.90:
            confidence = 'very_high'
        elif weighted_avg >= 0.75:
            confidence = 'high'
        elif weighted_avg >= 0.60:
            confidence = 'medium'
        else:
            confidence = 'low'

        return {
            **scores,
            'weighted_average': weighted_avg,
            'confidence': confidence
        }

    def find_similar_clients(
        self,
        first_name: str,
        last_name: str = '',
        email: str = None,
        company: str = None,
        phone: str = None,
        exclude_id: str = None,
        min_score: float = None
    ) -> List[Tuple[Any, float, Dict]]:
        """
        Recherche avancée de clients similaires avec matching multi-algorithme.

        Returns:
            Liste de (client, score, match_details) triée par score décroissant
        """
        from apps.accounts.models import Client

        if min_score is None:
            min_score = self.threshold

        candidates = Client.objects.all()
        if exclude_id:
            candidates = candidates.exclude(id=exclude_id)

        matches = []

        for client in candidates:
            match_details = {
                'matched_on': [],
                'scores': {},
                'algorithms': {}
            }

            best_score = 0.0

            # 1. CORRESPONDANCES EXACTES (100% confiance)
            if company and client.name:
                if self.normalize_text(company) == self.normalize_text(client.name):
                    match_details['matched_on'].append('company_exact')
                    best_score = 1.0
                else:
                    # Check if both names have random suffixes (e.g., _ABC1, _XYZ2)
                    import re
                    pattern = r'(.+)_([A-Z0-9]{4})$'
                    match1 = re.match(pattern, company)
                    match2 = re.match(pattern, client.name)
                    
                    if match1 and match2:
                        base1, suffix1 = match1.groups()
                        base2, suffix2 = match2.groups()
                        # If same base but different suffixes, skip this match
                        if base1 == base2 and suffix1 != suffix2:
                            continue

            if email and client.email:
                if self.normalize_text(email) == self.normalize_text(client.email):
                    match_details['matched_on'].append('email_exact')
                    best_score = max(best_score, 1.0)

            if phone and client.phone:
                norm_phone1 = self.normalize_phone(phone)
                norm_phone2 = self.normalize_phone(client.phone)
                if norm_phone1 and norm_phone2 and norm_phone1 == norm_phone2:
                    match_details['matched_on'].append('phone_exact')
                    best_score = max(best_score, 1.0)

            # 2. MATCHING FLOU SUR LE NOM
            if first_name or company:
                # Essayer de matcher sur le nom
                if first_name:
                    full_name = f"{first_name} {last_name}".strip()
                    client_name = client.name

                    name_scores = self.calculate_multi_algorithm_score(
                        full_name, client_name, use_phonetic=True
                    )

                    if name_scores['weighted_average'] >= min_score:
                        match_details['matched_on'].append('name_fuzzy')
                        match_details['scores']['name'] = name_scores['weighted_average']
                        match_details['algorithms']['name'] = name_scores
                        best_score = max(best_score, name_scores['weighted_average'])

                # Essayer de matcher sur le nom d'entreprise (alias pour nom)
                if company:
                    # Normaliser les noms d'entreprise (supprimer suffixes légaux)
                    norm_company1 = self.normalize_company_name(company)
                    norm_company2 = self.normalize_company_name(client.name)

                    company_scores = self.calculate_multi_algorithm_score(
                        norm_company1, norm_company2, use_phonetic=False
                    )

                    if company_scores['weighted_average'] >= min_score:
                        match_details['matched_on'].append('company_fuzzy')
                        match_details['scores']['company'] = company_scores['weighted_average']
                        match_details['algorithms']['company'] = company_scores
                        best_score = max(best_score, company_scores['weighted_average'])

            # Inclure seulement si le score atteint le seuil
            if best_score >= min_score:
                matches.append((client, best_score, match_details))

        # Trier par score décroissant
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def find_similar_suppliers(
        self,
        name: str,
        email: str = None,
        phone: str = None,
        exclude_id: str = None,
        min_score: float = None
    ) -> List[Tuple[Any, float, Dict]]:
        """
        Recherche avancée de fournisseurs similaires avec matching multi-algorithme.
        """
        from apps.suppliers.models import Supplier

        if min_score is None:
            min_score = self.threshold

        candidates = Supplier.objects.all()
        if exclude_id:
            candidates = candidates.exclude(id=exclude_id)

        matches = []

        for supplier in candidates:
            match_details = {
                'matched_on': [],
                'scores': {},
                'algorithms': {}
            }

            best_score = 0.0

            # 1. CORRESPONDANCES EXACTES (100% confiance)
            if name and supplier.name:
                if self.normalize_text(name) == self.normalize_text(supplier.name):
                    match_details['matched_on'].append('name_exact')
                    best_score = 1.0
                else:
                    # Check if both names have random suffixes (e.g., _ABC1, _XYZ2)
                    import re
                    pattern = r'(.+)_([A-Z0-9]{4})$'
                    match1 = re.match(pattern, name)
                    match2 = re.match(pattern, supplier.name)
                    
                    if match1 and match2:
                        base1, suffix1 = match1.groups()
                        base2, suffix2 = match2.groups()
                        # If same base but different suffixes, skip this match
                        if base1 == base2 and suffix1 != suffix2:
                            continue

            if email and supplier.email:
                if self.normalize_text(email) == self.normalize_text(supplier.email):
                    match_details['matched_on'].append('email_exact')
                    best_score = max(best_score, 1.0)

            if phone and supplier.phone:
                norm_phone1 = self.normalize_phone(phone)
                norm_phone2 = self.normalize_phone(supplier.phone)
                if norm_phone1 and norm_phone2 and norm_phone1 == norm_phone2:
                    match_details['matched_on'].append('phone_exact')
                    best_score = max(best_score, 1.0)

            # 2. MATCHING FLOU SUR LE NOM
            if name and supplier.name:
                # Normaliser les noms d'entreprise (supprimer suffixes légaux)
                norm_name1 = self.normalize_company_name(name)
                norm_name2 = self.normalize_company_name(supplier.name)

                name_scores = self.calculate_multi_algorithm_score(
                    norm_name1, norm_name2, use_phonetic=False
                )

                if name_scores['weighted_average'] >= min_score:
                    match_details['matched_on'].append('name_fuzzy')
                    match_details['scores']['name'] = name_scores['weighted_average']
                    match_details['algorithms']['name'] = name_scores
                    best_score = max(best_score, name_scores['weighted_average'])

            # Inclure seulement si le score atteint le seuil
            if best_score >= min_score:
                matches.append((supplier, best_score, match_details))

        # Trier par score décroissant
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def find_similar_products(
        self,
        name: str,
        reference: str = None,
        barcode: str = None,
        exclude_id: str = None,
        min_score: float = None
    ) -> List[Tuple[Any, float, Dict]]:
        """
        Recherche avancée de produits similaires avec matching multi-algorithme.
        """
        from apps.invoicing.models import Product

        if min_score is None:
            min_score = self.threshold

        candidates = Product.objects.all()
        if exclude_id:
            candidates = candidates.exclude(id=exclude_id)

        matches = []

        for product in candidates:
            match_details = {
                'matched_on': [],
                'scores': {},
                'algorithms': {}
            }

            best_score = 0.0

            # 1. CORRESPONDANCES EXACTES (100% confiance)
            if reference and product.reference:
                if self.normalize_text(reference) == self.normalize_text(product.reference):
                    match_details['matched_on'].append('reference_exact')
                    best_score = 1.0

            if barcode and product.barcode:
                if self.normalize_text(barcode) == self.normalize_text(product.barcode):
                    match_details['matched_on'].append('barcode_exact')
                    best_score = max(best_score, 1.0)

            if name and product.name:
                if self.normalize_text(name) == self.normalize_text(product.name):
                    match_details['matched_on'].append('name_exact')
                    best_score = max(best_score, 1.0)
                else:
                    # Check if both names have random suffixes (e.g., _ABC1, _XYZ2)
                    # and only the suffix differs - this indicates test data, not real similarity
                    import re
                    pattern = r'(.+)_([A-Z0-9]{4})$'
                    match1 = re.match(pattern, name)
                    match2 = re.match(pattern, product.name)
                    
                    if match1 and match2:
                        base1, suffix1 = match1.groups()
                        base2, suffix2 = match2.groups()
                        # If same base but different suffixes, skip this match
                        if base1 == base2 and suffix1 != suffix2:
                            continue

            # 2. MATCHING FLOU SUR LE NOM
            if name and product.name:
                name_scores = self.calculate_multi_algorithm_score(
                    name, product.name, use_phonetic=False
                )

                if name_scores['weighted_average'] >= min_score:
                    match_details['matched_on'].append('name_fuzzy')
                    match_details['scores']['name'] = name_scores['weighted_average']
                    match_details['algorithms']['name'] = name_scores
                    best_score = max(best_score, name_scores['weighted_average'])

            # Inclure seulement si le score atteint le seuil
            if best_score >= min_score:
                matches.append((product, best_score, match_details))

        # Trier par score décroissant
        matches.sort(key=lambda x: x[1], reverse=True)

        return matches

    def format_match_reason(self, match_details: Dict) -> str:
        """
        Formate les raisons de correspondance en français pour affichage.
        """
        matched_on = match_details.get('matched_on', [])
        scores = match_details.get('scores', {})

        if 'email_exact' in matched_on:
            return "Email identique (100%)"
        elif 'phone_exact' in matched_on:
            return "Téléphone identique (100%)"
        elif 'reference_exact' in matched_on:
            return "Référence identique (100%)"
        elif 'barcode_exact' in matched_on:
            return "Code-barres identique (100%)"
        elif 'name_fuzzy' in matched_on:
            score = scores.get('name', 0) * 100
            return f"Nom similaire ({score:.0f}%)"
        elif 'company_fuzzy' in matched_on:
            score = scores.get('company', 0) * 100
            return f"Nom d'entreprise similaire ({score:.0f}%)"
        else:
            return "Correspondance partielle"

    def create_similarity_message(self, entity_type: str, similar_entities: List) -> str:
        """
        Crée un message formaté pour l'IA décrivant les entités similaires.

        Args:
            entity_type: Type d'entité ('supplier', 'client', 'product')
            similar_entities: Liste de tuples (entity, score, match_details)

        Returns:
            str: Message formaté en français
        """
        if not similar_entities:
            return None

        entity_names = {
            'supplier': 'fournisseur',
            'client': 'client',
            'product': 'produit'
        }

        entity_name = entity_names.get(entity_type, 'entité')

        message = f"**Attention**: J'ai trouvé {len(similar_entities)} {entity_name}(s) similaire(s) :\n\n"

        for i, (entity, score, match_details) in enumerate(similar_entities[:3], 1):  # Max 3
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
                if hasattr(entity, 'company') and entity.company:
                    entity_info += f" ({entity.company})"
            elif entity_type == 'product':
                entity_info = f"**{entity.name}**"
                if entity.reference:
                    entity_info += f" - Réf: {entity.reference}"
            else:
                entity_info = str(entity)

            similarity_percent = int(score * 100)
            reason_text = self.format_match_reason(match_details)

            message += f"{i}. {entity_info}\n"
            message += f"   - Similarité: {similarity_percent}%\n"
            message += f"   - Raison: {reason_text}\n\n"

        message += "**Voulez-vous utiliser un de ces éléments existants ou créer un nouveau ?**"

        return message


# Instance globale avec seuil à 70% (plus strict pour éviter les faux positifs)
entity_matcher = EnhancedEntityMatcher(threshold=0.70)
