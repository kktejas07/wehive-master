"""Unit tests for prompts_lib, vector_store, rag_ingest, and ollama_embeddings.

These tests run fully offline (no MongoDB, no Ollama) by:
  - patching get_store() to a temp dir with YAML files
  - resetting the vector-store singleton and forcing in-memory mode
  - stubbing the Ollama embed function with deterministic vectors
"""

import os
import sys
import shutil
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("APP_ENV", "test")

from unittest.mock import patch, AsyncMock
import pytest


# ─── prompts_lib ─────────────────────────────────────────────────────────────

from prompts_lib import (
    Prompt,
    PromptStore,
    render,
    render_prompt,
    _extract_vars,
    _parse_yaml_fallback,
    get_store,
    reset_store,
)


class TestRender:
    def test_substitute_simple(self):
        out = render("Hello {{ name }}!", {"name": "World"})
        assert out == "Hello World!"

    def test_substitute_multiple(self):
        out = render("{{ a }} + {{ b }} = {{ c }}", {"a": 1, "b": 2, "c": 3})
        assert out == "1 + 2 = 3"

    def test_missing_variable_raises(self):
        with pytest.raises(ValueError):
            render("Hi {{ name }}", {})

    def test_whitespace_tolerated(self):
        out = render("{{  name  }}", {"name": "x"})
        assert out == "x"

    def test_no_vars(self):
        assert render("hello", {}) == "hello"

    def test_empty(self):
        assert render("", {}) == ""


class TestExtractVars:
    def test_unique(self):
        v = _extract_vars("{{ a }} {{ b }} {{ a }} {{ c }}")
        assert v == ["a", "b", "c"]

    def test_empty(self):
        assert _extract_vars("nothing here") == []


class TestPrompt:
    def test_to_dict(self):
        p = Prompt(id="x", version=1, description="d", tags=["t"], variables=["v"], system="s", user="u")
        d = p.to_dict()
        assert d["id"] == "x"
        assert d["version"] == 1

    def test_render_prompt_auto_discovers(self):
        p = Prompt(
            id="x", version=1, description="", tags=[],
            variables=[], system="hi {{ name }}", user="{{ q }}",
        )
        out = render_prompt(p, {"name": "Ada", "q": "hello"})
        assert out["system"] == "hi Ada"
        assert out["user"] == "hello"

    def test_render_prompt_missing_var_raises(self):
        p = Prompt(
            id="x", version=1, description="", tags=[],
            variables=[], system="hi {{ name }}", user="",
        )
        with pytest.raises(ValueError):
            render_prompt(p, {})


class TestYamlFallback:
    def test_parses_minimal(self):
        yaml = """id: test.prompt
version: 1
description: hello
system: you are {{ name }}
user: "{{ user_input }}"
"""
        out = _parse_yaml_fallback(yaml, "test")
        assert len(out) == 1
        p = out[0]
        assert p.id == "test.prompt"
        assert p.version == 1
        assert "name" in p.variables
        assert "user_input" in p.variables


class TestPromptStore:
    def setup_method(self):
        self._tmp = tempfile.mkdtemp(prefix="prompts_test_")
        reset_store()

    def teardown_method(self):
        shutil.rmtree(self._tmp, ignore_errors=True)
        reset_store()

    def _write(self, name: str, content: str):
        path = os.path.join(self._tmp, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    def test_load_yaml_dir(self):
        self._write("a.yaml", "id: a\nversion: 1\nsystem: sys\nuser: usr\n")
        self._write("b.yaml", "id: b\nversion: 2\nsystem: sys2\nuser: usr2\n")
        store = PromptStore(prompts_dir=self._tmp, db=None)
        store.reload()
        ids = [p["id"] for p in store.list()]
        assert "a" in ids and "b" in ids

    def test_latest_version(self):
        self._write("a.yaml", "id: a\nversion: 1\nsystem: v1\nuser: u\n---\nid: a\nversion: 2\nsystem: v2\nuser: u\n")
        store = PromptStore(prompts_dir=self._tmp, db=None)
        store.reload()
        latest = store.latest("a")
        assert latest is not None
        assert latest.version == 2
        assert "v2" in latest.system

    def test_get_specific_version(self):
        self._write("a.yaml", "id: a\nversion: 1\nsystem: v1\nuser: u\n---\nid: a\nversion: 3\nsystem: v3\nuser: u\n")
        store = PromptStore(prompts_dir=self._tmp, db=None)
        store.reload()
        assert store.get("a", version=1).system.strip() == "v1"
        assert store.get("a", version=3).system.strip() == "v3"
        assert store.get("a", version=99) is None

    def test_get_missing(self):
        store = PromptStore(prompts_dir=self._tmp, db=None)
        store.reload()
        assert store.get("nope") is None

    def test_list_empty_dir(self):
        store = PromptStore(prompts_dir=self._tmp, db=None)
        store.reload()
        assert store.list() == []


# ─── vector_store ────────────────────────────────────────────────────────────

from vector_store import (
    reset_client,
    get_collection,
    list_collections,
    upsert_documents,
    query_collection,
    delete_documents,
    collection_count,
)


class TestVectorStore:
    def setup_method(self):
        reset_client()

    def test_upsert_and_count(self):
        upsert_documents(
            "test_v1",
            ids=["a", "b", "c"],
            documents=["alpha", "beta", "gamma"],
            embeddings=[[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]],
            metadatas=[{"k": "a"}, {"k": "b"}, {"k": "c"}],
        )
        assert collection_count("test_v1") == 3

    def test_query_returns_ordered(self):
        upsert_documents(
            "test_v2",
            ids=["x", "y", "z"],
            documents=["doc x", "doc y", "doc z"],
            embeddings=[[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]],
            metadatas=[{"label": "x"}, {"label": "y"}, {"label": "z"}],
        )
        results = query_collection("test_v2", [1.0, 0.0], n_results=2)
        assert len(results) == 2
        assert results[0]["id"] == "x"
        assert "doc x" in results[0]["document"]

    def test_query_with_where(self):
        upsert_documents(
            "test_v3",
            ids=["a", "b", "c"],
            documents=["alpha", "beta", "gamma"],
            embeddings=[[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]],
            metadatas=[{"country": "us"}, {"country": "uk"}, {"country": "us"}],
        )
        results = query_collection("test_v3", [1.0, 0.0], n_results=10, where={"country": "us"})
        ids = sorted(r["id"] for r in results)
        assert ids == ["a", "c"]

    def test_delete_by_ids(self):
        upsert_documents(
            "test_v4",
            ids=["a", "b"],
            documents=["a", "b"],
            embeddings=[[1.0, 0.0], [0.0, 1.0]],
        )
        removed = delete_documents("test_v4", ids=["a"])
        assert removed == 1
        assert collection_count("test_v4") == 1

    def test_delete_by_where(self):
        upsert_documents(
            "test_v5",
            ids=["a", "b"],
            documents=["a", "b"],
            embeddings=[[1.0, 0.0], [0.0, 1.0]],
            metadatas=[{"type": "x"}, {"type": "y"}],
        )
        removed = delete_documents("test_v5", where={"type": "x"})
        assert removed == 1
        assert collection_count("test_v5") == 1

    def test_list_collections(self):
        upsert_documents(
            "coll_a",
            ids=["1"], documents=["d"], embeddings=[[1.0]],
        )
        upsert_documents(
            "coll_b",
            ids=["1"], documents=["d"], embeddings=[[1.0]],
        )
        names = set(list_collections())
        assert "coll_a" in names and "coll_b" in names


# ─── rag_ingest ─────────────────────────────────────────────────────────────

from rag_ingest import chunk_text, dict_to_text, make_id, ingest_documents


class TestChunkText:
    def test_short_returns_one_chunk(self):
        chunks = chunk_text("hello world")
        assert chunks == ["hello world"]

    def test_empty(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_long_text_chunks(self):
        text = ("Visa requirements for US tourist visa. " * 200).strip()
        chunks = chunk_text(text, chunk_size=200, overlap=20)
        assert len(chunks) >= 2
        for c in chunks:
            assert c

    def test_overlap_preserved(self):
        text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
        chunks = chunk_text(text, chunk_size=10, overlap=3)
        assert len(chunks) >= 1


class TestDictToText:
    def test_basic(self):
        d = {"id": "1", "name": "Alice", "city": "Paris"}
        out = dict_to_text(d, fields=["name", "city"])
        assert "name: Alice" in out
        assert "city: Paris" in out

    def test_skips_missing(self):
        d = {"id": "1", "name": "Alice"}
        out = dict_to_text(d, fields=["name", "missing"])
        assert "missing" not in out

    def test_handles_nested(self):
        import json
        d = {"id": "1", "meta": {"a": 1}}
        out = dict_to_text(d)
        assert "meta" in out
        parsed = json.loads(out.split("meta: ", 1)[1])
        assert parsed == {"a": 1}


class TestMakeId:
    def test_deterministic(self):
        assert make_id("ns", "k") == make_id("ns", "k")

    def test_diff_keys(self):
        assert make_id("ns", "a") != make_id("ns", "b")

    def test_diff_namespaces(self):
        assert make_id("ns1", "k") != make_id("ns2", "k")

    def test_length(self):
        assert len(make_id("ns", "k")) == 16


class TestIngestDocuments:
    def setup_method(self):
        reset_client()

    @pytest.mark.asyncio
    async def test_ingest_with_stub_embeddings(self):
        with patch("rag_ingest.embed_texts", new=AsyncMock(side_effect=lambda texts, **kw: [[0.1, 0.2, 0.3] for _ in texts])):
            res = await ingest_documents(
                "ingest_test_1",
                [
                    {"id": "1", "name": "Alice", "country": "us"},
                    {"id": "2", "name": "Bob", "country": "uk"},
                ],
                text_fields=["name", "country"],
                id_field="id",
            )
            assert res["ok"] is True
            assert res["documents"] == 2
            assert res["chunks"] >= 2
            assert collection_count("ingest_test_1") == res["chunks"]

    @pytest.mark.asyncio
    async def test_ingest_skips_empty(self):
        with patch("rag_ingest.embed_texts", new=AsyncMock(return_value=[])):
            res = await ingest_documents(
                "ingest_test_2",
                [{"id": "1", "name": ""}],
                text_fields=["name"],
                id_field="id",
            )
            assert res["documents"] == 0
            assert res["chunks"] == 0

    @pytest.mark.asyncio
    async def test_ingest_text_documents(self):
        from rag_ingest import ingest_text_documents
        with patch("rag_ingest.embed_texts", new=AsyncMock(return_value=[[0.1, 0.2]] * 2)):
            res = await ingest_text_documents(
                "faq_test",
                [
                    {"id": "q1", "text": "What is the tourist visa fee for Canada?"},
                    {"id": "q2", "text": "How long does a Schengen visa take?"},
                ],
            )
            assert res["chunks"] == 2
            assert collection_count("faq_test") == 2


# ─── ollama_embeddings ──────────────────────────────────────────────────────

from ollama_embeddings import (
    embed_texts,
    embed_query,
    _stub_vector,
    is_available,
    reset_availability_cache,
    OLLAMA_EMBED_MODEL,
)


class TestStubVector:
    def test_deterministic(self):
        a = _stub_vector("hello")
        b = _stub_vector("hello")
        assert a == b

    def test_normalized(self):
        import math
        v = _stub_vector("hi", dim=128)
        n = math.sqrt(sum(x * x for x in v))
        assert abs(n - 1.0) < 1e-6

    def test_dim_param(self):
        v = _stub_vector("x", dim=64)
        assert len(v) == 64


class TestEmbedOffline:
    def setup_method(self):
        reset_availability_cache()

    @pytest.mark.asyncio
    async def test_embed_returns_stubs_when_offline(self):
        with patch("ollama_embeddings.is_available", new=AsyncMock(return_value=False)):
            vecs = await embed_texts(["hello", "world"])
        assert len(vecs) == 2
        assert all(len(v) > 0 for v in vecs)

    @pytest.mark.asyncio
    async def test_embed_empty(self):
        assert await embed_texts([]) == []

    @pytest.mark.asyncio
    async def test_embed_query_singleton(self):
        with patch("ollama_embeddings.is_available", new=AsyncMock(return_value=False)):
            v = await embed_query("hi")
        assert isinstance(v, list)
        assert len(v) > 0

    @pytest.mark.asyncio
    async def test_raise_on_offline(self):
        from ollama_embeddings import embed_texts
        with patch("ollama_embeddings.is_available", new=AsyncMock(return_value=False)):
            with pytest.raises(RuntimeError):
                await embed_texts(["x"], raise_on_offline=True)
