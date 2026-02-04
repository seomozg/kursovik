from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..dependencies import get_db, get_llm_service
from ..services.llm_service import LLMService
from ..repositories.topic_repository import TopicRepository
from ..repositories.article_repository import ArticleRepository
from ..domain.topic import Topic
from ..domain.article import Article
from ..config import ARTICLE_GENERATION_TIMEOUT_MS, OUTLINE_GENERATION_TIMEOUT_MS
import json
import re

router = APIRouter()


@router.get("/")
async def get_topics(db: Session = Depends(get_db)):
    """Get all available topics that have outlines"""
    # For now, return all topics. In future, filter only those with outlines
    topics = db.query(Topic).all()
    return [{"id": t.id, "name": t.name, "created_at": t.created_at} for t in topics]


# Remove test endpoint that conflicts with topic routes


@router.get("/{topic_name}")
async def get_topic_outline(topic_name: str, db: Session = Depends(get_db)):
    """Get outline for a specific topic"""
    import urllib.parse
    decoded_topic_name = urllib.parse.unquote(topic_name)
    from ..domain.article import Article
    topic = db.query(Topic).filter(Topic.name == decoded_topic_name).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Get all articles for this topic (they represent the outline steps)
    articles = db.query(Article).filter(Article.topic_id == topic.id).order_by(Article.id).all()

    if not articles:
        raise HTTPException(status_code=404, detail="Outline not found for this topic")

    # First article should be the outline title, others are steps
    titles = [articles[0].title]  # Title
    titles.extend([article.title for article in articles[1:]])  # Steps

    return {"topic_id": topic.id, "titles": titles}


@router.get("/{topic_name}/articles-status")
async def get_topic_articles_status(topic_name: str, db: Session = Depends(get_db)):
    """Get article statuses and subheaders for a topic in a single request"""
    import urllib.parse
    decoded_topic_name = urllib.parse.unquote(topic_name)

    topic = db.query(Topic).filter(Topic.name == decoded_topic_name).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    articles = db.query(Article).filter(Article.topic_id == topic.id).order_by(Article.id).all()
    items = []

    for article in articles:
        subheaders = []
        if article.content:
            for line in article.content.split("\n"):
                header_match = re.match(r"^#{2,}\s+(.+)$", line)
                if header_match:
                    subheaders.append(header_match.group(1).strip())

        items.append({
            "id": article.id,
            "title": article.title,
            "status": article.status,
            "has_content": bool(article.content),
            "subheaders": subheaders,
        })

    return {"topic_id": topic.id, "items": items}


@router.delete("/{topic_name}/content")
async def delete_topic_content(topic_name: str, db: Session = Depends(get_db)):
    """Delete all articles for a topic (service endpoint)."""
    import urllib.parse
    decoded_topic_name = urllib.parse.unquote(topic_name)

    topic = db.query(Topic).filter(Topic.name == decoded_topic_name).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    deleted_count = db.query(Article).filter(Article.topic_id == topic.id).delete()
    db.delete(topic)
    db.commit()

    return {"topic_id": topic.id, "deleted_count": deleted_count}


@router.get("/{topic_name}/{step_title}")
async def get_topic_step_article(topic_name: str, step_title: str, db: Session = Depends(get_db)):
    """Get article for a specific step in a topic"""
    import urllib.parse
    # Double decode to handle complex titles with special characters
    decoded_topic_name = urllib.parse.unquote(urllib.parse.unquote(topic_name))
    decoded_step_title = urllib.parse.unquote(urllib.parse.unquote(step_title))

    from ..domain.article import Article
    topic = db.query(Topic).filter(Topic.name == decoded_topic_name).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Find article by topic and title
    article = db.query(Article).filter(
        Article.topic_id == topic.id,
        Article.title == decoded_step_title
    ).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return {
        "id": article.id,
        "topic_id": article.topic_id,
        "title": article.title,
        "content": article.content,
        "status": article.status,
        "created_at": article.created_at,
        "version": getattr(article, 'version', 0) or (len(article.content) if article.content else 0)  # Use article.version or fallback to content length
    }


@router.post("/{topic_name}/outline")
async def generate_outline(
    topic_name: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
):
    import urllib.parse
    # Decode URL-encoded topic name
    decoded_topic_name = urllib.parse.unquote(topic_name)
    print(f"DEBUG: Original topic_name: '{topic_name}', decoded: '{decoded_topic_name}'")

    from ..repositories.article_repository import ArticleRepository
    from ..domain.article import ArticleStatus

    topic_repo = TopicRepository(db)
    article_repo = ArticleRepository(db)
    topic = topic_repo.get_or_create(decoded_topic_name)
    print(f"DEBUG: Created/found topic: {topic.name} (id: {topic.id})")

    # Check if outline already exists
    existing_articles = article_repo.get_all_by_topic(topic.id)
    if existing_articles:
        # Return existing outline
        titles = [existing_articles[0].title]  # Title
        titles.extend([article.title for article in existing_articles[1:]])  # Steps
        return {"topic_id": topic.id, "titles": titles}

    try:
        # Start outline generation in background
        async def generate_outline_in_background():
            try:
                print(f"Starting outline generation for topic: {decoded_topic_name}")
                outline_text = await llm.generate_outline(decoded_topic_name)
                print(f"Outline generated, length: {len(outline_text)} characters")
                print(f"Outline content preview: '{outline_text[:200]}...'")

                # Парсинг outline в список заголовков (оставляем как есть от DeepSeek)
                lines = outline_text.strip().split("\n")
                titles = []
                for line in lines:
                    line = line.strip()
                    # Ищем заголовки в формате **Заголовок** и оставляем полный текст
                    if line.startswith("**") and line.endswith("**"):
                        title = line.strip("*")
                        titles.append(title)
                        print(f"Found title: '{title}'")

                print(f"Parsed {len(titles)} titles for topic: {decoded_topic_name}")

                # Save outline to database
                for i, title in enumerate(titles):
                    status = ArticleStatus.READY if i > 0 else ArticleStatus.READY  # All titles are ready
                    article_repo.create(topic.id, title)
                    print(f"Saved title {i+1}: '{title}'")

                print(f"Outline generation completed for topic: {decoded_topic_name}, saved {len(titles)} titles")
            except Exception as e:
                print(f"Error in outline background generation: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()

        # Add background task
        background_tasks.add_task(generate_outline_in_background)

        # Return immediately - outline will be available via GET request
        return {"topic_id": topic.id, "status": "generating", "titles": []}
    except ValueError as e:
        if "DEEPSEEK_API_KEY" in str(e):
            raise HTTPException(status_code=500, detail="DeepSeek API key not configured. Please set DEEPSEEK_API_KEY in environment variables.")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating outline: {str(e)}")


@router.post("/{topic_name}/{step_title}")
async def generate_topic_step_article(
    topic_name: str,
    step_title: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
):
    """Generate article for a specific step in a topic"""
    import urllib.parse
    # Double decode to handle complex titles with special characters
    decoded_topic_name = urllib.parse.unquote(urllib.parse.unquote(topic_name))
    decoded_step_title = urllib.parse.unquote(urllib.parse.unquote(step_title))
    from ..domain.article import Article, ArticleStatus
    from ..repositories.article_repository import ArticleRepository
    import asyncio

    topic = db.query(Topic).filter(Topic.name == decoded_topic_name).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    article_repo = ArticleRepository(db)

    # Check if article already exists and has content
    existing_article = db.query(Article).filter(
        Article.topic_id == topic.id,
        Article.title == decoded_step_title
    ).first()

    if existing_article and existing_article.status == ArticleStatus.READY and existing_article.content:
        return {
            "id": existing_article.id,
            "topic_id": existing_article.topic_id,
            "title": existing_article.title,
            "content": existing_article.content,
            "status": existing_article.status,
            "created_at": existing_article.created_at
        }

    try:
        # Create article if it doesn't exist
        if not existing_article:
            article = article_repo.create(topic.id, decoded_step_title)
        else:
            article = existing_article

        # Start generation in background
        async def generate_in_background():
            try:
                print(f"Starting article generation for: {step_title}")
                # Generate article content with real streaming
                content_parts = []
                chunk_count = 0
                chunk = None
                async for chunk in llm.generate_article(decoded_topic_name, step_title):
                    if chunk:  # Only add non-empty chunks
                        content_parts.append(chunk)
                        chunk_count += 1
                        print(f"Received chunk {chunk_count}: '{chunk[:50]}...' (len: {len(chunk)})")

                        # Minimal intermediate saves for streaming (every 200 chunks to minimize DB load)
                        if chunk_count % 200 == 0:
                            partial_content = ''.join(content_parts)
                            article_repo.update_content(article.id, partial_content)
                            article.version = chunk_count
                            db.commit()
                            print(f"Streaming update: {len(partial_content)} characters, version: {chunk_count}")

                # Check if we got any content at all
                if not content_parts:
                    print("ERROR: No content parts received!")
                    article_repo.update_status(article.id, "error")
                    return

                # Final update with complete content (only final save to DB)
                content = ''.join(content_parts)
                print(f"Final content assembled, total length: {len(content)}")
                print(f"Content preview: '{content[-200:]}...'")  # Show end of content
                print(f"Last chunk was: '{chunk}'")

                article_repo.update_content(article.id, content)
                article_repo.update_status(article.id, ArticleStatus.READY)
                # Final version update
                article.version = chunk_count + 1  # Ensure final version is higher
                db.commit()
                print(f"Article generation completed, final length: {len(content)} characters, total chunks: {chunk_count}, final version: {chunk_count + 1}")
            except Exception as e:
                print(f"Error in background generation: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
                article_repo.update_status(article.id, "error")

        # Add background task - this will run after response is sent
        background_tasks.add_task(generate_in_background)

        # Return immediately with current state
        return {
            "id": article.id,
            "topic_id": article.topic_id,
            "title": article.title,
            "content": article.content or "",
            "status": article.status,
            "created_at": article.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating article: {str(e)}")
