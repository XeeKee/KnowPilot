from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.models import UserSessionDB, HistoryRecordDB


logger = logging.getLogger(__name__)


class SessionDAO:
    """User session data access object
    
    Provides session-related database operations with concurrency safety and optimistic locking.
    """

    @staticmethod
    def create_session(session: Session, session_uuid: str, max_history: int = 10) -> UserSessionDB:
        """Create a new user session"""
        user_session = UserSessionDB(
            uuid=session_uuid,
            max_history=max_history,
            status="active",
            lock_version=0,
        )
        
        session.add(user_session)
        session.flush()  # Obtain generated ID
        
        logger.info(f"Created new session: {session_uuid}")
        return user_session

    @staticmethod
    def get_session_by_uuid(session: Session, session_uuid: str) -> Optional[UserSessionDB]:
        """Get session by UUID"""
        return session.query(UserSessionDB).filter(
            UserSessionDB.uuid == session_uuid
        ).first()

    @staticmethod
    def get_or_create_session(session: Session, session_uuid: str, max_history: int = 10) -> UserSessionDB:
        """Get or create session (idempotent)"""
        user_session = SessionDAO.get_session_by_uuid(session, session_uuid)
        
        if user_session is None:
            try:
                user_session = SessionDAO.create_session(session, session_uuid, max_history)
            except IntegrityError:
                # In concurrency scenarios, duplicate creation may occur; re-query
                session.rollback()
                user_session = SessionDAO.get_session_by_uuid(session, session_uuid)
                if user_session is None:
                    raise RuntimeError(f"Unable to create or get session: {session_uuid}")
                
        return user_session

    @staticmethod
    def update_current_record(session: Session, session_uuid: str, record_id: Optional[int]) -> bool:
        """Update current active record ID (using optimistic locking)"""
        user_session = SessionDAO.get_session_by_uuid(session, session_uuid)
        if not user_session:
            return False
        
        # Optimistic lock update
        old_version = user_session.lock_version
        user_session.current_record_id = record_id
        user_session.lock_version = old_version + 1
        user_session.updated_at = datetime.utcnow()
        
        try:
            # Verify version is not modified by other transactions
            result = session.query(UserSessionDB).filter(
                and_(
                    UserSessionDB.uuid == session_uuid,
                    UserSessionDB.lock_version == old_version
                )
            ).update({
                "current_record_id": record_id,
                "lock_version": old_version + 1,
                "updated_at": datetime.utcnow()
            })
            
            if result == 0:
                session.rollback()
                logger.warning(f"Session {session_uuid} update failed: version conflict")
                return False
                
            logger.info(f"Updated session {session_uuid} current record: {record_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update session: {e}")
            return False

    @staticmethod
    def get_session_status(session: Session, session_uuid: str) -> Optional[str]:
        """Get session status"""
        user_session = SessionDAO.get_session_by_uuid(session, session_uuid)
        return user_session.status if user_session else None

    @staticmethod
    def set_session_status(session: Session, session_uuid: str, status: str) -> bool:
        """Set session status"""
        user_session = SessionDAO.get_session_by_uuid(session, session_uuid)
        if not user_session:
            return False
        
        user_session.status = status
        user_session.updated_at = datetime.utcnow()
        
        logger.info(f"Session {session_uuid} status updated to: {status}")
        return True

    @staticmethod
    def cleanup_old_sessions(session: Session, max_sessions: int = 100) -> int:
        """Clean up outdated sessions
        
        Keep the latest max_sessions sessions and delete the rest.
        """
        # Get sessions to delete
        old_sessions = session.query(UserSessionDB).order_by(
            UserSessionDB.updated_at.desc()
        ).offset(max_sessions).all()
        
        if not old_sessions:
            return 0
        
        old_uuids = [s.uuid for s in old_sessions]
        
        # Delete old sessions (cascade delete related records)
        deleted_count = session.query(UserSessionDB).filter(
            UserSessionDB.uuid.in_(old_uuids)
        ).delete(synchronize_session=False)
        
        logger.info(f"Cleaned {deleted_count} old sessions")
        return deleted_count

    @staticmethod
    def get_session_summary(session: Session, session_uuid: str) -> Optional[dict]:
        """Get session summary information"""
        user_session = SessionDAO.get_session_by_uuid(session, session_uuid)
        if not user_session:
            return None
        
        # Count number of history records
        record_count = session.query(func.count(HistoryRecordDB.id)).filter(
            HistoryRecordDB.session_uuid == session_uuid
        ).scalar()
        
        return {
            "uuid": user_session.uuid,
            "status": user_session.status,
            "max_history": user_session.max_history,
            "current_record_id": user_session.current_record_id,
            "record_count": record_count,
            "created_at": user_session.created_at,
            "updated_at": user_session.updated_at,
        }
