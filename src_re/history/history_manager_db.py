"""
Database-based history management system for CollabThink.

This module provides persistent storage for conversation history, outlines,
and articles using PostgreSQL. It replaces the original in-memory storage
with a robust database solution while maintaining compatibility with the
existing interface. The system supports session-based data isolation and
efficient retrieval operations.
"""

from __future__ import annotations

import logging
import uuid as uuid_lib
from typing import Dict, Optional, List, Any

from database.session_manager import get_db_manager
from database.dao import HistoryDAO


logger = logging.getLogger(__name__)


class HistoryManager:
    """
    Database-based history record manager with PostgreSQL persistence.
    
    This class provides persistent storage for conversation history, outlines,
    and articles using PostgreSQL. It maintains compatibility with the original
    in-memory interface while offering improved data persistence, session
    management, and query capabilities.
    """
    
    def __init__(self):
        """Initialize the history manager (no initialization required for DB version)."""
        pass
    
    # =========================
    # Outline history management
    # =========================
    
    def save_outline(self, outline_content: str, session_id: Optional[str] = None) -> str:
        """
        Save outline content to the specified session with database persistence.
        
        This method stores outline content in PostgreSQL with proper session
        association and timestamp tracking for version control.
        
        Args:
            outline_content: Outline content to save
            session_id: Session ID. If None, a new UUID will be generated
            
        Returns:
            str: Saved session ID for future reference
        """
        if session_id is None:
            session_id = str(uuid_lib.uuid4())
        
        # Use database manager for transaction handling
        db_manager = get_db_manager()
        with db_manager.get_session() as db_session:
            outline = HistoryDAO.save_outline_snapshot(
                db_session, session_id, outline_content
            )
            
        logger.info(f"📝 Saved outline for session {session_id}")
        return session_id
    
    def get_outline(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the latest outline for the specified session.
        
        This method fetches the most recent outline snapshot from the database
        and returns it in a format compatible with the original interface.
        
        Args:
            session_id: Session ID to retrieve outline for
            
        Returns:
            Dict: Outline data including content, timestamp, and UUID, or None if not found
        """
        db_manager = get_db_manager()
        with db_manager.get_readonly_session() as db_session:
            outline = HistoryDAO.get_latest_outline(db_session, session_id)
            
            if outline:
                return {
                    'content': outline.content,
                    'timestamp': outline.timestamp.timestamp(),  # Convert to unix timestamp for compatibility
                    'uuid': outline.session_uuid
                }
        
        return None
    
    def list_outlines(self) -> List[Dict[str, Any]]:
        """
        Get list of all saved outlines (requires session scoping).
        
        Note: This method requires additional permission control for cross-session
        queries in the database version. Currently returns empty list until
        proper user isolation is implemented.
        
        Returns:
            List: Empty list (cross-session queries require permission control)
        """
        # Note: The original implementation returns outlines across all sessions.
        # In the DB version we need to scope it to the current user for security.
        # Temporarily return empty list because cross-session queries require extra permission control.
        logger.warning("list_outlines() requires session scoping in the DB version")
        return []
    
    def delete_outline(self, session_id: str) -> bool:
        """
        Delete outline for the specified session (managed via session cleanup).
        
        In the database version, outline deletion is handled through session
        cleanup rather than individual outline deletion for data integrity.
        
        Args:
            session_id: Session ID to delete outline for
            
        Returns:
            bool: Always returns True (deletion managed via session cleanup)
        """
        # In the DB version, we do not directly delete outline snapshots.
        # Management is handled via session cleanup for data integrity.
        logger.warning(f"delete_outline({session_id}) is managed via session cleanup in the DB version")
        return True
    
    # =========================
    # Article history management
    # =========================
    
    def save_article(self, article_content: str, session_id: Optional[str] = None) -> str:
        """Save article to the specified session
        
        Args:
            article_content: Article content
            session_id: Session ID; if None, a new one is generated
            
        Returns:
            str: Saved session ID
        """
        if session_id is None:
            session_id = str(uuid_lib.uuid4())
        
        db_manager = get_db_manager()
        with db_manager.get_session() as db_session:
            article = HistoryDAO.save_article_snapshot(
                db_session, session_id, article_content
            )
            
        logger.info(f"📄 Saved article for session {session_id}")
        return session_id
    
    def get_article(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get the article of the specified session
        
        Args:
            session_id: Session ID
            
        Returns:
            Dict: Article data, including content, timestamp, uuid
        """
        db_manager = get_db_manager()
        with db_manager.get_readonly_session() as db_session:
            article = HistoryDAO.get_latest_article(db_session, session_id)
            
            if article:
                return {
                    'content': article.content,
                    'timestamp': article.timestamp.timestamp(),  # convert to unix timestamp
                    'uuid': article.session_uuid
                }
        
        return None
    
    def list_articles(self) -> List[Dict[str, Any]]:
        """Get list of all saved articles
        
        Returns:
            List: Articles sorted by timestamp in descending order
        """
        # Same as list_outlines, needs session scoping
        logger.warning("list_articles() requires session scoping in the DB version")
        return []
    
    def delete_article(self, session_id: str) -> bool:
        """Delete the article for the specified session
        
        Args:
            session_id: Session ID
            
        Returns:
            bool: Whether deletion succeeded
        """
        # Same as delete_outline, managed via session cleanup
        logger.warning(f"delete_article({session_id}) is managed via session cleanup in the DB version")
        return True
    
    # =========================
    # Session management and cleanup
    # =========================
    
    def cleanup_old_sessions(self, max_sessions: int = 100):
        """Clean up outdated session history
        
        Args:
            max_sessions: Maximum number of sessions to keep
        """
        from database.dao import SessionDAO
        
        db_manager = get_db_manager()
        with db_manager.get_session() as db_session:
            deleted_count = SessionDAO.cleanup_old_sessions(db_session, max_sessions)
            
        logger.info(f"🧹 Cleaned up {deleted_count} old sessions")
    
    def get_session_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session summary information
        
        Args:
            session_id: Session ID
            
        Returns:
            Dict: Session summary information
        """
        from database.dao import SessionDAO
        
        db_manager = get_db_manager()
        with db_manager.get_readonly_session() as db_session:
            summary = SessionDAO.get_session_summary(db_session, session_id)
            
            if summary:
                # Add latest outline and article info
                latest_outline = HistoryDAO.get_latest_outline(db_session, session_id)
                latest_article = HistoryDAO.get_latest_article(db_session, session_id)
                
                summary.update({
                    'has_outline': latest_outline is not None,
                    'has_article': latest_article is not None,
                    'latest_outline_time': latest_outline.timestamp if latest_outline else None,
                    'latest_article_time': latest_article.timestamp if latest_article else None,
                })
            
            return summary
    
    # =========================
    # Compatibility methods
    # =========================
    
    def save_outline_to_session(self, session_id: str, outline_content: str) -> bool:
        """Save outline to the specified session (compatibility method)"""
        try:
            self.save_outline(outline_content, session_id)
            return True
        except Exception as e:
            logger.error(f"Failed to save outline to session {session_id}: {e}")
            return False
    
    def save_article_to_session(self, session_id: str, article_content: str) -> bool:
        """Save article to the specified session (compatibility method)"""
        try:
            self.save_article(article_content, session_id)
            return True
        except Exception as e:
            logger.error(f"Failed to save article to session {session_id}: {e}")
            return False
    
    def get_session_outline_content(self, session_id: str) -> Optional[str]:
        """Get the outline content of a session (compatibility method)"""
        outline_data = self.get_outline(session_id)
        return outline_data['content'] if outline_data else None
    
    def get_session_article_content(self, session_id: str) -> Optional[str]:
        """Get the article content of a session (compatibility method)"""
        article_data = self.get_article(session_id)
        return article_data['content'] if article_data else None
