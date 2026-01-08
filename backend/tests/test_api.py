import pytest
from httpx import AsyncClient
from app.main import app
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
@patch("app.services.llm_service.generate_plan")
async def test_generate_plan_endpoint(mock_generate_plan):
    mock_generate_plan.return_value = "Mock plan"

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post("/generate-plan", json={"topic": "python"})
        assert response.status_code == 200
        assert response.json() == {"plan": "Mock plan"}
