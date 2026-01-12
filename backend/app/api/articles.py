from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
from ..dependencies import get_db, get_llm_service, get_lock_service
from ..services.llm_service import LLMService
from ..services.lock_service import LockService
from ..services.streaming_parser import StreamingParser
from ..repositories.article_repository import ArticleRepository
from ..repositories.topic_repository import TopicRepository
from ..domain.article import ArticleStatus

router = APIRouter()


@router.get("/{topic_id}")
async def get_articles(topic_id: int, db: Session = Depends(get_db)):
    article_repo = ArticleRepository(db)
    articles = article_repo.get_all_by_topic(topic_id)
    return [
        {
            "id": a.id,
            "title": a.title,
            "status": a.status,
            "content": a.content if a.status == ArticleStatus.READY else None,
        }
        for a in articles
    ]


@router.post("/{topic_id}/{title}")
async def generate_article(
    topic_id: int,
    title: str,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
    lock_service: LockService = Depends(get_lock_service),
):
    article_repo = ArticleRepository(db)
    topic_repo = TopicRepository(db)

    topic = topic_repo.get_by_name("")  # TODO: Get topic by id, but for now assume
    # For simplicity, assume topic exists or create dummy
    topic = type('Topic', (), {'name': 'python'})()  # Mock topic

    article = article_repo.get_by_topic_and_title(topic_id, title)
    if article:
        if article.status == ArticleStatus.READY:
            return {"id": article.id, "content": article.content}
        elif article.status == ArticleStatus.GENERATING:
            # Connect to existing stream (simplified)
            return {"status": "generating"}
        elif article.status == ArticleStatus.FAILED:
            # Allow retry
            pass
    else:
        article = article_repo.create(topic_id, title)

    lock_key = f"article:{article.id}"
    if not await lock_service.acquire_lock(lock_key):
        return {"status": "generating"}

    try:
        article_repo.update_status(article.id, ArticleStatus.GENERATING)
        content = ""
        async for chunk in StreamingParser.parse_stream(llm.generate_article(topic.name, title)):
            content += chunk
        article_repo.update_content(article.id, content)
        article_repo.update_status(article.id, ArticleStatus.READY)
        await lock_service.release_lock(lock_key)
        return {"id": article.id, "content": content}
    except Exception as e:
        article_repo.update_status(article.id, ArticleStatus.FAILED)
        await lock_service.release_lock(lock_key)
        raise HTTPException(status_code=500, detail=str(e))