"""Unit tests for agent_framework (parse_tool_call, _split_args, _coerce_args,
AgentSpec, AgentRun, get_tool_descriptions, run_agent with mocked LLM/tool).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import AsyncMock, patch, MagicMock
import pytest

from shared.agent_framework import (
    AgentSpec,
    AgentStep,
    AgentRun,
    parse_tool_call,
    _split_args,
    _coerce_args,
    _stringify_tool_result,
    get_tool_descriptions,
    run_agent,
)


# ─── parse_tool_call ─────────────────────────────────────────────────────────

class TestParseToolCall:
    def test_simple(self):
        name, args = parse_tool_call("TOOL: lookup_country(country_id=us)")
        assert name == "lookup_country"
        assert args == {"country_id": "us"}

    def test_quoted_value_with_spaces(self):
        name, args = parse_tool_call('TOOL: search(query="hello world")')
        assert name == "search"
        assert args == {"query": "hello world"}

    def test_single_quoted(self):
        name, args = parse_tool_call("TOOL: search(query='a b c')")
        assert args == {"query": "a b c"}

    def test_no_args(self):
        name, args = parse_tool_call("TOOL: ping()")
        assert name == "ping"
        assert args == {}

    def test_no_tool_call(self):
        assert parse_tool_call("Just a normal response") is None
        assert parse_tool_call("") is None
        assert parse_tool_call(None) is None

    def test_extra_text_around_call(self):
        text = "Let me think...\n\nTOOL: lookup(country=ca)\n\nDone."
        name, args = parse_tool_call(text)
        assert name == "lookup"
        assert args == {"country": "ca"}

    def test_multiple_args(self):
        name, args = parse_tool_call("TOOL: search(a=1, b=2, c=three)")
        assert args == {"a": "1", "b": "2", "c": "three"}


class TestSplitArgs:
    def test_simple(self):
        assert _split_args("a=1, b=2") == ["a=1", "b=2"]

    def test_quoted_with_comma(self):
        assert _split_args('a="x,y", b=2') == ['a="x,y"', "b=2"]

    def test_empty(self):
        assert _split_args("") == []


class TestCoerceArgs:
    def test_int_coercion(self):
        schema = {"properties": {"x": {"type": "integer"}}}
        out = _coerce_args({"x": "42"}, schema)
        assert out == {"x": 42}
        assert isinstance(out["x"], int)

    def test_number_coercion(self):
        schema = {"properties": {"x": {"type": "number"}}}
        out = _coerce_args({"x": "3.14"}, schema)
        assert out == {"x": 3.14}

    def test_bool_coercion(self):
        schema = {"properties": {"x": {"type": "boolean"}}}
        assert _coerce_args({"x": "true"}, schema) == {"x": True}
        assert _coerce_args({"x": "false"}, schema) == {"x": False}

    def test_string_passthrough(self):
        schema = {"properties": {"x": {"type": "string"}}}
        assert _coerce_args({"x": "hello"}, schema) == {"x": "hello"}


# ─── AgentSpec / AgentRun ────────────────────────────────────────────────────

class TestAgentSpec:
    def test_to_from_dict_roundtrip(self):
        spec = AgentSpec(
            id="a1",
            name="Agent 1",
            role="helper",
            prompt_id="agent.react",
            tools=["t1", "t2"],
            provider_id="ollama",
            model="llama3.2",
            max_iterations=4,
            max_tokens=512,
            memory_window=8,
            description="test",
            tags=["x"],
            rag_collections=["c1"],
            temperature=0.2,
        )
        d = spec.to_dict()
        spec2 = AgentSpec.from_dict(d)
        assert spec2.id == "a1"
        assert spec2.tools == ["t1", "t2"]
        assert spec2.rag_collections == ["c1"]
        assert spec2.temperature == 0.2

    def test_from_dict_defaults(self):
        s = AgentSpec.from_dict({"id": "x"})
        assert s.id == "x"
        assert s.max_iterations == 6
        assert s.temperature == 0.3

    def test_to_dict_has_all_fields(self):
        d = AgentSpec(id="x", name="X", role="r", prompt_id="p").to_dict()
        for k in ("id", "name", "role", "prompt_id", "tools", "provider_id", "model", "max_iterations"):
            assert k in d


class TestAgentRun:
    def test_to_dict_empty(self):
        r = AgentRun(agent_id="a", input="hi")
        d = r.to_dict()
        assert d["agent_id"] == "a"
        assert d["steps"] == []
        assert d["final_answer"] == ""

    def test_step_to_dict(self):
        s = AgentStep(iteration=0, thought="t", tool_name="x", tool_args={"a": 1}, observation="o")
        d = s.to_dict()
        assert d["iteration"] == 0
        assert d["tool_name"] == "x"
        assert d["observation"] == "o"


class TestStringifyToolResult:
    def test_none(self):
        assert _stringify_tool_result(None) == "(no result)"

    def test_string(self):
        assert _stringify_tool_result("ok") == "ok"

    def test_dict(self):
        import json
        out = _stringify_tool_result({"a": 1, "b": [1, 2]})
        assert json.loads(out) == {"a": 1, "b": [1, 2]}

    def test_truncates(self):
        big = "x" * 5000
        out = _stringify_tool_result(big)
        assert len(out) <= 3000


# ─── get_tool_descriptions ───────────────────────────────────────────────────

class TestGetToolDescriptions:
    def setup_method(self):
        import shared.tool_registry as tr
        tr._tools.clear()
        async def handler(**kwargs):
            return "ok"
        tr.register_tool(
            "demo_tool",
            "Demo tool description",
            {"type": "object", "properties": {"q": {"type": "string", "description": "Search query"}}},
            handler,
        )

    def teardown_method(self):
        import shared.tool_registry as tr
        tr._tools.clear()

    def test_describes_known_tool(self):
        out = get_tool_descriptions(["demo_tool"])
        assert "demo_tool" in out
        assert "Demo tool description" in out
        assert "q" in out

    def test_skips_unknown(self):
        out = get_tool_descriptions(["demo_tool", "ghost"])
        assert "demo_tool" in out
        assert "ghost" not in out

    def test_empty(self):
        out = get_tool_descriptions([])
        assert "(no tools available)" in out


# ─── run_agent (with mocks) ──────────────────────────────────────────────────

class TestRunAgent:
    def setup_method(self):
        import shared.tool_registry as tr
        tr._tools.clear()
        async def echo_handler(**kwargs):
            return {"echo": kwargs}
        tr.register_tool(
            "echo",
            "Echo back the args",
            {
                "type": "object",
                "properties": {
                    "msg": {"type": "string", "description": "Message to echo"},
                },
            },
            echo_handler,
        )

    def teardown_method(self):
        import shared.tool_registry as tr
        tr._tools.clear()

    @pytest.mark.asyncio
    async def test_final_answer_no_tool_call(self):
        from shared.prompts_lib import reset_store, Prompt, PromptStore
        reset_store()
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_prompts_no_tool")
        os.makedirs(tmp, exist_ok=True)
        try:
            with open(os.path.join(tmp, "p.yaml"), "w") as f:
                f.write("id: test.no_tool\nversion: 1\nsystem: sys\nuser: usr\n")
            store = PromptStore(prompts_dir=tmp, db=None)
            store.reload()
            with patch("prompts_lib.get_store", return_value=store):
                spec = AgentSpec(
                    id="a1", name="A1", role="r",
                    prompt_id="test.no_tool", tools=[],
                )
                with patch("agent_framework._llm_call", new=AsyncMock(return_value=("just text", {"id": "ollama", "model": "llama3.2"}))):
                    run = await run_agent(spec, "hi", user_id="u1")
            assert run.final_answer == "just text"
            assert len(run.steps) == 1
            assert run.steps[0].tool_name is None
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
            reset_store()

    @pytest.mark.asyncio
    async def test_tool_call_then_final_answer(self):
        from shared.prompts_lib import reset_store, PromptStore
        reset_store()
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_prompts_tool")
        os.makedirs(tmp, exist_ok=True)
        try:
            with open(os.path.join(tmp, "p.yaml"), "w") as f:
                f.write("id: test.with_tool\nversion: 1\nsystem: sys\nuser: usr\n")
            store = PromptStore(prompts_dir=tmp, db=None)
            store.reload()
            with patch("prompts_lib.get_store", return_value=store):
                spec = AgentSpec(
                    id="a2", name="A2", role="r",
                    prompt_id="test.with_tool", tools=["echo"],
                    max_iterations=4,
                )
                responses = [
                    "Let me check.\nTOOL: echo(msg=\"hi\")",
                    "Final: done",
                ]
                async def fake_llm(**kw):
                    return (responses.pop(0), {"id": "ollama", "model": "m"})

                with patch("agent_framework._llm_call", new=fake_llm):
                    run = await run_agent(spec, "ping", user_id="u1")
            assert run.final_answer == "Final: done"
            assert len(run.steps) == 2
            assert run.steps[0].tool_name == "echo"
            assert run.steps[0].tool_args == {"msg": "hi"}
            assert "echo" in (run.steps[0].observation or "")
            assert run.steps[1].tool_name is None
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
            reset_store()

    @pytest.mark.asyncio
    async def test_unknown_tool_recovers(self):
        from shared.prompts_lib import reset_store, PromptStore
        reset_store()
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_prompts_unknown")
        os.makedirs(tmp, exist_ok=True)
        try:
            with open(os.path.join(tmp, "p.yaml"), "w") as f:
                f.write("id: test.unknown\nversion: 1\nsystem: sys\nuser: usr\n")
            store = PromptStore(prompts_dir=tmp, db=None)
            store.reload()
            with patch("prompts_lib.get_store", return_value=store):
                spec = AgentSpec(
                    id="a3", name="A3", role="r",
                    prompt_id="test.unknown", tools=["echo"],
                    max_iterations=4,
                )
                responses = [
                    "TOOL: ghost()",
                    "Done",
                ]
                async def fake_llm(**kw):
                    return (responses.pop(0), {"id": "ollama", "model": "m"})

                with patch("agent_framework._llm_call", new=fake_llm):
                    run = await run_agent(spec, "x", user_id="u1")
            assert run.final_answer == "Done"
            assert "ghost" in run.steps[0].observation.lower()
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
            reset_store()

    @pytest.mark.asyncio
    async def test_max_iterations_uses_last_thought(self):
        from shared.prompts_lib import reset_store, PromptStore
        reset_store()
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_prompts_max")
        os.makedirs(tmp, exist_ok=True)
        try:
            with open(os.path.join(tmp, "p.yaml"), "w") as f:
                f.write("id: test.max\nversion: 1\nsystem: sys\nuser: usr\n")
            store = PromptStore(prompts_dir=tmp, db=None)
            store.reload()
            with patch("prompts_lib.get_store", return_value=store):
                spec = AgentSpec(
                    id="a4", name="A4", role="r",
                    prompt_id="test.max", tools=["echo"],
                    max_iterations=2,
                )
                async def fake_llm(**kw):
                    return ("TOOL: echo(msg=\"x\")", {"id": "ollama", "model": "m"})

                with patch("agent_framework._llm_call", new=fake_llm):
                    run = await run_agent(spec, "x", user_id="u1")
            assert len(run.steps) == 2
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
            reset_store()

    @pytest.mark.asyncio
    async def test_llm_error_sets_run_error(self):
        from shared.prompts_lib import reset_store, PromptStore
        reset_store()
        tmp = os.path.join(os.path.dirname(__file__), "_tmp_prompts_err")
        os.makedirs(tmp, exist_ok=True)
        try:
            with open(os.path.join(tmp, "p.yaml"), "w") as f:
                f.write("id: test.err\nversion: 1\nsystem: sys\nuser: usr\n")
            store = PromptStore(prompts_dir=tmp, db=None)
            store.reload()
            with patch("prompts_lib.get_store", return_value=store):
                spec = AgentSpec(
                    id="a5", name="A5", role="r",
                    prompt_id="test.err", tools=[],
                )
                async def fake_llm(**kw):
                    raise RuntimeError("boom")

                with patch("agent_framework._llm_call", new=fake_llm):
                    run = await run_agent(spec, "x", user_id="u1")
            assert run.error and "boom" in run.error
            assert "boom" in run.final_answer
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)
            reset_store()
