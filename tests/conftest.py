"""Fixtures compartilhadas.

Testes de integracao/API/seguranca precisam de um PostgreSQL acessivel
(ver docker-compose.yml: `docker compose up -d db`). O banco de teste e
criado automaticamente (se nao existir) e as tabelas sao criadas a partir
dos models (Base.metadata), nao via Alembic, para isolar teste de migration
de teste de comportamento — a migration em si e validada manualmente/CI
(seção 15: "Testar migrations" e responsabilidade separada).
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production-use")
os.environ.setdefault("COOKIE_SECURE", "false")

from app.core import rate_limit as rate_limit_module  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.core.rate_limit import RateLimiter  # noqa: E402
from app.main import app  # noqa: E402

DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg://postgres:postgres@localhost:5432/marketing_platform_test"
)
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


def _ensure_database_exists(url: str) -> None:
    target = make_url(url)
    admin_engine = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": target.database}
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine():
    _ensure_database_exists(TEST_DATABASE_URL)
    eng = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Zera todos os `RateLimiter` de app/core/rate_limit.py antes de CADA
    teste — os limiters sao singletons de modulo (deliberado, ver o
    proprio arquivo), e os por IP isolado usam so o IP como chave. O
    `TestClient` do Starlette sempre reporta o host fixo "testclient", entao
    sem este reset a primeira duzia de testes que chamam /register (ou
    qualquer outro endpoint com limiter por IP) esgotaria a janela pra
    TODOS os testes seguintes da sessao inteira, nao so pra um teste."""
    for limiter in vars(rate_limit_module).values():
        if isinstance(limiter, RateLimiter):
            limiter.clear_all()
    yield


@pytest.fixture()
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection)
    session = session_factory()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client_factory(db_session):
    """Cria clientes de teste independentes (cookies isolados), simulando
    navegadores/usuarios diferentes contra o mesmo banco/transacao de teste.
    """

    def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override

    clients: list[TestClient] = []

    def _make() -> TestClient:
        c = TestClient(app)
        clients.append(c)
        return c

    yield _make

    app.dependency_overrides.clear()
    for c in clients:
        c.close()


@pytest.fixture()
def client(client_factory):
    return client_factory()
