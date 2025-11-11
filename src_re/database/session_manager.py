from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

from tool.config_manager import DatabaseConfig


logger = logging.getLogger(__name__)


class DatabaseSessionManager:
    """Database session manager
    
    Provides database connection pool management and session creation.
    Supports transaction management and connection reuse.
    """

    def __init__(self, db_config: DatabaseConfig):
        self.db_config = db_config
        self._engine = None
        self._session_factory = None
        self._initialize_engine()

    def _initialize_engine(self) -> None:
        """Initialize database engine and connection pool"""
        database_url = self._build_database_url()
        
        self._engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=self.db_config.pool_size,
            max_overflow=self.db_config.max_overflow,
            pool_timeout=self.db_config.pool_timeout,
            pool_recycle=self.db_config.pool_recycle,
            echo=self.db_config.echo,
            pool_pre_ping=True,  # Validate connection liveness
        )
        
        self._session_factory = sessionmaker(
            bind=self._engine,
            autoflush=False,
            autocommit=False,
        )
        
        logger.info(f"Database engine initialized: {self._mask_password(database_url)}")

    def _build_database_url(self) -> str:
        """Build database connection URL"""
        return (
            f"postgresql+psycopg2://"
            f"{self.db_config.username}:{self.db_config.password}@"
            f"{self.db_config.host}:{self.db_config.port}/"
            f"{self.db_config.database}"
        )

    def _mask_password(self, url: str) -> str:
        """Mask password in URL for logging"""
        if ":" in url and "@" in url:
            parts = url.split("@")
            if len(parts) == 2:
                credentials, rest = parts
                if ":" in credentials:
                    user_pass = credentials.split(":")
                    if len(user_pass) >= 3:  # postgresql+psycopg2://user:pass
                        masked = ":".join(user_pass[:-1]) + ":***"
                        return f"{masked}@{rest}"
        return url

    @property
    def engine(self):
        """Get database engine"""
        if self._engine is None:
            raise RuntimeError("Database engine is not initialized")
        return self._engine

    def create_session(self) -> Session:
        """Create a new database session"""
        if self._session_factory is None:
            raise RuntimeError("Session factory is not initialized")
        return self._session_factory()

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Context manager for a database session
        
        Automatically handles transaction commit and rollback.
        
        Usage:
            with db_manager.get_session() as session:
                session.add(...)
        """
        session = self.create_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database transaction rolled back: {e}")
            raise
        finally:
            session.close()

    @contextmanager
    def get_readonly_session(self) -> Generator[Session, None, None]:
        """Context manager for a read-only database session
        
        Dedicated to query operations; no commit is performed.
        """
        session = self.create_session()
        try:
            yield session
        finally:
            session.close()

    def health_check(self) -> bool:
        """Check database connection health"""
        try:
            with self.get_readonly_session() as session:
                session.execute(text("SELECT 1"))
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    def close(self) -> None:
        """Close database connection pool"""
        if self._engine:
            self._engine.dispose()
            logger.info("Database connection pool closed")


# Global database manager instance (lazy initialization)
_db_manager: Optional[DatabaseSessionManager] = None


def get_db_manager() -> DatabaseSessionManager:
    """Get global database manager instance"""
    global _db_manager
    if _db_manager is None:
        raise RuntimeError("Database manager is not initialized, call init_db_manager() first")
    return _db_manager


def init_db_manager(db_config: DatabaseConfig) -> DatabaseSessionManager:
    """Initialize global database manager"""
    global _db_manager
    _db_manager = DatabaseSessionManager(db_config)
    
    # Automatically create database table structure
    try:
        from .models import Base
        Base.metadata.create_all(bind=_db_manager.engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning(f"Failed to create tables automatically: {e}")
        # If automatic creation fails, try to create the key tables using explicit DDL.
        try:
            from .init_db import init_database
            init_database()
            logger.info("Database tables created using explicit DDL")
        except Exception as ddl_error:
            logger.error(f"Failed to create tables using DDL: {ddl_error}")
    
    return _db_manager


def close_db_manager() -> None:
    """Close global database manager"""
    global _db_manager
    if _db_manager:
        _db_manager.close()
        _db_manager = None
