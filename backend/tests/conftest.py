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


@pytest.fixture(scope="session")
def db():
    """Database session fixture for tests - session scope to avoid threading issues"""
    engine = create_engine("sqlite:///:memory:", poolclass=sqlalchemy.pool.StaticPool)
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
