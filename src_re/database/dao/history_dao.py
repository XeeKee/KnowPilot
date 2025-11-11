from __future__ import annotations

import logging
import uuid as uuid_lib
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import and_, func, desc
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.models import HistoryRecordDB, ConversationMessageDB, OutlineHistoryDB, ArticleHistoryDB


logger = logging.getLogger(__name__)


class HistoryDAO:
    """History data access object
    
    Provides database operations for history records, conversation messages, outlines, and articles.
    """

    @staticmethod
    def create_history_record(session: Session, session_uuid: str, record_position: Optional[int] = None) -> HistoryRecordDB:
        """Create a new history record"""
        record = HistoryRecordDB(
            session_uuid=session_uuid,
            record_position=record_position,
            outline="",
            article_chapters=[],
            references_data={},
            next_message_order=1,
        )
        
        session.add(record)
        session.flush()  # Obtain generated ID
        
        logger.info(f"Created history record: session={session_uuid}, id={record.id}")
        return record

    @staticmethod
    def get_history_record(session: Session, record_id: int) -> Optional[HistoryRecordDB]:
        """Get history record by ID"""
        return session.query(HistoryRecordDB).filter(
            HistoryRecordDB.id == record_id
        ).first()

    @staticmethod
    def get_session_records(session: Session, session_uuid: str, limit: Optional[int] = None) -> List[HistoryRecordDB]:
        """Get all history records of a session"""
        query = session.query(HistoryRecordDB).filter(
            HistoryRecordDB.session_uuid == session_uuid
        ).order_by(HistoryRecordDB.created_at.asc())
        
        if limit:
            query = query.limit(limit)
            
        return query.all()

    @staticmethod
    def get_latest_record(session: Session, session_uuid: str) -> Optional[HistoryRecordDB]:
        """Get the latest history record of a session"""
        return session.query(HistoryRecordDB).filter(
            HistoryRecordDB.session_uuid == session_uuid
        ).order_by(HistoryRecordDB.created_at.desc()).first()

    @staticmethod
    def update_record_outline(session: Session, record_id: int, outline: str) -> bool:
        """Update record outline"""
        record = HistoryDAO.get_history_record(session, record_id)
        if not record:
            return False
        
        record.outline = outline
        record.updated_at = datetime.utcnow()
        
        logger.info(f"Updated record {record_id} outline")
        return True

    @staticmethod
    def update_record_topic(session: Session, record_id: int, topic: str) -> bool:
        """Update record topic"""
        record = HistoryDAO.get_history_record(session, record_id)
        if not record:
            return False
        
        record.topic = topic
        record.updated_at = datetime.utcnow()
        
        logger.info(f"Updated record {record_id} topic")
        return True

    @staticmethod
    def update_record_articles(session: Session, record_id: int, articles: List[str]) -> bool:
        """Update record article chapters"""
        record = HistoryDAO.get_history_record(session, record_id)
        if not record:
            return False
        
        record.article_chapters = articles
        record.updated_at = datetime.utcnow()
        
        logger.info(f"Updated record {record_id} article chapters: {len(articles)} chapters")
        return True

    @staticmethod
    def update_record_references(session: Session, record_id: int, references: Dict[str, Any]) -> bool:
        """Update record references data"""
        record = HistoryDAO.get_history_record(session, record_id)
        if not record:
            return False
        
        record.references_data = references
        record.updated_at = datetime.utcnow()
        
        logger.info(f"Updated record {record_id} references data")
        return True

    @staticmethod
    def add_message(session: Session, record_id: int, role: str, content: str, message_id: Optional[str] = None) -> Optional[ConversationMessageDB]:
        """Add conversation message (concurrency-safe)"""
        if message_id is None:
            message_id = str(uuid_lib.uuid4())
        
        # Get and increment message order (atomic)
        record = session.query(HistoryRecordDB).filter(
            HistoryRecordDB.id == record_id
        ).with_for_update().first()
        
        if not record:
            logger.error(f"Record {record_id} does not exist")
            return None
        
        message_order = record.next_message_order
        record.next_message_order += 1
        record.updated_at = datetime.utcnow()
        
        # Create message
        message = ConversationMessageDB(
            record_id=record_id,
            message_id=message_id,
            message_order=message_order,
            role=role,
            content=content,
        )
        
        try:
            session.add(message)
            session.flush()
            
            logger.info(f"Added message: record={record_id}, order={message_order}, role={role}")
            return message
            
        except IntegrityError as e:
            logger.error(f"Failed to add message: {e}")
            return None

    @staticmethod
    def get_record_messages(session: Session, record_id: int) -> List[ConversationMessageDB]:
        """Get all messages of a record"""
        return session.query(ConversationMessageDB).filter(
            ConversationMessageDB.record_id == record_id
        ).order_by(ConversationMessageDB.message_order).all()

    @staticmethod
    def cleanup_old_records(session: Session, session_uuid: str, max_records: int = 10) -> int:
        """Clean up outdated records of a session
        
        Keep the latest max_records and delete the rest.
        """
        # Get records to delete
        old_records = session.query(HistoryRecordDB).filter(
            HistoryRecordDB.session_uuid == session_uuid
        ).order_by(HistoryRecordDB.created_at.desc()).offset(max_records).all()
        
        if not old_records:
            return 0
        
        old_ids = [r.id for r in old_records]
        
        # Delete old records (cascade deletes related messages)
        deleted_count = session.query(HistoryRecordDB).filter(
            HistoryRecordDB.id.in_(old_ids)
        ).delete(synchronize_session=False)
        
        logger.info(f"Cleaned {deleted_count} old records for session {session_uuid}")
        return deleted_count

    @staticmethod
    def save_outline_snapshot(session: Session, session_uuid: str, content: str) -> OutlineHistoryDB:
        """Save outline snapshot"""
        outline = OutlineHistoryDB(
            session_uuid=session_uuid,
            content=content,
        )
        
        session.add(outline)
        session.flush()
        
        logger.info(f"Saved outline snapshot: session={session_uuid}")
        return outline

    @staticmethod
    def get_latest_outline(session: Session, session_uuid: str) -> Optional[OutlineHistoryDB]:
        """Get the latest outline snapshot"""
        return session.query(OutlineHistoryDB).filter(
            OutlineHistoryDB.session_uuid == session_uuid
        ).order_by(OutlineHistoryDB.timestamp.desc()).first()

    @staticmethod
    def save_article_snapshot(session: Session, session_uuid: str, content: str) -> ArticleHistoryDB:
        """Save article snapshot"""
        article = ArticleHistoryDB(
            session_uuid=session_uuid,
            content=content,
        )
        
        session.add(article)
        session.flush()
        
        logger.info(f"Saved article snapshot: session={session_uuid}")
        return article

    @staticmethod
    def get_latest_article(session: Session, session_uuid: str) -> Optional[ArticleHistoryDB]:
        """Get the latest article snapshot"""
        return session.query(ArticleHistoryDB).filter(
            ArticleHistoryDB.session_uuid == session_uuid
        ).order_by(ArticleHistoryDB.timestamp.desc()).first()

    @staticmethod
    def get_records_summary(session: Session, session_uuid: str) -> List[Dict[str, Any]]:
        """Get summary information of session records"""
        records = HistoryDAO.get_session_records(session, session_uuid)

        summaries = []
        for i, record in enumerate(records):
            outline_preview = record.outline[:100] + "..." if len(record.outline) > 100 else record.outline
            article_count = len(record.article_chapters) if record.article_chapters else 0
            topic_preview = record.topic[:50] + "..." if record.topic and len(record.topic) > 50 else (record.topic or "")

            # Fix position numbering: ensure each record has a unique continuous position value
            # Use loop index i as position, since records are already sorted by creation time
            position = i

            summaries.append({
                "id": record.id,
                "position": position,  # Use continuous index value directly
                "created_at": record.created_at.isoformat() if record.created_at else None,
                "updated_at": record.updated_at.isoformat() if record.updated_at else None,
                "has_outline": bool(record.outline),
                "has_article": article_count > 0,
                "has_topic": bool(record.topic),
                "topic_preview": topic_preview,
                "article_count": article_count,
                "outline_preview": outline_preview,
            })

        return summaries
