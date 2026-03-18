from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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
