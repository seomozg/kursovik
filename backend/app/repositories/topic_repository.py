from sqlalchemy.orm import Session
from ..domain.topic import Topic


class TopicRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_name(self, name: str) -> Topic | None:
        return self.session.query(Topic).filter(Topic.name == name).first()

    def create(self, name: str) -> Topic:
        topic = Topic(name=name)
        self.session.add(topic)
        self.session.commit()
        self.session.refresh(topic)
        return topic

    def get_or_create(self, name: str) -> Topic:
        topic = self.get_by_name(name)
        if topic is None:
            topic = self.create(name)
        return topic