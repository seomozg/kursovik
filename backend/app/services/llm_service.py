import asyncio
from typing import AsyncGenerator
from .deepseek_utils import get_deepseek_response
from ..config import STREAMING_DELAY_SECONDS, AI_MAX_TOKENS, AI_TEMPERATURE, OUTLINE_PROMPT_TEMPLATE, ARTICLE_PROMPT_TEMPLATE


class LLMService:
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com"):
        self.api_key = api_key
        self.base_url = base_url

    async def generate_outline(self, topic: str) -> str:
        # Clean topic to prevent API issues
        topic_clean = topic.replace('"', '\\"').replace("'", "\\'").replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        prompt = OUTLINE_PROMPT_TEMPLATE.format(topic=topic_clean)
        return await self._generate(prompt)

    async def generate_article(self, topic: str, title: str) -> AsyncGenerator[str, None]:
        # Clean topic and title to prevent API issues
        topic_clean = topic.replace('"', '\\"').replace("'", "\\'").replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        title_clean = title.replace('"', '\\"').replace("'", "\\'").replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')

        # Handle hints (titles containing __HINT__)
        if '__HINT__' in title:
            # Extract the actual hint query from the title
            hint_query = title.replace('__HINT__', '').replace('__', '').strip()
            # Limit length and clean up special characters that might break API
            hint_query = hint_query[:500]  # Limit to 500 chars
            # Remove or escape problematic characters
            hint_query = hint_query.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
            # Escape quotes to prevent JSON issues
            hint_query = hint_query.replace('"', '\\"').replace("'", "\\'")
            prompt = f"Объясни кратко и понятно в контексте темы {topic_clean}: {hint_query}"
            async for chunk in self._generate_stream(prompt, is_hint=True):
                yield chunk
        else:
            prompt = ARTICLE_PROMPT_TEMPLATE.format(topic=topic_clean, title=title_clean)
            async for chunk in self._generate_stream(prompt):
                yield chunk

    async def generate_outline_stream(self, topic: str) -> AsyncGenerator[str, None]:
        # Clean topic to prevent API issues
        topic_clean = topic.replace('"', '\\"').replace("'", "\\'").replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        prompt = OUTLINE_PROMPT_TEMPLATE.format(topic=topic_clean)
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

    async def _generate_stream(self, prompt: str, is_hint: bool = False) -> AsyncGenerator[str, None]:
        # Use real DeepSeek streaming API via deepseek_utils
        import asyncio

        # Use smaller max_tokens for hints
        max_tokens = 1000 if is_hint else AI_MAX_TOKENS

        # Get streaming response with updated parameters using thread pool
        try:
            stream_response = await asyncio.to_thread(
                get_deepseek_response,
                prompt,
                self.api_key,
                max_tokens=max_tokens,
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
