from typing import AsyncGenerator


class StreamingParser:
    @staticmethod
    async def parse_stream(stream: AsyncGenerator[str, None]) -> AsyncGenerator[str, None]:
        """Парсит стриминг и форматирует контент на лету."""
        buffer = ""
        async for chunk in stream:
            buffer += chunk
            # Для простоты, просто yield chunk
            yield chunk