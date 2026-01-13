from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from .dependencies import get_db, get_llm_service
from .services.llm_service import LLMService
from .repositories.topic_repository import TopicRepository
from .repositories.article_repository import ArticleRepository
from .domain.topic import Topic
from .domain.article import Article, ArticleStatus
import json
import urllib.parse
import base64

router = APIRouter()

# Store active WebSocket connections by article ID
active_connections = {}

@router.websocket("/ws/generate-article")
async def websocket_article_stream(
    websocket: WebSocket,
    topic: str = "",
    title: str = "",
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
):
    """WebSocket endpoint for real-time article streaming"""
    # Decode query parameters
    decoded_topic_name = urllib.parse.unquote(topic)
    decoded_step_title = urllib.parse.unquote(title)

    await websocket.accept()

    topic_obj = None
    article = None
    connection_key = None

    try:
        # Find or create topic
        topic_obj = db.query(Topic).filter(Topic.name == decoded_topic_name).first()
        if not topic_obj:
            topic_obj = Topic(name=decoded_topic_name)
            db.add(topic_obj)
            db.commit()
            db.refresh(topic_obj)

        article_repo = ArticleRepository(db)

        # Check special cases
        is_outline = decoded_step_title == "__OUTLINE__"
        is_hint = "__HINT__" in decoded_step_title

        if is_hint:
            # For hints, don't create article in DB
            article = None
        elif is_outline:
            # For outlines, create temporary article that will be parsed later
            article = article_repo.create(topic_obj.id, "__OUTLINE__")
        else:
            # Normal article generation
            existing_article = db.query(Article).filter(
                Article.topic_id == topic_obj.id,
                Article.title == decoded_step_title
            ).first()

            if not existing_article:
                article = article_repo.create(topic_obj.id, decoded_step_title)
            else:
                article = existing_article

        # Store connection (skip for hints)
        if article:
            connection_key = f"{topic_obj.id}:{article.id}"
            active_connections[connection_key] = websocket
        else:
            connection_key = None

        # Send initial status
        await websocket.send_json({
            "status": "generating",
            "content_b64": base64.b64encode("".encode('utf-8')).decode('utf-8'),
            "version": 0
        })

        # Start generation in background
        async def generate_with_websocket():
            try:
                content_parts = []
                chunk_count = 0

                if is_outline:
                    # Generate outline
                    print(f"Starting WebSocket outline generation for: {decoded_topic_name}")
                    async for chunk in llm.generate_outline_stream(decoded_topic_name):
                        if chunk:
                            content_parts.append(chunk)
                            chunk_count += 1
                            content_b64 = base64.b64encode(''.join(content_parts).encode('utf-8')).decode('utf-8')
                            await websocket.send_json({
                                "status": "generating",
                                "content_b64": content_b64,
                                "version": chunk_count
                            })
                else:
                    # Generate article
                    async for chunk in llm.generate_article(decoded_topic_name, decoded_step_title):
                        if chunk:
                            content_parts.append(chunk)
                            chunk_count += 1
                            content_b64 = base64.b64encode(''.join(content_parts).encode('utf-8')).decode('utf-8')
                            await websocket.send_json({
                                "status": "generating",
                                "content_b64": content_b64,
                                "version": chunk_count
                            })

                if not content_parts:
                    await websocket.send_json({"error": "No content"})
                    return

                final_content = ''.join(content_parts)

                if is_outline:
                    # Parse outline and save titles
                    lines = final_content.strip().split("\n")
                    titles = []
                    for line in lines:
                        line = line.strip()
                        if line.startswith("**") and line.endswith("**"):
                            title = line.strip("*")
                            titles.append(title)
                            print(f"Found title: '{title}'")

                    print(f"Parsed {len(titles)} titles for topic: {decoded_topic_name}")

                    # Save outline titles to database
                    for i, title in enumerate(titles):
                        article_repo.create(topic_obj.id, title)
                        print(f"Saved title {i+1}: '{title}'")

                    # Remove temporary outline article
                    try:
                        temp_article = db.query(Article).filter(
                            Article.topic_id == topic_obj.id,
                            Article.title == "__OUTLINE__"
                        ).first()
                        if temp_article:
                            db.delete(temp_article)
                            db.commit()
                            print("Removed temporary outline article")
                    except Exception as e:
                        print(f"Error removing temp article: {e}")

                    await websocket.send_json({
                        "status": "ready",
                        "titles": titles,
                        "version": chunk_count + 1
                    })
                elif not is_hint:
                    # Save normal article (not outline or hint)
                    article_repo.update_content(article.id, final_content)
                    article_repo.update_status(article.id, ArticleStatus.READY)
                    article.version = chunk_count + 1
                    db.commit()

                    content_b64 = base64.b64encode(final_content.encode('utf-8')).decode('utf-8')
                    await websocket.send_json({
                        "status": "ready",
                        "content_b64": content_b64,
                        "version": chunk_count + 1
                    })
                else:
                    # For hints, just send content without saving
                    content_b64 = base64.b64encode(final_content.encode('utf-8')).decode('utf-8')
                    await websocket.send_json({
                        "status": "ready",
                        "content_b64": content_b64,
                        "version": chunk_count + 1
                    })

            except Exception as e:
                await websocket.send_json({"error": str(e)})

        # Run generation
        await generate_with_websocket()

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {type(e).__name__}: {str(e)}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        # Clean up connection
        if topic_obj and article:
            connection_key = f"{topic_obj.id}:{article.id}"
            if connection_key in active_connections:
                del active_connections[connection_key]
        try:
            await websocket.close()
        except:
            pass
            await websocket.close()
