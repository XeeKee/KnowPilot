"""
Article routing and operation management module.

This module provides centralized routing for all article-related operations including
generation, modification, polishing, and section management. It coordinates between
different article processing components and manages user session state.
"""

from tool.config_manager import Config
from tool.lm import LLMModel
from article.article_modify import ArticleModify
from article.article_polish import ArticlePolish
from article.article_section import ArticleSection
from flask import session
from session_id.session_id_db import UUIDManager
from utils.ArticleTextProcessing import ArticleTextProcessing
import logging

class ArticleRouter:
    """
    Central router for article-related operations.
    
    This class coordinates all article operations including generation, modification,
    and polishing. It manages routing logic and integrates with various article
    processing components while maintaining user session state.
    """
    
    def __init__(self, 
                 config: Config, 
                 lm: LLMModel, 
                 jsonData: dict, 
                 uuid_manager: UUIDManager,
                 rm=None,  
                 private_info=None  
                ):
        """
        Initialize the article router.
        
        Args:
            config: Configuration manager instance
            lm: Language model for content generation
            jsonData: Request data containing operation type and parameters
            uuid_manager: UUID manager for session handling
            rm: Optional retrieval model for content enhancement
            private_info: Optional private information manager
        """
        self.config = config
        self.lm = lm
        self.rm = rm  
        self.jsonData = jsonData
        self.uuid_manager = uuid_manager
        self.user_session = self.uuid_manager.check_uuid()
        self.pos = jsonData.get("pos", -1)
        self.topic = jsonData.get("topic", "")
        self.private_info = private_info  

    def route(self):
        """
        Route and distribute article-related operations.
        
        This method acts as the main entry point for article operations,
        directing requests to appropriate handlers based on the operation type.
        
        Returns:
            Result of the routed operation
            
        Raises:
            ValueError: When an invalid article type is specified
        """
        
        if self.jsonData["type"] == 'generate_article':
            return self._handle_generate_article()
        elif self.jsonData["type"] == 'continue_generation':
            return self._handle_continue_generation()
        elif self.jsonData["type"] == 'generate_single_chapter':
            return self._handle_generate_single_chapter()
        elif self.jsonData["type"] == 'modify_article':
            return self._handle_modify_article()
        elif self.jsonData["type"] == 'polish_article':
            return self._handle_polish_article()
        elif self.jsonData["type"] == 'modify_section':
            return self._handle_modify_section()
        elif self.jsonData["type"] == 'polish_section':
            return self._handle_polish_section()
        else:
            raise ValueError(f"Invalid article type: {self.jsonData['type']}")

    def _handle_generate_article(self):
        """
        Handle generating a complete article with streaming chapter generation.
        
        This method orchestrates the generation of a complete article by
        processing each chapter sequentially and streaming results back to
        the client for real-time feedback.
        
        Returns:
            Streaming response with generated article content
        """
        try:
            # Get outline content from request or session
            outline = self.jsonData.get("outline", "")
            if not outline:
                # Try to get outline from session if not provided in request
                record = self.user_session.get_record_safe(self.pos)
                if record and record.outline:
                    outline = record.outline
                else:
                    raise ValueError("No outline available for article generation")

            # Get current session_id for private information access
            session_id = self.user_session.uuid if self.user_session else None

            # Create chapter generator with private info manager
            AS = ArticleSection(self.config, self.lm, self.rm, outline, self.topic, self.private_info)
            
            # Parse and clean outline to extract chapter structure
            from utils.ArticleTextProcessing import ArticleTextProcessing
            cleaned_outline = ArticleTextProcessing.clean_up_outline(outline, self.topic)
            chapters = AS._parse_outline_to_chapters(cleaned_outline)
            
            if not chapters:
                logging.warning("No chapters found in outline")
                return "ARTICLE_COMPLETE\n"
            
            logging.info(f"Starting streaming article generation for {len(chapters)} chapters")
            
            # Initialize article list from session or create new one
            current_articles = self.user_session.get_record_articles(self.pos)
            if current_articles is None:
                current_articles = []
            
            # Ensure the list length matches the number of chapters
            while len(current_articles) < len(chapters):
                current_articles.append("")
            
            # Stream generate each chapter for real-time feedback
            def generate_chapters_stream():
                for chapter_index in range(len(chapters)):
                    try:
                        logging.info(f"Generating chapter {chapter_index + 1}/{len(chapters)}: {chapters[chapter_index]}")
                        
                        # Generate a single chapter with session context
                        chapter_result = AS.generate_single_chapter(chapter_index, session_id)
                        
                        # Check if generation resulted in an error
                        if isinstance(chapter_result, dict) and chapter_result.get('error'):
                            error_type = chapter_result.get('error_type', 'other')
                            error_message = chapter_result.get('error_message', 'Unknown error')
                            
                            logging.error(f"Chapter {chapter_index} generation failed: {error_message}")
                            
                            # Create error data, including error type
                            error_data = {
                                'type': 'chapter_error',
                                'index': chapter_index,
                                'title': chapters[chapter_index],
                                'error': error_message,
                                'error_type': error_type,
                                'status': 'error'
                            }
                            
                            import json
                            yield f"CHAPTER_ERROR:{json.dumps(error_data, ensure_ascii=False)}\n"
                            break
                        
                        if chapter_result and chapter_result.get('content'):
                            chapter_content = chapter_result.get('content')
                            chapter_references = chapter_result.get('references', {})
                            
                            # Update specified chapter (only save content, not reference data)
                            current_articles[chapter_index] = chapter_content
                            
                            # Save the updated article list
                            if self.user_session.update_record_articles(self.pos, current_articles):
                                logging.info(f"Chapter {chapter_index} saved to position {self.pos}")
                            
                            # Create chapter data
                            import json
                            chapter_data = {
                                'type': 'chapter',
                                'index': chapter_index,
                                'title': chapters[chapter_index],
                                'content': chapter_content,
                                'references': chapter_references,
                                'depth': 1,
                                'status': 'completed'
                            }
                            
                            # Return chapter data
                            yield f"CHAPTER_DATA:{json.dumps(chapter_data, ensure_ascii=False)}\n"
                        else:
                            # Chapter generation failed, but no error flag (for backward compatibility)
                            error_data = {
                                'type': 'chapter_error',
                                'index': chapter_index,
                                'title': chapters[chapter_index],
                                'error': 'Chapter generation failed',
                                'error_type': 'other',
                                'status': 'error'
                            }
                            import json
                            yield f"CHAPTER_ERROR:{json.dumps(error_data, ensure_ascii=False)}\n"
                            break
                            
                    except Exception as e:
                        error_message = str(e)
                        logging.error(f"Error generating chapter {chapter_index}: {error_message}")
                        
                        # Detect network-related errors
                        network_error_indicators = [
                            'timeout', 'connection', 'network', 'request', 'http', 'ssl',
                            'Connection timed out', 'Connection refused', 'Read timed out',
                            'HTTPSConnectionPool', 'ConnectionError', 'socket.timeout',
                            'requests.exceptions', 'urllib3', 'DNS', 'resolve', 'unreachable',
                            'LM API call failed', 'RuntimeError', 'API failed'
                        ]
                        
                        is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators)
                        error_type = 'network' if is_network_error else 'other'
                        
                        # Chapter generation error
                        error_data = {
                            'type': 'chapter_error',
                            'index': chapter_index,
                            'title': chapters[chapter_index] if chapter_index < len(chapters) else f"Chapter {chapter_index + 1}",
                            'error': error_message,
                            'error_type': error_type,
                            'status': 'error'
                        }
                        import json
                        yield f"CHAPTER_ERROR:{json.dumps(error_data, ensure_ascii=False)}\n"
                        break
                
                # Completion signal
                yield "ARTICLE_COMPLETE\n"
            
            return generate_chapters_stream()
            
        except Exception as e:
            logging.error(f"Error in generate_article: {str(e)}")
            raise

    def _handle_continue_generation(self):
        """Handle continuing to generate the article from a specified chapter - stream back each chapter"""
        try:
            # Get outline content and starting chapter index
            outline = self.jsonData.get("outline", "")
            start_chapter_index = self.jsonData.get("start_chapter_index", 0)
            
            if not outline:
                logging.error("No outline provided for continue generation")
                raise ValueError("Outline is required for continue generation")

            # Get current session_id
            session_id = self.user_session.uuid if self.user_session else None

            # Create chapter generator, pass private info manager
            AS = ArticleSection(self.config, self.lm, self.rm, outline, self.topic, self.private_info)
            
            # Parse outline to get chapter information
            from utils.ArticleTextProcessing import ArticleTextProcessing
            cleaned_outline = ArticleTextProcessing.clean_up_outline(outline, self.topic)
            chapters = AS._parse_outline_to_chapters(cleaned_outline)
            
            if not chapters:
                logging.error("No chapters found in outline")
                raise ValueError("No valid chapters found in outline")
            
            # Validate start index
            if start_chapter_index >= len(chapters):
                logging.error(f"Start chapter index {start_chapter_index} out of range, total chapters: {len(chapters)}")
                raise ValueError(f"Start chapter index out of range")
            
            logging.info(f"Starting continue generation from chapter {start_chapter_index + 1}/{len(chapters)}")
            
            # Initialize article list
            current_articles = self.user_session.get_record_articles(self.pos)
            if current_articles is None:
                current_articles = []
            
            # Ensure the list length is sufficient
            while len(current_articles) < len(chapters):
                current_articles.append("")
            
            # Stream generate remaining chapters from the specified starting chapter
            def generate_remaining_chapters_stream():
                for chapter_index in range(start_chapter_index, len(chapters)):
                    try:
                        logging.info(f"Generating chapter {chapter_index + 1}/{len(chapters)}: {chapters[chapter_index]}")
                        
                        # Generate a single chapter, pass session_id
                        chapter_result = AS.generate_single_chapter(chapter_index, session_id)
                        
                        # Check if it is an error result
                        if isinstance(chapter_result, dict) and chapter_result.get('error'):
                            error_type = chapter_result.get('error_type', 'other')
                            error_message = chapter_result.get('error_message', 'Unknown error')
                            
                            logging.error(f"Chapter {chapter_index} generation failed: {error_message}")
                            
                            # Create error data, including error type
                            error_data = {
                                'type': 'chapter_error',
                                'index': chapter_index,
                                'title': chapters[chapter_index],
                                'error': error_message,
                                'error_type': error_type,
                                'status': 'error'
                            }
                            
                            import json
                            yield f"CHAPTER_ERROR:{json.dumps(error_data, ensure_ascii=False)}\n"
                            break
                        
                        if chapter_result and chapter_result.get('content'):
                            chapter_content = chapter_result.get('content')
                            chapter_references = chapter_result.get('references', {})
                            
                            # Update specified chapter (only save content, not reference data)
                            current_articles[chapter_index] = chapter_content
                            
                            # Save the updated article list
                            if self.user_session.update_record_articles(self.pos, current_articles):
                                logging.info(f"Chapter {chapter_index} saved to position {self.pos}")
                            
                            # Create chapter data
                            import json
                            chapter_data = {
                                'type': 'chapter',
                                'index': chapter_index,
                                'title': chapters[chapter_index],
                                'content': chapter_content,
                                'references': chapter_references,
                                'depth': 1,
                                'status': 'completed'
                            }
                            
                            # Return chapter data
                            yield f"CHAPTER_DATA:{json.dumps(chapter_data, ensure_ascii=False)}\n"
                        else:
                            # Chapter generation failed, but no error flag (for backward compatibility)
                            error_data = {
                                'type': 'chapter_error',
                                'index': chapter_index,
                                'title': chapters[chapter_index],
                                'error': 'Chapter generation failed',
                                'error_type': 'other',
                                'status': 'error'
                            }
                            import json
                            yield f"CHAPTER_ERROR:{json.dumps(error_data, ensure_ascii=False)}\n"
                            break
                            
                    except Exception as e:
                        error_message = str(e)
                        logging.error(f"Error generating chapter {chapter_index}: {error_message}")
                        
                        # Detect network-related errors
                        network_error_indicators = [
                            'timeout', 'connection', 'network', 'request', 'http', 'ssl',
                            'Connection timed out', 'Connection refused', 'Read timed out',
                            'HTTPSConnectionPool', 'ConnectionError', 'socket.timeout',
                            'requests.exceptions', 'urllib3', 'DNS', 'resolve', 'unreachable',
                            'LM API call failed', 'RuntimeError', 'API failed'
                        ]
                        
                        is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators)
                        error_type = 'network' if is_network_error else 'other'
                        
                        # Chapter generation error
                        error_data = {
                            'type': 'chapter_error',
                            'index': chapter_index,
                            'title': chapters[chapter_index] if chapter_index < len(chapters) else f"Chapter {chapter_index + 1}",
                            'error': error_message,
                            'error_type': error_type,
                            'status': 'error'
                        }
                        import json
                        yield f"CHAPTER_ERROR:{json.dumps(error_data, ensure_ascii=False)}\n"
                        break
                
                # Completion signal
                yield "ARTICLE_COMPLETE\n"
            
            return generate_remaining_chapters_stream()
            
        except Exception as e:
            logging.error(f"Error in continue_generation: {str(e)}")
            raise

    def _handle_generate_single_chapter(self):
        """Handle generating a single chapter"""
        try:
            outline = self.jsonData.get("outline", "")
            chapter_index = self.jsonData.get("chapter_index", 0)
            
            logging.info(f"Start generating chapter {chapter_index + 1}, topic: {self.topic}")
            
            if not outline:
                # Try to get outline from session
                record = self.user_session.get_record_safe(self.pos)
                if record and record.outline:
                    outline = record.outline
                    logging.info("Successfully got outline from session")
                else:
                    error_msg = "No outline available for chapter generation"
                    logging.error(error_msg)
                    raise ValueError(error_msg)

            # Get current session_id
            session_id = self.user_session.uuid if self.user_session else None

            # Create chapter generator, pass private info manager
            logging.info(f"Creating chapter generator, outline length: {len(outline)}")
            AS = ArticleSection(self.config, self.lm, self.rm, outline, self.topic, self.private_info)
            
            logging.info(f"Calling generate_single_chapter method, chapter index: {chapter_index}")
            result = AS.generate_single_chapter(chapter_index, session_id)

            if result:
                # Check if it is an error result
                if isinstance(result, dict) and result.get('error'):
                    logging.error(f"Single chapter generation failed: {result.get('error_message')}")
                    return result
                
                # Get the current article list
                current_articles = self.user_session.get_record_articles(self.pos)
                if current_articles is None:
                    current_articles = []
                
                # Ensure the list length is sufficient
                while len(current_articles) <= chapter_index:
                    current_articles.append("")
                
                # Update specified chapter (only save content, not reference data)
                if isinstance(result, dict) and 'content' in result:
                    chapter_content = result['content']
                    current_articles[chapter_index] = chapter_content
                    
                    # Save the updated article list
                    if self.user_session.update_record_articles(self.pos, current_articles):
                        logging.info(f"Chapter {chapter_index} saved to position {self.pos}")
                    else:
                        logging.warning(f"Failed to save chapter {chapter_index} to position {self.pos}")
                    
                    return result
                else:
                    # Maintain backward compatibility in case result is a string
                    current_articles[chapter_index] = result
                    # Save the updated article list
                    if self.user_session.update_record_articles(self.pos, current_articles):
                        logging.info(f"Chapter {chapter_index} saved to position {self.pos}")
                    
                    return {"content": result, "references": {}}
            else:
                logging.error(f"Failed to generate single chapter {chapter_index + 1}")
                return {
                    'error': True,
                    'error_type': 'other',
                    'error_message': 'No response from generation service',
                    'chapter_index': chapter_index
                }

        except Exception as e:
            error_message = str(e)
            logging.error(f"Error in generate_single_chapter: {error_message}")
            
            # Detect network-related errors
            network_error_indicators = [
                'timeout', 'connection', 'network', 'request', 'http', 'ssl',
                'Connection timed out', 'Connection refused', 'Read timed out',
                'HTTPSConnectionPool', 'ConnectionError', 'socket.timeout',
                'requests.exceptions', 'urllib3', 'DNS', 'resolve', 'unreachable',
                'LM API call failed', 'RuntimeError', 'API failed', 'response timeout',
                'no response', 'server timeout', 'request timeout', 'time out',
                'connection reset', 'broken pipe', 'network unreachable',
                'host unreachable', 'connection aborted', 'connection lost',
                'failed to establish', 'remote end closed', 'socket closed',
                'Max retries exceeded', 'Connection broken', 'Remote disconnected',
                'Service unavailable', 'Bad gateway', 'Gateway timeout',
                'Internal server error', 'Server error', 'HTTP 5', 'HTTP 50',
                'TimeoutError', 'ConnectTimeout', 'ReadTimeout', 'RequestException'
            ]
            
            is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators)
            error_type = 'network' if is_network_error else 'other'
            
            return {
                'error': True,
                'error_type': error_type,
                'error_message': error_message,
                'chapter_index': chapter_index
            }

    def _handle_modify_article(self):
        """Handle modifying an article"""
        try:
            # Get current article content
            current_articles = self.user_session.get_record_articles(self.pos)
            if not current_articles:
                raise ValueError("No article content available for modification")

            # Merge article content
            article_text = '\n\n'.join(current_articles)
            
            # Get modification instruction
            modification_instruction = self.jsonData.get("instruction", "")
            if not modification_instruction:
                raise ValueError("No modification instruction provided")

            # Create article modifier
            AM = ArticleModify(self.lm, self.rm, article_text, modification_instruction)
            result = AM.modify_article()

            if result:
                # Split the modified article back into chapters
                modified_articles = self._split_article_to_chapters(result)
                
                # Save to session
                if self.user_session.update_record_articles(self.pos, modified_articles):
                    logging.info(f"Modified article saved to position {self.pos}")
                else:
                    logging.warning(f"Failed to save modified article to position {self.pos}")

            return result
        except Exception as e:
            logging.error(f"Error in modify_article: {str(e)}")
            raise

    def _handle_polish_article(self):
        """Handle polishing an article"""
        try:
            # Get current article content
            current_articles = self.user_session.get_record_articles(self.pos)
            if not current_articles:
                raise ValueError("No article content available for polishing")

            # Merge article content
            article_text = '\n\n'.join(current_articles)
            
            # Get polishing feedback
            feedback = self.jsonData.get("feedback", "")
            if not feedback:
                raise ValueError("No polishing feedback provided")

            # Create article polisher
            AP = ArticlePolish(self.lm, self.rm, article_text, feedback)
            result = AP.polish_article()

            if result:
                # Split the polished article back into chapters
                polished_articles = self._split_article_to_chapters(result)
                
                # Save to session
                if self.user_session.update_record_articles(self.pos, polished_articles):
                    logging.info(f"Polished article saved to position {self.pos}")
                else:
                    logging.warning(f"Failed to save polished article to position {self.pos}")

            return result
        except Exception as e:
            logging.error(f"Error in polish_article: {str(e)}")
            raise

    def _handle_modify_section(self):
        """Handle modifying a section"""
        try:
            section_content = self.jsonData.get("section_content", "")
            modification_instruction = self.jsonData.get("modification_instruction", "")
            
            if not section_content or not modification_instruction:
                raise ValueError("Missing section_content or modification_instruction")
            
            # Get current session_id
            session_id = self.user_session.uuid if self.user_session else None
            
            # Create section modifier, pass private info manager
            AS = ArticleSection(self.config, self.lm, self.rm, "", self.topic, self.private_info)
            
            # Execute modification
            result = AS.modify_section(section_content, modification_instruction, session_id)
            
            return result
            
        except Exception as e:
            logging.error(f"Error in modify_section: {str(e)}")
            raise

    def _handle_polish_section(self):
        """Handle polishing a section"""
        try:
            section_content = self.jsonData.get("section_content", "")
            feedback = self.jsonData.get("feedback", "")
            chapter_index = self.jsonData.get("chapter_index")
            
            if not section_content or not feedback:
                raise ValueError("Missing section_content or feedback")
            
            # Get current session_id
            session_id = self.user_session.uuid if self.user_session else None
            
            # Create section polisher, pass private info manager
            AS = ArticleSection(self.config, self.lm, self.rm, "", self.topic, self.private_info)
            
            # Execute polishing
            result = AS.polish_section(section_content, feedback, session_id)
            
            # Process the return result - ensure it is JSON serializable
            if isinstance(result, dict) and 'content' in result and 'references' in result:
                # If there is a chapter index and session ID, save the reference data
                if chapter_index is not None and self.user_session:
                    # Try to save chapter reference data
                    logging.info(f"Saving reference data for chapter {chapter_index}")
                    self.user_session.update_record_chapter_references(
                        self.pos, 
                        chapter_index, 
                        result['references']
                    )
            else:
                # For backward compatibility, convert string result to dictionary format
                if isinstance(result, str):
                    result = {"content": result, "references": {}}
            
            return result
            
        except Exception as e:
            logging.error(f"Error in polish_section: {str(e)}")
            raise

    def _split_article_to_chapters(self, article_text: str) -> list:
        """Split article text into a list of chapters"""
        if not article_text:
            return []
        
        # Clean up the article using ArticleTextProcessing
        cleaned_article = ArticleTextProcessing.clean_up_section(article_text)
        
        # Split by chapter (assuming chapters start with #)
        chapters = []
        current_chapter = ""
        
        for line in cleaned_article.split('\n'):
            if line.strip().startswith('#'):
                if current_chapter:
                    chapters.append(current_chapter.strip())
                current_chapter = line + '\n'
            else:
                current_chapter += line + '\n'
        
        # Add the last chapter
        if current_chapter:
            chapters.append(current_chapter.strip())
        
        return chapters if chapters else [cleaned_article]