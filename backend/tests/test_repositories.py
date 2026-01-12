import pytest
from sqlalchemy.orm import Session
from app.domain.topic import Topic
from app.domain.article import Article, ArticleStatus
from app.repositories.topic_repository import TopicRepository
from app.repositories.article_repository import ArticleRepository


class TestTopicRepository:
    """Test Topic Repository operations"""

    @pytest.fixture
    def topic_repo(self, db: Session):
        """Topic repository fixture"""
        return TopicRepository(db)

    def test_get_or_create_new_topic(self, topic_repo, db: Session):
        """Test creating a new topic"""
        topic = topic_repo.get_or_create("python")

        assert topic.name == "python"
        assert topic.id is not None

        # Verify in database
        db_topic = db.query(Topic).filter(Topic.name == "python").first()
        assert db_topic is not None
        assert db_topic.name == "python"

    def test_get_or_create_existing_topic(self, topic_repo, db: Session):
        """Test getting existing topic"""
        # Create topic first
        topic1 = topic_repo.get_or_create("javascript")

        # Get same topic again
        topic2 = topic_repo.get_or_create("javascript")

        assert topic1.id == topic2.id
        assert topic1.name == topic2.name

        # Should be only one topic in database
        topics = db.query(Topic).filter(Topic.name == "javascript").all()
        assert len(topics) == 1

    def test_get_or_create_multiple_topics(self, topic_repo, db: Session):
        """Test creating multiple different topics"""
        topics = ["python", "javascript", "java", "csharp"]

        created_topics = []
        for topic_name in topics:
            topic = topic_repo.get_or_create(topic_name)
            created_topics.append(topic)

        # All topics should be unique
        ids = [t.id for t in created_topics]
        assert len(set(ids)) == len(ids)  # All IDs unique

        names = [t.name for t in created_topics]
        assert set(names) == set(topics)

        # Verify in database
        db_topics = db.query(Topic).all()
        assert len(db_topics) == len(topics)


class TestArticleRepository:
    """Test Article Repository operations"""

    @pytest.fixture
    def repos(self, db: Session):
        """Repository fixtures"""
        return {
            'topic': TopicRepository(db),
            'article': ArticleRepository(db)
        }

    def test_create_article(self, repos, db: Session):
        """Test creating a new article"""
        # Create topic first
        topic = repos['topic'].get_or_create("test_topic")

        # Create article
        article = repos['article'].create(topic.id, "Test Article Title")

        assert article.topic_id == topic.id
        assert article.title == "Test Article Title"
        assert article.content is None or article.content == ""
        assert article.status == ArticleStatus.NOT_STARTED

        # Verify in database
        db_article = db.query(Article).filter(Article.id == article.id).first()
        assert db_article is not None
        assert db_article.title == "Test Article Title"

    def test_update_content(self, repos, db: Session):
        """Test updating article content"""
        # Create article
        topic = repos['topic'].get_or_create("content_test")
        article = repos['article'].create(topic.id, "Content Test")

        # Update content
        new_content = "This is the updated content for the article."
        repos['article'].update_content(article.id, new_content)

        # Verify update
        updated_article = db.query(Article).filter(Article.id == article.id).first()
        assert updated_article.content == new_content

    def test_update_status(self, repos, db: Session):
        """Test updating article status"""
        # Create article
        topic = repos['topic'].get_or_create("status_test")
        article = repos['article'].create(topic.id, "Status Test")

        # Update status
        repos['article'].update_status(article.id, ArticleStatus.READY)

        # Verify update
        updated_article = db.query(Article).filter(Article.id == article.id).first()
        assert updated_article.status == ArticleStatus.READY

    def test_get_all_by_topic(self, repos, db: Session):
        """Test getting all articles for a topic"""
        # Create topic and multiple articles
        topic = repos['topic'].get_or_create("multi_article_test")

        article_titles = ["Article 1", "Article 2", "Article 3"]
        created_articles = []

        for title in article_titles:
            article = repos['article'].create(topic.id, title)
            created_articles.append(article)

        # Get all articles for topic
        articles = repos['article'].get_all_by_topic(topic.id)

        assert len(articles) == len(article_titles)
        retrieved_titles = [a.title for a in articles]
        assert set(retrieved_titles) == set(article_titles)

    def test_get_all_by_topic_empty(self, repos, db: Session):
        """Test getting articles for topic with no articles"""
        topic = repos['topic'].get_or_create("empty_topic")

        articles = repos['article'].get_all_by_topic(topic.id)
        assert len(articles) == 0

    def test_multiple_topics_separate_articles(self, repos, db: Session):
        """Test that articles from different topics are separate"""
        # Create two topics
        topic1 = repos['topic'].get_or_create("topic1")
        topic2 = repos['topic'].get_or_create("topic2")

        # Create articles for each topic
        article1 = repos['article'].create(topic1.id, "Topic1 Article")
        article2 = repos['article'].create(topic2.id, "Topic2 Article")

        # Verify articles are in correct topics
        topic1_articles = repos['article'].get_all_by_topic(topic1.id)
        topic2_articles = repos['article'].get_all_by_topic(topic2.id)

        assert len(topic1_articles) == 1
        assert len(topic2_articles) == 1

        assert topic1_articles[0].title == "Topic1 Article"
        assert topic2_articles[0].title == "Topic2 Article"

        assert topic1_articles[0].topic_id == topic1.id
        assert topic2_articles[0].topic_id == topic2.id

    def test_article_lifecycle(self, repos, db: Session):
        """Test complete article lifecycle"""
        # Create
        topic = repos['topic'].get_or_create("lifecycle_test")
        article = repos['article'].create(topic.id, "Lifecycle Article")

        assert article.status == ArticleStatus.NOT_STARTED
        assert article.content == "" or article.content is None

        # Update content progressively
        repos['article'].update_content(article.id, "Partial content...")
        repos['article'].update_status(article.id, ArticleStatus.GENERATING)

        partial_article = db.query(Article).filter(Article.id == article.id).first()
        assert partial_article.content == "Partial content..."
        assert partial_article.status == ArticleStatus.GENERATING

        # Complete article
        final_content = "This is the complete article content with full details."
        repos['article'].update_content(article.id, final_content)
        repos['article'].update_status(article.id, ArticleStatus.READY)

        final_article = db.query(Article).filter(Article.id == article.id).first()
        assert final_article.content == final_content
        assert final_article.status == ArticleStatus.READY


class TestRepositoryIntegration:
    """Integration tests for repositories working together"""

    @pytest.fixture
    def repos(self, db: Session):
        """Repository fixtures"""
        return {
            'topic': TopicRepository(db),
            'article': ArticleRepository(db)
        }

    def test_full_outline_creation_workflow(self, repos, db: Session):
        """Test the complete workflow of creating an outline"""
        topic_name = "outline_workflow_test"

        # Create topic
        topic = repos['topic'].get_or_create(topic_name)
        assert topic.name == topic_name

        # Create articles (simulating outline creation)
        outline_titles = [
            "Учебный план по Тестированию",
            "Основы тестирования",
            "Юнит-тестирование",
            "Интеграционное тестирование"
        ]

        for title in outline_titles:
            article = repos['article'].create(topic.id, title)
            assert article.title == title
            assert article.topic_id == topic.id

        # Verify complete outline structure
        articles = repos['article'].get_all_by_topic(topic.id)
        assert len(articles) == len(outline_titles)

        retrieved_titles = [a.title for a in articles]
        assert set(retrieved_titles) == set(outline_titles)

        # All articles should be in correct order and have proper status
        for article in articles:
            assert article.status == ArticleStatus.NOT_STARTED
            assert article.topic_id == topic.id
