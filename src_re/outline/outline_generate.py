from tool.config_manager import Config
from tool.lm import LLMModel
import logging
# default
PROMPT_TEMPLATES = {
    "default": """
    You now need to create an outline for this topic book
    Please strictly follow these rules when writing the outline:
    Use "# Title" for first-level headings, "## Title" for second-level headings, "### Title" for third-level headings, and so on.
    The outline should only contain hierarchical headings at various levels, without any additional information or body content.
    Do not include the topic name itself in the outline.
    Generate only 5 lines most.
    The outline you output:
    """
}
class OutlineGenerate:
    def __init__(self, config: Config, lm: LLMModel, messages: list):
        self.config = config
        self.lm = lm
        self.outlineType = config.model.outlineType
        self.prompt = PROMPT_TEMPLATES[self.outlineType]
        self.messages = messages

    def generate_outline(self):
        message = {"role": "user", "content": self.prompt}
        self.messages.append(message)
        logging.info(f"Messages: {self.messages[-1]}")
        return self.lm.call(self.messages)
