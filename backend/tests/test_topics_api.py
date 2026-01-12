import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, AsyncMock
from app.domain.topic import Topic
from app.domain.article import Article, ArticleStatus
from app.repositories.topic_repository import TopicRepository
from app.repositories.article_repository import ArticleRepository


class TestTopicsAPI:
    """Test Topics API endpoints with real data"""

    def test_get_topics_empty_database(self, client: TestClient, db: Session):
        """Test GET /api/topics/ with empty database"""
        response = client.get("/api/topics/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_create_and_get_topic_outline(self, client: TestClient, db: Session):
        """Test creating outline and retrieving it with mocked LLM"""
        topic_name = "python"

        # Mock LLM response
        mock_outline = "**Учебный план по Python**\n**Основы Python**\n**ООП**"

        with patch('app.services.llm_service.get_deepseek_response') as mock_llm:
            mock_llm.return_value = mock_outline

            # Create outline
            response = client.post(f"/api/topics/{topic_name}/outline")
            assert response.status_code == 200
            outline_data = response.json()
            assert "topic_id" in outline_data
            assert "status" in outline_data
            assert outline_data["status"] == "generating"  # Now returns generating status

            # Wait a bit for background task to complete (in real app this would be async)
            import time
            time.sleep(0.1)

            # Get outline again (should return existing)
            response = client.get(f"/api/topics/{topic_name}")
            assert response.status_code == 200
            retrieved_data = response.json()
            assert "topic_id" in retrieved_data
            assert "titles" in retrieved_data
            assert isinstance(retrieved_data["titles"], list)

            # Verify topic created in database
            topic = db.query(Topic).filter(Topic.name == topic_name).first()
            assert topic is not None
            assert topic.name == topic_name

            # Verify articles created
            articles = db.query(Article).filter(Article.topic_id == topic.id).all()
            assert len(articles) > 0

    def test_get_nonexistent_topic_outline(self, client: TestClient):
        """Test GET outline for non-existent topic"""
        response = client.get("/api/topics/nonexistent")
        assert response.status_code == 404
        assert "Topic not found" in response.json()["detail"]

    def test_generate_article_websocket_flow(self, client: TestClient, db: Session):
        """Test article generation flow (WebSocket endpoint tested separately)"""
        # Create topic and article first
        topic_repo = TopicRepository(db)
        article_repo = ArticleRepository(db)

        topic = topic_repo.get_or_create("test_topic")
        article = article_repo.create(topic.id, "Test Article")

        # Mock streaming generation
        mock_chunks = ["First chunk", " second chunk", " third chunk"]

        with patch('app.services.llm_service.LLMService.generate_article', new_callable=AsyncMock) as mock_stream:
            async def async_generator():
                for chunk in mock_chunks:
                    yield chunk

            mock_stream.return_value = async_generator()

            # In real app, WebSocket would handle this
            # Here we just test that the endpoint exists and basic setup works
            response = client.get(f"/api/topics/{topic.name}/{article.title}")
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert "content" in data

    def test_config_values(self):
        """Test that configuration values are properly loaded"""
        from app.config import (
            STREAMING_DELAY_SECONDS,
            OUTLINE_POLLING_INTERVAL_MS,
            ARTICLE_GENERATION_TIMEOUT_MS,
            OUTLINE_GENERATION_TIMEOUT_MS
        )

        # Test that config values are reasonable
        assert STREAMING_DELAY_SECONDS > 0
        assert OUTLINE_POLLING_INTERVAL_MS > 0
        assert ARTICLE_GENERATION_TIMEOUT_MS > 0
        assert OUTLINE_GENERATION_TIMEOUT_MS > 0

    def test_article_status_transitions(self, client: TestClient, db: Session):
        """Test article status transitions"""
        # Create topic and article
        topic_repo = TopicRepository(db)
        article_repo = ArticleRepository(db)

        topic = topic_repo.get_or_create("status_test")
        article = article_repo.create(topic.id, "Status Test Article")

        # Initially should be ready (for outline articles)
        assert article.status == ArticleStatus.READY

        # Test status update
        article_repo.update_status(article.id, ArticleStatus.READY)
        db.refresh(article)
        assert article.status == ArticleStatus.READY
