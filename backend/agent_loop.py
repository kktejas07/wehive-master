"""ReAct Agent Loop — Reason-Act-Observe cycle for Eva.

Implements the pattern from ai-agents-architect skill:
1. Reason: Analyze the user query and decide next action
2. Act: Call a tool or respond directly
3. Observe: Process the tool result
4. Repeat until the query is resolved or max iterations reached
"""

import logging
from typing import Optional

from tool_registry import list_tools, get_tool

logger = logging.getLogger('wehive.agent_loop')

MAX_ITERATIONS = 5


async def react_chat(user_prompt: str, context: str, conversation_history: str, marketplace_call) -> str:
    """Run a ReAct agent loop with tool access.

    Args:
        user_prompt: The user's message
        context: Retrieved context from RAG
        conversation_history: Recent conversation history
        marketplace_call: Async callable that accepts a combined prompt string and returns the LLM response

    Returns:
        The final response text
    """
    system = _build_system_prompt(context, conversation_history)
    tools_desc = _format_tool_descriptions()

    # Phase 1: Inject tool descriptions + context into system prompt
    enriched_prompt = (
        f"{user_prompt}\n\n"
        f"Available tools:\n{tools_desc}\n\n"
        "If you need current data, use a tool by writing:\n"
        "TOOL: tool_name(param1=value1, param2=value2)\n"
        "The system will execute the tool and return the result."
    )

    # Phase 2: Initial call to the LLM
    response = await marketplace_call(system + '\n\n' + enriched_prompt)

    # Phase 3: Check for tool calls and iterate
    for iteration in range(MAX_ITERATIONS):
        tool_call = _parse_tool_call(response)
        if not tool_call:
            break

        tool_name, params = tool_call
        tool = get_tool(tool_name)
        if not tool:
            response = response + f"\n\n(Error: tool '{tool_name}' not found)"
            break

        logger.info('Agent iteration %d: calling tool %s with %s', iteration + 1, tool_name, params)

        # Execute the tool
        try:
            result = await tool.handler(**params)
            observation = str(result)[:2000]  # Truncate long results
        except Exception as e:
            observation = f"Error: {e}"
            logger.exception('Tool %s failed', tool_name)

        # Feed observation back to the LLM
        follow_up = (
            f"Tool '{tool_name}' returned:\n{observation}\n\n"
            "Based on this result, provide your final answer to the user."
        )
        response = await marketplace_call(system + '\n\n' + follow_up)

    return response


def _build_system_prompt(context: str, conversation_history: str) -> str:
    parts = ["You are Eva — the friendly visa & travel assistant for We Hive Immigration Services (Ballari, India)."]
    if conversation_history:
        parts.append(f"\nConversation so far:\n{conversation_history}")
    if context:
        parts.append(f"\nCurrent data from our system:\n{context}")
    parts.append(
        "\nTone: warm, professional, India-friendly. Use ₹ for INR. "
        "Be concise (2-4 sentences). "
        "Introduce yourself as Eva when prompted."
    )
    return '\n'.join(parts)


def _format_tool_descriptions() -> str:
    tools = list_tools()
    if not tools:
        return "No tools available."
    lines = []
    for t in tools:
        lines.append(f"- {t.name}: {t.description}")
        props = t.parameters.get('properties', {})
        for p_name, p_info in props.items():
            lines.append(f"  {p_name}: {p_info.get('description', '')}")
    return '\n'.join(lines)


def _parse_tool_call(text: str) -> Optional[tuple]:
    """Parse a TOOL: tool_name(param=value) pattern from the LLM response."""
    import re
    match = re.search(r'TOOL:\s*(\w+)\(([^)]*)\)', text)
    if not match:
        return None
    tool_name = match.group(1)
    params_str = match.group(2)
    params = {}
    for pair in params_str.split(','):
        pair = pair.strip()
        if '=' in pair:
            key, value = pair.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            params[key] = value
    return tool_name, params
