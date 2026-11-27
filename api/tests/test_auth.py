from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token
from app.services.user_service import UserService


def unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:8]}@aegis.test"


@pytest.fixture
async def test_user(db_session: AsyncSession) -> dict:
    """Create a user directly via service and return credentials."""
    email = unique_email()
    password = "s3cr3tP@ss"
    user = await UserService(db_session).create(email=email, password=password, name="Test User")
    return {"id": user.id, "email": email, "password": password}


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: dict) -> None:
    response = await client.post(
        "/v1/auth/login",
        json={"email": test_user["email"], "password": test_user["password"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: dict) -> None:
    response = await client.post(
        "/v1/auth/login",
        json={"email": test_user["email"], "password": "wrong"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/auth/login",
        json={"email": "nobody@aegis.test", "password": "whatever"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, test_user: dict) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": test_user["email"], "password": test_user["password"]},
    )
    token = login.json()["access_token"]
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == test_user["email"]


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient) -> None:
    response = await client.get("/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_new_user_defaults_last_seen_version_to_current(
    client: AsyncClient, test_user: dict
) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": test_user["email"], "password": test_user["password"]},
    )
    token = login.json()["access_token"]
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.json()["last_seen_version"] is not None


@pytest.mark.asyncio
async def test_mark_changelog_seen(client: AsyncClient, test_user: dict) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": test_user["email"], "password": test_user["password"]},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.post(
        "/v1/auth/me/changelog-seen", json={"version": "9.9.9"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["last_seen_version"] == "9.9.9"

    me = await client.get("/v1/auth/me", headers=headers)
    assert me.json()["last_seen_version"] == "9.9.9"


@pytest.mark.asyncio
async def test_mark_changelog_seen_unauthenticated(client: AsyncClient) -> None:
    response = await client.post("/v1/auth/me/changelog-seen", json={"version": "9.9.9"})
    assert response.status_code == 401


# ── JWT ───────────────────────────────────────────────────────────────────────


def _token(claims: dict, key: str | None = None) -> str:
    return jwt.encode(claims, key or settings.secret_key, algorithm=settings.algorithm)


def test_access_token_round_trip() -> None:
    assert decode_access_token(create_access_token(42)) == 42


def test_access_token_keeps_the_claims_issued_before_pyjwt() -> None:
    """Tokens issued by python-jose (HS256, string sub, numeric exp) stay valid."""
    payload = jwt.decode(
        create_access_token(7), settings.secret_key, algorithms=[settings.algorithm]
    )
    assert payload["sub"] == "7"
    assert isinstance(payload["exp"], int)


def test_expired_token_is_rejected() -> None:
    expired = datetime.now(UTC) - timedelta(seconds=1)
    assert decode_access_token(_token({"sub": "42", "exp": expired})) is None


def test_token_signed_with_another_key_is_rejected() -> None:
    expire = datetime.now(UTC) + timedelta(minutes=5)
    forged = _token({"sub": "42", "exp": expire}, key="x" * 32 + "another-signing-key")
    assert decode_access_token(forged) is None


def test_token_with_another_algorithm_is_rejected() -> None:
    expire = datetime.now(UTC) + timedelta(minutes=5)
    token = jwt.encode({"sub": "42", "exp": expire}, settings.secret_key, algorithm="HS512")
    assert decode_access_token(token) is None


def test_malformed_token_is_rejected() -> None:
    assert decode_access_token("not-a-jwt") is None


def test_token_with_non_numeric_sub_is_rejected() -> None:
    expire = datetime.now(UTC) + timedelta(minutes=5)
    assert decode_access_token(_token({"sub": "abc", "exp": expire})) is None


@pytest.mark.asyncio
async def test_expired_token_gets_401(client: AsyncClient, test_user: dict) -> None:
    expired = datetime.now(UTC) - timedelta(seconds=1)
    token = _token({"sub": str(test_user["id"]), "exp": expired})
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
