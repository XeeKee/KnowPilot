#!/usr/bin/env python3
"""
Database migration script: add the 'topic' column to the history_records table.
Before running this script, please ensure that the database is backed up.
"""

import logging
import sys
import os

# Add parent directory to path to ensure modules can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from tool.config_manager import ConfigManager
from database.session_manager import DatabaseSessionManager


def migrate_add_topic_field():
    """Add the 'topic' column to the history_records table"""
    
    # Read configuration
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(current_dir, "config.yaml")
    config_manager = ConfigManager(config_file=config_path)
    config = config_manager.config
    
    # Initialize database connection
    db_manager = DatabaseSessionManager(config.database)
    
    try:
        with db_manager.get_session() as session:
            # Check whether the 'topic' column already exists
            check_column_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'history_records' 
                AND column_name = 'topic'
            """)
            
            result = session.execute(check_column_query)
            existing_column = result.fetchone()
            
            if existing_column:
                print("✅ Topic column already exists, no migration needed")
                return True
            
            # Add the 'topic' column
            add_column_query = text("""
                ALTER TABLE history_records 
                ADD COLUMN topic TEXT
            """)
            
            print("🔄 Adding 'topic' column to history_records table...")
            session.execute(add_column_query)
            session.commit()
            
            print("✅ Successfully added 'topic' column to history_records table")
            
            # Verify the column was added successfully
            verify_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'history_records' 
                AND column_name = 'topic'
            """)
            
            result = session.execute(verify_query)
            column_info = result.fetchone()
            
            if column_info:
                print(f"✅ Verification succeeded: 'topic' column added")
                print(f"   - column: {column_info.column_name}")
                print(f"   - type: {column_info.data_type}")
                print(f"   - nullable: {column_info.is_nullable}")
                return True
            else:
                print("❌ Verification failed: could not find the added 'topic' column")
                return False
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        logging.error(f"Migration failed: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("=" * 60)
    print("🗃️  Database migration: add 'topic' column to history_records table")
    print("=" * 60)
    
    success = migrate_add_topic_field()
    
    if success:
        print("=" * 60)
        print("🎉 Migration completed!")
        print("HistoryRecord can now store and retrieve topic information")
        print("=" * 60)
        sys.exit(0)
    else:
        print("=" * 60)
        print("💥 Migration failed! Please check error details and retry")
        print("=" * 60)
        sys.exit(1)
