from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic_settings import BaseSettings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.models  # noqa: F401 — registers all models on Base.metadata
from app.core.database import Base, get_db
from app.main import app
from app.services.user_service import UserService


class _TestSettings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aegis_test"

    model_config = {
        "env_prefix": "AEGIS_",
        "env_file": str(Path(__file__).parent.parent / ".env.test"),
        "env_file_encoding": "utf-8",
    }


_TEST_DB_URL = _TestSettings().database_url

# Safety guard: never run against production
_BLOCKED_HOSTS = {"10.10.1.3"}
for _host in _BLOCKED_HOSTS:
    if _host in _TEST_DB_URL:
        raise RuntimeError(
            "Tests apontam para produção! "
            "Crie api/.env.test com AEGIS_DATABASE_URL apontando para um banco local."
        )

_test_engine = create_async_engine(_TEST_DB_URL, poolclass=NullPool)
_TestSession = async_sessionmaker(
    bind=_test_engine, expire_on_commit=False, autocommit=False, autoflush=False
)


# ─── Schema lifecycle (session-scoped) ───────────────────────────────────────


@pytest.fixture(scope="session", autouse=True)
async def _create_schema() -> None:
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _test_engine.dispose()


@pytest.fixture(autouse=True)
async def _truncate_tables() -> None:
    """Limpa todas as linhas após cada teste para garantir isolamento."""
    yield
    async with _test_engine.begin() as conn:
        tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


# ─── Dependency override ──────────────────────────────────────────────────────


async def _override_get_db() -> AsyncSession:  # type: ignore[override]
    async with _TestSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


# ─── Fixtures ─────────────────────────────────────────────────────────────────


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
