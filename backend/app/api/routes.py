from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm_service import generate_plan

router = APIRouter()

class PlanRequest(BaseModel):
    topic: str

@router.post("/generate-plan")
async def generate_learning_plan(request: PlanRequest):
    try:
        plan = await generate_plan(request.topic)
        return {"plan": plan}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))