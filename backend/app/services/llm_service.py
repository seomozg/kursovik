import asyncio
from typing import AsyncGenerator
from .deepseek_utils import get_deepseek_response
from ..config import STREAMING_DELAY_SECONDS, AI_MAX_TOKENS, AI_TEMPERATURE, OUTLINE_PROMPT_TEMPLATE, ARTICLE_PROMPT_TEMPLATE, HINT_PROMPT_TEMPLATE


class LLMService:
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com"):
        self.api_key = api_key
        self.base_url = base_url

    def _escape_for_json(self, text: str) -> str:
        """Escape quotes to prevent JSON issues in API requests"""
        return text.replace('"', '\\"').replace("'", "\\'")

    async def generate_outline(self, topic: str) -> str:
        # Escape quotes to prevent JSON issues
        topic_clean = self._escape_for_json(topic)
        prompt = OUTLINE_PROMPT_TEMPLATE.format(topic=topic_clean)
        return await self._generate(prompt)

    async def generate_article(self, topic: str, title: str) -> AsyncGenerator[str, None]:
        # Handle special cases
        if '__HINT__' in title:
            # Extract the actual hint query from the title
            hint_query = title.replace('__HINT__', '').replace('__', '')
            topic_escaped = self._escape_for_json(topic)
            hint_query_escaped = self._escape_for_json(hint_query)
            prompt = HINT_PROMPT_TEMPLATE.format(topic=topic_escaped, hint_query=hint_query_escaped)
        elif '__OUTLINE__' in title:
            topic_escaped = self._escape_for_json(topic)
            prompt = OUTLINE_PROMPT_TEMPLATE.format(topic=topic_escaped)
        else:
            topic_escaped = self._escape_for_json(topic)
            title_escaped = self._escape_for_json(title)
            prompt = ARTICLE_PROMPT_TEMPLATE.format(topic=topic_escaped, title=title_escaped)

        async for chunk in self._generate_stream(prompt):
            yield chunk

    async def generate_outline_stream(self, topic: str) -> AsyncGenerator[str, None]:
        prompt = OUTLINE_PROMPT_TEMPLATE.format(topic=topic)
        async for chunk in self._generate_stream(prompt):
            yield chunk

    async def _generate(self, prompt: str) -> str:
        print(f"DEBUG: Calling DeepSeek API with prompt: {prompt[:50]}...")

        # Use real DeepSeek API via thread pool
        try:
            result = await asyncio.to_thread(
                get_deepseek_response,
                prompt,
                self.api_key,
                max_tokens=AI_MAX_TOKENS,
                temperature=AI_TEMPERATURE,
                stream=False
            )
            print(f"DEBUG: API response: {result[:100]}...")
            return result
        except Exception as e:
            print(f"DEBUG: API call failed: {type(e).__name__}: {e}")
            raise

    async def _generate_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        # Use real DeepSeek streaming API via deepseek_utils
        import asyncio

        # Get streaming response with updated parameters using thread pool
        try:
            stream_response = await asyncio.to_thread(
                get_deepseek_response,
                prompt,
                self.api_key,
                max_tokens=AI_MAX_TOKENS,
                temperature=AI_TEMPERATURE,
                stream=True
            )

            for chunk in stream_response:
                yield chunk
                # Add configurable delay for streaming experience
                await asyncio.sleep(STREAMING_DELAY_SECONDS)
        except Exception as e:
            print(f"DEBUG: Streaming failed: {type(e).__name__}: {e}")
            yield f"Ошибка стриминга: {str(e)}"
