from __future__ import annotations

import logging
import uuid as uuid_lib
from datetime import datetime
from typing import List, Dict, Optional, Any

from flask import session
from flask_login import current_user

from database.session_manager import get_db_manager
from database.dao import SessionDAO, HistoryDAO, GenerationDAO
from database.models import HistoryRecordDB, ConversationMessageDB


logger = logging.getLogger(__name__)


class HistoryRecord:
    """History record structure (compatible with original interface)
    
    Now serves as a wrapper for database records, maintaining the original interface unchanged.
    """
    
    def __init__(self, db_record: Optional[HistoryRecordDB] = None):
        if db_record:
            self._db_record = db_record
            self._messages = None  
            self.topic = db_record.topic or ""  
            self.outline = db_record.outline or ""
            self.article = db_record.article_chapters or []
            self.references = db_record.references_data or {}
            self.timestamp = db_record.created_at.isoformat()
            self._record_id = db_record.id
        else:
            self._db_record = None
            self._messages = []
            self.topic = ""
            self.outline = ""
            self.article = []
            self.references = {}
            self.timestamp = datetime.now().isoformat()
            self._record_id = None
    
    @property
    def messages(self) -> List:
        """Get message list (lazy loading)"""
        if self._messages is None and self.db_record_id:
            # Load messages from database
            try:
                db_manager = get_db_manager()
                with db_manager.get_readonly_session() as db_session:
                    db_messages = HistoryDAO.get_record_messages(db_session, self.db_record_id)
                    self._messages = [
                        {
                            'role': msg.role,
                            'content': msg.content,
                            'timestamp': msg.timestamp.isoformat(),
                            'message_id': msg.message_id,
                        }
                        for msg in db_messages
                    ]
            except Exception as e:
                logger.error(f"Error loading messages for record {self.db_record_id}: {e}")
                self._messages = []
        elif self._messages is None:
            self._messages = []
        
        return self._messages
    
    @messages.setter
    def messages(self, value: List):
        """Set message list"""
        self._messages = value
    
    @property
    def db_record_id(self) -> Optional[int]:
        """Get database record ID"""
        if self._db_record:
            return self._db_record.id
        elif hasattr(self, '_record_id'):
            return self._record_id
        else:
            return None


class UserSession:
    """User session data structure (database version)
    
    Refactored to use PostgreSQL storage, maintaining compatibility with original interface.
    """
    
    def __init__(self, uuid: str):
        self.uuid = uuid
        self.max_history = 30
        self._current_pos = -1
        self._created_at = None
        self._updated_at = None
        self._db_session = None
        self._history_records_cache = None
        
        # Load or create session from database
        self._load_or_create_session()
    
    def _load_or_create_session(self):
        """Load or create session from database"""
        db_manager = get_db_manager()
        with db_manager.get_session() as db_session:
            db_session_obj = SessionDAO.get_or_create_session(
                db_session, self.uuid, self.max_history
            )

            self.max_history = db_session_obj.max_history
            self._created_at = db_session_obj.created_at.isoformat()
            self._updated_at = db_session_obj.updated_at.isoformat()
            self._current_record_id = db_session_obj.current_record_id  
            
            # History record migration
            if '@' in self.uuid:
                self._migrate_user_history(db_session)
    
    @property
    def created_at(self) -> str:
        return self._created_at or datetime.now().isoformat()
    
    @property
    def updated_at(self) -> str:
        return self._updated_at or datetime.now().isoformat()
    
    @property
    def current_pos(self) -> int:
        """Get current position"""
        try:
            # Use stored current_record_id, reload if not exists
            current_record_id = getattr(self, '_current_record_id', None)
            if not current_record_id:
                # Reload current_record_id from database
                db_manager = get_db_manager()
                with db_manager.get_readonly_session() as db_session:
                    session_obj = SessionDAO.get_session_by_uuid(db_session, self.uuid)
                    if session_obj:
                        current_record_id = session_obj.current_record_id
                        self._current_record_id = current_record_id  # Cache result
            
            if current_record_id:
                # Calculate position based on current_record_id
                db_manager = get_db_manager()
                with db_manager.get_readonly_session() as db_session:
                    records = HistoryDAO.get_session_records(db_session, self.uuid)
                    for i, record in enumerate(records):
                        if record.id == current_record_id:
                            return i  
            else:
                logger.debug(f"No current_record_id for session {self.uuid}")
        except Exception as e:
            logger.error(f"Error getting current pos for session {self.uuid}: {e}")
        return -1
    
    @property
    def history_records(self) -> List[HistoryRecord]:
        """Get history record list (lazy loading)"""
        if self._history_records_cache is None:
            self._load_history_records()
        return self._history_records_cache
    
    def refresh_history_records(self):
        """Force refresh history record cache (called after transaction commit)"""
        self._invalidate_cache()
        return self.history_records
    
    def _load_history_records(self):
        """Load history records from database"""
        try:
            db_manager = get_db_manager()
            with db_manager.get_readonly_session() as db_session:
                db_records = HistoryDAO.get_session_records(
                    db_session, self.uuid, limit=self.max_history
                )
                # Convert to HistoryRecord objects
                self._history_records_cache = [
                    HistoryRecord(db_record)
                    for db_record in db_records
                ]
        except Exception as e:
            logger.error(f"Error loading history records for session {self.uuid}: {e}")
            self._history_records_cache = [] 
    
    def _invalidate_cache(self):
        """Invalidate cache"""
        self._history_records_cache = None
    
    def _has_any_records(self) -> bool:
        """Check if current session has any history records"""
        try:
            db_manager = get_db_manager()
            with db_manager.get_readonly_session() as db_session:
                records = HistoryDAO.get_session_records(db_session, self.uuid, limit=1)
                return len(records) > 0
        except Exception:
            return False
    
    def _migrate_user_history(self, db_session):
        """Migrate user's history records to current email format session_uuid"""
        try:
            email = self.uuid
            logger.info(f"Starting comprehensive history migration for user {email}")
            
            # Method 1: Find all historical sessions of current user through user_sessions table
            from sqlalchemy import text
            from database.dao import UserDAO
            
            # First get user ID
            user = UserDAO.get_by_email(db_session, email)
            if not user:
                logger.warning(f"User {email} not found in users table, skipping migration")
                return
            
            user_id = user.id
            logger.info(f"Found user {email} with ID {user_id}")
            
            # Find all sessions owned by this user
            user_sessions_query = text("""
                SELECT DISTINCT uuid 
                FROM user_sessions 
                WHERE owner_user_id = :user_id AND uuid != :current_uuid
                ORDER BY uuid
            """)
            
            existing_sessions = []
            result = db_session.execute(user_sessions_query, {
                "user_id": user_id,
                "current_uuid": email
            })
            for row in result:
                existing_sessions.append(row[0])
            
            # Method 2: Find session_uuid containing email (backup method)
            email_pattern_query = text("""
                SELECT DISTINCT session_uuid 
                FROM history_records 
                WHERE session_uuid LIKE :pattern AND session_uuid != :current_uuid
                ORDER BY session_uuid
            """)
            
            result = db_session.execute(email_pattern_query, {
                "pattern": f"%{email}%",
                "current_uuid": email
            })
            for row in result:
                session_uuid = row[0]
                if session_uuid not in existing_sessions:
                    existing_sessions.append(session_uuid)
            
            # Method 3: Find orphaned history records (without corresponding user_sessions records)
            orphaned_query = text("""
                SELECT DISTINCT hr.session_uuid 
                FROM history_records hr 
                LEFT JOIN user_sessions us ON hr.session_uuid = us.uuid 
                WHERE us.uuid IS NULL AND hr.session_uuid != :current_uuid
                ORDER BY hr.session_uuid
            """)
            
            result = db_session.execute(orphaned_query, {"current_uuid": email})
            orphaned_sessions = [row[0] for row in result]
            
            if orphaned_sessions:
                logger.info(f"Found {len(orphaned_sessions)} orphaned sessions: {orphaned_sessions}")
                # Create user_sessions records for orphaned sessions
                for orphaned_uuid in orphaned_sessions:
                    # Check if it possibly belongs to current user (heuristic judgment)
                    if (email.split('@')[0] in orphaned_uuid or 
                        any(pattern in orphaned_uuid for pattern in [f"user_1_{email}", f"user_2_{email}", 
                                                                      f"user_3_{email}", f"user_4_{email}", 
                                                                      f"user_5_{email}"])):
                        existing_sessions.append(orphaned_uuid)
                        # Create user_sessions record
                        create_session_query = text("""
                            INSERT INTO user_sessions (uuid, max_history, owner_user_id, created_at, updated_at)
                            VALUES (:uuid, 30, :user_id, NOW(), NOW())
                            ON CONFLICT (uuid) DO UPDATE SET owner_user_id = :user_id
                        """)
                        db_session.execute(create_session_query, {
                            "uuid": orphaned_uuid,
                            "user_id": user_id
                        })
                        logger.info(f"Linked orphaned session {orphaned_uuid} to user {email}")
            
            if not existing_sessions:
                logger.info(f"No history records found for migration for user {email}")
                return
            
            logger.info(f"Found {len(existing_sessions)} sessions to migrate: {existing_sessions}")
            
            # Migrate history records
            migrated_count = 0
            for old_session_uuid in existing_sessions:
                update_query = text("""
                    UPDATE history_records 
                    SET session_uuid = :new_uuid 
                    WHERE session_uuid = :old_uuid
                """)
                result = db_session.execute(update_query, {
                    "new_uuid": email,
                    "old_uuid": old_session_uuid
                })
                count = result.rowcount
                migrated_count += count
                logger.info(f"Migrated {count} records from {old_session_uuid} to {email}")
            
            # Also migrate user_sessions table
            session_update_query = text("""
                UPDATE user_sessions 
                SET uuid = :new_uuid 
                WHERE uuid = :old_uuid AND uuid != :new_uuid
            """)
            for old_session_uuid in existing_sessions:
                db_session.execute(session_update_query, {
                    "new_uuid": email,
                    "old_uuid": old_session_uuid
                })
            
            logger.info(f"History migration completed: {migrated_count} total records migrated to {email}")
            
            # Invalidate cache and reload
            self._invalidate_cache()
            
        except Exception as e:
            logger.error(f"Error during history migration for {email}: {e}")
            import traceback
            logger.error(f"Migration traceback: {traceback.format_exc()}")
            # Don't throw exception to avoid affecting normal session creation
    
    def create_record(self) -> HistoryRecord:
        """Create new history record"""
        db_manager = get_db_manager()
        with db_manager.get_session() as db_session:
            # Create database record (position = current record count = append to end)
            position = len(self.history_records)
            db_record = HistoryDAO.create_history_record(
                db_session, self.uuid, position
            )
            
            # Update session's current record ID
            SessionDAO.update_current_record(db_session, self.uuid, db_record.id)
            
            # Clean up old records (maintain max history record count)
            HistoryDAO.cleanup_old_records(db_session, self.uuid, self.max_history)
            
            # Create record object within session, save necessary data
            record_id = db_record.id
            record_created_at = db_record.created_at
            record_outline = db_record.outline or ""
            record_article_chapters = db_record.article_chapters or []
            record_references_data = db_record.references_data or {}
        
        # Update current position to new record's position at end of queue (ascending: newest at end)
        if self._history_records_cache is None:
            self._history_records_cache = []
        new_position = len(self._history_records_cache)  # Index after append
        self._current_pos = new_position
        self._current_record_id = record_id
        
        # Create record outside session to avoid binding issues, and update local cache (append to end)
        record = HistoryRecord()
        record._db_record = None
        record.topic = ""
        record.outline = record_outline
        record.article = record_article_chapters
        record.references = record_references_data
        record.timestamp = record_created_at.isoformat()
        record._record_id = record_id
        
        self._history_records_cache.append(record)
        
        logger.info(f"Created new record id={record_id} at position {new_position} for session {self.uuid}")
        return record
    
    def get_record(self, pos: int) -> HistoryRecord:
        """Get record at specified position"""
        records = self.history_records
        if not records:
            raise IndexError("No history records available")
        
        # Handle negative indices
        if pos < 0:
            pos = len(records) + pos
        
        if pos < 0 or pos >= len(records):
            raise IndexError(f"Record position {pos} out of range (0-{len(records)-1})")
        
        return records[pos]
    
    def get_record_safe(self, pos: int) -> Optional[HistoryRecord]:
        """Safely get record, return None if failed"""
        try:
            return self.get_record(pos)
        except (IndexError, TypeError):
            return None
    
    def get_all_records(self) -> List[HistoryRecord]:
        """Get all history records"""
        return self.history_records
    
    def get_current_record(self) -> Optional[HistoryRecord]:
        """Get current active record"""
        current_pos = self.current_pos
        if current_pos >= 0:
            return self.get_record_safe(current_pos)
        elif self.history_records:
            return self.history_records[-1]  # Return newest record
        return None
    
    def set_current_pos(self, pos: int) -> bool:
        """Set current active record position"""
        records = self.history_records
        if 0 <= pos < len(records):
            record = records[pos]
            if record.db_record_id:
                db_manager = get_db_manager()
                with db_manager.get_session() as db_session:
                    success = SessionDAO.update_current_record(
                        db_session, self.uuid, record.db_record_id
                    )
                    if success:
                        self._current_pos = pos
                        self._current_record_id = record.db_record_id  # Key fix: also update record_id cache
                        logger.info(f"Set current pos to {pos} (record_id={record.db_record_id}) for session {self.uuid}")
                        return True
        return False
    
    def get_current_pos(self) -> int:
        """Get current active record position"""
        return self.current_pos
    
    def get_records_summary(self) -> List[Dict]:
        """Get history record summary information"""
        try:
            db_manager = get_db_manager()
            with db_manager.get_readonly_session() as db_session:
                summaries = HistoryDAO.get_records_summary(db_session, self.uuid)
                
                try:
                    summaries = sorted(summaries, key=lambda s: s.get('position', 0))
                except Exception:
                    pass
                
                current_record_id = getattr(self, '_current_record_id', None)
                for summary in summaries:
                    # Normalize fields
                    summary['pos'] = summary.get('position', 0)
                    summary['timestamp'] = summary.get('created_at', datetime.now().isoformat())
                    summary['is_current'] = summary.get('id') == current_record_id
                
                return summaries
        except Exception as e:
            logger.error(f"Error getting records summary for session {self.uuid}: {e}")
            return [] 
    
    def update_record_outline(self, pos: int, outline: str) -> bool:
        """Update outline of specified record"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                success = HistoryDAO.update_record_outline(
                    db_session, record.db_record_id, outline
                )
                if success:
                    record.outline = outline
                    return True
        return False

    def update_record_topic(self, pos: int, topic: str) -> bool:
        """Update topic of specified record"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                success = HistoryDAO.update_record_topic(
                    db_session, record.db_record_id, topic
                )
                if success:
                    record.topic = topic
                    return True
        return False
    
    def update_record_article(self, pos: int, article: str) -> bool:
        """Update article of specified record (append to list)"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            # Get current article list and append
            current_articles = record.article or []
            current_articles.append(article)
            
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                success = HistoryDAO.update_record_articles(
                    db_session, record.db_record_id, current_articles
                )
                if success:
                    record.article = current_articles
                    return True
        return False
    
    def update_record_articles(self, pos: int, articles: List[str]) -> bool:
        """Update article list of specified record (replace entire list)"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                success = HistoryDAO.update_record_articles(
                    db_session, record.db_record_id, articles
                )
                if success:
                    record.article = articles
                    return True
        return False
    
    def update_record_references(self, pos: int, references: Dict) -> bool:
        """Update reference data of specified record"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                success = HistoryDAO.update_record_references(
                    db_session, record.db_record_id, references
                )
                if success:
                    record.references = references
                    return True
        return False
    
    def add_message(self, pos: int, role: str, content: str) -> bool:
        """Add message to specified record"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                message = HistoryDAO.add_message(
                    db_session, record.db_record_id, role, content
                )
                if message:
                    # Add to memory cache
                    if record._messages is None:
                        record._messages = []
                    record._messages.append({
                        'role': role,
                        'content': content,
                        'timestamp': message.timestamp.isoformat(),
                        'message_id': message.message_id,
                    })
                    return True
        return False
    
    def get_record_articles(self, pos: int) -> List[str]:
        """Get article list of specified record"""
        try:
            record = self.get_record(pos)
            return record.article if record else []
        except (IndexError, TypeError):
            return []
    
    def get_record_article_text(self, pos: int) -> str:
        """Get article text of specified record (merge all articles)"""
        try:
            record = self.get_record(pos)
            if record and record.article:
                return '\n\n'.join(record.article)
            return ""
        except (IndexError, TypeError):
            return ""
            
    def get_record_chapter_references(self, pos: int, chapter_index: int) -> Dict:
        """Get reference data for specific chapter of specified record"""
        try:
            record = self.get_record(pos)
            if record and record.references:
                return record.references.get(str(chapter_index), {})
            return {}
        except (IndexError, TypeError):
            return {}
    
    def update_record_chapter_references(self, pos: int, chapter_index: int, chapter_references: Dict):
        """Update reference data for specific chapter of specified record"""
        record = self.get_record_safe(pos)
        if record and record.db_record_id:
            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                # Get current reference data
                current_references = record.references or {}
                
                # Ensure chapter_index is in string format
                chapter_key = str(chapter_index)
                current_references[chapter_key] = chapter_references
                
                # Update database
                success = HistoryDAO.update_record_references(
                    db_session, record.db_record_id, current_references
                )
                if success:
                    record.references = current_references
                    return True
        return False


class UUIDManager:
    """UUID Manager (database version)
    
    Refactored to use PostgreSQL storage, maintaining compatibility with original interface.
    """
    
    def __init__(self):
        self._user_sessions_cache = {}
        self.session_id = ""
    
    def check_uuid(self) -> UserSession:
        """Check if UUID has user session, create new one if not exists"""
        # 1) Logged in user: Use email as stable session ID to avoid history becoming invisible due to restart/SECRET_KEY changes
        try:
            if current_user and getattr(current_user, 'is_authenticated', False):
                user_email = getattr(current_user, 'email', None)
                if user_email:
                    session['session_id'] = user_email
        except Exception:
            # Some contexts might not have current_user, can be ignored
            pass

        # 2) Prefer using session_id already set in Flask session (may come from login or existing session)
        if 'session_id' in session:
            self.session_id = session['session_id']
            logger.info(f"Using session_id: {self.session_id}")
        else:
            # 3) If not, generate anonymous session UUID
            new_uuid = str(uuid_lib.uuid4())
            session['session_id'] = new_uuid
            self.session_id = new_uuid
            logger.info(f"Generated anonymous session_id: {self.session_id}")
        
        # Check cache
        if self.session_id in self._user_sessions_cache:
            user_session = self._user_sessions_cache[self.session_id]
            logger.info(f"User session found in cache for uuid: {self.session_id}")
            return user_session
        
        # Create or load session
        user_session = UserSession(self.session_id)
        self._user_sessions_cache[self.session_id] = user_session
        
        logger.info(f"User session loaded/created for uuid: {self.session_id}")
        return user_session
    
    def get_session_by_uuid(self, uuid: str) -> Optional[UserSession]:
        """Get user session by UUID"""
        if uuid in self._user_sessions_cache:
            return self._user_sessions_cache[uuid]
        
        # Try to load from database
        try:
            user_session = UserSession(uuid)
            self._user_sessions_cache[uuid] = user_session
            return user_session
        except Exception as e:
            logger.error(f"Failed to load session {uuid}: {e}")
            return None
    
    def get_current_session(self) -> Optional[UserSession]:
        """Get current session"""
        return self.check_uuid()
    
    def list_all_records(self) -> List[Dict]:
        """List all records from all sessions"""
        # This function requires admin privileges, temporarily return current session records
        current_session = self.get_current_session()
        if current_session:
            summaries = current_session.get_records_summary()
            for summary in summaries:
                summary['session_uuid'] = current_session.uuid
            return summaries
        return []
    
    def get_record_by_session_and_pos(self, session_uuid: str, pos: int) -> Optional[HistoryRecord]:
        """Get record by session UUID and position"""
        user_session = self.get_session_by_uuid(session_uuid)
        if user_session:
            return user_session.get_record_safe(pos)
        return None
    
    
    def update_current_session_pos(self, pos: int) -> bool:
        """Update active position of current session"""
        current_session = self.get_current_session()
        return current_session.set_current_pos(pos) if current_session else False
    
    def save_outline_to_current_pos(self, outline: str) -> bool:
        """Save outline to current position of current session"""
        current_session = self.get_current_session()
        if current_session:
            current_pos = current_session.get_current_pos()
            if current_pos >= 0:
                return current_session.update_record_outline(current_pos, outline)
            else:
                # Create new record
                record = current_session.create_record()
                return current_session.update_record_outline(
                    len(current_session.history_records) - 1, outline
                )
        return False
    
    def save_article_to_current_pos(self, article: str) -> bool:
        """Save article to current position of current session"""
        current_session = self.get_current_session()
        if current_session:
            current_pos = current_session.get_current_pos()
            if current_pos >= 0:
                return current_session.update_record_article(current_pos, article)
            else:
                # Create new record
                record = current_session.create_record()
                return current_session.update_record_article(
                    len(current_session.history_records) - 1, article
                )
        return False

    def save_topic_to_current_pos(self, topic: str) -> bool:
        """Save topic to current record (save to both topic field and __topic field in references_data)"""
        try:
            current_session = self.get_current_session()
            if not current_session:
                return False
            # Ensure there is a current record
            current_record = current_session.get_current_record()
            if not current_record:
                current_record = current_session.create_record()

            if not current_record or not current_record.db_record_id:
                return False

            # 1. Update record's topic field
            current_pos = current_session.get_current_pos()
            topic_success = current_session.update_record_topic(current_pos, topic)
            
            # 2. Merge and update topic field in reference data (maintain backward compatibility)
            merged_refs = current_record.references or {}
            if not isinstance(merged_refs, dict):
                merged_refs = {}
            merged_refs['__topic'] = topic

            db_manager = get_db_manager()
            with db_manager.get_session() as db_session:
                refs_success = HistoryDAO.update_record_references(db_session, current_record.db_record_id, merged_refs)
                if refs_success:
                    current_record.references = merged_refs
                
                # Return True as long as topic field update succeeds
                return topic_success
        except Exception:
            return False
    
    def cleanup_old_sessions(self, max_sessions: int = 100):
        """Clean up old sessions"""
        db_manager = get_db_manager()
        with db_manager.get_session() as db_session:
            deleted_count = SessionDAO.cleanup_old_sessions(db_session, max_sessions)
            
        # Clean up memory cache
        if len(self._user_sessions_cache) > max_sessions:
            # Simple LRU cleanup
            cache_items = list(self._user_sessions_cache.items())
            keep_items = cache_items[-max_sessions:]
            self._user_sessions_cache = dict(keep_items)
            
        logger.info(f"Cleaned up sessions: {deleted_count} from database, cache size: {len(self._user_sessions_cache)}")

    def logout_current_user(self):
        """Logout current user, clean up session cache and Flask session"""
        try:
            current_session_id = self.session_id
            if current_session_id:
                # Remove current session from memory cache
                if current_session_id in self._user_sessions_cache:
                    del self._user_sessions_cache[current_session_id]
                    logger.info(f"Removed session {current_session_id} from cache")
                
                # Clear session_id from Flask session
                if 'session_id' in session:
                    session.pop('session_id')
                    logger.info(f"Cleared session_id from Flask session")
                
                # Reset current session ID
                self.session_id = ""
                
                logger.info(f"Successfully logged out user from session {current_session_id}")
            else:
                logger.info("No active session to logout")
        except Exception as e:
            logger.error(f"Error during logout: {e}")
