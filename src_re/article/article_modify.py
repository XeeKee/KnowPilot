from tool.lm import LLMModel
from utils.ArticleTextProcessing import ArticleTextProcessing
import logging
import re

class ArticleModify:
    def __init__(self, lm: LLMModel, rm, article_text: str, modification_instruction: str):
        self.lm = lm
        self.rm = rm  
        self.article_text = article_text
        self.modification_instruction = modification_instruction

    def modify_article(self) -> str:
        """Modify the article based on instructions"""
        try:
            logging.info(f"Starting article modification with instruction: {self.modification_instruction[:100]}...")
            
            cleaned_article = ArticleTextProcessing.clean_up_section(self.article_text)
            
            search_results = self._perform_search_for_modify(cleaned_article, self.modification_instruction)
            formatted_results = self._format_search_results(search_results)
            
            prompt = self._build_modification_prompt(cleaned_article, self.modification_instruction, formatted_results)
            
            response = self.lm.generate(prompt)
            
            if response:
                modified_article = ArticleTextProcessing.clean_up_section(response)
                
                processed_article = self._process_references(modified_article, search_results)
                
                logging.info("Article modification completed successfully")
                return processed_article
            else:
                logging.warning("No response from LM for article modification")
                return self.article_text
                
        except Exception as e:
            logging.error(f"Error in modify_article: {str(e)}")
            raise

    def _perform_search_for_modify(self, article_text: str, instruction: str) -> list:
        """Perform search for modification"""
        try:
            if self.rm is None:
                logging.info("No search tool available for modify search")
                return []
            
            search_query = f"{instruction} {article_text[:100]}"
            logging.info(f"Performing modify search for: {search_query}")
            
            search_results = self.rm(search_query)
            logging.info(f"Found {len(search_results)} modify search results")
            
            return search_results
            
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
            
            formatted_text = f"[{idx}]"
            formatted_text += "\n".join(f"- {snippet}" for snippet in snippets)
            formatted_results.append(formatted_text)
            
            result['reference_id'] = idx
        
        return "\n\n".join(formatted_results)

    def _process_references(self, content: str, search_results: list) -> str:
        """Process references to ensure uniform reference numbers"""
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

    def _build_modification_prompt(self, article_text: str, instruction: str, formatted_results: str) -> str:
        """Build article modification prompt"""
        if formatted_results and formatted_results.strip():
            prompt = f"""Please modify the article based on the following instructions and search results:

Modification Instruction:
{instruction}

Search Results:
{formatted_results}

Original Text:
{article_text}

Requirements:
1. Strictly follow the modification instructions.
2. Maintain the overall structure and logic of the article.
3. Ensure the modified content is coherent and fluent.
4. Maintain an academic writing style.
5. If the instruction involves deleting content, please remove the relevant parts completely.
6. If the instruction involves adding content, please add it in the appropriate place.
7. If the instruction involves modifying content, please maintain the original format and style.
8. You can use information from the search results to improve the content and mark citations in the format [n].

Please output the complete modified article:"""
        else:
            prompt = f"""Please modify the article based on the following instructions:

Modification Instruction:
{instruction}

Original Text:
{article_text}

Requirements:
1. Strictly follow the modification instructions.
2. Maintain the overall structure and logic of the article.
3. Ensure the modified content is coherent and fluent.
4. Maintain an academic writing style.
5. If the instruction involves deleting content, please remove the relevant parts completely.
6. If the instruction involves adding content, please add it in the appropriate place.
7. If the instruction involves modifying content, please maintain the original format and style.

Please output the complete modified article:"""
        
        return prompt 