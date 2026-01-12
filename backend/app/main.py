from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import topics, articles
from .websocket import router as websocket_router

app = FastAPI(title="Kursovik API", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev server
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
