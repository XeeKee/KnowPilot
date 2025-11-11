"""
Database configuration and connection management module.

This module provides database connection setup, URL construction, and session
management for the CollabThink application. It supports multiple database
configuration methods with fallback to default development settings.
"""

from __future__ import annotations

from os import getenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base


def get_database_url() -> str:
    """
    Construct the database URL with priority-based configuration.
    
    This function implements a three-tier configuration system:
    1) Full DATABASE_URL environment variable (highest priority)
    2) Individual DB_* environment variables for flexible configuration
    3) Default local development settings for immediate development setup
    
    Returns:
        str: Complete PostgreSQL connection URL
    """
    # 1) Full URL - highest priority for production deployments
    url = getenv("DATABASE_URL")
    if url:
        return url

    # 2) Concatenate individual environment variables for flexible configuration
    host = getenv("DB_HOST")
    port = getenv("DB_PORT")
    name = getenv("DB_NAME")
    user = getenv("DB_USER")
    pwd  = getenv("DB_PASSWORD")
    if all([host, port, name, user, pwd]):
        return f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{name}"

    # 3) Default local development account for immediate development setup
    # These credentials are consistent with project documentation and local setup
    return "postgresql+psycopg2://collabthink_user:collabthink123@localhost:5432/collabthink_db"


# Create database engine with connection pooling and health checks
engine = create_engine(get_database_url(), pool_pre_ping=True)
# Create session factory for database operations
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_database_url",
]



