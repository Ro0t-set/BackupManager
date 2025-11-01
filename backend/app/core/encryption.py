from cryptography.fernet import Fernet
import base64
import os
from hashlib import sha256


def get_encryption_key() -> bytes:
    """Get or generate encryption key from environment"""
    key_string = os.getenv("ENCRYPTION_KEY", "dev-encryption-key")
    # Create a consistent 32-byte key from the string
    key_hash = sha256(key_string.encode()).digest()
    return base64.urlsafe_b64encode(key_hash)


def encrypt_password(password: str) -> str:
    """Encrypt a password for storage"""
    if not password:
        return ""

    key = get_encryption_key()
    f = Fernet(key)
    encrypted = f.encrypt(password.encode())
    return encrypted.decode()


def decrypt_password(encrypted_password: str) -> str:
    """Decrypt a stored password"""
    if not encrypted_password:
        return ""

    key = get_encryption_key()
    f = Fernet(key)
    decrypted = f.decrypt(encrypted_password.encode())
    return decrypted.decode()
