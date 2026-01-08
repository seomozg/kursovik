import os
import httpx
from typing import Optional


async def generate_plan(topic: str) -> str:
    """
    Генерирует учебный план по заданной теме с помощью DeepSeek API.
    """
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY не установлена")

    prompt = f"Я хочу изучить {topic}. Составь учебный план от начального уровня до профессионального. Раздели на уровни с заголовками."

    url = "https://api.deepseek.com/v1/chat/completions"  # Предполагаемый URL, заменить на реальный
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "deepseek-chat",  # Предполагаемая модель
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1000
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()
