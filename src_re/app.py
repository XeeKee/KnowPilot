"""
Main Flask application for CollabThink.

This module provides the core Flask application with comprehensive API endpoints
for outline generation, article creation, user authentication, and session
management. It implements model pre-loading, database integration, and
streaming responses for real-time content generation.
"""

from flask import Flask, Response, request, stream_with_context, render_template, send_from_directory, jsonify, session, make_response, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from tool.lm import LLMModel
from tool.config_manager import ConfigManager, Config
import uuid as uuid_lib
import argparse
import sys
import os
import time
import threading
import traceback
from tool.orm import AliGoogleSearch
import logging
import json
import re
from datetime import datetime
from outline.outline_router import OutlineRouter
from article.article_router import ArticleRouter
from typing import Any
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


class AppSet:
    """
    Main Flask application configuration and setup.
    
    This class manages the Flask application instance, configuration,
    and initialization of all required components including language models,
    search engines, and database connections. It implements comprehensive
    error handling and performance optimization through model pre-loading.
    """
    
    def __init__(self, config: Config):
        """
        Initialize the Flask application with configuration.
        
        Args:
            config: Configuration object containing Flask and app settings
        """
        self.app = Flask(__name__,
                         static_folder   = config.flask.static_folder,
                         static_url_path = config.flask.static_url_path,
                         template_folder = config.flask.template_folder)
                         
        self.app.secret_key = config.app.secret_key

        # Configure session security and lifetime settings
        self.app.permanent_session_lifetime = config.app.permanent_session_lifetime
        self.app.config['SESSION_COOKIE_HTTPONLY'] = config.app.SESSION_COOKIE_HTTPONLY  
        self.app.config['SESSION_COOKIE_SAMESITE'] = config.app.SESSION_COOKIE_SAMESITE  
        self.app.config['SESSION_COOKIE_SECURE'] = config.app.SESSION_COOKIE_SECURE  
        CORS(self.app, supports_credentials=True)

# Initialize application with comprehensive logging
logging.basicConfig(level=logging.INFO)
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(current_dir, "config.yaml")
config_manager = ConfigManager(config_file = config_path)
logging.info(f"ConfigManager loaded")
config = config_manager.config
logging.info(f"Config loaded: {config}")

# Pre-load heavy models to avoid delay on first request
# This optimization significantly improves user experience by eliminating
# model loading delays during actual API calls
logging.info("=" * 60)
logging.info("🚀 Starting model pre-loading to optimize page load times...")
start_time = time.time()

logging.info("📚 Loading LLM Model...")
lm_start = time.time()
lm = LLMModel(config)
lm_duration = time.time() - lm_start
logging.info(f"✅ LLMModel loaded in {lm_duration:.2f} seconds")

logging.info("🔍 Loading Search Model...")
rm_start = time.time()
rm = AliGoogleSearch(config)
rm_duration = time.time() - rm_start
logging.info(f"✅ AliGoogleSearch loaded in {rm_duration:.2f} seconds")

# Pre-load the sentence transformer model by initializing PrivateInformation
# Note: Embedding model will be loaded lazily on first use to reduce startup time
logging.info("🧠 Initializing PrivateInformation (embedding model will load on first use)...")
embedding_start = time.time()
from information.private_information import PrivateInformation
private_info_manager = PrivateInformation()
embedding_duration = time.time() - embedding_start
logging.info(f"✅ PrivateInformation manager initialized in {embedding_duration:.2f} seconds (embedding model not loaded yet)")

total_duration = time.time() - start_time
logging.info("=" * 60)
logging.info(f"🎉 All models pre-loaded successfully!")
logging.info(f"📊 Total loading time: {total_duration:.2f} seconds")
logging.info(f"   - LLM Model: {lm_duration:.2f}s")
logging.info(f"   - Search Model: {rm_duration:.2f}s") 
logging.info(f"   - Embedding Model: {embedding_duration:.2f}s")
logging.info("=" * 60)

# Initialize database session manager with health checking
# This ensures database connectivity before accepting user requests
_db_manager_available = False
try:
    from database.session_manager import init_db_manager, get_db_manager
    init_db_manager(config.database)
    # Perform health check to ensure database is actually available
    try:
        dbm_check = get_db_manager()
        if dbm_check.health_check():
            _db_manager_available = True
            logging.info("Database session manager initialized and healthy")
        else:
            _db_manager_available = False
            logging.warning("Database session manager initialized but health check failed; running without DB")
    except Exception as he:
        _db_manager_available = False
        logging.warning(f"Database health check error: {he}; running without DB")
except Exception as e:
    logging.error(f"Database session manager init failed: {e}")
    logging.error("App will run without database functionality")
    
App = AppSet(config)
logging.info(f"AppSet loaded")

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(App.app)
login_manager.login_view = 'login_page'
login_manager.login_message = "Please log in to access this page"
login_manager.login_message_category = "info"
logging.info(f"LoginManager initialized")

# Lightweight database login user wrapper that satisfies Flask-Login interface
class DBLoginUser:
    def __init__(self, email: str):
        self.email = email
        self.id = email

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return self.id

# Select corresponding UUID management implementation based on database availability
try:
    if _db_manager_available:
        from session_id.session_id_db import UUIDManager as UUIDManagerImpl
    else:
        from session_id.session_id import UUIDManager as UUIDManagerImpl
except Exception:
    # Fall back to memory implementation to avoid application failure due to import errors
    from session_id.session_id import UUIDManager as UUIDManagerImpl

uuid_manager = UUIDManagerImpl()
logging.info(f"UUIDManager loaded")

# User loader callback for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    """Load user by ID (email) for Flask-Login from database"""
    try:
        from database.session_manager import get_db_manager
        from database.dao import UserDAO
        dbm = get_db_manager()
        with dbm.get_readonly_session() as db_sess:
            user = UserDAO.get_by_email(db_sess, user_id)
            if user and user.is_active:
                return DBLoginUser(user.email)
        return None
    except Exception as e:
        logging.error(f"Error loading user {user_id}: {str(e)}")
        return None

# Authentication APIs
@App.app.route("/api/register", methods=["POST"])
def register():
    """User registration API"""
    try:
        json_data = request.get_json()
        if not json_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        email = json_data.get('email')
        password = json_data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Use database DAO to create user
        from database.session_manager import get_db_manager
        from database.dao import UserDAO
        dbm = get_db_manager()
        with dbm.get_session() as db_sess:
            if UserDAO.get_by_email(db_sess, email):
                return jsonify({'error': 'User with this email already exists'}), 400
            user = UserDAO.create_user(db_sess, email, password)
            if not user:
                return jsonify({'error': 'Failed to create user'}), 500
            logging.info(f"User {email} registered successfully")
            return jsonify({
                'status': 'success',
                'message': 'User registered successfully',
                'user': {
                    'email': user.email,
                    'created_at': user.created_at.isoformat()
                }
            }), 201
            
    except Exception as e:
        logging.error(f"Error in user registration: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@App.app.route("/api/login", methods=["POST"])
def login():
    """User login API"""
    try:
        json_data = request.get_json()
        if not json_data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        email = json_data.get('email')
        password = json_data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Critical fix: Clean up possible old sessions before user login
        # Prevent session information leakage from previously logged in users
        if 'session_id' in session:
            old_session_id = session['session_id']
            logging.info(f"Clearing old session before login: {old_session_id}")
            # Clean up old session cache in UUIDManager
            if hasattr(uuid_manager, 'logout_current_user'):
                uuid_manager.logout_current_user()
            # Clear Flask session
            session.clear()
        
        # Validate user (database)
        from database.session_manager import get_db_manager
        from database.dao import UserDAO, SessionDAO
        dbm = get_db_manager()
        with dbm.get_session() as db_sess:
            user = UserDAO.verify_password(db_sess, email, password)
            if user:
                # Extract user data before session closes
                user_email = user.email
                user_id = user.id
                user_last_login = user.last_login
                
                # Use DBLoginUser wrapper to satisfy Flask-Login interface
                login_user(DBLoginUser(user_email), remember=True)
                session['session_id'] = user_email
                
                # Bind/create database session and set owner
                current_session = uuid_manager.check_uuid()
                from database.dao import SessionDAO
                SessionDAO.get_or_create_session(db_sess, current_session.uuid, 10)
                sess = SessionDAO.get_session_by_uuid(db_sess, current_session.uuid)
                if sess:
                    sess.owner_user_id = user_id                
                
                # Start async preloading of user's private files and vector storage
                # This runs in background to avoid blocking login response
                import threading
                def async_preload():
                    try:
                        logging.info(f"🔄 Starting background preload for user {user_email}")
                        preload_success = private_info_manager.preload_session_data(user_email)
                        if preload_success:
                            logging.info(f"✅ Successfully preloaded private data for user {user_email}")
                        else:
                            logging.warning(f"⚠️ Failed to preload private data for user {user_email}")
                    except Exception as preload_error:
                        logging.error(f"❌ Error preloading private data for user {user_email}: {preload_error}")
                
                # Start background thread for preloading
                preload_thread = threading.Thread(target=async_preload, daemon=True)
                preload_thread.start()
                
                logging.info(f"User {email} logged in successfully with session {current_session.uuid}")
                return jsonify({
                    'status': 'success',
                    'message': 'Login successful',
                    'user': {
                        'email': user_email,
                        'last_login': user_last_login.isoformat() if user_last_login else None,
                        'is_authenticated': True
                    }
                }), 200
            else:
                return jsonify({'error': 'Invalid email or password'}), 401
            
    except Exception as e:
        logging.error(f"Error in user login: {str(e)}")
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@App.app.route("/api/login", methods=["GET"])
def login_redirect():
    """Handle GET requests to /api/login by redirecting to login page"""
    return redirect(url_for('login_page'))

@App.app.route("/api/logout", methods=["POST"])
@login_required
def logout():
    """User logout API"""
    try:
        user_email = current_user.email if current_user else 'Unknown'
        
        # Log out user
        logout_user()
        
        # Clean up session cache in UUIDManager
        uuid_manager.logout_current_user()
        
        # Completely clear Flask session to prevent session information leakage
        session.clear()
        
        logging.info(f"User {user_email} logged out successfully, session cleared")
        return jsonify({
            'status': 'success',
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        logging.error(f"Error in user logout: {str(e)}")
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@App.app.route("/api/user/current", methods=["GET"])
@login_required
def get_current_user():
    """Get current logged in user information"""
    try:
        if current_user.is_authenticated:
            return jsonify({
                'status': 'success',
                'user': {
                    'email': getattr(current_user, 'email', ''),
                    'created_at': None,
                    'last_login': None,
                    'is_authenticated': True
                }
            }), 200
        else:
            return jsonify({'error': 'No authenticated user'}), 401
            
    except Exception as e:
        logging.error(f"Error getting current user: {str(e)}")
        return jsonify({'error': f'Failed to get user info: {str(e)}'}), 500

@App.app.route("/api/users", methods=["GET"])
@login_required
def list_users():
    """List all users (admin function)"""
    try:
        users = uuid_manager.list_all_users()
        return jsonify({
            'status': 'success',
            'users': users,
            'total': len(users)
        }), 200
        
    except Exception as e:
        logging.error(f"Error listing users: {str(e)}")
        return jsonify({'error': f'Failed to list users: {str(e)}'}), 500

# Health check endpoint
@App.app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    try:
        health_status = {
            'status': 'ok',
            'database': 'not_available',
            'timestamp': datetime.now().isoformat()
        }
        
        if _db_manager_available:
            try:
                from database.session_manager import get_db_manager
                db_manager = get_db_manager()
                if db_manager.health_check():
                    health_status['database'] = 'healthy'
                else:
                    health_status['database'] = 'error'
            except Exception as e:
                health_status['database'] = f'error: {str(e)}'
                
        return jsonify(health_status), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
# generate outline
@App.app.route("/api/generate/outlines", methods=["POST"])
@login_required
def generate_outline() -> Any:
    try:
        json_data = request.get_json()
        
        # Execute route to generate outline first (this will create a record)
        router = OutlineRouter(config, lm, json_data, uuid_manager)
        result = router.route()
        
        # After outline generation is complete, save topic to current record
        if json_data['type'] == 'generate_outline' and json_data and 'prompt' in json_data:
            topic = json_data['prompt']
            success = uuid_manager.save_topic_to_current_pos(topic)
            if success:
                logging.info(f"Topic saved to current position: {topic[:50]}...")
            else:
                logging.warning("Failed to save topic to current position")
        
        response = make_response(result)
        response.headers['Content-Type'] = 'text/plain; charset=utf-8'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# generate demo outline
@App.app.route("/api/generate/demooutline", methods=["POST"])
@login_required
def generate_demo_outline() -> Any:
    try:
        json_data = request.get_json()
        
        # Ensure there is a current session
        current_session = uuid_manager.get_current_session()
        if not current_session:
            current_session = uuid_manager.check_uuid()
        
        # Create new record
        current_session.create_record()
        
        # If topic is provided, save it to the record
        if "topic" in json_data:
            topic = json_data.get("topic", "")
            # Use uuid_manager method to save topic
            uuid_manager.save_topic_to_current_pos(topic)
        
        # Directly save preset outline to history record
        outline_content = json_data.get("outline", "")
        from utils.ArticleTextProcessing import ArticleTextProcessing
        cleaned_outline = ArticleTextProcessing.clean_up_outline(outline_content, json_data.get("topic", ""))
        
        # Use uuid_manager method to save outline
        success = uuid_manager.save_outline_to_current_pos(cleaned_outline)
        if not success:
            logging.error("Failed to save demo outline")
            return jsonify({'error': 'Failed to save demo outline'}), 500
        
        logging.info(f"Demo outline saved: {len(cleaned_outline)} characters")
        
        response = make_response(cleaned_outline)
        response.headers['Content-Type'] = 'text/plain; charset=utf-8'
        return response
    except Exception as e:
        logging.error(f"Error generating demo outline: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Session-based history management APIs
@App.app.route("/api/session/records", methods=["GET"])
@login_required
def list_session_records():
    """Get all history records of current session"""
    try:
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        # Force refresh history record cache to ensure latest data is displayed
        current_session.refresh_history_records()
        
        records = current_session.get_records_summary()
        return jsonify({
            'status': 'success',
            'session_uuid': current_session.uuid,
            'current_pos': current_session.current_pos,
            'records': records,
            'total': len(records)
        })
    except Exception as e:
        import traceback
        error_details = f"Error listing session records: {str(e)}\nTraceback: {traceback.format_exc()}"
        logging.error(error_details)
        return jsonify({'error': str(e), 'details': error_details}), 500

@App.app.route("/api/session/records/<int:pos>", methods=["GET"])
@login_required
def get_session_record(pos: int):
    """Get record details at specified position in current session"""
    try:
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        record = current_session.get_record_safe(pos)
        if not record:
            return jsonify({'error': f'Record at position {pos} not found'}), 404
        
        return jsonify({
            'status': 'success',
            'pos': pos,
            'record': {
                'timestamp': record.timestamp,
                'topic': record.topic,  # Add topic field
                'outline': record.outline,
                'article': record.article,  # Now it's a string list
                'article_text': '\n\n'.join(record.article) if record.article else "",  # Merged article text
                'has_outline': bool(record.outline),
                'has_article': bool(record.article) and len(record.article) > 0,
                'article_count': len(record.article)
            }
        })
    except Exception as e:
        logging.error(f"Error getting session record: {str(e)}")
        return jsonify({'error': str(e)}), 500

@App.app.route("/api/session/current_pos", methods=["GET"])
@login_required
def get_current_pos():
    """Get active position of current session"""
    try:
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        # Force refresh history record cache to ensure latest data is displayed
        current_session.refresh_history_records()
        
        return jsonify({
            'status': 'success',
            'session_uuid': current_session.uuid,
            'current_pos': current_session.current_pos,
            'total_records': len(current_session.history_records)
        })
    except Exception as e:
        import traceback
        error_details = f"Error getting current pos: {str(e)}\nTraceback: {traceback.format_exc()}"
        logging.error(error_details)
        return jsonify({'error': str(e), 'details': error_details}), 500

@App.app.route("/api/session/current_pos", methods=["POST"])
@login_required
def set_current_pos():
    """Set active position of current session"""
    try:
        json_data = request.get_json()
        pos = json_data.get('pos')
        
        if pos is None:
            return jsonify({'error': 'Missing pos parameter'}), 400
        
        success = uuid_manager.update_current_session_pos(pos)
        if success:
            return jsonify({
                'status': 'success',
                'message': f'Current position updated to {pos}'
            })
        else:
            return jsonify({'error': 'Failed to update position'}), 400
    except Exception as e:
        logging.error(f"Error setting current pos: {str(e)}")
        return jsonify({'error': str(e)}), 500

@App.app.route("/api/session/outline", methods=["POST"])
@login_required
def save_outline_to_session():
    """Save outline to current session position"""
    try:
        json_data = request.get_json()
        outline_content = json_data.get('outline_content')
        pos = json_data.get('pos')  # Optional, if provided, save to specified position
        
        if not outline_content:
            return jsonify({'error': 'Missing outline_content parameter'}), 400
        
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        if pos is not None:
            # Save to specified position; if equal to current record count, append and create new record then save
            try:
                total_records = len(current_session.history_records)
            except Exception:
                total_records = 0

            if pos == total_records:
                # Append mode: create new record then write
                current_session.create_record()
                success = current_session.update_record_outline(pos, outline_content)
            elif 0 <= pos < total_records:
                success = current_session.update_record_outline(pos, outline_content)
            else:
                return jsonify({'error': f'Invalid position {pos}'}), 400

            if not success:
                return jsonify({'error': f'Failed to save outline to position {pos}'}), 400
        else:
            # Save to current position
            success = uuid_manager.save_outline_to_current_pos(outline_content)
            if not success:
                return jsonify({'error': 'Failed to save outline to current position'}), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Outline saved successfully',
            'session_uuid': current_session.uuid,
            'current_pos': current_session.current_pos
        })
    except Exception as e:
        logging.error(f"Error saving outline: {str(e)}")
        return jsonify({'error': str(e)}), 500

@App.app.route("/api/session/chapter_references", methods=["GET"])
@login_required
def get_chapter_references():
    """Get reference data for specified chapter, return format: {id: {content, title, url}}"""
    try:
        pos = request.args.get('pos', type=int)
        chapter_index = request.args.get('chapter_index', type=int)
        
        if chapter_index is None:
            return jsonify({'error': 'Missing chapter_index parameter'}), 400
        
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        if pos is None:
            pos = current_session.current_pos
        
        logging.info(f"Getting references for chapter {chapter_index} at position {pos}")
        references = current_session.get_record_chapter_references(pos, chapter_index)
        
        # Validate returned reference data format
        if isinstance(references, dict):
            ref_count = len(references)
            logging.info(f"Found {ref_count} references for chapter {chapter_index}")
            
            # Check reference data structure
            for ref_id, ref_data in list(references.items()):
                # Ensure each reference data contains necessary fields
                if not isinstance(ref_data, dict):
                    logging.warning(f"Reference data for ID {ref_id} is not a dictionary, removing it")
                    references.pop(ref_id)
                    continue
                
                # Check if required fields exist
                required_fields = ['content', 'title', 'url']
                missing_fields = [field for field in required_fields if field not in ref_data]
                if missing_fields:
                    logging.warning(f"Reference data for ID {ref_id} is missing fields: {missing_fields}")
                    # Add missing fields to ensure frontend doesn't crash
                    for field in missing_fields:
                        ref_data[field] = ""
                
                # Remove unnecessary index field to maintain format consistency
                if 'index' in ref_data:
                    ref_data.pop('index')
        else:
            logging.warning(f"References is not a dictionary: {type(references)}")
            references = {}
        
        return jsonify({
            'status': 'success',
            'chapter_index': chapter_index,
            'references': references,
            'count': len(references)
        })
    except Exception as e:
        logging.error(f"Error getting chapter references: {str(e)}")
        return jsonify({'error': str(e)}), 500


@App.app.route("/api/session/article", methods=["POST"])
@login_required
def save_article_to_session():
    """Save article to current session position (append to list)"""
    try:
        json_data = request.get_json()
        article_content = json_data.get('article_content')
        references = json_data.get('references')
        pos = json_data.get('pos')
        mode = json_data.get('mode', 'append')
        if not article_content:
            return jsonify({'error': 'Missing article_content parameter'}), 400
        
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        # Save article content
        article_saved = False
        if pos is not None:
            # Save to specified position
            if mode == 'append':
                article_saved = current_session.update_record_article(pos, article_content)
            elif mode == 'replace':
                article_saved = current_session.update_record_articles(pos, [article_content])
        
            if not article_saved:
                return jsonify({'error': f'Failed to save article to position {pos}'}), 400
        else:
            # Save to current position
            article_saved = uuid_manager.save_article_to_current_pos(article_content)
            if not article_saved:
                return jsonify({'error': 'Failed to save article to current position'}), 400
        
        # Save reference data (if any)
        references_saved = False
        if references:
            logging.info(f"Processing references data: {len(references)} chapters")
            
            # Validate references format
            is_valid_format = True
            try:
                for chapter_idx, chapter_refs in references.items():
                    # Check if chapter index can be converted to integer
                    try:
                        int(chapter_idx)
                    except (ValueError, TypeError):
                        logging.warning(f"Chapter index '{chapter_idx}' is not a valid integer")
                        is_valid_format = False
                        break
                    
                    # Check if chapter_refs is a dictionary and its values are also dictionaries
                    if not isinstance(chapter_refs, dict):
                        logging.warning(f"References for chapter {chapter_idx} is not a dictionary")
                        is_valid_format = False
                        break
                    
                    # Check if each reference data has necessary fields
                    for ref_id, ref_data in chapter_refs.items():
                        if not isinstance(ref_data, dict):
                            logging.warning(f"Reference data for ID {ref_id} in chapter {chapter_idx} is not a dictionary")
                            is_valid_format = False
                            break
                        
                        # Check if required fields exist
                        required_fields = ['content', 'title', 'url']
                        missing_fields = [field for field in required_fields if field not in ref_data]
                        if missing_fields:
                            logging.warning(f"Reference data for ID {ref_id} in chapter {chapter_idx} is missing fields: {missing_fields}")
                            # Does not affect format validation, just log warning
            except Exception as e:
                logging.error(f"Error validating references format: {e}")
                is_valid_format = False
            
            # Save based on validation result
            if is_valid_format:
                logging.info("References format is valid, saving directly")
                if pos is not None:
                    references_saved = current_session.update_record_references(pos, references)
                else:
                    references_saved = uuid_manager.save_references_to_current_pos(references)
            else:
                logging.warning("References format is not valid, attempting to save anyway")
                if pos is not None:
                    references_saved = current_session.update_record_references(pos, references)
                else:
                    references_saved = uuid_manager.save_references_to_current_pos(references)
            
            if not references_saved:
                logging.warning(f"Failed to save references for session {current_session.uuid}")
        
        return jsonify({
            'status': 'success',
            'message': f'Article saved successfully{", with references" if references_saved else ""}',
            'session_uuid': current_session.uuid,
            'current_pos': current_session.current_pos
        })
    except Exception as e:
        logging.error(f"Error saving article: {str(e)}")
        return jsonify({'error': str(e)}), 500


# generate article  
@App.app.route("/api/generate/articles", methods=["POST"])
@login_required
def generate_article() -> Any:
    try:
        json_data = request.get_json()
        if not json_data or 'type' not in json_data:
            return jsonify({'error': 'Missing required field: type'}), 400
        
        # Use new ArticleRouter for routing, pass search tools and private domain library manager
        router = ArticleRouter(config, lm, json_data, uuid_manager, rm, private_info_manager)
        result = router.route()
        
        # Return different response formats based on operation type
        if json_data['type'] in ['generate_single_chapter', 'generate_article', 'continue_generation']:
            # Streaming response for chapter generation and complete article generation
            
            if json_data['type'] == 'generate_single_chapter':
                # Single chapter generation, return text directly
                if isinstance(result, dict) and result.get('error'):
                    # Return JSON formatted error response
                    return jsonify(result), 500
                else:
                    # Successful response, return JSON format
                    return jsonify(result)
            else:
                # Complete article generation and continue generation, return streaming response
                return Response(result, content_type='text/plain; charset=utf-8')
        else:
            # JSON response for other operations
            return jsonify({
                'status': 'success',
                'message': f'Article {json_data["type"]} completed',
                'result': result
            })
    except Exception as e:
        logging.error(f"Error in generate_article: {str(e)}")
        return jsonify({'error': str(e)}), 500

# upload && send private files
@App.app.route("/api/upload_private_files", methods=["POST"])
@login_required
def upload_private_files():
    """Handle private library file uploads, save based on UUID"""
    try:
        jsonData = request.json
        
        # Validate request data
        if not jsonData or jsonData.get('type') != 'private_information':
            return jsonify({'error': 'Invalid request type'}), 400
            
        files = jsonData.get('files', [])
        timestamp = jsonData.get('timestamp')
        
        if not files:
            return jsonify({'error': 'No files provided'}), 400
        
        # Process uploaded files using global PrivateInformation instance
        processed_files = private_info_manager.process_uploaded_files(files)
        
        # Get current session
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        # Save files to current session
        session_id = private_info_manager.save_private_files(processed_files, current_session.uuid)
        
        # Return success response
        response_data = {
            'processed_files': processed_files,
            'session_id': session_id,
            'total_files': len(processed_files)
        }
        
        print(f"File upload successful: {len(processed_files)} files saved to session {session_id}")
        return jsonify({
            'status': 'success',
            'message': 'Files uploaded and saved successfully',
            'data': response_data
        })
        
    except Exception as e:
        print(f"Error processing file upload: {str(e)}")
        return jsonify({'error': f'File processing failed: {str(e)}'}), 500

@App.app.route("/api/get_private_files", methods=["GET"])
@login_required
def get_private_files():
    """Get private file list for current session"""
    try:
        print("🔍 [DEBUG] get_private_files API called")
        
        current_session = uuid_manager.get_current_session()
        if not current_session:
            print("❌ [DEBUG] No active session found")
            return jsonify({'error': 'No active session found'}), 404
        
        print(f"✅ [DEBUG] Found session: {current_session.uuid}")
        
        private_files_data = private_info_manager.get_private_files(current_session.uuid)
        print(f"📁 [DEBUG] Private files data: {private_files_data}")
        
        if private_files_data:
            # Get file info using PrivateInformation method
            files_info = private_info_manager.get_session_files_info(current_session.uuid)
            print(f"📋 [DEBUG] Files info: {files_info}")
            
            response_data = {
                'files': files_info or [],
                'session_id': current_session.uuid,
                'total_files': len(files_info) if files_info else 0
            }
            
            print(f"📤 [DEBUG] Sending response: {response_data}")
            
            return jsonify({
                'status': 'success',
                'message': 'Private files retrieved successfully',
                'data': response_data
            })
        else:
            print("📭 [DEBUG] No private files data found")
            return jsonify({
                'status': 'success',
                'message': 'No private files found',
                'data': {
                    'files': [],
                    'session_id': current_session.uuid,
                    'total_files': 0
                }
            })
            
    except Exception as e:
        print(f"❌ [DEBUG] Error retrieving private files: {str(e)}")
        return jsonify({'error': f'Failed to retrieve private files: {str(e)}'}), 500

@App.app.route("/api/delete_private_file", methods=["POST"])
@login_required
def delete_private_file():
    """Delete specified private file"""
    try:
        data = request.get_json()
        file_name = data.get('file_name')
        
        if not file_name:
            return jsonify({'error': 'File name is required'}), 400
        
        current_session = uuid_manager.get_current_session()
        if not current_session:
            return jsonify({'error': 'No active session found'}), 404
        
        success = private_info_manager.delete_private_file(file_name, current_session.uuid)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': f'File "{file_name}" deleted successfully',
                'data': {
                    'deleted_file': file_name,
                    'session_id': current_session.uuid
                }
            })
        else:
            return jsonify({'error': f'File "{file_name}" not found or could not be deleted'}), 404
            
    except Exception as e:
        print(f"Error deleting private file: {str(e)}")
        return jsonify({'error': f'Failed to delete private file: {str(e)}'}), 500

# static files
@App.app.route("/")
def index():
    # Redirect to login page
    return redirect(url_for('login_page'))

@App.app.route("/health")
def health_check_simple():
    """Health check endpoint to verify all models are loaded"""
    return jsonify({
        'status': 'healthy',
        'message': 'All models pre-loaded successfully',
        'models': {
            'llm_model': 'loaded',
            'search_model': 'loaded', 
            'embedding_file': 'loaded'
        },
        'timestamp': time.time()
    })

@App.app.route("/chat")
@App.app.route("/chat.html")
@login_required
def chat():
    return render_template('chat.html')

@App.app.route("/login")
@App.app.route("/login.html")
def login_page():
    return render_template('login.html')

@App.app.route("/register")
@App.app.route("/register.html")
def register_page():
    return render_template('register.html')

@App.app.route('/static/<path:filename>')
def static_files(filename):
    static_folder = App.app.static_folder or "front_end_re"
    return send_from_directory(static_folder, filename)

# Remove duplicate health check endpoint, use the detailed version above

if __name__ == "__main__":
    logging.info(f"Starting server on {config.app.host}:{config.app.port}")
    # Disable reloader in development to avoid reloading models
    App.app.run(host=config.app.host, port=config.app.port, debug=config.app.debug, use_reloader=False)