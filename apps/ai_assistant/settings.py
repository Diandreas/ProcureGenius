"""
Configuration pour le module IA Assistant
"""
import os
from django.conf import settings

# Mistral AI Configuration
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY', '')
MISTRAL_MODEL = os.getenv('MISTRAL_MODEL', 'mistral-large')
MISTRAL_TEMPERATURE = float(os.getenv('MISTRAL_TEMPERATURE', '0.7'))
MISTRAL_MAX_TOKENS = int(os.getenv('MISTRAL_MAX_TOKENS', '1000'))

# Conversation settings
MAX_CONVERSATION_HISTORY = 20  # Nombre maximum de messages à garder en contexte
CONVERSATION_TIMEOUT_HOURS = 24  # Temps avant qu'une conversation soit considérée comme inactive

# Document analysis settings
SUPPORTED_DOCUMENT_TYPES = ['invoice', 'purchase_order', 'supplier_list', 'client_list']
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB

# Action permissions
# Définir quelles actions peuvent être exécutées automatiquement
AUTO_EXECUTABLE_ACTIONS = [
    'search_supplier',
    'search_invoice',
    'search_purchase_order',
    'get_stats',
]

# Actions nécessitant une confirmation
CONFIRMATION_REQUIRED_ACTIONS = [
    'create_supplier',
    'create_invoice',
    'create_purchase_order',
    'update_supplier',
    'update_invoice',
    'update_purchase_order',
    'delete_supplier',
    'delete_invoice',
    'delete_purchase_order',
]

# OCR Configuration (pour le scanning de documents)
OCR_ENGINE = os.getenv('OCR_ENGINE', 'tesseract')  # tesseract ou google-vision
TESSERACT_CMD = os.getenv('TESSERACT_CMD', '/usr/bin/tesseract')

# Cache settings pour l'IA
AI_CACHE_TIMEOUT = 3600  # 1 heure
AI_RATE_LIMIT = 100  # Requêtes par heure par utilisateur