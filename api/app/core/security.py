from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import settings

# ── API key helpers ──────────────────────────────────────────────────────────


def generate_api_key() -> str:
    """Generate a cryptographically secure API key (shown once to the user)."""
    return secrets.token_urlsafe(32)


def hash_api_key(key: str) -> str:
    """Hash an API key with SHA-256. High-entropy tokens don't need bcrypt."""
    return hashlib.sha256(key.encode()).hexdigest()


def verify_api_key(plain: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_api_key(plain), hashed)


# ── Password helpers ─────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a user password with SHA-256 + a per-password salt."""
    salt = secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{digest}"


def verify_password(plain: str, hashed: str) -> bool:
    salt, digest = hashed.split(":", 1)
    expected = hashlib.sha256(f"{salt}{plain}".encode()).hexdigest()
    return hmac.compare_digest(expected, digest)


# ── JWT helpers ───────────────────────────────────────────────────────────────


def create_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_access_token(token: str) -> int | None:
    """Return user_id from a valid token, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub = payload.get("sub")
        return int(sub) if sub else None
    except Exception:
        return None
