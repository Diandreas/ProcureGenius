"""
Service OCR pour l'extraction de texte depuis des images
"""
import os
import io
import base64
from typing import Optional, Tuple
from PIL import Image
import pytesseract
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
import logging

logger = logging.getLogger(__name__)


class OCRService:
    """Service pour l'extraction de texte depuis des images"""
    
    def __init__(self):
        # Configuration Tesseract
        tesseract_cmd = getattr(settings, 'TESSERACT_CMD', '/usr/bin/tesseract')
        if os.path.exists(tesseract_cmd):
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        
        self.supported_formats = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff']
        self.max_file_size = getattr(settings, 'MAX_DOCUMENT_SIZE', 10 * 1024 * 1024)  # 10MB
    
    def extract_text_from_image(self, image_file: InMemoryUploadedFile) -> Tuple[bool, str, Optional[str]]:
        """
        Extrait le texte d'une image uploadée
        
        Args:
            image_file: Fichier image uploadé
            
        Returns:
            Tuple (success, text/error_message, detected_language)
        """
        try:
            # Vérifier le type de fichier
            if image_file.content_type not in self.supported_formats:
                return False, f"Format non supporté: {image_file.content_type}", None
            
            # Vérifier la taille
            if image_file.size > self.max_file_size:
                return False, "Fichier trop volumineux (max 10MB)", None
            
            # Ouvrir l'image
            image = Image.open(image_file)
            
            # Prétraitement de l'image pour améliorer l'OCR
            image = self._preprocess_image(image)
            
            # Extraction du texte avec détection de langue
            try:
                # Essayer d'abord en français
                text_fr = pytesseract.image_to_string(image, lang='fra')
                confidence_fr = self._calculate_confidence(text_fr)
                
                # Essayer en anglais
                text_en = pytesseract.image_to_string(image, lang='eng')
                confidence_en = self._calculate_confidence(text_en)
                
                # Choisir le meilleur résultat
                if confidence_fr > confidence_en:
                    text = text_fr
                    lang = 'fr'
                else:
                    text = text_en
                    lang = 'en'
                
            except Exception:
                # Fallback sans spécifier la langue
                text = pytesseract.image_to_string(image)
                lang = 'unknown'
            
            # Nettoyer le texte
            text = self._clean_text(text)
            
            if not text.strip():
                return False, "Aucun texte détecté dans l'image", None
            
            return True, text, lang
            
        except Exception as e:
            logger.error(f"OCR extraction error: {e}")
            return False, f"Erreur lors de l'extraction: {str(e)}", None
    
    def extract_text_from_base64(self, base64_string: str) -> Tuple[bool, str, Optional[str]]:
        """
        Extrait le texte depuis une image encodée en base64
        
        Args:
            base64_string: Image encodée en base64
            
        Returns:
            Tuple (success, text/error_message, detected_language)
        """
        try:
            # Décoder le base64
            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))
            
            # Créer un fichier temporaire pour réutiliser la méthode existante
            image_file = io.BytesIO()
            image.save(image_file, format='PNG')
            image_file.seek(0)
            
            # Créer un InMemoryUploadedFile
            from django.core.files.uploadedfile import InMemoryUploadedFile
            uploaded_file = InMemoryUploadedFile(
                image_file,
                None,
                'image.png',
                'image/png',
                image_file.tell(),
                None
            )
            uploaded_file.seek(0)
            
            return self.extract_text_from_image(uploaded_file)
            
        except Exception as e:
            logger.error(f"Base64 OCR extraction error: {e}")
            return False, f"Erreur lors du décodage base64: {str(e)}", None
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Prétraite l'image pour améliorer la qualité de l'OCR
        
        Args:
            image: Image PIL
            
        Returns:
            Image prétraitée
        """
        # Convertir en niveaux de gris
        if image.mode != 'L':
            image = image.convert('L')
        
        # Augmenter le contraste
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Redimensionner si trop petite
        width, height = image.size
        if width < 1000:
            ratio = 1000 / width
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        return image
    
    def _clean_text(self, text: str) -> str:
        """
        Nettoie le texte extrait
        
        Args:
            text: Texte brut de l'OCR
            
        Returns:
            Texte nettoyé
        """
        # Supprimer les lignes vides multiples
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)
        
        # Rejoindre avec des sauts de ligne simples
        text = '\n'.join(cleaned_lines)
        
        # Supprimer les caractères spéciaux isolés
        import re
        text = re.sub(r'[^\w\s\-.,;:!?€$£¥@#%&*()\[\]{}"\'°/\\+=<>]', '', text)
        
        return text.strip()
    
    def _calculate_confidence(self, text: str) -> float:
        """
        Calcule un score de confiance basé sur la qualité du texte
        
        Args:
            text: Texte extrait
            
        Returns:
            Score de confiance (0-1)
        """
        if not text:
            return 0.0
        
        # Compter les mots valides
        words = text.split()
        valid_words = 0
        
        for word in words:
            # Un mot valide a au moins 2 caractères et contient des lettres
            if len(word) >= 2 and any(c.isalpha() for c in word):
                valid_words += 1
        
        if len(words) == 0:
            return 0.0
        
        # Score basé sur le ratio de mots valides
        confidence = valid_words / len(words)
        
        # Pénaliser s'il y a trop de caractères spéciaux
        special_chars = sum(1 for c in text if not c.isalnum() and not c.isspace())
        if special_chars > len(text) * 0.3:
            confidence *= 0.7
        
        return min(confidence, 1.0)


class DocumentProcessor:
    """Processeur de documents pour l'extraction et la structuration des données"""
    
    def __init__(self):
        self.ocr_service = OCRService()
        self.patterns = {
            'invoice': {
                'number': [
                    r'(?:facture|invoice)\s*(?:n°|no|#)?\s*:?\s*(\w+)',
                    r'(?:n°|no|#)\s*(?:de facture|invoice)?\s*:?\s*(\w+)'
                ],
                'date': [
                    r'(?:date|du)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                    r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
                ],
                'total': [
                    r'(?:total|montant total)\s*:?\s*([0-9,.\s]+)\s*(?:€|EUR|CAD|\$)?',
                    r'(?:ttc|total ttc)\s*:?\s*([0-9,.\s]+)\s*(?:€|EUR|CAD|\$)?'
                ],
            },
            'purchase_order': {
                'number': [
                    r'(?:bon de commande|purchase order|po)\s*(?:n°|no|#)?\s*:?\s*(\w+)',
                    r'(?:commande|order)\s*(?:n°|no|#)?\s*:?\s*(\w+)'
                ],
                'supplier': [
                    r'(?:fournisseur|supplier|vendor)\s*:?\s*([^\n]+)',
                    r'(?:à|to)\s*:?\s*([^\n]+)'
                ],
            }
        }
    
    def process_document(self, image_file: InMemoryUploadedFile, document_type: str) -> dict:
        """
        Traite un document complet : OCR + extraction de données
        
        Args:
            image_file: Fichier image du document
            document_type: Type de document
            
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
        
        # Extraction des données structurées
        extracted_data = self._extract_structured_data(text, document_type)
        
        return {
            'success': True,
            'ocr_text': text,
            'language': language,
            'extracted_data': extracted_data,
            'document_type': document_type
        }
    
    def _extract_structured_data(self, text: str, document_type: str) -> dict:
        """
        Extrait des données structurées du texte
        
        Args:
            text: Texte extrait par OCR
            document_type: Type de document
            
        Returns:
            Dict avec les données extraites
        """
        import re
        
        if document_type not in self.patterns:
            return {}
        
        patterns = self.patterns[document_type]
        extracted = {}
        
        for field, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    extracted[field] = match.group(1).strip()
                    break
        
        # Extraction des montants
        amounts = re.findall(r'([0-9]+[,.]?[0-9]*)\s*(?:€|EUR|CAD|\$)', text)
        if amounts:
            extracted['amounts'] = [self._parse_amount(a) for a in amounts]
        
        # Extraction des dates
        dates = re.findall(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', text)
        if dates:
            extracted['dates'] = dates
        
        # Extraction des emails
        emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        if emails:
            extracted['emails'] = emails
        
        # Extraction des numéros de téléphone
        phones = re.findall(r'(?:\+\d{1,3}\s?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}', text)
        if phones:
            extracted['phones'] = phones
        
        return extracted
    
    def _parse_amount(self, amount_str: str) -> float:
        """Parse un montant string en float"""
        try:
            # Remplacer la virgule par un point
            amount_str = amount_str.replace(',', '.')
            # Supprimer les espaces
            amount_str = amount_str.replace(' ', '')
            return float(amount_str)
        except:
            return 0.0