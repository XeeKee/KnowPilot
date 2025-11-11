"""
Language model integration and management module.

This module provides a unified interface for interacting with various language
models through the OpenAI API. It supports multiple model types including
VolcEngine, implements robust error handling with retry logic, and provides
comprehensive logging for debugging and monitoring.
"""

import os
import time
import random
from openai import OpenAI
import requests
import logging
from .config_manager import ConfigManager, Config

class LLMModel:
    """
    Language model interface with comprehensive error handling.
    
    This class provides a unified interface for interacting with language
    models through the OpenAI API. It supports multiple model types,
    implements retry logic with exponential backoff, and provides detailed
    logging for monitoring and debugging API calls.
    """
    def __init__(self, config: Config):
        """
        Initialize the language model with configuration.
        
        Args:
            config: Configuration object containing model settings
        """
        self.type = config.model.type
        self.name = config.model.name
        self.api_key = config.model.api_key
        self.base_url = config.model.base_url
        self.max_tokens = config.model.max_tokens
        self.temperature = config.model.temperature
        self.top_p = config.model.top_p

        # Initialize OpenAI client with configuration
        self.client = OpenAI(base_url = self.base_url, 
                             api_key  = self.api_key,
                             timeout=60.0  
                            )

    def call(self, messages: list, **kwargs):
        """
        Route API calls based on model type.
        
        Args:
            messages: List of message dictionaries for the conversation
            **kwargs: Additional parameters for the API call
            
        Returns:
            Model response content
        """
        if self.type == "VolcEngine":
            return self.volcengine_call(messages, **kwargs)

    def generate(self, prompt: str, **kwargs):
        """
        Generate response from a single prompt.
        
        This method converts a single prompt into the message format
        required by the language model API.
        
        Args:
            prompt: Single prompt string
            **kwargs: Additional parameters for generation
            
        Returns:
            Generated response content
        """
        messages = [{"role": "user", "content": prompt}]
        return self.call(messages, **kwargs)

    def volcengine_call(self, messages: list, **kwargs):
        """
        Execute API call to VolcEngine model with retry logic.
        
        This method implements robust error handling with exponential
        backoff and comprehensive logging for monitoring API performance
        and debugging issues.
        
        Args:
            messages: List of message dictionaries
            **kwargs: Additional parameters including max_retries
            
        Returns:
            Model response content
            
        Raises:
            RuntimeError: When all retry attempts fail with specific error categorization
        """
        max_retries = kwargs.get("max_retries", 3)
        logging.info(f"Calling {self.name} Model ...")
        
        last_error = None
        for attempt in range(max_retries):
            try:
                logging.info(f"Attempt {attempt + 1} to calling {self.name} Model ...")
                
                start_time = time.time()
                logging.info(f"Starting API call at {time.strftime('%H:%M:%S', time.localtime(start_time))}")
                
                # Execute API call with configured parameters
                completion = self.client.chat.completions.create(
                    model=self.name,
                    messages=messages,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                    top_p=self.top_p,
                    stream=False,
                    timeout=30.0  
                )
                
                end_time = time.time()
                duration = end_time - start_time
                logging.info(f"API call completed in {duration:.2f} seconds")
                
                return completion.choices[0].message.content
                
            except Exception as e:
                last_error = e
                end_time = time.time()
                duration = end_time - start_time if 'start_time' in locals() else 0
                
                logging.error(f"The {attempt + 1}-th request to LM API failed after {duration:.2f} seconds with the following error:\n{e}")
                logging.error(f"Error type: {type(e).__name__}")
                
                # Implement exponential backoff for retries
                if attempt < max_retries - 1:  
                    delay = random.uniform(1, 5)  
                    logging.info(f"Waiting {delay:.2f} seconds before retry...")
                    time.sleep(delay)
                else:
                    logging.error(f"All {max_retries} attempts failed")
        
        # Provide detailed error categorization for better debugging
        error_msg = f"LM API调用失败，重试{max_retries}次后仍然失败"
        if last_error:
            error_msg += f": {str(last_error)}"
        logging.error(error_msg)
        
        if last_error:
            error_str = str(last_error).lower()
            # Categorize errors for better error handling by calling code
            if any(keyword in error_str for keyword in ["timeout", "timed out", "time out"]):
                raise RuntimeError(f"Network timeout error: {error_msg}")
            elif any(keyword in error_str for keyword in ["connection", "connect", "network", "unreachable"]):
                raise RuntimeError(f"Network connection error: {error_msg}")
            else:
                raise RuntimeError(error_msg)
        else:
            raise RuntimeError(error_msg)
