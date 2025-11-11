"""
Article text processing utilities and content manipulation tools.

This module provides comprehensive text processing capabilities for article content
including word count limiting, citation management, section parsing, and content
cleaning. It implements algorithms for preserving text integrity while performing
various transformations and extractions.
"""

import re
from typing import List, Dict

class ArticleTextProcessing:
    """
    Text processing utilities for article content manipulation.
    
    This class provides static methods for various text processing operations
    including word count management, citation handling, section parsing, and
    content cleaning. All methods are designed to preserve text integrity
    while performing their operations.
    """
    
    @staticmethod
    def limit_word_count_preserve_newline(input_string, max_word_count):
        """
        Limit word count while preserving complete line integrity.
        
        This function implements a sophisticated word counting algorithm that
        truncates text at word boundaries while ensuring no partial lines
        are included in the output. It processes text line by line to maintain
        readability and structure.
        
        Args:
            input_string (str): The string to be truncated. This string may contain multiple lines.
            max_word_count (int): The maximum number of words allowed in the truncated string.

        Returns:
            str: The truncated string with word count limited to `max_word_count`, preserving complete lines.
        """

        word_count = 0
        limited_string = ''

        # Process text line by line to maintain line integrity
        for word in input_string.split('\n'):
            line_words = word.split()
            for lw in line_words:
                if word_count < max_word_count:
                    limited_string += lw + ' '
                    word_count += 1
                else:
                    break
            if word_count >= max_word_count:
                break
            limited_string = limited_string.strip() + '\n'

        return limited_string.strip()

    @staticmethod
    def remove_citations(s):
        """
        Remove citation patterns from text content.
        
        This function uses regex pattern matching to identify and remove
        citation references in the format [1], [2], or [1, 2]. It handles
        both single and grouped citations efficiently.
        
        Args:
            s (str): The string from which citations are to be removed.

        Returns:
            str: The string with all citation patterns removed.
        """

        return re.sub(r'\[\d+(?:,\s*\d+)*\]', '', s)

    @staticmethod
    def get_first_section_dict_and_list(s):
        """
        Parse the first section of text into structured format.
        
        This method extracts section titles and content from markdown-style
        text using '#' as section markers. It creates both a dictionary
        for content lookup and a list for ordered access.
        
        Args:
            s (str): Text containing markdown-style sections
            
        Returns:
            tuple: (content_dict, titles) where content_dict maps titles to content
                   and titles is an ordered list of section titles
        """
        text = s
        sections = text.strip().split('\n# ')
        titles = []
        content_dict = {}

        # Process each section to extract title and content
        for section in sections:
            if section:
                lines = section.split('\n', 1)
                title = lines[0].strip()
                content = lines[1].strip() if len(lines) > 1 else ""
                
                titles.append(title)
                content_dict[title] = content
        return content_dict, titles

    @staticmethod
    def parse_citation_indices(s):
        """
        Extract citation indices from text content.
        
        This function uses regex to find all citation references in the
        format [number] and returns them as a list of integers. It handles
        the extraction efficiently for large text content.
        
        Args:
            s (str): The content string containing citations in the format [number].

        Returns:
            List[int]: A list of unique citation indexes extracted from the content, in the order they appear.
        """
        matches = re.findall(r'\[\d+\]', s)
        return [int(index[1:-1]) for index in matches]

    @staticmethod
    def remove_uncompleted_sentences_with_citations(text):
        """
        Remove incomplete sentences and standalone citations from text.
        
        This function implements a sophisticated text cleaning algorithm that
        identifies sentence boundaries and removes incomplete content while
        preserving complete sentences with their citations. It handles grouped
        citations by splitting them into individual references.
        
        Args:
            text (str): The input text from which uncompleted sentences and their citations are to be removed.

        Returns:
            str: Text containing only complete sentences with their citations.
        """

        # Convert citations like [1, 2, 3] to [1][2][3].
        def replace_with_individual_brackets(match):
            numbers = match.group(1).split(', ')
            return ' '.join(f'[{n}]' for n in numbers)

        # Deduplicate and sort individual groups of citations.
        def deduplicate_group(match):
            citations = match.group(0)
            unique_citations = list(set(re.findall(r'\[\d+\]', citations)))
            sorted_citations = sorted(unique_citations, key=lambda x: int(x.strip('[]')))
            # Return the sorted unique citations as a string
            return ''.join(sorted_citations)

        text = re.sub(r'\[([0-9, ]+)\]', replace_with_individual_brackets, text)
        text = re.sub(r'(\[\d+\])+', deduplicate_group, text)

        eos_pattern = r'([.!?])\s*(\[\d+\])?\s*'
        matches = list(re.finditer(eos_pattern, text))
        if matches:
            last_match = matches[-1]
            text = text[:last_match.end()].strip()

        return text

    @staticmethod
    def clean_up_citation(conv):
        for turn in conv.dlg_history:
            turn.agent_utterance = turn.agent_utterance[:turn.agent_utterance.find('References:')]
            turn.agent_utterance = turn.agent_utterance[:turn.agent_utterance.find('Sources:')]
            turn.agent_utterance = turn.agent_utterance.replace('Answer:', '').strip()
            try:
                max_ref_num = max([int(x) for x in re.findall(r'\[(\d+)\]', turn.agent_utterance)])
            except Exception as e:
                max_ref_num = 0
            if max_ref_num > len(turn.search_results):
                for i in range(len(turn.search_results), max_ref_num + 1):
                    turn.agent_utterance = turn.agent_utterance.replace(f'[{i}]', '')
            turn.agent_utterance = ArticleTextProcessing.remove_uncompleted_sentences_with_citations(
                turn.agent_utterance)

        return conv
        
    @staticmethod
    def clean_up_outline(outline, topic=""):
        if not outline or not outline.strip():
            return "# Introduction\n# Main Content\n# Conclusion"
            
        output_lines = []
        current_level = 0
        has_valid_outline = False

        for line in outline.split('\n'):
            stripped_line = line.strip()

            if topic != "" and f"# {topic.lower()}" in stripped_line.lower():
                output_lines = []

            if stripped_line.startswith('#') and stripped_line != '#':
                current_level = stripped_line.count('#')
                output_lines.append(stripped_line)
                has_valid_outline = True
            elif stripped_line and not has_valid_outline and not stripped_line.startswith('@'):
                if "error" in stripped_line.lower() or "failed" in stripped_line.lower() or "出错" in stripped_line:
                    continue
                else:
                    output_lines.append("# " + stripped_line)
                    has_valid_outline = True
            elif stripped_line.startswith('@'):
                output_lines.append(stripped_line)

        if not output_lines:
            return "# Introduction\n# Main Content\n# Conclusion"
            
        outline = '\n'.join(output_lines)

        # Remove references.
        outline = re.sub(r"#[#]? See also.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? See Also.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Notes.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? References.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? External links.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? External Links.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Bibliography.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Further reading*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Further Reading*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Summary.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Appendices.*?(?=##|$)", '', outline, flags=re.DOTALL)
        outline = re.sub(r"#[#]? Appendix.*?(?=##|$)", '', outline, flags=re.DOTALL)

        if not outline.strip():
            return "# Introduction\n# Main Content\n# Conclusion"
            
        return outline


    @staticmethod
    def clean_up_section(text):
        """Clean up a section:
        1. Remove uncompleted sentences (usually due to output token limitation).
        2. Deduplicate individual groups of citations.
        3. Remove unnecessary summary."""

        paragraphs = text.split('\n')
        output_paragraphs = []
        summary_sec_flag = False
        for p in paragraphs:
            p = p.strip()
            if len(p) == 0:
                continue
            if not p.startswith('#'):
                p = ArticleTextProcessing.remove_uncompleted_sentences_with_citations(p)
            if summary_sec_flag:
                if p.startswith('#'):
                    summary_sec_flag = False
                else:
                    continue
            if p.startswith('Overall') or p.startswith('In summary') or p.startswith('In conclusion'):
                continue
            if "# Summary" in p or '# Conclusion' in p:
                summary_sec_flag = True
                continue
            output_paragraphs.append(p)

        return '\n\n'.join(output_paragraphs)

    @staticmethod
    def update_citation_index(s, citation_map):
        """Update citation index in the string based on the citation map."""
        for original_citation in citation_map:
            s = s.replace(f"[{original_citation}]", f"__PLACEHOLDER_{original_citation}__")
        for original_citation, unify_citation in citation_map.items():
            s = s.replace(f"__PLACEHOLDER_{original_citation}__", f"[{unify_citation}]")

        return s

    @staticmethod
    def parse_article_into_dict(input_string):
        """
        Parses a structured text into a nested dictionary. The structure of the text
        is defined by markdown-like headers (using '#' symbols) to denote sections
        and subsections. Each section can contain content and further nested subsections.

        The resulting dictionary captures the hierarchical structure of sections, where
        each section is represented as a key (the section's title) mapping to a value
        that is another dictionary. This dictionary contains two keys:
        - 'content': content of the section
        - 'subsections': a list of dictionaries, each representing a nested subsection
        following the same structure.

        Args:
            input_string (str): A string containing the structured text to parse.

        Returns:
            A dictionary representing contains the section title as the key, and another dictionary
        as the value, which includes the 'content' and 'subsections' keys as described above.
        """
        lines = input_string.split('\n')
        lines = [line for line in lines if line.strip()]
        root = {'content': '', 'subsections': {}}
        current_path = [(root, -1)]

        for line in lines:
            if line.startswith('#'):
                level = line.count('#')
                title = line.strip('# ').strip()
                new_section = {'content': '', 'subsections': {}}

                # Pop from stack until find the parent level
                while current_path and current_path[-1][1] >= level:
                    current_path.pop()

                # Append new section to the nearest upper level's subsections
                current_path[-1][0]['subsections'][title] = new_section
                current_path.append((new_section, level))
            else:
                current_path[-1][0]['content'] += line + '\n'

        return root['subsections']

    @staticmethod
    def parse_outline(markdown: str) -> List[Dict]:
        """
        Parse Markdown heading hierarchy and return a list of dictionaries with level information
        Example input:
            # Root
            ## Child1
            ### Grandchild
            ## Child2
        Example output:
            [
                {"title": "Root", "level": 1},
                {"title": "Child1", "level": 2},
                {"title": "Grandchild", "level": 3},
                {"title": "Child2", "level": 2}
            ]
        """
        lines = [line.strip() for line in markdown.split('\n') if line.strip()]
        parsed = []
        for line in lines:
            match = re.match(r'^(#+)\s+(.+?)\s*$', line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                parsed.append({"title": title, "level": level})
        return parsed