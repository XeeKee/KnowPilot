"""
Session management and user authentication module.

This module provides comprehensive session management, user authentication,
and history tracking for the CollabThink application. It implements
Flask-Login integration, secure password hashing, and session state
management with proper data structures for conversation history.
"""

from typing import List, Dict, Optional
from datetime import datetime
import uuid as uuid_lib
from flask import session
from flask_login import UserMixin
import logging
import hashlib

class User(UserMixin):
    """
    User authentication class with Flask-Login integration.
    
    This class implements the Flask-Login UserMixin interface to provide
    seamless authentication integration. It handles password hashing,
    authentication state management, and user session tracking.
    """
    
    def __init__(self, email: str, password: str = None):
        """
        Initialize user with email and optional password.
        
        Args:
            email: User's email address (used as unique identifier)
            password: Optional password for authentication
        """
        self.id = email  
        self.email = email
        self.password_hash = self._hash_password(password) if password else None
        self._is_authenticated = False  # Use private attribute for security
        self.created_at = datetime.now().isoformat()
        self.last_login = None
    
    @property
    def is_authenticated(self):
        """
        Authentication status property for Flask-Login.
        
        Returns:
            bool: True if user is authenticated, False otherwise
        """
        return self._is_authenticated
    
    @is_authenticated.setter
    def is_authenticated(self, value):
        """
        Setter for authentication status.
        
        Args:
            value: Boolean authentication status
        """
        self._is_authenticated = value
        
    def _hash_password(self, password: str) -> str:
        """
        Hash password using SHA256 for secure storage.
        
        This method implements secure password hashing to prevent
        plaintext password storage in the system.
        
        Args:
            password: Plaintext password to hash
            
        Returns:
            str: SHA256 hash of the password
        """
        if password:
            return hashlib.sha256(password.encode('utf-8')).hexdigest()
        return None
    
    def check_password(self, password: str) -> bool:
        """
        Verify password against stored hash.
        
        Args:
            password: Plaintext password to verify
            
        Returns:
            bool: True if password matches, False otherwise
        """
        if not password or not self.password_hash:
            return False
        return self.password_hash == self._hash_password(password)
    
    def set_password(self, password: str):
        """
        Set new password with secure hashing.
        
        Args:
            password: New plaintext password
        """
        self.password_hash = self._hash_password(password)
    
    def login(self):
        """
        Mark user as authenticated and update login timestamp.
        
        This method updates the authentication state and logs
        the login event for audit purposes.
        """
        self.is_authenticated = True
        self.last_login = datetime.now().isoformat()
        logging.info(f"User {self.email} logged in at {self.last_login}")
    
    def logout(self):
        """
        Mark user as not authenticated.
        
        This method clears the authentication state and logs
        the logout event for audit purposes.
        """
        self.is_authenticated = False
        logging.info(f"User {self.email} logged out")
    
    def get_id(self):
        """
        Return user ID for Flask-Login integration.
        
        Returns:
            str: User identifier (email address)
        """
        return str(self.id)
    
    def __repr__(self):
        return f'<User {self.email}>'

class HistoryRecord:
    """
    History record structure for conversation and content tracking.
    
    This class maintains the state of a single conversation session
    including messages, topic, outline, generated articles, and
    reference materials for each chapter.
    """
    
    def __init__(self):
        """Initialize empty history record with default values."""
        self.messages = []
        self.topic: str = ""         
        self.outline: str = ""
        self.article: List[str] = []  
        # Store reference data with chapter indexing for organized access
        self.references: Dict = {}    # Format: {chapter_index: {id: {content, title, url}}} 
        self.timestamp = datetime.now().isoformat()

class UserSession:
    """
    User session data structure with history management.
    
    This class manages the complete session state including conversation
    history, current position tracking, and session metadata. It provides
    methods for creating, accessing, and managing history records.
    """
    
    def __init__(self, uuid: str):
        """
        Initialize user session with unique identifier.
        
        Args:
            uuid: Unique session identifier
        """
        self.uuid = uuid
        self.max_history = 30  # Maximum number of history records to maintain
        self.history_records: List[HistoryRecord] = []
        self.current_pos: int = -1  # Current active record position
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()
    
    def create_record(self):
        """
        Create new history record and update session state.
        
        This method creates a new history record, manages the history
        size limit, and updates the current position pointer.
        
        Returns:
            HistoryRecord: Newly created history record
        """
        record = HistoryRecord()
        self.history_records.append(record)
        
        # Maintain history size limit by removing oldest records
        if len(self.history_records) > self.max_history:
            self.history_records.pop(0)
        
        # Update current position to newest record
        self.current_pos = len(self.history_records) - 1
        self.updated_at = datetime.now().isoformat()
        logging.info(f"Created new record at pos {self.current_pos} for session {self.uuid}")
        return record
    
    def get_record(self, pos: int):
        """
        Get history record at specified position.
        
        This method provides safe access to history records with
        proper bounds checking and negative index support.
        
        Args:
            pos: Position index (supports negative indexing)
            
        Returns:
            HistoryRecord: Record at specified position
            
        Raises:
            IndexError: When position is out of bounds
        """
        if not self.history_records:
            raise IndexError("No history records available")
        
        # Handle negative indices for convenient access
        if pos < 0:
            pos = len(self.history_records) + pos
        
        if pos < 0 or pos >= len(self.history_records):
            raise IndexError(f"Record position {pos} out of range (0-{len(self.history_records)-1})")
        
        return self.history_records[pos]
    
    def get_record_safe(self, pos: int):
        """Safely get record, return None if failed"""
        try:
            return self.get_record(pos)
        except (IndexError, TypeError):
            return None
    
    def get_all_records(self):
        """Get all history records"""
        return self.history_records
    
    def get_current_record(self):
        """Get current active record"""
        if self.current_pos >= 0 and self.current_pos < len(self.history_records):
            return self.history_records[self.current_pos]
        elif self.history_records:
            self.current_pos = len(self.history_records) - 1
            return self.history_records[self.current_pos]
        return None
    
    def set_current_pos(self, pos: int):
        """Set current active record position"""
        if 0 <= pos < len(self.history_records):
            self.current_pos = pos
            self.updated_at = datetime.now().isoformat()
            logging.info(f"Set current pos to {pos} for session {self.uuid}")
            return True
        return False
    
    def get_current_pos(self):
        """Get current active record position"""
        if not self.history_records:
            return -1
        if self.current_pos < 0 or self.current_pos >= len(self.history_records):
            self.current_pos = len(self.history_records) - 1
        return self.current_pos
    
    def get_records_summary(self):
        """Get history records summary information"""
        records = []
        for i, record in enumerate(self.history_records):
            outline_preview = record.outline[:100] + "..." if len(record.outline) > 100 else record.outline
            records.append({
                'pos': i,
                'timestamp': record.timestamp,
                'topic': record.topic, 
                'has_topic': bool(record.topic), 
                'has_outline': bool(record.outline),
                'has_article': bool(record.article) and len(record.article) > 0,  
                'article_count': len(record.article),  
                'outline_preview': outline_preview,
                'is_current': i == self.current_pos
            })
        return records
    
    def update_record_topic(self, pos: int, topic: str):
        """Update topic of specified record"""
        try:
            record = self.get_record(pos)
            record.topic = topic
            self.updated_at = datetime.now().isoformat()
            return True
        except IndexError:
            return False
    
    def update_record_outline(self, pos: int, outline: str):
        """Update outline of specified record"""
        try:
            record = self.get_record(pos)
            record.outline = outline
            self.updated_at = datetime.now().isoformat()
            return True
        except IndexError:
            return False
    
    def update_record_article(self, pos: int, article: str):
        """Update article of specified record (append to list)"""
        try:
            record = self.get_record(pos)
            record.article.append(article)
            self.updated_at = datetime.now().isoformat()
            return True
        except IndexError:
            return False
    
    def update_record_articles(self, pos: int, articles: List[str]):
        """Update article list of specified record (replace entire list)"""
        try:
            record = self.get_record(pos)
            record.article = articles
            self.updated_at = datetime.now().isoformat()
            return True
        except IndexError:
            return False
    
    def update_record_references(self, pos: int, references: Dict):
        """Update reference data of specified record
        
        references format: {chapter_index: {id: {content, title, url}}}
        """
        try:
            record = self.get_record(pos)
            logging.info(f"Updating references for record at position {pos}")
            
            # Check if references are already in chapter-indexed format
            is_chapter_indexed = all(
                isinstance(chapter_data, dict) and 
                all(isinstance(ref_data, dict) for ref_data in chapter_data.values())
                for chapter_data in references.values()
            ) if references else False
            
            if is_chapter_indexed:
                # If already in chapter-indexed format {chapter_index: {id: {content, title, url}}}
                logging.info("References are already in chapter-indexed format")
                
                if not isinstance(record.references, dict):
                    record.references = {}
                
                # Convert string keys to integer keys (if possible)
                normalized_refs = {}
                for chapter_idx, chapter_refs in references.items():
                    # Try to convert chapter_idx to integer
                    try:
                        idx = int(chapter_idx)
                    except (ValueError, TypeError):
                        idx = chapter_idx
                        
                    normalized_refs[idx] = chapter_refs
                
                # Merge reference data
                for chapter_idx, chapter_refs in normalized_refs.items():
                    if chapter_idx not in record.references:
                        record.references[chapter_idx] = {}
                    record.references[chapter_idx].update(chapter_refs)
            else:
                logging.warning("References are not in expected format, saving as-is")
                record.references = references
                
            self.updated_at = datetime.now().isoformat()
            return True
        except IndexError:
            logging.error(f"Record at position {pos} not found")
            return False
    
    def update_record_chapter_references(self, pos: int, chapter_index: int, chapter_references: Dict):
        """Update reference data for specific chapter of specified record
        
        Args:
            pos: Record position
            chapter_index: Chapter index
            chapter_references: Chapter reference data, format: {id: {content, title, url}}
            
        Returns:
            bool: Whether update was successful
        """
        try:
            record = self.get_record(pos)
            logging.info(f"Updating references for chapter {chapter_index} in record at position {pos}")
            
            if not isinstance(record.references, dict):
                record.references = {}
                
            # Ensure chapter_index is integer or convert to integer
            try:
                chapter_idx = int(chapter_index)
            except (ValueError, TypeError):
                chapter_idx = chapter_index
                
            # Update reference data for this chapter
            record.references[chapter_idx] = chapter_references
            
            self.updated_at = datetime.now().isoformat()
            logging.info(f"Successfully updated references for chapter {chapter_index} in record at position {pos}")
            return True
        except IndexError:
            logging.error(f"Record at position {pos} not found")
            return False
    
    def get_record_articles(self, pos: int) -> List[str]:
        """Get article list of specified record"""
        try:
            record = self.get_record(pos)
            return record.article
        except IndexError:
            return []
    
    def get_record_article_text(self, pos: int) -> str:
        """Get article text of specified record (merge all articles)"""
        try:
            record = self.get_record(pos)
            return '\n\n'.join(record.article)
        except IndexError:
            return ""
            
    def get_record_chapter_references(self, pos: int, chapter_index: int) -> Dict:
        """Get reference data for specific chapter of specified record
        
        Returns format: {id: {content, title, url}}
        """
        try:
            record = self.get_record(pos)
            logging.info(f"Getting chapter references for chapter {chapter_index} from record at position {pos}")
            
            if not isinstance(record.references, dict):
                logging.warning(f"References in record at position {pos} is not a dictionary")
                return {}
                
            if chapter_index in record.references:
                logging.info(f"Found references for chapter {chapter_index}")
                return record.references[chapter_index]
            
            if str(chapter_index) in record.references:
                logging.info(f"Found references for chapter {str(chapter_index)}")
                return record.references[str(chapter_index)]
            
            # If no direct match found for chapter index, return empty dict
            logging.info(f"No references found for chapter {chapter_index}")
            return {}
            
        except IndexError:
            logging.error(f"Record at position {pos} not found")
            return {}
        except Exception as e:
            logging.error(f"Error retrieving chapter references: {e}")
            return {}

class UUIDManager:
    def __init__(self):
        self.user_sessions: List[UserSession] = []
        self.session_id = ""
        self.users: Dict[str, User] = {}  # email -> User mapping
        self.current_user = None  # Current logged in user

    def create_user(self, email: str, password: str) -> Optional[User]:
        """Create new user"""
        if not email or not password:
            logging.error("Email and password are required for user creation")
            return None
            
        if email in self.users:
            logging.warning(f"User with email {email} already exists")
            return None
        
        user = User(email, password)
        self.users[email] = user
        logging.info(f"Created new user: {email}")
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.users.get(email)
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Verify user email and password"""
        user = self.get_user_by_email(email)
        if user and user.check_password(password):
            user.login()
            self.current_user = user
            session['session_id'] = user.email
            self.session_id = user.email
            logging.info(f"User {email} authenticated successfully")
            return user
        logging.warning(f"Authentication failed for user {email}")
        return None
    
    def login_user(self, user: User):
        """Login user"""
        if user:
            user.login()
            self.current_user = user
            session['session_id'] = user.email
            self.session_id = user.email
            logging.info(f"User {user.email} logged in and session created")
    
    def logout_current_user(self):
        """Logout current user"""
        if self.current_user:
            self.current_user.logout()
            logging.info(f"User {self.current_user.email} logged out")
            self.current_user = None
        
        # Clear session_id from session
        if 'session_id' in session:
            session.pop('session_id')
        self.session_id = ""
    
    def get_current_user(self) -> Optional[User]:
        """Get current logged in user"""
        return self.current_user
    
    def list_all_users(self) -> List[Dict]:
        """List all user information (without passwords)"""
        return [
            {
                'email': user.email,
                'created_at': user.created_at,
                'last_login': user.last_login,
                'is_authenticated': user.is_authenticated
            }
            for user in self.users.values()
        ]

    def check_uuid(self):
        """
        Check user session, if user is logged in use user email as session_id
        If not logged in create anonymous session
        """
        # If there is current user, use user email as session_id
        if self.current_user and self.current_user.is_authenticated:
            session['session_id'] = self.current_user.email
            self.session_id = self.current_user.email
        elif 'session_id' not in session:
            # Create anonymous session
            session['session_id'] = str(uuid_lib.uuid4())
            
        self.session_id = session['session_id']

        for user_session in self.user_sessions:
            if user_session.uuid == self.session_id:
                logging.info(f"User session found for uuid: {self.session_id}")
                return user_session

        logging.info(f"Creating new user session for uuid: {self.session_id}")
        new_user_session = UserSession(self.session_id)
        self.user_sessions.append(new_user_session)
        return new_user_session
    
    def get_session_by_uuid(self, uuid: str) -> Optional[UserSession]:
        """Get user session by UUID"""
        for user_session in self.user_sessions:
            if user_session.uuid == uuid:
                return user_session
        return None
    
    def get_current_session(self) -> Optional[UserSession]:
        """Get current session"""
        return self.check_uuid()
    
    def list_all_records(self) -> List[Dict]:
        """List all records from all sessions"""
        all_records = []
        for user_session in self.user_sessions:
            session_records = user_session.get_records_summary()
            for record in session_records:
                record['session_uuid'] = user_session.uuid
                all_records.append(record)
        
        # Sort by timestamp, newest first
        all_records.sort(key=lambda x: x['timestamp'], reverse=True)
        return all_records
    
    def get_record_by_session_and_pos(self, session_uuid: str, pos: int) -> Optional[HistoryRecord]:
        """Get record by session UUID and position"""
        user_session = self.get_session_by_uuid(session_uuid)
        if user_session:
            return user_session.get_record_safe(pos)
        return None
    
    def update_current_session_pos(self, pos: int) -> bool:
        """Update active position of current session"""
        current_session = self.get_current_session()
        if current_session:
            return current_session.set_current_pos(pos)
        return False
    
    def save_topic_to_current_pos(self, topic: str) -> bool:
        """Save topic to current position of current session"""
        current_session = self.get_current_session()
        if current_session:
            current_record = current_session.get_current_record()
            if current_record:
                current_record.topic = topic
                current_session.updated_at = datetime.now().isoformat()
                return True
            else:
                # If no current record, don't auto-create, wait for other places to create record then save
                logging.info(f"No current record found, topic will be saved when record is created: {topic[:50]}...")
                return False
        return False
    
    def save_outline_to_current_pos(self, outline: str) -> bool:
        """Save outline to current position of current session"""
        current_session = self.get_current_session()
        if current_session:
            current_record = current_session.get_current_record()
            if current_record:
                current_record.outline = outline
                current_session.updated_at = datetime.now().isoformat()
                return True
            else:
                # If no current record, create a new one
                new_record = current_session.create_record()
                new_record.outline = outline
                return True
        return False
    
    def save_article_to_current_pos(self, article: str) -> bool:
        """Save article to current position of current session (append to list)"""
        current_session = self.get_current_session()
        if current_session:
            current_record = current_session.get_current_record()
            if current_record:
                current_record.article.append(article)
                current_session.updated_at = datetime.now().isoformat()
                return True
            else:
                # If no current record, create a new one
                new_record = current_session.create_record()
                new_record.article.append(article)
                return True
        return False
    
    def save_articles_to_current_pos(self, articles: List[str]) -> bool:
        """Save article list to current position of current session (replace entire list)"""
        current_session = self.get_current_session()
        if current_session:
            current_record = current_session.get_current_record()
            if current_record:
                current_record.article = articles
                current_session.updated_at = datetime.now().isoformat()
                return True
            else:
                # If no current record, create a new one
                new_record = current_session.create_record()
                new_record.article = articles
                return True
        return False
    
    def save_references_to_current_pos(self, references: Dict) -> bool:
        """Save reference data to current position of current session
        
        references format: {chapter_index: {id: {content, title, url}}}
        """
        current_session = self.get_current_session()
        if current_session:
            current_record = current_session.get_current_record()
            if current_record:
                # Check if references are already in chapter-indexed format
                is_chapter_indexed = all(
                    isinstance(chapter_data, dict) and 
                    all(isinstance(ref_data, dict) for ref_data in chapter_data.values())
                    for chapter_data in references.values()
                ) if references else False
                
                if is_chapter_indexed:
                    # If already in chapter-indexed format {chapter_index: {id: {content, title, url}}}
                    logging.info("References are already in chapter-indexed format")
                    
                    if not isinstance(current_record.references, dict):
                        current_record.references = {}
                    
                    # Convert string keys to integer keys (if possible)
                    normalized_refs = {}
                    for chapter_idx, chapter_refs in references.items():
                        # Try to convert chapter_idx to integer
                        try:
                            idx = int(chapter_idx)
                        except (ValueError, TypeError):
                            idx = chapter_idx
                            
                        normalized_refs[idx] = chapter_refs
                    
                    # Merge reference data
                    for chapter_idx, chapter_refs in normalized_refs.items():
                        if chapter_idx not in current_record.references:
                            current_record.references[chapter_idx] = {}
                        current_record.references[chapter_idx].update(chapter_refs)
                elif any(isinstance(ref, dict) and 'index' in ref for ref in references.values()):
                    # Handle old format: {id: {content, title, url, index}}
                    logging.info("Processing references with index field")
                    
                    if not isinstance(current_record.references, dict):
                        current_record.references = {}
                        
                    # Organize references by chapter
                    for ref_id, ref_data in references.items():
                        chapter_index = ref_data.get('index')
                        if chapter_index is not None:
                            if chapter_index not in current_record.references:
                                current_record.references[chapter_index] = {}
                            # Create a copy of reference data without index field
                            ref_copy = {k: v for k, v in ref_data.items() if k != 'index'}
                            current_record.references[chapter_index][ref_id] = ref_copy
                else:
                    # Handle unknown format or empty references
                    logging.warning("References format unknown or empty, saving as-is")
                    current_record.references = references
                
                current_session.updated_at = datetime.now().isoformat()
                return True
            else:
                # If no current record, create a new one
                logging.info("Creating new record for references")
                new_record = current_session.create_record()
                # Use the same logic to handle reference data
                return self.save_references_to_current_pos(references)
        return False
            

    
    def get_outline_by_session_and_pos(self, session_uuid: str, pos: int) -> Optional[str]:
        """Get outline by session UUID and position"""
        record = self.get_record_by_session_and_pos(session_uuid, pos)
        return record.outline if record else None
    
    def get_article_by_session_and_pos(self, session_uuid: str, pos: int) -> Optional[List[str]]:
        """Get article list by session UUID and position"""
        record = self.get_record_by_session_and_pos(session_uuid, pos)
        return record.article if record else None
    
    def get_article_text_by_session_and_pos(self, session_uuid: str, pos: int) -> Optional[str]:
        """Get article text by session UUID and position (merge all articles)"""
        record = self.get_record_by_session_and_pos(session_uuid, pos)
        return '\n\n'.join(record.article) if record and record.article else None
        
    def get_chapter_references_by_session_and_pos(self, session_uuid: str, pos: int, chapter_index: int) -> Dict:
        """Get chapter reference data by session UUID, position and chapter index"""
        user_session = self.get_session_by_uuid(session_uuid)
        if user_session:
            return user_session.get_record_chapter_references(pos, chapter_index)
        return {}
    
    def cleanup_old_sessions(self, max_sessions: int = 50):
        """Clean up old sessions"""
        if len(self.user_sessions) > max_sessions:
            # Sort by update time, keep newest ones
            self.user_sessions.sort(key=lambda x: x.updated_at, reverse=True)
            removed_count = len(self.user_sessions) - max_sessions
            self.user_sessions = self.user_sessions[:max_sessions]
            logging.info(f"Cleaned up {removed_count} old sessions")


    
    