from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="Kursovik Backend", description="AI-powered learning service")

app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Kursovik API"}