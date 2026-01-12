import pytest
from app.repositories.topic_repository import TopicRepository


def test_get_by_name_not_found(db_session):
    repo = TopicRepository(db_session)
    topic = repo.get_by_name("nonexistent")
    assert topic is None


def test_create_topic(db_session):
    repo = TopicRepository(db_session)
    topic = repo.create("python")
    assert topic.name == "python"
    assert topic.id is not None


def test_get_or_create_new(db_session):
    repo = TopicRepository(db_session)
    topic = repo.get_or_create("python")
    assert topic.name == "python"


def test_get_or_create_existing(db_session):
    repo = TopicRepository(db_session)
    topic1 = repo.create("python")
    topic2 = repo.get_or_create("python")
    assert topic1.id == topic2.id