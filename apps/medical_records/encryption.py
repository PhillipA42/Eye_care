import base64
from django.conf import settings
from cryptography.fernet import Fernet

# Fallback 32-byte url-safe base64 key for development/testing if settings are missing
DEV_KEY = Fernet.generate_key()

def get_fernet_instance():
    key = getattr(settings, 'MEDICAL_RECORD_ENCRYPTION_KEY', None)
    if not key:
        # Fallback to dev key
        return Fernet(DEV_KEY)
    
    # Ensure key is bytes and base64 encoded
    if isinstance(key, str):
        key = key.encode()
    
    try:
        return Fernet(key)
    except Exception:
        # Fallback if key is malformed
        return Fernet(DEV_KEY)

def encrypt_text(text: str) -> bytes:
    if not text:
        return b""
    fernet = get_fernet_instance()
    return fernet.encrypt(text.encode('utf-8'))

def decrypt_text(ciphertext: bytes) -> str:
    if not ciphertext:
        return ""
    fernet = get_fernet_instance()
    try:
        decrypted = fernet.decrypt(bytes(ciphertext))
        return decrypted.decode('utf-8')
    except Exception:
        return "[Error: Unable to decrypt clinical note. Invalid key or corrupted data.]"
