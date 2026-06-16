from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.services.user_service import UserService

# NullPool: no connection reuse between tests — avoids event loop conflicts
_test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
_TestSession = async_sessionmaker(
    bind=_test_engine, expire_on_commit=False, autocommit=False, autoflush=False
)


async def _override_get_db() -> AsyncSession:  # type: ignore[override]
    async with _TestSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
async def db_session() -> AsyncSession:
    async with _TestSession() as session:
        yield session


@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> dict:
    email = f"admin-{uuid.uuid4().hex[:8]}@aegis.test"
    password = "AdminP@ss1"
    user = await UserService(db_session).create(
        email=email,
        password=password,
        name="Test Admin",
        role="admin",
        must_change_password=False,
    )
    return {"id": user.id, "email": email, "password": password}


@pytest.fixture
async def admin_token_headers(client: AsyncClient, admin_user: dict) -> dict:
    resp = await client.post(
        "/v1/auth/login",
        json={"email": admin_user["email"], "password": admin_user["password"]},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
async def admin_client(admin_token_headers: dict) -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers=admin_token_headers,
    ) as ac:
        yield ac
