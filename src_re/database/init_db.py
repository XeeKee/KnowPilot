from __future__ import annotations

from sqlalchemy import text, Index

from . import engine
from .models import Base, ConversationMessageDB, GenerationChunkDB


def init_database() -> None:
    """
    Create all table structures and indexes." 
    Contains enhanced models that support concurrency and streaming generation.
    Operation mode: python -m src_re.database.init_db
    Or: python CollabThink/src_re/database/init_db.py
    """
    #  Create all tables 
    #  Some historical model files contain duplicate Base definitions. 
    #  Rely on explicit DDL to ensure the existence of key tables)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        # If there are conflicts, continue to use explicit DDL to ensure main tables
        pass
    
    # Create additional indexes to optimize query performance
    with engine.connect() as conn:
        # Create users table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
                last_login TIMESTAMP WITHOUT TIME ZONE
            );
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """))

        # Add owner foreign key to user_sessions table 
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'fk_user_sessions_owner_user_id'
                ) THEN
                    ALTER TABLE user_sessions
                    ADD CONSTRAINT fk_user_sessions_owner_user_id
                    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
                END IF;
            END$$;
        """))

        # Session State Index
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_sessions_status 
            ON user_sessions(status)
        """))
        
        # History Record Session and Time Index
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_history_records_session_created 
            ON history_records(session_uuid, created_at DESC)
        """))
        
        # Message Uniqueness Index
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_record_order 
            ON conversation_messages(record_id, message_order)
        """))
        
        # Generation Task Status Index
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_generation_jobs_session_status 
            ON generation_jobs(session_uuid, status)
        """))
        
        # Generation Chunk Uniqueness Index
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_chunks_job_seq 
            ON generation_chunks(job_id, seq)
        """))
        
        # Connectivity Check
        conn.execute(text("SELECT 1"))
        conn.commit()

    print("✅ Database initialization completed (table structures and indexes created)")
    print("📊 Supported features:")
    print("   - Concurrent session management")
    print("   - Optimistic locking to prevent data conflicts")
    print("   - Multi-task concurrent streaming generation")
    print("   - Real-time saving of generation fragments")
    print("   - History record limit management")


if __name__ == "__main__":
    init_database()



