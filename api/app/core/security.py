from __future__ import annotations

import hashlib
import hmac
import secrets


def generate_api_key() -> str:
    """Generate a cryptographically secure API key (shown once to the user)."""
    return secrets.token_urlsafe(32)


def hash_api_key(key: str) -> str:
    """Hash an API key with SHA-256. High-entropy tokens don't need bcrypt."""
    return hashlib.sha256(key.encode()).hexdigest()


def verify_api_key(plain: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_api_key(plain), hashed)
