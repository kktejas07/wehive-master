from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
import operator


class WeHiveAgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    user_id: str
    session_id: str
    intent: str
    retrieved_docs: list
    retrieval_quality: str
    retry_count: int
    reformulated_query: str
    final_answer: str
    requires_human: bool
    agent_name: str
    memory_context: str
