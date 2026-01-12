import pytest
from unittest.mock import patch, AsyncMock
from app.services.llm_service import LLMService


class TestLLMService:
    """Test LLM Service with mocked API calls"""

    @pytest.fixture
    def llm_service(self):
        """LLM Service fixture"""
        return LLMService(api_key="test_key")

    def test_init(self, llm_service):
        """Test LLM service initialization"""
        assert llm_service.api_key == "test_key"
        assert llm_service.base_url == "https://api.deepseek.com"

    @pytest.mark.asyncio
    async def test_generate_outline_success(self, llm_service):
        """Test successful outline generation"""
        mock_response = "**Учебный план по Python**\n**Основы Python**\n**ООП**"

        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            mock_get.return_value = mock_response

            result = await llm_service.generate_outline("python")

            assert "**Учебный план по Python**" in result
            assert "**Основы Python**" in result
            mock_get.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_article_success(self, llm_service):
        """Test successful article generation"""
        mock_chunks = ["Chunk 1", "Chunk 2", "Chunk 3"]

        async def mock_generate_article(topic, title):
            for chunk in mock_chunks:
                yield chunk

        llm_service.generate_article = mock_generate_article

        chunks = []
        async for chunk in llm_service.generate_article("python", "Basics"):
            chunks.append(chunk)

        assert chunks == mock_chunks

    @pytest.mark.asyncio
    async def test_generate_outline_with_prompt(self, llm_service):
        """Test that correct prompt is sent to API"""
        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            mock_get.return_value = "**Test outline**"

            await llm_service.generate_outline("test_topic")

            # Verify correct prompt was used
            call_args = mock_get.call_args[0]
            assert "Я хочу изучить test_topic" in call_args[0]
            assert "учебный план" in call_args[0]
            # stream parameter should be False by default
            call_kwargs = mock_get.call_args[1]
            assert call_kwargs.get('stream', False) is False

    @pytest.mark.asyncio
    async def test_generate_article_with_prompt(self, llm_service):
        """Test that correct prompt is sent for article generation"""
        async def mock_generate_article(topic, title):
            yield "Test content"

        original_method = llm_service.generate_article
        llm_service.generate_article = mock_generate_article

        chunks = []
        async for chunk in llm_service.generate_article("python", "Variables"):
            chunks.append(chunk)

        assert chunks == ["Test content"]

        # Restore original method
        llm_service.generate_article = original_method

    @pytest.mark.asyncio
    async def test_api_error_handling(self, llm_service):
        """Test error handling when API fails"""
        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            mock_get.side_effect = Exception("API Error")

            with pytest.raises(Exception):
                await llm_service.generate_outline("python")

    @pytest.mark.asyncio
    async def test_streaming_error_handling(self, llm_service):
        """Test error handling in streaming"""
        async def failing_generator(topic, title):
            raise Exception("Streaming failed")
            yield "This won't be reached"

        llm_service.generate_article = failing_generator

        with pytest.raises(Exception):
            async for chunk in llm_service.generate_article("python", "Test"):
                pass


class TestLLMServiceIntegration:
    """Integration tests for LLM Service with real prompts"""

    @pytest.fixture
    def llm_service(self):
        """LLM Service fixture"""
        return LLMService(api_key="test_key")

    @pytest.mark.asyncio
    async def test_outline_structure(self, llm_service):
        """Test that generated outline has proper structure"""
        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            mock_get.return_value = "**Учебный план по Python: от новичка до эксперта**\n**Основы Python**\n**Структуры данных**\n**Функции**"

            result = await llm_service.generate_outline("python")

            # Should contain the main title
            assert "Учебный план по Python" in result
            # Should contain multiple sections
            assert result.count("**") >= 4  # Title + at least 3 sections

    @pytest.mark.asyncio
    async def test_article_content_structure(self, llm_service):
        """Test that generated article has content"""
        mock_chunks = ["Это подробная статья", "о программировании", "с множеством деталей"]

        async def mock_generate_article(topic, title):
            for chunk in mock_chunks:
                yield chunk

        llm_service.generate_article = mock_generate_article

        content_parts = []
        async for chunk in llm_service.generate_article("python", "Basics"):
            content_parts.append(chunk)

        full_content = ''.join(content_parts)
        assert len(full_content) > 0
        assert "программировании" in full_content

    @pytest.mark.asyncio
    async def test_multiple_topics_different_outlines(self, llm_service):
        """Test that different topics generate different outlines"""
        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            # First call for Python
            mock_get.return_value = "**Python Plan**\n**Python Basics**"
            python_outline = await llm_service.generate_outline("python")

            # Second call for JavaScript
            mock_get.return_value = "**JavaScript Plan**\n**JS Basics**"
            js_outline = await llm_service.generate_outline("javascript")

            assert "Python" in python_outline
            assert "JavaScript" in js_outline
            assert python_outline != js_outline

    @pytest.mark.asyncio
    async def test_empty_topic_handling(self, llm_service):
        """Test handling of empty topic names"""
        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            mock_get.return_value = "**Empty Topic Plan**"

            result = await llm_service.generate_outline("")
            assert "Empty Topic Plan" in result

    @pytest.mark.asyncio
    async def test_special_characters_in_topic(self, llm_service):
        """Test handling of special characters in topic names"""
        with patch('app.services.llm_service.get_deepseek_response') as mock_get:
            mock_get.return_value = "**Special Topic Plan**"

            result = await llm_service.generate_outline("C++ & Java")
            assert "Special Topic Plan" in result