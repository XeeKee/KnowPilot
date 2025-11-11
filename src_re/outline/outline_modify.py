from utils.ArticleTextProcessing import ArticleTextProcessing
class OutlineModify():

    def __init__(self, lm, messages: list, current_outline: str):
        self.lm = lm
        self.messages = messages
        self.current_outline = current_outline

    def modify_outline(self):
        # You need to make sure that the last element of messages is the user's outline
        # Check if messages list is not empty before popping
        if self.messages:
            self.messages.pop(-1)
        self.messages.append({"role": "user", "content": self.current_outline})
        return self.messages