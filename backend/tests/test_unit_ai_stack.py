"""Unit tests for the AI stack additions (Prompts 2-6 + A/B).

All external I/O (Qdrant, Ollama, MongoDB, Langfuse) is mocked so these
run without any running services.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "wehive_test")
os.environ.setdefault("JWT_SECRET", "test_secret_key_for_unit_tests_do_not_use_in_prod")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.com")

from unittest.mock import AsyncMock, MagicMock, patch
import pytest


# ─── embeddings_bge ──────────────────────────────────────────────────────────

class TestEmbeddingsBge:
    def test_token_to_idx_deterministic(self):
        from embeddings_bge import _token_to_idx
        assert _token_to_idx("hello") == _token_to_idx("hello")
        assert 0 <= _token_to_idx("hello") <= 65535

    def test_sparse_vec_sums_to_one(self):
        from embeddings_bge import _sparse_vec
        sv = _sparse_vec("visa requirements canada")
        assert sv, "should not be empty"
        assert abs(sum(sv.values()) - 1.0) < 1e-6, "TF values should sum to 1"

    def test_sparse_vec_empty_string(self):
        from embeddings_bge import _sparse_vec
        assert _sparse_vec("") == {}

    def test_sparse_vec_indices_in_range(self):
        from embeddings_bge import _sparse_vec
        sv = _sparse_vec("immigration student visa f1 h1b")
        for idx in sv:
            assert 0 <= idx <= 65535

    def test_get_sparse_vectors_batch(self):
        from embeddings_bge import get_sparse_vectors
        results = get_sparse_vectors(["hello world", "visa rules"])
        assert len(results) == 2
        for sv in results:
            assert isinstance(sv, dict)


# ─── qdrant_store — RRF merge ────────────────────────────────────────────────

class TestRrfMerge:
    def test_single_list(self):
        from qdrant_store import rrf_merge
        docs = [{"id": "a"}, {"id": "b"}, {"id": "c"}]
        result = rrf_merge([docs])
        assert [d["id"] for d in result] == ["a", "b", "c"]

    def test_two_lists_top_gets_boost(self):
        from qdrant_store import rrf_merge
        list1 = [{"id": "a"}, {"id": "b"}]
        list2 = [{"id": "b"}, {"id": "c"}]
        result = rrf_merge([list1, list2])
        ids = [d["id"] for d in result]
        # "b" appears in both lists → highest RRF score → first
        assert ids[0] == "b"

    def test_empty_lists_handled(self):
        from qdrant_store import rrf_merge
        assert rrf_merge([]) == []
        assert rrf_merge([[]]) == []

    def test_deduplication(self):
        from qdrant_store import rrf_merge
        docs = [{"id": "x"}]
        result = rrf_merge([docs, docs])
        assert len(result) == 1


# ─── reranker ────────────────────────────────────────────────────────────────

class TestReranker:
    def test_fallback_when_flashrank_missing(self):
        """Without flashrank installed the reranker slices top_n."""
        from reranker import _LazyReranker
        r = _LazyReranker()
        docs = [{"id": str(i), "text": f"doc {i}"} for i in range(10)]
        result = r.rerank("test query", docs, top_n=3)
        assert len(result) == 3

    def test_rerank_empty(self):
        from reranker import _LazyReranker
        r = _LazyReranker()
        assert r.rerank("query", [], top_n=5) == []

    def test_rerank_fewer_than_top_n(self):
        from reranker import _LazyReranker
        r = _LazyReranker()
        docs = [{"id": "1", "text": "hello"}]
        result = r.rerank("query", docs, top_n=10)
        assert len(result) == 1


# ─── observability ───────────────────────────────────────────────────────────

class TestObservability:
    def test_noop_when_keys_missing(self):
        """@observe() should pass through with no keys configured."""
        os.environ.pop("LANGFUSE_PUBLIC_KEY", None)
        os.environ.pop("LANGFUSE_SECRET_KEY", None)
        from observability import observe

        @observe("test_fn")
        async def _fn(x):
            return x * 2

        import asyncio
        result = asyncio.get_event_loop().run_until_complete(_fn(5))
        assert result == 10

    def test_observe_preserves_return_value(self):
        from observability import observe

        @observe("echo")
        async def _echo(v):
            return v

        import asyncio
        assert asyncio.get_event_loop().run_until_complete(_echo("hi")) == "hi"


# ─── student_memory ──────────────────────────────────────────────────────────

class TestStudentMemory:
    def _get_sm(self):
        """Import StudentMemory with db + mem0 mocked."""
        import importlib
        with patch.dict("sys.modules", {"db": MagicMock(), "mem0": MagicMock()}):
            import student_memory as sm
            importlib.reload(sm)
            return sm.StudentMemory, sm._NoOpMemory

    def test_noop_memory_add_returns_none(self):
        _, NoOp = self._get_sm()
        assert NoOp().add("user1", "some fact") is None

    def test_noop_memory_search_returns_empty(self):
        _, NoOp = self._get_sm()
        result = NoOp().search("user1", "visa")
        assert result == {"results": []} or result == []

    def test_noop_memory_get_profile_summary_returns_empty_string(self):
        SM, _ = self._get_sm()
        # StudentMemory.get_profile_summary degrades to "" when mem0 returns nothing
        assert SM.get_profile_summary("user1") == ""

    def test_noop_memory_forget_does_not_raise(self):
        SM, _ = self._get_sm()
        SM.forget("user1")  # should not raise


# ─── rag_ingest — chunk_text ─────────────────────────────────────────────────

class TestChunkText:
    def test_short_text_returns_as_is(self):
        from rag_ingest import chunk_text
        text = "Short text."
        result = chunk_text(text, chunk_size=800)
        assert result == [text]

    def test_empty_text_returns_empty(self):
        from rag_ingest import chunk_text
        assert chunk_text("") == []

    def test_long_text_splits(self):
        from rag_ingest import chunk_text
        # ~2000 tokens worth of text
        text = "This is a sentence. " * 200
        chunks = chunk_text(text, chunk_size=200, overlap=20)
        assert len(chunks) > 1
        for c in chunks:
            assert c.strip()

    def test_no_empty_chunks(self):
        from rag_ingest import chunk_text
        text = "Hello world. " * 100
        for c in chunk_text(text, chunk_size=50):
            assert c.strip() != ""

    def test_semantic_chunker_fallback(self):
        """When USE_SEMANTIC_CHUNKER=true but chonkie is missing, falls back gracefully."""
        os.environ["USE_SEMANTIC_CHUNKER"] = "true"
        from rag_ingest import chunk_text
        text = "This is a sentence. " * 10
        result = chunk_text(text, chunk_size=800)
        assert result  # still returns something
        os.environ.pop("USE_SEMANTIC_CHUNKER", None)


# ─── aggregator_crew ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_aggregator_crew_collects_all_results():
    """run_all() should return a dict with keys for all 4 agents."""
    import importlib
    with patch.dict("sys.modules", {
        "news_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={"items": 5})),
        "blog_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={"items": 3})),
        "event_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={"items": 0})),
        "intake_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={"items": 2})),
        "db": MagicMock(),
    }):
        from agents.crewai import aggregator_crew
        importlib.reload(aggregator_crew)
        result = await aggregator_crew.run_all()
    assert set(result.keys()) == {"news", "blog", "event", "intake"}
    for v in result.values():
        assert v.get("status") == "ok"


@pytest.mark.asyncio
async def test_aggregator_crew_handles_partial_failure():
    """A failing agent should produce status=error without crashing the run."""
    import importlib
    with patch.dict("sys.modules", {
        "news_aggregator_agent": MagicMock(run_aggregator=AsyncMock(side_effect=RuntimeError("feed down"))),
        "blog_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={"items": 1})),
        "event_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={})),
        "intake_aggregator_agent": MagicMock(run_aggregator=AsyncMock(return_value={})),
        "db": MagicMock(),
    }):
        from agents.crewai import aggregator_crew
        importlib.reload(aggregator_crew)
        result = await aggregator_crew.run_all()
    assert result["news"]["status"] == "error"
    assert result["blog"]["status"] == "ok"


# ─── ragas_evaluator ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ragas_evaluator_skips_when_not_installed():
    """evaluate() should return status=skipped when ragas package is absent."""
    mock_col = MagicMock()
    mock_col.insert_one = AsyncMock()

    with patch("eval.ragas_evaluator._ragas_available", return_value=False), \
         patch("eval.ragas_evaluator.eval_runs_col", mock_col):
        from eval.ragas_evaluator import evaluate
        result = await evaluate()

    assert result["status"] == "skipped"
    assert "ragas" in result["reason"].lower()
    mock_col.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_ragas_evaluator_skips_when_no_history():
    """evaluate() should skip gracefully when chat_messages returns no history."""
    import importlib
    mock_col = MagicMock()
    mock_col.insert_one = AsyncMock()

    mock_ragas = MagicMock()
    mock_ragas.evaluate = MagicMock()
    mock_datasets = MagicMock()
    mock_datasets.Dataset.from_list = MagicMock(return_value=MagicMock())

    with patch.dict("sys.modules", {"db": MagicMock(), "ragas": mock_ragas,
                                     "ragas.metrics": MagicMock(), "datasets": mock_datasets}):
        from eval import ragas_evaluator
        importlib.reload(ragas_evaluator)
        with patch.object(ragas_evaluator, "_ragas_available", return_value=True), \
             patch.object(ragas_evaluator, "eval_runs_col", mock_col), \
             patch.object(ragas_evaluator, "_sample_questions", new=AsyncMock(return_value=[])):
            result = await ragas_evaluator.evaluate()

    assert result["status"] == "skipped"


# ─── browser_scraper ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_browser_scraper_plain_fetch():
    """scrape_page() should return text for non-JS URLs via httpx."""
    import httpx
    mock_response = MagicMock()
    mock_response.text = "<html>Hello</html>"
    mock_response.raise_for_status = MagicMock()

    with patch("agents.browser_scraper._needs_js", return_value=False), \
         patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
            get=AsyncMock(return_value=mock_response)
        ))
        mock_client.return_value.__aexit__ = AsyncMock(return_value=False)
        from agents.browser_scraper import scrape_page
        result = await scrape_page("https://example.com")

    assert result == "<html>Hello</html>"


@pytest.mark.asyncio
async def test_browser_scraper_returns_none_on_error():
    """scrape_page() should return None rather than raise on network error."""
    with patch("agents.browser_scraper._needs_js", return_value=False), \
         patch("agents.browser_scraper._fetch_plain", new=AsyncMock(side_effect=Exception("timeout"))):
        from agents import browser_scraper
        import importlib; importlib.reload(browser_scraper)
        result = await browser_scraper.scrape_page("https://bad.example")
    assert result is None


# ─── LangGraph state ─────────────────────────────────────────────────────────

def test_langgraph_state_has_required_keys():
    pytest.importorskip("langchain_core", reason="langchain_core not installed")
    from agents.langgraph.state import WeHiveAgentState
    import typing
    hints = typing.get_type_hints(WeHiveAgentState)
    required = {"messages", "user_id", "session_id", "intent", "retrieved_docs",
                "retrieval_quality", "retry_count", "final_answer"}
    assert required.issubset(hints.keys())


# ─── supervisor — document_agent_node ────────────────────────────────────────

@pytest.mark.asyncio
async def test_document_agent_node_returns_answer_from_db():
    """document_agent_node queries document_checklists and returns an answer."""
    pytest.importorskip("langchain_core", reason="langchain_core not installed")
    import importlib
    from unittest.mock import AsyncMock, MagicMock, patch

    checklist_doc = {
        "_id": "ck1",
        "title": "Canada Study Permit Checklist",
        "items": ["Valid passport", "Acceptance letter", "Proof of funds"],
    }

    mock_cursor = MagicMock()
    mock_cursor.__aiter__ = MagicMock(return_value=iter([checklist_doc]))
    mock_cursor.limit.return_value = mock_cursor

    mock_col = MagicMock()
    mock_col.find.return_value.limit.return_value = mock_cursor

    mock_db_mod = MagicMock()
    mock_db_mod.db = {"document_checklists": mock_col}

    with patch.dict("sys.modules", {"db": mock_db_mod}):
        import agents.langgraph.supervisor as sup

        fake_msg = MagicMock()
        fake_msg.content = "what documents for canada study permit"
        state = {
            "messages": [fake_msg],
            "user_id": "u1", "session_id": "s1", "intent": "document",
            "retrieved_docs": [], "retrieval_quality": "none",
            "retry_count": 0, "reformulated_query": "", "final_answer": "",
            "requires_human": False, "agent_name": "", "memory_context": "",
        }

        with patch.object(sup, "_quick_llm", new=AsyncMock(return_value="Here is your checklist")):
            result = await sup.document_agent_node(state)

    assert result.get("agent_name") == "document_agent"
    assert result.get("final_answer")


@pytest.mark.asyncio
async def test_news_agent_node_returns_answer_from_db():
    """news_agent_node queries global_news and returns a summary."""
    pytest.importorskip("langchain_core", reason="langchain_core not installed")
    from unittest.mock import AsyncMock, MagicMock, patch

    news_item = {
        "_id": "n1",
        "title": "Canada extends post-grad work permits",
        "summary": "IRCC announced extension of PGWP.",
        "published_at": "2024-11-01T00:00:00Z",
        "status": "approved",
    }

    mock_cursor = MagicMock()
    mock_cursor.__aiter__ = MagicMock(return_value=iter([news_item]))
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.sort.return_value.limit.return_value = mock_cursor

    mock_news_col = MagicMock()
    mock_news_col.find.return_value = mock_cursor

    mock_db_mod = MagicMock()
    mock_db_mod.db = {"global_news": mock_news_col}

    with patch.dict("sys.modules", {"db": mock_db_mod}):
        import agents.langgraph.supervisor as sup

        fake_msg = MagicMock()
        fake_msg.content = "any recent news on canada work permits"
        state = {
            "messages": [fake_msg],
            "user_id": "u1", "session_id": "s1", "intent": "news",
            "retrieved_docs": [], "retrieval_quality": "none",
            "retry_count": 0, "reformulated_query": "", "final_answer": "",
            "requires_human": False, "agent_name": "", "memory_context": "",
        }

        with patch.object(sup, "_quick_llm", new=AsyncMock(return_value="Here are the latest news")):
            result = await sup.news_agent_node(state)

    assert result.get("agent_name") == "news_agent"
    assert result.get("final_answer")


# ─── rejections indexer ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rejection_indexer_upserts_and_marks():
    """index_rejection_patterns upserts rejected apps into Qdrant and marks them indexed."""
    import importlib
    from unittest.mock import AsyncMock, MagicMock, patch

    app_doc = {
        "_id": "app1",
        "status": "rejected",
        "rejection_reason": "Insufficient funds",
        "country_code": "CA",
        "visa_type": "study",
    }

    # Motor async cursor needs __aiter__ returning self and __anext__ raising StopAsyncIteration
    class _FakeCursor:
        def __init__(self, docs):
            self._docs = iter(docs)
        def find(self, *a, **kw): return self
        def limit(self, n): return self
        def __aiter__(self): return self
        async def __anext__(self):
            try: return next(self._docs)
            except StopIteration: raise StopAsyncIteration

    cursor = _FakeCursor([app_doc])
    mock_apps_col = MagicMock()
    mock_apps_col.find.return_value = cursor
    mock_apps_col.update_many = AsyncMock()

    mock_db_mod = MagicMock()
    mock_db_mod.db = {"applications": mock_apps_col}

    mock_upsert = AsyncMock()
    mock_init = AsyncMock()

    mock_qdrant_mod = MagicMock()
    mock_qdrant_mod.upsert_documents = mock_upsert
    mock_qdrant_mod.init_qdrant_collections = mock_init

    with patch.dict("sys.modules", {"db": mock_db_mod, "qdrant_store": mock_qdrant_mod}):
        import rejection_indexer as ri
        importlib.reload(ri)
        await ri.index_rejection_patterns()

    mock_upsert.assert_called_once()
    call_args = mock_upsert.call_args
    assert call_args[0][0] == "wehive_rejections"
    docs_sent = call_args[0][1]
    assert len(docs_sent) == 1
    assert "Insufficient funds" in docs_sent[0]["text"]


# ─── user document indexer ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_user_doc_indexer_extracts_and_upserts():
    """_index_user_doc extracts PDF text and upserts into wehive_user_docs."""
    import io
    from unittest.mock import AsyncMock, MagicMock, patch

    # Build a minimal real PDF with pypdf
    import pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    mock_upsert = AsyncMock()
    mock_qdrant = MagicMock()
    mock_qdrant.upsert_documents = mock_upsert

    with patch.dict("sys.modules", {"qdrant_store": mock_qdrant}):
        import importlib, user_doc_indexer as udi
        importlib.reload(udi)
        await udi.index_user_doc(
            doc_id="doc1",
            user_id="user42",
            application_id="app1",
            doc_type="passport",
            filename="passport.pdf",
            content=pdf_bytes,
        )

    # Blank page has no text — upsert should NOT be called
    mock_upsert.assert_not_called()


@pytest.mark.asyncio
async def test_user_doc_indexer_skips_gracefully_on_error():
    """index_user_doc should not raise when qdrant_store is unavailable."""
    from unittest.mock import AsyncMock, MagicMock, patch
    mock_qdrant = MagicMock()
    mock_qdrant.upsert_documents = AsyncMock(side_effect=Exception("qdrant down"))

    with patch.dict("sys.modules", {"qdrant_store": mock_qdrant}):
        import importlib, user_doc_indexer as udi
        importlib.reload(udi)
        # Should not raise
        await udi.index_user_doc(
            doc_id="doc2",
            user_id="user1",
            application_id="app2",
            doc_type="sop",
            filename="sop.pdf",
            content=b"%PDF-1.4 invalid",
        )


# ─── qdrant_store — delete helpers ───────────────────────────────────────────

def _mock_qdrant_models():
    """Return a sys.modules patch dict that stubs out qdrant_client internals."""
    from unittest.mock import MagicMock
    mock_models = MagicMock()
    mock_models.PointIdsList = MagicMock
    mock_models.Filter = MagicMock
    mock_models.FieldCondition = MagicMock
    mock_models.MatchValue = MagicMock
    return {
        "qdrant_client": MagicMock(),
        "qdrant_client.models": mock_models,
    }


@pytest.mark.asyncio
async def test_delete_document_calls_qdrant():
    """delete_document should call client.delete with the UUID-mapped point id."""
    from unittest.mock import AsyncMock, MagicMock, patch

    mock_client = MagicMock()
    mock_client.collection_exists = AsyncMock(return_value=True)
    mock_client.delete = AsyncMock()

    with patch.dict("sys.modules", _mock_qdrant_models()), \
         patch("qdrant_store.get_client", return_value=mock_client):
        from qdrant_store import delete_document
        await delete_document("wehive_user_docs", "doc-123")

    mock_client.delete.assert_called_once()
    call_kwargs = mock_client.delete.call_args[1]
    assert call_kwargs["collection_name"] == "wehive_user_docs"


@pytest.mark.asyncio
async def test_delete_document_skips_when_collection_missing():
    """delete_document should not raise when collection doesn't exist."""
    from unittest.mock import AsyncMock, MagicMock, patch

    mock_client = MagicMock()
    mock_client.collection_exists = AsyncMock(return_value=False)
    mock_client.delete = AsyncMock()

    with patch.dict("sys.modules", _mock_qdrant_models()), \
         patch("qdrant_store.get_client", return_value=mock_client):
        from qdrant_store import delete_document
        await delete_document("wehive_user_docs", "doc-xyz")

    mock_client.delete.assert_not_called()


@pytest.mark.asyncio
async def test_delete_by_user_targets_both_collections():
    """delete_by_user should delete from both wehive_user_docs and wehive_student_memory."""
    from unittest.mock import AsyncMock, MagicMock, patch

    mock_client = MagicMock()
    mock_client.collection_exists = AsyncMock(return_value=True)
    mock_client.delete = AsyncMock()

    with patch.dict("sys.modules", _mock_qdrant_models()), \
         patch("qdrant_store.get_client", return_value=mock_client):
        from qdrant_store import delete_by_user
        await delete_by_user("user-42")

    assert mock_client.delete.call_count == 2
    collections_deleted = {c[1]["collection_name"] for c in mock_client.delete.call_args_list}
    assert collections_deleted == {"wehive_user_docs", "wehive_student_memory"}


# ─── prompt_optimizer ────────────────────────────────────────────────────────

# Import once — optimize_prompts does all DB access inside the function
from eval.prompt_optimizer import optimize_prompts as _optimize_prompts


def _make_mock_db(evals: list):
    from unittest.mock import AsyncMock, MagicMock

    class _Cursor:
        def __init__(self, data): self._it = iter(data)
        def __aiter__(self): return self
        async def __anext__(self):
            try: return next(self._it)
            except StopIteration: raise StopAsyncIteration
        def find(self, *a, **kw): return self
        def limit(self, n): return self
        def sort(self, *a): return self

    mock_opt_col = MagicMock()
    mock_opt_col.insert_one = AsyncMock()
    mock_db_mod = MagicMock()
    mock_db_mod.db = {"rag_eval_runs": _Cursor(evals), "prompt_optimizer_runs": mock_opt_col}
    return mock_db_mod, mock_opt_col


@pytest.mark.asyncio
async def test_prompt_optimizer_skips_with_no_evals():
    """optimize_prompts should skip when no eval runs exist."""
    from unittest.mock import patch
    mock_db_mod, _ = _make_mock_db([])
    with patch.dict("sys.modules", {"db": mock_db_mod}):
        result = await _optimize_prompts()
    assert result["status"] == "skipped"
    assert "no completed eval runs" in result["reason"]


@pytest.mark.asyncio
async def test_prompt_optimizer_skips_when_scores_high():
    """optimize_prompts should skip when both scores are above threshold."""
    from unittest.mock import patch
    evals = [
        {"faithfulness": 0.92, "answer_relevancy": 0.91, "status": "ok"},
        {"faithfulness": 0.90, "answer_relevancy": 0.93, "status": "ok"},
    ]
    mock_db_mod, _ = _make_mock_db(evals)
    with patch.dict("sys.modules", {"db": mock_db_mod}):
        result = await _optimize_prompts()
    assert result["status"] == "skipped"
    assert "above threshold" in result["reason"]


# ─── load_memory_node ────────────────────────────────────────────────────────

class _Msg:
    """Minimal stand-in for langchain_core HumanMessage in tests."""
    def __init__(self, content): self.content = content


def _langgraph_stubs():
    """Minimal sys.modules stubs so rag_loop.py can be imported without langgraph installed."""
    from unittest.mock import MagicMock
    lg = MagicMock()
    lg_graph = MagicMock()
    lg_graph.StateGraph = MagicMock(return_value=MagicMock(
        add_node=MagicMock(), add_edge=MagicMock(), add_conditional_edges=MagicMock(),
        set_entry_point=MagicMock(), compile=MagicMock(return_value=MagicMock()),
    ))
    lg_graph.END = "END"
    return {
        "langgraph": lg,
        "langgraph.graph": lg_graph,
        "langchain_core": MagicMock(),
        "langchain_core.messages": MagicMock(),
        "qdrant_store": MagicMock(),
        "reranker": MagicMock(),
        "agents.langgraph.state": MagicMock(),
    }


@pytest.mark.asyncio
async def test_load_memory_node_injects_context():
    """load_memory_node should populate memory_context from student_memory.search."""
    from unittest.mock import MagicMock, patch

    mock_sm = MagicMock()
    mock_sm.search = MagicMock(return_value=[
        {"memory": "Student wants to study in Canada"},
        {"memory": "Prefers universities in Ontario"},
    ])
    mock_sm_mod = MagicMock()
    mock_sm_mod.student_memory = mock_sm

    stubs = {**_langgraph_stubs(), "student_memory": mock_sm_mod}
    # Remove cached module so it's re-imported with stubs
    sys.modules.pop("agents.langgraph.rag_loop", None)
    with patch.dict("sys.modules", stubs):
        from agents.langgraph.rag_loop import load_memory_node
        state = {"messages": [_Msg("Which university should I apply to?")], "user_id": "user-abc"}
        result = await load_memory_node(state)

    assert "memory_context" in result
    assert "Canada" in result["memory_context"]
    assert "Ontario" in result["memory_context"]


@pytest.mark.asyncio
async def test_load_memory_node_skips_eval_bot():
    """load_memory_node should return empty context for eval_bot user_id."""
    from unittest.mock import patch

    sys.modules.pop("agents.langgraph.rag_loop", None)
    with patch.dict("sys.modules", _langgraph_stubs()):
        from agents.langgraph.rag_loop import load_memory_node
        state = {"messages": [_Msg("test query")], "user_id": "eval_bot"}
        result = await load_memory_node(state)

    assert result == {"memory_context": ""}


@pytest.mark.asyncio
async def test_load_memory_node_handles_error_gracefully():
    """load_memory_node should return empty context when student_memory raises."""
    from unittest.mock import MagicMock, patch

    mock_sm = MagicMock()
    mock_sm.search = MagicMock(side_effect=RuntimeError("mem0 unavailable"))
    mock_sm_mod = MagicMock()
    mock_sm_mod.student_memory = mock_sm

    stubs = {**_langgraph_stubs(), "student_memory": mock_sm_mod}
    sys.modules.pop("agents.langgraph.rag_loop", None)
    with patch.dict("sys.modules", stubs):
        from agents.langgraph.rag_loop import load_memory_node
        state = {"messages": [_Msg("visa question")], "user_id": "user-xyz"}
        result = await load_memory_node(state)

    assert result == {"memory_context": ""}


# ─── observability.flush (async) ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_observability_flush_is_awaitable():
    """flush() must be async — awaiting it should not raise TypeError."""
    import inspect
    from observability import flush
    assert inspect.iscoroutinefunction(flush), "flush must be an async function"
    await flush()  # no-op when Langfuse keys are absent — must not raise
