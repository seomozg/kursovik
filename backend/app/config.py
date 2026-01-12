# WebSocket streaming delay
STREAMING_DELAY_SECONDS = 0.005  # Delay between chunks in LLM service (5ms)

# AI generation parameters
AI_MAX_TOKENS = 8000  # Maximum tokens for article generation (optimized for DeepSeek API)
AI_TEMPERATURE = 0.7  # Default temperature for balanced creativity and consistency

# AI Prompts
OUTLINE_PROMPT_TEMPLATE = """Я хочу изучить {topic}. Составь учебный план от начального уровня до профессионального.

ВАЖНО: Выведи ТОЛЬКО заголовки в формате:
**Учебный план: Название**
**Уровень 1: Название уровня**
**Уровень 2: Название уровня**
и т.д.

НЕ добавляй никаких описаний, объяснений или дополнительного текста! Только заголовки в формате **Заголовок**."""

ARTICLE_PROMPT_TEMPLATE = """Я хочу изучить {topic}. Напиши исчерпывающую статью про "{title}".
Используй строгую структуру: заголовки + контент. Не используй подзаголовки, только заголовки 1-го уровня.
"""

# Polling intervals for outline loading
OUTLINE_POLLING_INTERVAL_MS = 200  # Frontend polling interval for outlines (200ms)

# Timeouts
ARTICLE_GENERATION_TIMEOUT_MS = 300000  # 5 minutes
OUTLINE_GENERATION_TIMEOUT_MS = 30000  # 30 seconds
