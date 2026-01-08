import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.llm_service import generate_plan


@pytest.mark.asyncio
async def test_generate_study_plan():
    mock_response = {
        "choices": [{"message": {"content": "Учебный план по теме python\n\nНачальный уровень\n- Основы"}}]
    }
    with patch.dict("os.environ", {"DEEPSEEK_API_KEY": "test_key"}), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_response_obj = MagicMock()
        mock_response_obj.status_code = 200
        mock_response_obj.json.return_value = mock_response
        mock_response_obj.raise_for_status.return_value = None
        mock_post.return_value = mock_response_obj
        
        result = await generate_plan("python")
        assert "Начальный уровень" in result
