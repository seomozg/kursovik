from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv
load_dotenv()
from .services.llm_service import LLMService
import redis.asyncio as redis
from .services.lock_service import LockService

# Database
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kursovik.db")

# Configure connection pooling for PostgreSQL
if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,  # Maximum number of connections in the pool
        max_overflow=20,  # Maximum number of connections that can be created beyond pool_size
        pool_timeout=30,  # Timeout for getting a connection from the pool
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False  # Set to True for SQL debugging
    )
else:
    # SQLite configuration (no pooling needed)
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# LLM Service
def get_llm_service() -> LLMService:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not set")
    return LLMService(api_key)


# Redis and Lock Service
redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)


def get_lock_service() -> LockService:
    return LockService(redis_client)