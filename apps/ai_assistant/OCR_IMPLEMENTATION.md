# 📄 Étape 5 : OCR Service Amélioré avec Mistral AI

## 🎯 Objectif

Améliorer le service OCR existant pour utiliser Mistral AI pour l'analyse intelligente des documents après extraction du texte.

---

## 📋 Architecture

```
Document Image → OCR (pytesseract) → Texte Brut → Mistral AI → Données Structurées
```

**Améliorations :**
1. ✅ Garder l'OCR existant (pytesseract ou simulation)
2. ✅ Ajouter analyse intelligente via Mistral
3. ✅ Détecter automatiquement le type de document
4. ✅ Extraire des données complexes (tableaux, articles, etc.)

---

## 🔧 Code à Ajouter dans `ocr_service.py`

### 1. Ajouter l'import Mistral

```python
from .services import MistralService
```

### 2. Améliorer la classe `DocumentProcessor`

Remplacer la méthode `process_document` par cette version améliorée :

```python
def process_document(self, image_file: InMemoryUploadedFile, document_type: str = None) -> dict:
    """
    Traite un document complet : OCR + analyse IA

    Args:
        image_file: Fichier image du document
        document_type: Type de document (auto-détecté si None)

    Returns:
        Dict avec les données extraites
    """
    # Extraction OCR
    success, text, language = self.ocr_service.extract_text_from_image(image_file)

    if not success:
        return {
            'success': False,
            'error': text,
            'ocr_text': None,
            'extracted_data': None
        }

    # Si le type n'est pas fourni, le détecter
    if not document_type:
        document_type = self._detect_document_type(text)

    # Analyse intelligente avec Mistral AI
    mistral_service = MistralService()
    ai_extraction = mistral_service.analyze_document(text, document_type)

    # Combiner extraction regex (rapide) et IA (précise)
    regex_data = self._extract_structured_data(text, document_type)

    if ai_extraction.get('success'):
        extracted_data = {
            **regex_data,  # Données regex en base
            **ai_extraction.get('data', {})  # Données IA prioritaires
        }
    else:
        extracted_data = regex_data

    return {
        'success': True,
        'ocr_text': text,
        'language': language,
        'extracted_data': extracted_data,
        'document_type': document_type,
        'confidence': self._calculate_extraction_confidence(extracted_data)
    }
```

### 3. Ajouter la détection automatique de type

```python
def _detect_document_type(self, text: str) -> str:
    """
    Détecte automatiquement le type de document

    Args:
        text: Texte extrait du document

    Returns:
        Type de document détecté
    """
    import re

    text_lower = text.lower()

    # Mots-clés par type de document
    invoice_keywords = ['facture', 'invoice', 'montant total', 'ttc', 'ht', 'tva']
    po_keywords = ['bon de commande', 'purchase order', 'livraison', 'delivery']
    supplier_list_keywords = ['fournisseur', 'supplier', 'contact', 'liste']

    # Compter les occurrences
    invoice_score = sum(1 for kw in invoice_keywords if kw in text_lower)
    po_score = sum(1 for kw in po_keywords if kw in text_lower)
    supplier_score = sum(1 for kw in supplier_list_keywords if kw in text_lower)

    # Patterns spécifiques
    if re.search(r'facture\s*(?:n°|no|#)', text_lower):
        invoice_score += 3
    if re.search(r'bon de commande\s*(?:n°|no|#)', text_lower):
        po_score += 3

    # Déterminer le type
    scores = {
        'invoice': invoice_score,
        'purchase_order': po_score,
        'supplier_list': supplier_score
    }

    detected_type = max(scores, key=scores.get)

    # Si le score est trop faible, retourner 'unknown'
    if scores[detected_type] < 2:
        return 'unknown'

    return detected_type
```

### 4. Calculer la confiance d'extraction

```python
def _calculate_extraction_confidence(self, extracted_data: dict) -> float:
    """
    Calcule un score de confiance pour les données extraites

    Args:
        extracted_data: Données extraites

    Returns:
        Score de confiance (0-1)
    """
    if not extracted_data:
        return 0.0

    # Champs critiques par type
    critical_fields = {
        'invoice': ['invoice_number', 'client_name', 'total', 'date'],
        'purchase_order': ['po_number', 'supplier_name', 'total'],
        'supplier_list': ['suppliers']
    }

    # Compter les champs présents
    total_fields = len(extracted_data)
    filled_fields = sum(1 for v in extracted_data.values() if v and str(v).strip())

    if total_fields == 0:
        return 0.0

    # Score de base
    confidence = filled_fields / total_fields

    # Bonus si les champs critiques sont présents
    doc_type = extracted_data.get('document_type', 'invoice')
    if doc_type in critical_fields:
        critical = critical_fields[doc_type]
        critical_present = sum(1 for field in critical if field in extracted_data and extracted_data[field])
        if len(critical) > 0:
            critical_ratio = critical_present / len(critical)
            confidence = (confidence + critical_ratio) / 2

    return min(confidence, 1.0)
```

### 5. Ajouter support pour les listes de fournisseurs

```python
def extract_supplier_list(self, text: str) -> dict:
    """
    Extrait une liste de fournisseurs depuis un registre

    Args:
        text: Texte du registre

    Returns:
        Dict avec la liste des fournisseurs
    """
    mistral_service = MistralService()
    result = mistral_service.analyze_document(text, 'supplier_list')

    if not result.get('success'):
        return {
            'success': False,
            'error': result.get('error'),
            'suppliers': []
        }

    suppliers_data = result.get('data', {}).get('suppliers', [])

    return {
        'success': True,
        'suppliers': suppliers_data,
        'count': len(suppliers_data)
    }
```

---

## 🆕 Nouvelle Classe : SmartDocumentAnalyzer

Ajouter cette classe à la fin de `ocr_service.py` :

```python
class SmartDocumentAnalyzer:
    """
    Analyseur intelligent de documents utilisant OCR + Mistral AI
    """

    def __init__(self):
        self.document_processor = DocumentProcessor()
        self.mistral_service = MistralService()

    async def analyze_and_create(self, image_file: InMemoryUploadedFile,
                                  auto_create: bool = False,
                                  user = None) -> dict:
        """
        Analyse un document et optionnellement crée l'entité correspondante

        Args:
            image_file: Fichier image
            auto_create: Créer automatiquement l'entité
            user: Utilisateur Django

        Returns:
            Dict avec analyse et résultat de création
        """
        # Analyser le document
        analysis = self.document_processor.process_document(image_file)

        if not analysis['success']:
            return analysis

        result = {
            'analysis': analysis,
            'created_entity': None
        }

        # Créer l'entité si demandé
        if auto_create and analysis.get('extracted_data'):
            doc_type = analysis['document_type']
            extracted = analysis['extracted_data']

            if doc_type == 'invoice':
                entity = await self._create_invoice_from_data(extracted, user)
                result['created_entity'] = entity

            elif doc_type == 'purchase_order':
                entity = await self._create_po_from_data(extracted, user)
                result['created_entity'] = entity

            elif doc_type == 'supplier_list':
                entities = await self._create_suppliers_from_list(extracted, user)
                result['created_entities'] = entities

        return result

    async def _create_invoice_from_data(self, data: dict, user) -> dict:
        """Crée une facture depuis les données extraites"""
        from .services import ActionExecutor

        executor = ActionExecutor()

        # Préparer les paramètres
        params = {
            'client_name': data.get('client_name', 'Client Inconnu'),
            'description': f"Facture {data.get('invoice_number', '')} importée",
        }

        # Ajouter les articles si présents
        if 'items' in data:
            params['items'] = data['items']

        # Montant total
        if 'total' in data:
            params['amount'] = float(data['total'])

        # Date d'échéance
        if 'due_date' in data:
            params['due_date'] = data['due_date']

        return await executor.create_invoice(params, user)

    async def _create_po_from_data(self, data: dict, user) -> dict:
        """Crée un bon de commande depuis les données extraites"""
        from .services import ActionExecutor

        executor = ActionExecutor()

        params = {
            'supplier_name': data.get('supplier_name', 'Fournisseur Inconnu'),
            'description': f"BC {data.get('po_number', '')} importé",
        }

        if 'items' in data:
            params['items'] = data['items']

        if 'total' in data:
            params['total_amount'] = float(data['total'])

        if 'delivery_date' in data:
            params['delivery_date'] = data['delivery_date']

        return await executor.create_purchase_order(params, user)

    async def _create_suppliers_from_list(self, data: dict, user) -> list:
        """Crée plusieurs fournisseurs depuis une liste"""
        from .services import ActionExecutor

        executor = ActionExecutor()
        suppliers = data.get('suppliers', [])

        results = []
        for supplier_data in suppliers:
            result = await executor.create_supplier(supplier_data, user)
            results.append(result)

        return results

    def preview_extraction(self, image_file: InMemoryUploadedFile) -> dict:
        """
        Prévisualise l'extraction sans créer d'entité

        Args:
            image_file: Fichier image

        Returns:
            Dict avec les données qui seraient extraites
        """
        analysis = self.document_processor.process_document(image_file)

        if not analysis['success']:
            return analysis

        # Formater pour affichage
        extracted = analysis.get('extracted_data', {})
        doc_type = analysis.get('document_type')

        preview = {
            'document_type': doc_type,
            'confidence': analysis.get('confidence', 0),
            'fields': {}
        }

        # Formater les champs selon le type
        if doc_type == 'invoice':
            preview['fields'] = {
                'Numéro de facture': extracted.get('invoice_number', 'Non détecté'),
                'Client': extracted.get('client_name', 'Non détecté'),
                'Date': extracted.get('date', 'Non détecté'),
                'Montant total': f"{extracted.get('total', 0)} €",
                'Articles': len(extracted.get('items', []))
            }

        elif doc_type == 'purchase_order':
            preview['fields'] = {
                'Numéro BC': extracted.get('po_number', 'Non détecté'),
                'Fournisseur': extracted.get('supplier_name', 'Non détecté'),
                'Date livraison': extracted.get('delivery_date', 'Non détecté'),
                'Montant': f"{extracted.get('total', 0)} €",
                'Articles': len(extracted.get('items', []))
            }

        elif doc_type == 'supplier_list':
            suppliers = extracted.get('suppliers', [])
            preview['fields'] = {
                'Nombre de fournisseurs': len(suppliers),
                'Fournisseurs détectés': [s.get('name', '') for s in suppliers[:5]]
            }

        return preview
```

---

## 📡 Intégration avec les Views

Ajouter dans `views.py` :

```python
class DocumentAnalysisView(APIView):
    """Endpoint pour analyser des documents scannés"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        """
        Analyse un document uploadé

        Body:
        - file: Image du document
        - document_type: Type (optionnel, auto-détecté si omis)
        - auto_create: Boolean pour création automatique
        - preview_only: Boolean pour preview sans création
        """
        try:
            image_file = request.FILES.get('file')
            if not image_file:
                return Response(
                    {'error': 'Aucun fichier fourni'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            document_type = request.data.get('document_type')
            auto_create = request.data.get('auto_create', 'false').lower() == 'true'
            preview_only = request.data.get('preview_only', 'false').lower() == 'true'

            from .ocr_service import SmartDocumentAnalyzer
            analyzer = SmartDocumentAnalyzer()

            # Preview seulement
            if preview_only:
                result = analyzer.preview_extraction(image_file)
                return Response(result, status=status.HTTP_200_OK)

            # Analyse complète
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                result = loop.run_until_complete(
                    analyzer.analyze_and_create(
                        image_file,
                        auto_create=auto_create,
                        user=request.user
                    )
                )
            finally:
                loop.close()

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Document analysis error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

Ajouter la route dans `api_urls.py` :

```python
path('analyze-document/', DocumentAnalysisView.as_view(), name='analyze-document'),
```

---

## 🧪 Tests Rapides

### Test 1: Analyse simple
```bash
curl -X POST http://localhost:8000/api/v1/ai/analyze-document/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@facture.png" \
  -F "preview_only=true"
```

### Test 2: Analyse et création auto
```bash
curl -X POST http://localhost:8000/api/v1/ai/analyze-document/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@facture.png" \
  -F "auto_create=true"
```

### Test 3: Type spécifié
```bash
curl -X POST http://localhost:8000/api/v1/ai/analyze-document/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@bon_commande.png" \
  -F "document_type=purchase_order" \
  -F "auto_create=true"
```

---

## ✅ Checklist d'Implémentation

- [ ] Ajouter import `MistralService` dans `ocr_service.py`
- [ ] Remplacer `process_document()` par la version améliorée
- [ ] Ajouter `_detect_document_type()`
- [ ] Ajouter `_calculate_extraction_confidence()`
- [ ] Ajouter `extract_supplier_list()`
- [ ] Ajouter la classe `SmartDocumentAnalyzer`
- [ ] Ajouter `DocumentAnalysisView` dans `views.py`
- [ ] Ajouter la route dans `api_urls.py`
- [ ] Tester avec différents types de documents

---

## 🎯 Fonctionnalités Complètes

Après implémentation, le module OCR peut :

✅ Extraire du texte depuis des images (pytesseract)
✅ Détecter automatiquement le type de document
✅ Analyser intelligemment avec Mistral AI
✅ Extraire des données structurées complexes
✅ Créer automatiquement les entités (factures, BC, fournisseurs)
✅ Prévisualiser avant création
✅ Calculer un score de confiance
✅ Gérer des listes de fournisseurs

---

**Prochaine étape :** Frontend FloatingAIAssistant avec support d'upload de documents.
