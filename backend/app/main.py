from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import topics, articles
from .websocket import router as websocket_router

app = FastAPI(title="Kursovik API", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8081",
        "http://localhost:8083",
        "http://127.0.0.1:3000",  # Add localhost variations
        "http://127.0.0.1:3001",
        "http://0.0.0.0:3000",
        "http://0.0.0.0:3001",
        "*",  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
app.include_router(articles.router, prefix="/api/articles", tags=["articles"])
app.include_router(websocket_router, tags=["websocket"])


@app.get("/")
async def root():
    return {"message": "Welcome to Kursovik API"}

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "kursovik-backend",
        "version": "1.0.0"
    }

@app.get("/metrics")
async def metrics():
    """Basic metrics endpoint"""
    from sqlalchemy.orm import Session
    from .dependencies import SessionLocal
    from .domain.topic import Topic
    from .domain.article import Article

    # Get database session directly
    db = SessionLocal()
    try:
        topics_count = db.query(Topic).count()
        articles_count = db.query(Article).count()
        return {
            "topics_total": topics_count,
            "articles_total": articles_count,
            "database_status": "connected"
        }
    finally:
        db.close()
