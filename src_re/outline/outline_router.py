"""
Outline routing and operation management module.

This module provides centralized routing for all outline-related operations including
generation, modification, and polishing. It coordinates between different outline
processing components and manages user session state for outline persistence.
"""

from tool.config_manager import Config
from tool.lm import LLMModel
from outline.outline_generate import OutlineGenerate
from outline.outline_modify import OutlineModify
from outline.outline_polish import OutlinePolish
from flask import session
from session_id.session_id_db import UUIDManager
from utils.ArticleTextProcessing import ArticleTextProcessing
import logging

class OutlineRouter:
    """
    Central router for outline-related operations.
    
    This class coordinates all outline operations including generation, modification,
    and polishing. It manages routing logic, integrates with various outline
    processing components, and maintains user session state for outline persistence.
    """
    
    def __init__(self, 
                 config: Config, 
                 lm: LLMModel, 
                 jsonData: dict, 
                 uuid_manager: UUIDManager,
                ):
        """
        Initialize the outline router.
        
        Args:
            config: Configuration manager instance
            lm: Language model for outline generation and modification
            jsonData: Request data containing operation type and parameters
            uuid_manager: UUID manager for session handling
        """
        self.config = config
        self.lm = lm
        self.jsonData = jsonData
        self.uuid_manager = uuid_manager
        self.user_session = self.uuid_manager.check_uuid()
        self.pos = jsonData["pos"] if "pos" in jsonData else -1
        self.topic = jsonData.get("topic", "")  

    
    def route(self):
        """
        Route and distribute outline-related operations.
        
        This method acts as the main entry point for outline operations,
        directing requests to appropriate handlers based on the operation type.
        It handles outline generation, modification, and polishing with
        proper session management and content cleaning.
        
        Returns:
            Processed outline content based on the operation type
        """
        if self.jsonData["type"] == 'generate_outline':
            # Handle outline generation with prompt processing
            temp_messages = [{"role": "user", "content": self.jsonData["prompt"]}]
            OG = OutlineGenerate(self.config, self.lm, temp_messages)
            result = OG.generate_outline()
            if result is None:
                result = ""
            
            # Clean and format the generated outline for consistency
            cleaned_result = ArticleTextProcessing.clean_up_outline(result, self.topic)
            logging.info(f"Generated outline cleaned: original length {len(result)}, cleaned length {len(cleaned_result)}")
            
            # Create new record and persist after successful generation
            self.user_session.create_record()
            pos = self.user_session.current_pos
            # Add prompt message to new record's messages for context
            try:
                record = self.user_session.get_record(pos)
                record.messages.append({"role": "user", "content": self.jsonData["prompt"]})
            except Exception:
                pass
            self.user_session.update_record_outline(pos, cleaned_result)
            return cleaned_result

        # Handle outline modification with existing context
        elif self.jsonData["type"] == 'modify_outline':
            # Safely get record at specified position
            record = self.user_session.get_record_safe(self.pos)
            if record is None:
                # If record doesn't exist, use current record or create new record
                current_record = self.user_session.get_current_record()
                if current_record is None:
                    self.user_session.create_record()
                    current_record = self.user_session.get_current_record()
                if current_record is not None:
                    self.messages = current_record.messages
                else:
                    self.messages = []
                self.pos = self.user_session.current_pos
            else:
                self.messages = record.messages
            
            # Process outline modification with context
            OM = OutlineModify(self.lm, self.messages, self.jsonData["prompt"])
            result = OM.modify_outline()
            
            # Use ArticleTextProcessing to clean modified outline for consistency
            if isinstance(result, str):
                cleaned_result = ArticleTextProcessing.clean_up_outline(result, self.topic)
                logging.info(f"Modified outline cleaned for position {self.pos}")
                
                # Save cleaned modified outline to session for persistence
                if self.user_session.update_record_outline(self.pos, cleaned_result):
                    logging.info(f"Modified outline saved to position {self.pos}")
                return cleaned_result
            
            logging.info(f"Modified outline processed for position {self.pos}")
            return result
        
        # Handle outline polishing for improved quality
        elif self.jsonData["type"] == 'polish_outline':
            # Safely get record at specified position
            record = self.user_session.get_record_safe(self.pos)
            if record is None:
                # If record doesn't exist, use current record or create new record
                current_record = self.user_session.get_current_record()
                if current_record is None:
                    self.user_session.create_record()
                    current_record = self.user_session.get_current_record()
                if current_record is not None:
                    self.messages = current_record.messages
                else:
                    self.messages = []
                self.pos = self.user_session.current_pos
                logging.warning(f"Position {self.pos} not found, using current position {self.user_session.current_pos}")
            else:
                self.messages = record.messages
            
            # Ensure there is current outline content for polishing
            current_outline = self.jsonData["prompt"]
            if not current_outline and record:
                current_outline = record.outline
            
            if not current_outline:
                raise ValueError("No outline content available for polishing")
            
            # Clean input outline before polishing
            cleaned_input_outline = ArticleTextProcessing.clean_up_outline(current_outline, self.topic)
            
            OP = OutlinePolish(self.lm, 
                               self.messages, 
                               cleaned_input_outline, 
                               self.jsonData["feedback"])
            result = OP.polish_outline()
            
            # Clean polished outline
            cleaned_result = ArticleTextProcessing.clean_up_outline(result, self.topic)
            logging.info(f"Polished outline cleaned for position {self.pos}")
            
            # Save cleaned polished outline
            if self.user_session.update_record_outline(self.pos, cleaned_result):
                logging.info(f"Cleaned polished outline saved to position {self.pos}")
            return cleaned_result
        else:
            raise ValueError(f"Invalid type: {self.jsonData['type']}")

    def _clean_and_validate_outline(self, outline: str) -> str:
        """
        Clean and validate outline content
        
        Args:
            outline: Original outline content
            
        Returns:
            str: Cleaned outline content
        """
        if not outline or not outline.strip():
            logging.warning("Empty outline provided, returning default structure")
            return "# Introduction\n# Main Content\n# Conclusion"
        
        # Use ArticleTextProcessing to clean outline
        cleaned_outline = ArticleTextProcessing.clean_up_outline(outline, self.topic)
        
        return cleaned_outline