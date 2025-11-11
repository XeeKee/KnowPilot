"""
Database models and schema definitions for CollabThink.

This module defines the complete database schema including user management,
session handling, conversation history, and generation job tracking. The models
implement optimistic locking for concurrency safety and proper relationship
management for data integrity.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
    Boolean,
)
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column
from sqlalchemy.types import JSON


Base = declarative_base()

class UserDB(Base):
    """
    User account management table.
    
    This table stores user authentication and profile information with
    proper indexing for efficient login operations and role management.
    """
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index('idx_users_email', 'email', unique=True),
    )
    
    def __repr__(self):
        return f"<UserDB(email='{self.email}')>"


class UserSessionDB(Base):
    """
    User session management table with concurrency safety.
    
    This table supports concurrency-safe session management using optimistic
    locking to prevent conflicts when multiple operations access the same
    session simultaneously. It tracks active sessions and their current state.
    """

    __tablename__ = "user_sessions"

    uuid: Mapped[str] = mapped_column(String(36), primary_key=True)
    max_history: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    current_record_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Replaces current_pos, points to the current active record
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, inactive, archived
    lock_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Optimistic lock version
    owner_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Owner user ID (users.id)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    history_records: Mapped[List["HistoryRecordDB"]] = relationship(
        back_populates="user_session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class HistoryRecordDB(Base):
    """
    History record table for structured content storage.
    
    This table stores structured content including outlines, articles, and
    references. It supports concurrency-safe message order allocation
    to prevent race conditions in conversation management.
    """

    __tablename__ = "history_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_uuid: Mapped[str] = mapped_column(
        String(36), ForeignKey("user_sessions.uuid", ondelete="CASCADE"), index=True
    )
    record_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Optional sort position, not enforced unique
    topic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Topic content
    outline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    article_chapters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # List[str] stored as JSON
    references_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    next_message_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # For atomic allocation of message order
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user_session: Mapped["UserSessionDB"] = relationship(back_populates="history_records")
    messages: Mapped[List["ConversationMessageDB"]] = relationship(
        back_populates="history_record",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ConversationMessageDB.message_order",
    )
    generation_jobs: Mapped[List["GenerationJobDB"]] = relationship(
        back_populates="history_record",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ConversationMessageDB(Base):
    """
    Conversation message storage with ordering support.
    
    This table stores individual conversation messages with proper ordering
    to maintain conversation flow and context. It supports rich content
    storage and metadata tracking.
    """

    __tablename__ = "conversation_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("history_records.id", ondelete="CASCADE"), index=True
    )
    message_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)  # UUID for idempotency
    message_order: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'user' | 'assistant' | 'system'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    history_record: Mapped["HistoryRecordDB"] = relationship(back_populates="messages")


class OutlineHistoryDB(Base):
    """Outline snapshot table (compatible with current HistoryManager's in-memory outlines structure)"""

    __tablename__ = "outline_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_uuid: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class ArticleHistoryDB(Base):
    """Article snapshot table (compatible with current HistoryManager's in-memory articles structure)"""

    __tablename__ = "article_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_uuid: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class GenerationJobDB(Base):
    """Concurrent generation jobs table
    Supports multiple concurrent streaming generation jobs within a session.
    """

    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    session_uuid: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    record_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("history_records.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)  # queued, running, succeeded, failed, canceled
    topic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outline_snapshot_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # For detecting outline changes
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    history_record: Mapped[Optional["HistoryRecordDB"]] = relationship(back_populates="generation_jobs")
    chunks: Mapped[List["GenerationChunkDB"]] = relationship(
        back_populates="generation_job",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="GenerationChunkDB.seq",
    )


class GenerationChunkDB(Base):
    """Streaming generation chunks table
    Stores streaming output chunks for each generation job.
    """

    __tablename__ = "generation_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generation_jobs.id", ondelete="CASCADE"), index=True
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)  # Strictly increasing sequence number
    chapter_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Chapter index, optional
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_final_chunk: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    generation_job: Mapped["GenerationJobDB"] = relationship(back_populates="chunks")


__all__ = [
    "Base",
    "UserDB",
    "UserSessionDB",
    "HistoryRecordDB",
    "ConversationMessageDB",
    "OutlineHistoryDB",
    "ArticleHistoryDB",
    "GenerationJobDB",
    "GenerationChunkDB",
]
