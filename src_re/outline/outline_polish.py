from utils.ArticleTextProcessing import ArticleTextProcessing
from tool.lm import LLMModel
import logging
OUTLINE_POLISH_PROMPT = \
    """
    You are an experienced outline polishing assistant. Please refine the provided outline by improving language expression, optimizing logical structure, and enhancing presentation effectiveness to make the outline clearer, more concise, and easier to understand.

    Outline content:

    {outline}

    Polishing requirements (optional):

    (e.g., strengthen logical coherence, increase language conciseness, highlight key points, etc. If no specific requirements, leave blank.)

    {polish_requirements}

    Reference materials (optional):

    (If you have relevant reference materials or retrieved content, paste here. If none, leave blank.)

    {reference}

    Please strictly follow these rules when polishing the outline:
    Use "# Title" for first-level headings, "## Title" for second-level headings, "### Title" for third-level headings, and so on.
    The outline should only contain hierarchical headings at various levels, without any additional information or body content.
    Do not include the topic name itself in the outline.

    Based on the above information and rules, please polish the outline and return the refined version.
    """
    
class OutlinePolish():

    def __init__(self, lm: LLMModel, messages: list, current_outline: str, feedback: str, reference: str = "None"):
        self.lm = lm
        self.messages = messages
        self.current_outline = current_outline
        self.feedback = feedback
        self.reference = reference or "None"

    def polish_outline(self):
        # You need to make sure that the last element of messages is the user's outline
        # Check if messages list is not empty before popping
        if self.messages:
            self.messages.pop(-1)
        
        self.messages.append({"role": "user", 
                              "content": OUTLINE_POLISH_PROMPT.format(outline=self.current_outline, 
                                                                      polish_requirements=self.feedback, 
                                                                      reference=self.reference)})
        polished_outline = self.lm.call(self.messages)
        polished_outline = ArticleTextProcessing.clean_up_outline(polished_outline)
        logging.info(f"Raw outline: {self.current_outline}")
        logging.info(f"Polished outline: {polished_outline}")
        return polished_outline
