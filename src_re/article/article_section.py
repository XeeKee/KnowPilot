"""
Article section generation and management module.

This module handles the generation of individual article sections and chapters
using language models. It provides timeout protection, content generation,
and integration with private information systems for enhanced content creation.
"""

from tool.config_manager import Config
from tool.lm import LLMModel
import logging
import re
import signal
import time
import threading
from typing import List, Dict, Any, Optional

class ArticleSection:
    """
    Article section generator with timeout protection and content management.
    
    This class handles the generation of article sections and chapters using
    language models. It provides robust timeout handling and integrates with
    private information systems for enhanced content generation.
    """
    
    def __init__(self, config: Config, lm: LLMModel, rm, outline: str, topic: str = "", private_info=None):
        """
        Initialize the article section generator.
        
        Args:
            config: Configuration manager instance
            lm: Language model instance for content generation
            rm: Retrieval model for content enhancement
            outline: Article outline structure
            topic: Article topic for context
            private_info: Optional private information manager for enhanced content
        """
        self.config = config
        self.lm = lm
        self.rm = rm  
        self.outline = outline
        self.topic = topic
        
        # Initialize private information manager if not provided
        if private_info is not None:
            self.private_info = private_info
        else:
            try:
                from information.private_information import PrivateInformation
                self.private_info = PrivateInformation()
            except ImportError as e:
                logging.warning(f"PrivateInformation not available: {e}")
                self.private_info = None

    def _with_timeout(self, func, timeout_seconds=300, step_name=""):
        """
        Execute a function with timeout protection.
        
        This method provides robust timeout handling for long-running operations
        like language model calls, preventing the system from hanging indefinitely.
        
        Args:
            func: Function to execute
            timeout_seconds: Timeout in seconds, default 5 minutes
            step_name: Step name for logging and error reporting
            
        Returns:
            Function execution result
            
        Raises:
            TimeoutError: When operation exceeds the specified timeout
        """
        import threading
        import platform
        
        # Use lists to store results and exceptions for thread communication
        result = [None]
        exception = [None]
        
        def target():
            try:
                result[0] = func()
            except Exception as e:
                exception[0] = e
        
        # Create and start daemon thread for function execution
        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(timeout_seconds)
        
        # Check for timeout and handle exceptions
        if thread.is_alive():
            logging.error(f"Timeout in {step_name} after {timeout_seconds} seconds")
            raise TimeoutError(f"Operation timeout after {timeout_seconds} seconds in {step_name}")
        
        if exception[0]:
            raise exception[0]
            
        return result[0]

    def generate_single_chapter(self, chapter_index: int, session_id: Optional[str] = None) -> dict:
        """
        Generate a single chapter based on the outline.
        
        This method generates content for a specific chapter using the language
        model and integrates with private information systems for enhanced content.
        
        Args:
            chapter_index: Index of the chapter to generate
            session_id: Optional session identifier for private information access
            
        Returns:
            dict: Dictionary containing chapter content and reference data
                content: Chapter content
                references: Reference data for frontend display
        """
        try:
            # Parse outline to extract chapter structure
            chapters = self._parse_outline_to_chapters(self.outline)
            
            if chapter_index >= len(chapters):
                logging.error(f"Chapter index {chapter_index} out of range, total chapters: {len(chapters)}")
                return {"content": "", "references": {}}
            
            chapter_title = chapters[chapter_index]
            logging.info(f"Generating chapter {chapter_index + 1}: {chapter_title}")
            
            # Generate chapter content using the language model
            result = self._generate_chapter_content(chapter_title, self.outline, chapter_index, session_id)
            
            if result:
                if isinstance(result, dict) and result.get('error'):
                    logging.error(f"Chapter generation failed: {result.get('error_message')}")
                    return result  
                elif isinstance(result, dict) and result.get('content'):
                    logging.info(f"Successfully generated chapter {chapter_index + 1}: {chapter_title}")
                    return result
                else:
                    logging.error(f"Failed to generate chapter {chapter_index + 1}: {chapter_title}")
                    return {
                        'error': True,
                        'error_type': 'other',
                        'error_message': 'Unknown generation error',
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
            else:
                logging.error(f"Failed to generate chapter {chapter_index + 1}: {chapter_title}")
                return {
                    'error': True,
                    'error_type': 'other', 
                    'error_message': 'No response from generation service',
                    'chapter_index': chapter_index,
                    'chapter_title': chapter_title
                }
                
        except Exception as e:
            logging.error(f"Error generating chapter {chapter_index}: {str(e)}")
            return ""

    def modify_section(self, section_content: str, modification_instruction: str, session_id: Optional[str] = None) -> str:
        """Modify section content"""
        try:
            logging.info("Starting section modification")
            
            # Clean section content
            cleaned_section = section_content.strip()
            if not cleaned_section:
                logging.warning("Section content is empty")
                return ""
            
            # Perform search to get relevant information
            search_results = self._perform_search_for_modify(cleaned_section, modification_instruction, session_id)
            formatted_results = self._format_search_results(search_results)
            
            prompt = self._build_modification_prompt(cleaned_section, modification_instruction, formatted_results)
            
            # Call LLM for modification
            logging.info("Calling LLM for section modification")
            response = self.lm.generate(prompt)
            
            if response:
                logging.info("Section modification completed")
                return response
            else:
                logging.warning("Section modification failed")
                return section_content
                
        except Exception as e:
            logging.error(f"Error modifying section: {str(e)}")
            return section_content

    def polish_section(self, section_content: str, feedback: str, session_id: Optional[str] = None) -> dict:
        """Polish section content, return content and reference data
        
        Returns:
            dict: Dictionary containing content and reference data
                content: Polished section content
                references: Reference data for frontend display
        """
        try:
            logging.info("Starting section polishing")
            
            # Clean section content
            cleaned_section = section_content.strip()
            if not cleaned_section:
                logging.warning("Section content is empty")
                return {"content": "", "references": {}}
            
            # Perform search to get relevant information
            search_results = self._perform_search_for_polish(cleaned_section, session_id)
            formatted_results = self._format_search_results(search_results)
            
            # Build polishing prompt
            prompt = self._build_section_polish_prompt(cleaned_section, feedback, formatted_results)
            
            # Call LLM for polishing
            logging.info("Calling LLM for section polishing")
            response = self.lm.generate(prompt)
            
            if response:
                logging.info("Section polishing completed")
                # Process references and get reference data
                processed_content, reference_data = self._process_references(response, search_results)
                return {
                    'content': processed_content,
                    'references': reference_data
                }
            else:
                logging.warning("Section polishing failed")
                return {"content": section_content, "references": {}}
                
        except Exception as e:
            logging.error(f"Error polishing section: {str(e)}")
            return {"content": section_content, "references": {}}

    def _parse_outline_to_chapters(self, outline: str) -> list:
        """Parse chapter titles from outline - identify all lines starting with # (consistent with frontend)"""
        chapters = []
        lines = outline.split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('#'):
                title = line.lstrip('#').strip()
                if title:
                    chapters.append(title)
        
        return chapters

    def _generate_chapter_content(self, chapter_title: str, outline: str, chapter_index: int, session_id: Optional[str] = None) -> dict:
        """Generate chapter content and return content and reference data
        
        Returns:
            dict: Dictionary containing content and reference data
                content: Chapter content
                references: Reference data for frontend display
        """
        # Common indicators for detecting network errors
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
            'TimeoutError', 'ConnectTimeout', 'ReadTimeout', 'RequestException',
            'Operation timeout', 'timeout after', 'seconds in', 'Step timeout',
            'Generation timeout', 'Search timeout', 'Keyword timeout',
            'Prompt timeout', 'Reference timeout', 'Long response time',
            'Unresponsive', 'No activity', 'Hanging', 'Stalled'
        ]
        
        try:
            # Generate search keywords
            try:
                logging.info(f"Step 1/4: Generating search keywords for chapter {chapter_index}")
                search_keywords = self._with_timeout(
                    lambda: self._generate_search_keywords(chapter_title),
                    timeout_seconds=30,  
                    step_name="Generate Search Keywords"
                )
            except (TimeoutError, Exception) as e:
                error_message = str(e)
                logging.error(f"Error generating search keywords: {error_message}")
                is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators) or isinstance(e, TimeoutError)
                if is_network_error:
                    logging.warning(f"Network/timeout error detected while generating keywords for chapter {chapter_index}: {error_message}")
                    return {
                        'error': True,
                        'error_type': 'network',
                        'error_message': f"Network/timeout error while generating keywords: {error_message}",
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
                # Use fallback keywords
                search_keywords = [chapter_title, self.topic] if self.topic else [chapter_title]
            
            # Perform web search
            try:
                logging.info(f"Step 2/4: Performing search for chapter {chapter_index}")
                search_results = self._with_timeout(
                    lambda: self._perform_search(search_keywords, session_id),
                    timeout_seconds=60,  
                    step_name="Perform Search"
                )
            except (TimeoutError, Exception) as e:
                error_message = str(e)
                logging.error(f"Error performing search: {error_message}")
                is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators) or isinstance(e, TimeoutError)
                if is_network_error:
                    logging.warning(f"Network/timeout error detected while searching for chapter {chapter_index}: {error_message}")
                    return {
                        'error': True,
                        'error_type': 'network',
                        'error_message': f"Network/timeout error during search: {error_message}",
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
                # If not a network error but search failed, use empty results
                search_results = []
            
            # Format search results
            formatted_results = self._format_search_results(search_results)
            
            # Build chapter generation prompt
            try:
                logging.info(f"Step 3/4: Building chapter prompt for chapter {chapter_index}")
                prompt = self._with_timeout(
                    lambda: self._build_chapter_prompt(chapter_title, outline, chapter_index, formatted_results),
                    timeout_seconds=60,  # 1 minute timeout
                    step_name="Build Chapter Prompt"
                )
            except (TimeoutError, Exception) as e:
                error_message = str(e)
                logging.error(f"Error building chapter prompt: {error_message}")
                is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators) or isinstance(e, TimeoutError)
                if is_network_error:
                    logging.warning(f"Network/timeout error detected while building prompt for chapter {chapter_index}: {error_message}")
                    return {
                        'error': True,
                        'error_type': 'network',
                        'error_message': f"Network/timeout error while building prompt: {error_message}",
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
                # If not a network error but prompt building failed, use simple prompt
                prompt = f"""Please generate chapter {chapter_index + 1}: "{chapter_title}" based on the following article topic and outline:
Topic:
{self.topic}
Outline:
{outline}
Please generate the content for chapter {chapter_index + 1}:"""
            
            # Call LLM to generate chapter content
            try:
                logging.info(f"Step 4/4: Generating content with LLM for chapter {chapter_index}")
                response = self._with_timeout(
                    lambda: self.lm.generate(prompt),
                    timeout_seconds=180,  
                    step_name="LLM Generation"
                )

                if response:
                    # Process references and get reference data
                    try:
                        logging.info(f"Step 4.1/4: Processing references for chapter {chapter_index}")
                        processed_content, reference_data = self._with_timeout(
                            lambda: self._process_references(response, search_results),
                            timeout_seconds=60,  
                            step_name="Process References"
                        )
                        return {
                            'content': processed_content,
                            'references': reference_data,
                            'chapter_index': chapter_index,
                            'chapter_title': chapter_title
                        }
                    except (TimeoutError, Exception) as ref_error:
                        error_message = str(ref_error)
                        logging.error(f"Error processing references: {error_message}")
                        is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators) or isinstance(ref_error, TimeoutError)
                        if is_network_error:
                            logging.warning(f"Network/timeout error detected while processing references for chapter {chapter_index}: {error_message}")
                            return {
                                'error': True,
                                'error_type': 'network',
                                'error_message': f"Network/timeout error while processing references: {error_message}",
                                'chapter_index': chapter_index,
                                'chapter_title': chapter_title
                            }
                        # If not a network error, return original content
                        return {
                            'content': response,
                            'chapter_title': chapter_title,
                            'chapter_index': chapter_index,
                            'references': {}
                        }
                else:
                    logging.warning("No response from LM for chapter generation")
                    return {
                        'error': True,
                        'error_type': 'other',
                        'error_message': 'No response from generation service',
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
            except (TimeoutError, Exception) as lm_error:
                # Capture exceptions in LLM call
                error_message = str(lm_error)
                logging.error(f"LLM generation error: {error_message}")
                
                # Check if it's a network error or timeout
                is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators) or isinstance(lm_error, TimeoutError)
                
                if is_network_error:
                    logging.warning(f"Network/timeout error detected in LLM call for chapter {chapter_index}: {error_message}")
                    return {
                        'error': True,
                        'error_type': 'network',
                        'error_message': error_message,
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
                else:
                    return {
                        'error': True,
                        'error_type': 'other',
                        'error_message': error_message,
                        'chapter_index': chapter_index,
                        'chapter_title': chapter_title
                    }
                
        except Exception as e:
            error_message = str(e)
            logging.error(f"Error generating chapter content: {error_message}")
            
            # Detect if it's a network-related error or timeout
            is_network_error = any(indicator.lower() in error_message.lower() for indicator in network_error_indicators) or isinstance(e, TimeoutError)
            
            if is_network_error:
                logging.warning(f"Network/timeout error detected for chapter {chapter_index}: {error_message}")
                return {
                    'error': True,
                    'error_type': 'network',
                    'error_message': error_message,
                    'chapter_index': chapter_index,
                    'chapter_title': chapter_title
                }
            else:
                logging.error(f"Non-network error for chapter {chapter_index}: {error_message}")
                return {
                    'error': True,
                    'error_type': 'other',
                    'error_message': error_message,
                    'chapter_index': chapter_index,
                    'chapter_title': chapter_title
                }

    def _generate_search_keywords(self, chapter_title: str) -> list:
        """Generate search keywords"""
        try:
            prompt = (
                f"I am going to write the \"{chapter_title}\" section for the topic: '{self.topic}'. "
                "Please help me generate some search keywords that can represent the content of this section and can be retrieved by search engines. "
                "Please return in the format <begin>[keyword1, keyword2, keyword3]<end>. You should provide no more than 3 keywords."
            )
            response = self.lm.generate(prompt)
            try:
                keywords_str = response.split('<begin>')[1].split('<end>')[0]
                keywords = [k.strip().strip('[]"\'') for k in keywords_str.split(',')]
                return [k for k in keywords if k]  # Filter empty strings
            except (IndexError, AttributeError):
                # If parsing fails, use chapter title and topic as keywords
                return [chapter_title, self.topic] if self.topic else [chapter_title]
        except Exception as e:
            logging.warning(f"Error generating search keywords: {str(e)}")
            return [chapter_title, self.topic] if self.topic else [chapter_title]

    def _get_private_content(self, query: str, session_id: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """Get private domain content"""
        if not self.private_info:
            return None
        
        try:
            if not session_id:
                return None
            
            if self.private_info.has_vector_capability(session_id):
                logging.info(f"🔍 Searching private library for: {query[:50]}...")
                relevant_chunks = self.private_info.get_relevant_content_for_generation(query, session_id, top_k=3)
                if relevant_chunks:
                    logging.info(f"📚 Found {len(relevant_chunks)} private library chunks")
                    return relevant_chunks
                else:
                    logging.info("📚 No relevant private library content found")
            else:
                logging.info("⚠️ Private library vector capability not available")
            
            return None
        except Exception as e:
            logging.error(f"Error retrieving private content: {str(e)}")
            return None

    def _should_use_web_search(self, private_chunks: Optional[List[Dict[str, Any]]], min_content_length: int = 3500) -> bool:
        """Determine if web search is needed"""
        if not private_chunks:
            return True
        
        # Calculate total content length of all chunks
        total_content_length = 0
        for chunk in private_chunks:
            if chunk.get('snippets'):
                for snippet in chunk['snippets']:
                    total_content_length += len(snippet)
        
        logging.info(f"📊 Private content length: {total_content_length} chars from {len(private_chunks)} chunks")
        
        # If private domain content is rich enough, no need for web search
        if total_content_length >= min_content_length:
            logging.info("✅ Private content sufficient, skipping web search")
            return False
        
        logging.info(f"⚠️ Private content insufficient ({total_content_length} < {min_content_length}), will use web search")
        return True

    def _perform_search(self, keywords: list, session_id: Optional[str] = None) -> list:
        """Perform search (prioritize private domain, then web search)"""
        try:
            # Build search query
            search_query = ' '.join(keywords)
            logging.info(f"🔍 Performing search for: {search_query}")
            
            # First try to get content from private domain
            private_chunks = self._get_private_content(search_query, session_id)
            
            # Determine if web search is needed
            if self._should_use_web_search(private_chunks):
                # Perform web search
                if self.rm is None:
                    logging.info("No search tool available, skipping web search")
                    return private_chunks if private_chunks else []
                
                logging.info(f"🌐 Performing web search for: {search_query}")
                search_results = self.rm(search_query)
                logging.info(f"Found {len(search_results)} web search results")
                
                # If there are private domain chunks, insert them one by one at the beginning of search results
                if private_chunks:
                    for i, chunk in enumerate(reversed(private_chunks)):
                        search_results.insert(0, chunk)
                    logging.info(f"📚 Added {len(private_chunks)} private library chunks to search results")
                
                return search_results
            else:
                # Only use private domain content
                if private_chunks:
                    logging.info(f"📚 Using {len(private_chunks)} private library chunks only")
                    return private_chunks
                else:
                    logging.warning("No private content available and web search disabled")
                    return []
            
        except Exception as e:
            logging.error(f"Error performing search: {str(e)}")
            return []

    def _perform_search_for_polish(self, section_content: str, session_id: Optional[str] = None) -> list:
        """Perform search for polishing (prioritize private domain)"""
        try:
            # Extract keywords from section content for search
            search_query = f"improve {section_content[:100]}"
            logging.info(f"🔍 Performing polish search for: {search_query}")
            
            # First try to get content from private domain
            private_chunks = self._get_private_content(search_query, session_id)
            
            # Determine if web search is needed
            if self._should_use_web_search(private_chunks, min_content_length=300):
                # Perform web search
                if self.rm is None:
                    logging.info("No search tool available for polish search")
                    return private_chunks if private_chunks else []
                
                logging.info(f"🌐 Performing web polish search for: {search_query}")
                search_results = self.rm(search_query)
                logging.info(f"Found {len(search_results)} polish search results")
                
                # If there are private domain chunks, insert them one by one at the beginning of search results
                if private_chunks:
                    for i, chunk in enumerate(reversed(private_chunks)):
                        search_results.insert(0, chunk)
                    logging.info(f"📚 Added {len(private_chunks)} private library chunks to polish search results")
                
                return search_results
            else:
                # Only use private domain content
                if private_chunks:
                    logging.info(f"📚 Using {len(private_chunks)} private library chunks only for polish")
                    return private_chunks
                else:
                    logging.warning("No private content available for polish and web search disabled")
                    return []
            
        except Exception as e:
            logging.error(f"Error performing polish search: {str(e)}")
            return []

    def _perform_search_for_modify(self, section_content: str, instruction: str, session_id: Optional[str] = None) -> list:
        """Perform search for modification"""
        try:
            if self.rm is None:
                logging.info("No search tool available for modify search")
                return []
            
            # Extract keywords from section content and modification instruction for search
            search_query = f"modify {section_content[:100]} {instruction[:100]}"
            logging.info(f"Performing modify search for: {search_query}")
            
            # First try to get content from private domain
            private_chunks = self._get_private_content(search_query, session_id)
            
            # Determine if web search is needed
            if self._should_use_web_search(private_chunks, min_content_length=300):
                # Perform web search
                search_results = self.rm(search_query)
                logging.info(f"Found {len(search_results)} modify search results")
                
                # If there are private domain chunks, insert them one by one at the beginning of search results
                if private_chunks:
                    for i, chunk in enumerate(reversed(private_chunks)):
                        search_results.insert(0, chunk)
                    logging.info(f"📚 Added {len(private_chunks)} private library chunks to modify search results")
                
                return search_results
            else:
                # Only use private domain content
                if private_chunks:
                    logging.info(f"📚 Using {len(private_chunks)} private library chunks only for modify")
                    return private_chunks
                else:
                    logging.warning("No private content available for modify and web search disabled")
                    return []
            
        except Exception as e:
            logging.error(f"Error performing modify search: {str(e)}")
            return []

    def _format_search_results(self, search_results: list) -> str:
        """Format search results"""
        if not search_results:
            return ""
        
        formatted_results = []
        for idx, result in enumerate(search_results):
            snippets = result.get('snippets', [])
            if not snippets and result.get('description'):
                snippets = [result['description']]
            
            # References start from number 1
            formatted_text = f"[{idx + 1}]"
            formatted_text += "\n".join(f"- {snippet}" for snippet in snippets)
            formatted_results.append(formatted_text)
            
            # Add reference ID to result
            result['reference_id'] = idx + 1
        
        return "\n\n".join(formatted_results)

    def _process_references(self, content: str, search_results: list) -> tuple:
        """Process references, ensure unified reference numbers, and return reference data for frontend display
        
        Returns:
            tuple: (processed_content, reference_data)
                processed_content: Processed content
                reference_data: Reference data for frontend display
        """
        logging.info("Processing references in content")
        if not search_results:
            return content, {}
        
        # Find all reference numbers used in the content
        used_refs = set(int(x) for x in re.findall(r'\[(\d+)\]', content))

        # Add a reference_id field to each item in search_results, starting from 1
        for idx, result in enumerate(search_results):
            result['old_reference_id'] = idx + 1
        
        # Remove unused results from search_results, store as new variable
        used_search_results = [result for result in search_results if result.get('old_reference_id') in used_refs]

        for idx, result in enumerate(used_search_results):
            result['new_reference_id'] = idx + 1

        # Replace old reference numbers with new reference numbers
        processed_content = content
        for result in used_search_results:
            old_ref = result.get('old_reference_id')
            new_ref = result.get('new_reference_id')
            if old_ref and new_ref:
                logging.info(f"Replacing reference [{old_ref}] with [{new_ref}]")
                processed_content = processed_content.replace(f"[{old_ref}]", f"[{new_ref}]") 

        # Remove old_reference_id field from used_search_results and rename new_reference_id to 'reference_id'
        for result in used_search_results:
            if 'old_reference_id' in result:
                del result['old_reference_id']
            if 'new_reference_id' in result:
                result['reference_id'] = result.pop('new_reference_id')
        
        # Create reference data for frontend display
        reference_data = {}
        for result in used_search_results:
            ref_id = result.get('reference_id')
            if ref_id:
                snippets = result.get('snippets', [])
                title = result.get('title', '')
                url = result.get('url', '')
                description = result.get('description', '')
                
                # Ensure at least one snippet
                tooltip_content = snippets[0] if snippets else description
                
                reference_data[str(ref_id)] = {
                    'content': tooltip_content,
                    'title': title,
                    'url': url
                }
        
        return processed_content, reference_data

    def _has_subsections(self, chapter_title: str, outline: str, chapter_index: int) -> bool:
        """Detect if current chapter contains subsections"""
        lines = outline.split('\n')
        chapters = []
        
        # Get all chapter titles and their levels
        for line in lines:
            line = line.strip()
            if line.startswith('#'):
                level = line.count('#')
                title = line.lstrip('#').strip()
                if title:
                    chapters.append({'title': title, 'level': level})
        
        if chapter_index >= len(chapters):
            return False
            
        current_chapter = chapters[chapter_index]
        current_level = current_chapter['level']
        
        # Check if subsequent chapters have deeper level titles
        for i in range(chapter_index + 1, len(chapters)):
            next_chapter = chapters[i]
            if next_chapter['level'] > current_level:
                return True
            elif next_chapter['level'] <= current_level:
                break
                
        return False

    def _build_chapter_prompt(self, chapter_title: str, outline: str, chapter_index: int, formatted_results: str) -> str:
        """Build chapter generation prompt"""
        # Detect if it contains subsections
        has_subsections = self._has_subsections(chapter_title, outline, chapter_index)
        # Output topic
        logging.info(f"Generating chapter prompt for: {self.topic} (Index: {chapter_index + 1})")
        if formatted_results and formatted_results.strip():
            # Prompt with search results
            if has_subsections:
                prompt = f"""Please generate chapter {chapter_index + 1}: "{chapter_title}" based on the following article topic, outline, and search results:
Topic:
{self.topic}
                
Outline:
{outline}

Search Results:
{formatted_results}

Requirements:
1. Only generate overview content for "{chapter_title}" chapter, do not expand its subsections in detail
2. Content should be a general introduction and overview of the chapter topic
3. Language should be fluent and professional
4. Recommended chapter length: 400-800 words (overview content)
5. Maintain academic writing style
6. May briefly mention subsections but do not expand in detail
7. Use information from search results and mark references with [n] format, where n is the search result number
8. Ensure accurate references based on search results
9. Do NOT include a reference list or bibliography at the end of the section.

Please generate the overview content for chapter {chapter_index + 1}:"""
            else:
                prompt = f"""Please generate chapter {chapter_index + 1}: "{chapter_title}" based on the following article topic, outline, and search results:

Topic:
{self.topic}
                
Outline:
{outline}

Search Results:
{formatted_results}

Requirements:
1. Strictly follow the outline structure
2. Content should be detailed, specific, and logical
3. Language should be fluent and professional
4. Recommended chapter length: 800-1500 words
5. Maintain academic writing style
6. Ensure complete and coherent chapter content
7. Use information from search results and mark references with [n] format, where n is the search result number
8. Ensure accurate references based on search results
9. Do NOT add a reference list or bibliography at the end of the section.


Please generate the content for chapter {chapter_index + 1}:"""
        else:
            # Prompt without search results
            if has_subsections:
                prompt = f"""Please generate chapter {chapter_index + 1}: "{chapter_title}" based on the following article topic and outline:
Topic:
{self.topic}
                
Outline:
{outline}

Requirements:
1. Only generate overview content for "{chapter_title}" chapter, do not expand its subsections in detail
2. Content should be a general introduction and overview of the chapter topic
3. Language should be fluent and professional
4. Recommended chapter length: 400-800 words (overview content)
5. Maintain academic writing style
6. May briefly mention subsections but do not expand in detail
7. Do NOT add a reference list or bibliography at the end of the section.

Please generate the overview content for chapter {chapter_index + 1}:"""
            else:
                prompt = f"""Please generate chapter {chapter_index + 1}: "{chapter_title}" based on the following article topic and outline:
Topic:
{self.topic}

Outline:
{outline}

Requirements:
1. Strictly follow the outline structure
2. Content should be detailed, specific, and logical
3. Language should be fluent and professional
4. Recommended chapter length: 800-1500 words
5. Maintain academic writing style
6. Ensure complete and coherent chapter content
7. Do NOT add a reference list or bibliography at the end of the section.

Please generate the content for chapter {chapter_index + 1}:"""
        
        return prompt

    def _build_section_modification_prompt(self, section_content: str, instruction: str) -> str:
        """Build section modification prompt"""
        prompt = f"""Please modify the section according to the following instruction:

Modification Instruction:
{instruction}

Section Content:
{section_content}

Requirements:
1. Strictly follow the modification instruction
2. Maintain the overall structure and logic of the section
3. Ensure the modified content is coherent and fluent
4. Maintain academic writing style
5. If the instruction involves deleting content, completely remove relevant parts
6. If the instruction involves adding content, add at appropriate positions
7. If the instruction involves modifying content, maintain original format and style

Please output the complete modified section:"""
        
        return prompt

    def _build_section_polish_prompt(self, section_content: str, feedback: str, formatted_results: str) -> str:
        """Build section polish prompt"""
        if formatted_results and formatted_results.strip():
            # Polish prompt with search results
            prompt = f"""Please polish the section based on the following feedback and search results:
Polish Feedback:
{feedback}

Search Results:
{formatted_results}

Section Content:
{section_content}

Requirements:
1. Perform targeted polishing based on feedback
2. Improve language expression and logical structure of the section
3. Enhance readability and professionalism of the section
4. Keep core content and viewpoints unchanged
5. Ensure polished content is more fluent and accurate
6. Maintain academic writing style
7. If feedback involves specific issues, focus on resolving these problems
8. Can use information from search results to improve content, mark references with [n] format
9. Do not add content unrelated to the topic, such as comparisons with pre-polish content, summaries of modified parts, and explainations of improvements.
10. Do NOT add a reference list or bibliography at the end of the section.

Please output the complete polished section (do NOT include a reference list at the end):"""
        else:
            # Polish prompt without search results
            prompt = f"""Please polish the section based on the following feedback:

Polish Feedback:
{feedback}

Section Content:
{section_content}

Requirements:
1. Perform targeted polishing based on feedback
2. Improve language expression and logical structure of the section
3. Enhance readability and professionalism of the section
4. Keep core content and viewpoints unchanged
5. Ensure polished content is more fluent and accurate
6. Maintain academic writing style
7. If feedback involves specific issues, focus on resolving these problems
8. Do NOT add a reference list or bibliography at the end of the section.

Please output the complete polished section (do NOT include a reference list at the end):"""
        return prompt