"""ReAct Agent Loop — Reason-Act-Observe cycle for Eva.

Implements the pattern from ai-agents-architect skill:
1. Reason: Analyze the user query and decide next action
2. Act: Call a tool or respond directly
3. Observe: Process the tool result
4. Repeat until the query is resolved or max iterations reached

The heavyweight agent framework lives in `agent_framework.py`. This
module keeps a lightweight shim that the legacy `routes_chatbot.py`
callsite expects, and delegates to the new framework when available.
"""

import logging
from typing import Optional

from shared.tool_registry import list_tools, get_tool

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

    enriched_prompt = (
        f"{user_prompt}\n\n"
        f"Available tools:\n{tools_desc}\n\n"
        "If you need current data, use a tool by writing:\n"
        "TOOL: tool_name(param1=value1, param2=value2)\n"
        "The system will execute the tool and return the result."
    )

    response = await marketplace_call(system + '\n\n' + enriched_prompt)

    for iteration in range(MAX_ITERATIONS):
        try:
            from shared.agent_framework import parse_tool_call
            tool_call = parse_tool_call(response or "")
        except Exception as e:
            logger.debug("agent_framework not available, using legacy parser: %s", e)
            tool_call = _parse_tool_call_legacy(response)
        if not tool_call:
            break

        tool_name, params = tool_call
        tool = get_tool(tool_name)
        if not tool:
            response = response + f"\n\n(Error: tool '{tool_name}' not found)"
            break

        logger.info('Agent iteration %d: calling tool %s with %s', iteration + 1, tool_name, params)

        try:
            from shared.agent_framework import call_tool_by_name
            result, err = await call_tool_by_name(tool_name, params)
            observation = (f"Error: {err}" if err else str(result))[:2000]
        except Exception:
            try:
                result = await tool.handler(**params)
                observation = str(result)[:2000]
            except Exception as e:
                observation = f"Error: {e}"
                logger.exception('Tool %s failed', tool_name)

        follow_up = (
            f"Tool '{tool_name}' returned:\n{observation}\n\n"
            "Based on this result, provide your final answer to the user."
        )
        response = await marketplace_call(system + '\n\n' + follow_up)

    return response


def _build_system_prompt(context: str, conversation_history: str) -> str:
    try:
        from shared.prompts_lib import get_store, render_prompt
        store = get_store()
        p = store.get("system.hive")
        if p:
            rendered = render_prompt(p, {"user_input": ""})
            sys_prompt = rendered["system"]
        else:
            raise ValueError("no system.hive prompt")
    except Exception:
        sys_prompt = (
            "You are Hive — the friendly visa & travel assistant for "
            "We Hive Immigration Services (Ballari, India)."
        )
    if conversation_history:
        sys_prompt += f"\nConversation so far:\n{conversation_history}"
    if context:
        sys_prompt += f"\nCurrent data from our system:\n{context}"
    sys_prompt += (
        "\nTone: warm, professional, India-friendly. Use ₹ for INR. "
        "Be concise (2-4 sentences). "
        "Introduce yourself as Hive when prompted."
    )
    return sys_prompt


def _format_tool_descriptions() -> str:
    try:
        from shared.agent_framework import get_tool_descriptions
        names = [t.name for t in list_tools()]
        return get_tool_descriptions(names) or "No tools available."
    except Exception:
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


def _parse_tool_call_legacy(text: str) -> Optional[tuple]:
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
