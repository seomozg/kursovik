from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os
from dotenv import load_dotenv
load_dotenv()
from .services.llm_service import LLMService
import redis.asyncio as redis
from .services.lock_service import LockService

# Database
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kursovik.db")

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