from sqlalchemy.orm import Session
from ..domain.article import Article, ArticleStatus


class ArticleRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_topic_and_title(self, topic_id: int, title: str) -> Article | None:
        return (
            self.session.query(Article)
            .filter(Article.topic_id == topic_id, Article.title == title)
            .first()
        )

    def create(self, topic_id: int, title: str) -> Article:
        article = Article(topic_id=topic_id, title=title)
        self.session.add(article)
        self.session.commit()
        self.session.refresh(article)
        return article

    def update_status(self, article_id: int, status: ArticleStatus) -> None:
        self.session.query(Article).filter(Article.id == article_id).update(
            {"status": status}
        )
        self.session.commit()

    def update_content(self, article_id: int, content: str) -> None:
        self.session.query(Article).filter(Article.id == article_id).update(
            {"content": content}
        )
        self.session.commit()

    def get_all_by_topic(self, topic_id: int) -> list[Article]:
        return (
            self.session.query(Article).filter(Article.topic_id == topic_id).all()
        )