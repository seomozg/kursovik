import pytest
import sqlalchemy.pool
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from app.main import app
from app.dependencies import get_db
from app.domain.topic import Base, Topic
from app.domain.article import Article


@pytest.fixture()
def db():
    """Fresh in-memory database per test - full isolation between tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        poolclass=sqlalchemy.pool.StaticPool,
        # TestClient runs the app in worker threads; allow cross-thread use
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """HTTP client fixture for testing FastAPI endpoints"""
    # Override dependency to use test database
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Create TestClient for synchronous testing
    client = TestClient(app)
    yield client

    # Clear overrides after test
    app.dependency_overrides.clear()
@pytest.fixture()
def db_session(db):
    """Alias for repository tests that expect the db_session fixture name."""
    return db
