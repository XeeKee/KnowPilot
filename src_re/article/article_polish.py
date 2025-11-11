from tool.lm import LLMModel
from utils.ArticleTextProcessing import ArticleTextProcessing
import logging
import re

class ArticlePolish:
    def __init__(self, lm: LLMModel, rm, article_text: str, feedback: str):
        self.lm = lm
        self.rm = rm  # Search tool
        self.article_text = article_text
        self.feedback = feedback

    def polish_article(self) -> str:
        """Polish the article based on feedback"""
        try:
            logging.info(f"Starting article polishing with feedback: {self.feedback[:100]}...")
            
            cleaned_article = ArticleTextProcessing.clean_up_section(self.article_text)
            
            search_results = self._perform_search_for_polish(cleaned_article, self.feedback)
            formatted_results = self._format_search_results(search_results)
            
            prompt = self._build_polish_prompt(cleaned_article, self.feedback, formatted_results)
            
            response = self.lm.generate(prompt)
            
            if response:
                polished_article = ArticleTextProcessing.clean_up_section(response)
                
                processed_article = self._process_references(polished_article, search_results)
                
                logging.info("Article polishing completed successfully")
                return processed_article
            else:
                logging.warning("No response from LM for article polishing")
                return self.article_text
                
        except Exception as e:
            logging.error(f"Error in polish_article: {str(e)}")
            raise

    def _perform_search_for_polish(self, article_text: str, feedback: str) -> list:
        """Perform search for polishing"""
        try:
            if self.rm is None:
                logging.info("No search tool available for polish search")
                return []
            
            search_query = f"improve {feedback} {article_text[:100]}"
            logging.info(f"Performing polish search for: {search_query}")
            
            search_results = self.rm(search_query)
            logging.info(f"Found {len(search_results)} polish search results")
            
            return search_results
            
        except Exception as e:
            logging.error(f"Error performing polish search: {str(e)}")
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
            
            formatted_text = f"[{idx}]"
            formatted_text += "\n".join(f"- {snippet}" for snippet in snippets)
            formatted_results.append(formatted_text)
            
            result['reference_id'] = idx
        
        return "\n\n".join(formatted_results)

    def _process_references(self, content: str, search_results: list) -> str:
        """Process references to ensure consistent reference numbering"""
        if not search_results:
            return content
        
        used_refs = set(int(x) for x in re.findall(r'\[(\d+)\]', content))
        
        replacements = {}
        
        for result in search_results:
            if result.get('reference_id') in used_refs:
                old_ref = f'[{result["reference_id"]}]'
                new_ref = f'[{result["reference_id"]}]'
                replacements[old_ref] = new_ref
        
        processed_content = content
        for old_ref, new_ref in replacements.items():
            processed_content = processed_content.replace(old_ref, new_ref)
        
        return processed_content

    def _build_polish_prompt(self, article_text: str, feedback: str, formatted_results: str) -> str:
        """Build article polishing prompt"""
        if formatted_results and formatted_results.strip():
            prompt = f"""Please polish the article based on the following feedback and search results:

Polishing Feedback:
{feedback}

Search Results:
{formatted_results}

Original Text:
{article_text}

Requirements:
1. Polish the article based on the feedback.
2. Improve the language and logical structure of the article.
3. Enhance the readability and professionalism of the article.
4. Keep the core content and viewpoint of the article unchanged.
5. Ensure the polished content is more fluent and accurate.
6. Maintain an academic writing style.
7. If the feedback involves specific issues, please focus on resolving them.
8. You can use information from the search results to improve the content and mark citations in the format [n].

Please output the complete polished article:"""
        else:
            prompt = f"""Please polish the article based on the following feedback:

Polishing Feedback:
{feedback}

Original Text:
{article_text}

Requirements:
1. Polish the article based on the feedback.
2. Improve the language and logical structure of the article.
3. Enhance the readability and professionalism of the article.
4. Keep the core content and viewpoint of the article unchanged.
5. Ensure the polished content is more fluent and accurate.
6. Maintain an academic writing style.
7. If the feedback involves specific issues, please focus on resolving them.

Please output the complete polished article:"""
        
        return prompt
