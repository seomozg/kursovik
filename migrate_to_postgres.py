#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL
Run this script after setting up PostgreSQL database.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URLs
SQLITE_URL = "sqlite:///./backend/kursovik.db"
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://postgres:changeme123@localhost:5432/kursovik")

def check_postgres_connection():
    """Check if PostgreSQL is available and accessible"""
    try:
        engine = create_engine(POSTGRES_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ PostgreSQL connection successful!")
        return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        print("\n🔧 To set up PostgreSQL:")
        print("1. Install PostgreSQL locally or use Docker")
        print("2. Create database 'kursovik' with user 'postgres'")
        print("3. Set password to 'changeme123'")
        print("4. Or modify DATABASE_URL in .env to match your setup")
        return False

def migrate_data():
    print("Starting database migration from SQLite to PostgreSQL...")

    # Create engines
    sqlite_engine = create_engine(SQLITE_URL)
    postgres_engine = create_engine(POSTGRES_URL)

    # Create sessions
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)

    sqlite_session = SQLiteSession()
    postgres_session = PostgresSession()

    try:
        # Check if PostgreSQL tables exist
        result = postgres_session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        existing_tables = [row[0] for row in result.fetchall()]

        if 'topics' not in existing_tables or 'articles' not in existing_tables:
            print("ERROR: PostgreSQL tables don't exist. Please run 'alembic upgrade head' first.")
            return False

        # Check if data already exists in PostgreSQL
        topics_count = postgres_session.execute(text("SELECT COUNT(*) FROM topics")).scalar() or 0
        if topics_count > 0:
            print(f"PostgreSQL already contains {topics_count} topics. Skipping migration.")
            return True

        print("Migrating topics...")
        # Migrate topics
        sqlite_topics = sqlite_session.execute(text("SELECT id, name, created_at, updated_at FROM topics")).fetchall()
        for topic in sqlite_topics:
            postgres_session.execute(
                text("INSERT INTO topics (id, name, created_at, updated_at) VALUES (:id, :name, :created_at, :updated_at)"),
                {"id": topic[0], "name": topic[1], "created_at": topic[2], "updated_at": topic[3]}
            )

        print("Migrating articles...")
        # Migrate articles
        sqlite_articles = sqlite_session.execute(text("SELECT id, topic_id, title, content, status, created_at, updated_at FROM articles")).fetchall()
        for article in sqlite_articles:
            postgres_session.execute(
                text("INSERT INTO articles (id, topic_id, title, content, status, created_at, updated_at) VALUES (:id, :topic_id, :title, :content, :status, :created_at, :updated_at)"),
                {
                    "id": article[0],
                    "topic_id": article[1],
                    "title": article[2],
                    "content": article[3],
                    "status": article[4],
                    "created_at": article[5],
                    "updated_at": article[6]
                }
            )

        postgres_session.commit()
        print(f"Successfully migrated {len(sqlite_topics)} topics and {len(sqlite_articles)} articles to PostgreSQL!")

        # Verify migration
        final_topics_count = postgres_session.execute(text("SELECT COUNT(*) FROM topics")).scalar()
        final_articles_count = postgres_session.execute(text("SELECT COUNT(*) FROM articles")).scalar()
        print(f"Verification: PostgreSQL now contains {final_topics_count} topics and {final_articles_count} articles.")

        return True

    except Exception as e:
        print(f"Error during migration: {e}")
        postgres_session.rollback()
        return False

    finally:
        sqlite_session.close()
        postgres_session.close()

if __name__ == "__main__":
    print("🔄 PostgreSQL Migration Tool")
    print("=" * 40)

    # First check connection
    if not check_postgres_connection():
        print("\n❌ Cannot proceed with migration. Please set up PostgreSQL first.")
        sys.exit(1)

    # Run migration
    success = migrate_data()
    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now use PostgreSQL in production.")
    else:
        print("\n❌ Migration failed. Check the error messages above.")
    sys.exit(0 if success else 1)
