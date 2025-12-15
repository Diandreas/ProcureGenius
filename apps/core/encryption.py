"""
Service de chiffrement pour les données sensibles (mots de passe SMTP, etc.)
Utilise cryptography.fernet avec une clé dérivée de Django SECRET_KEY
"""
from cryptography.fernet import Fernet
from django.conf import settings
import hashlib
import base64
import logging

logger = logging.getLogger(__name__)

# Cache de la clé Fernet
_fernet_key = None


def get_fernet_key():
    """Génère ou récupère la clé Fernet depuis Django SECRET_KEY"""
    global _fernet_key
    
    if _fernet_key is None:
        # Dériver une clé 32 bytes depuis SECRET_KEY
        secret_key = settings.SECRET_KEY.encode('utf-8')
        key_hash = hashlib.sha256(secret_key).digest()
        # Encoder en base64 pour Fernet (qui nécessite 32 bytes base64-encoded)
        _fernet_key = base64.urlsafe_b64encode(key_hash)
    
    return _fernet_key


def encrypt_value(value):
    """
    Chiffre une valeur (ex: mot de passe SMTP)
    
    Args:
        value: String à chiffrer
        
    Returns:
        String chiffrée (base64)
    """
    if not value:
        return None
    
    try:
        fernet = Fernet(get_fernet_key())
        encrypted = fernet.encrypt(value.encode('utf-8'))
        return encrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Error encrypting value: {e}")
        raise


def decrypt_value(encrypted_value):
    """
    Déchiffre une valeur chiffrée
    
    Args:
        encrypted_value: String chiffrée (base64)
        
    Returns:
        String déchiffrée
    """
    if not encrypted_value:
        return None
    
    try:
        fernet = Fernet(get_fernet_key())
        decrypted = fernet.decrypt(encrypted_value.encode('utf-8'))
        return decrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Error decrypting value: {e}")
        raise

