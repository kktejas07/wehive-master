"""
Unit tests for the Wise with RAG system.

Fast, offline — no live Mongo, no network.
Mocks match the actual function signatures in each module.
"""
import hashlib
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# wise/embeddings.py
# ---------------------------------------------------------------------------

class TestEmbeddings:
    """embed() contract: returns list[float] of EMBEDDING_DIM, stable, normalised."""

    def test_hash_embed_returns_list_of_floats(self):
        from wise.embeddings import _hash_embed, EMBEDDING_DIM
        result = _hash_embed("hello world")
        assert isinstance(result, list)
        assert len(result) == EMBEDDING_DIM
        assert all(isinstance(v, float) for v in result)

    def test_hash_embed_deterministic(self):
        from wise.embeddings import _hash_embed
        assert _hash_embed("foo") == _hash_embed("foo")

    def test_hash_embed_different_inputs_differ(self):
        from wise.embeddings import _hash_embed
        assert _hash_embed("foo") != _hash_embed("bar")

    def test_hash_embed_values_in_unit_range(self):
        from wise.embeddings import _hash_embed
        for v in _hash_embed("test sentence"):
            assert -1.0 <= v <= 1.0, f"value {v} out of [-1, 1]"

    @pytest.mark.asyncio
    async def test_embed_returns_correct_dim(self):
        from wise.embeddings import embed, EMBEDDING_DIM
        result = await embed("test query")
        assert isinstance(result, list)
        assert len(result) == EMBEDDING_DIM

    @pytest.mark.asyncio
    async def test_embed_returns_floats(self):
        from wise.embeddings import embed
        result = await embed("some text")
        assert all(isinstance(v, float) for v in result)

    @pytest.mark.asyncio
    async def test_embed_dim_consistent_across_calls(self):
        from wise.embeddings import embed, EMBEDDING_DIM
        r1 = await embed("first text")
        r2 = await embed("second text")
        assert len(r1) == EMBEDDING_DIM
        assert len(r2) == EMBEDDING_DIM


# ---------------------------------------------------------------------------
# wise/packs.py
# ---------------------------------------------------------------------------

class TestPacks:
    """SEED_PACKS structure and seed_packs() upsert logic."""

    def test_seed_packs_structure(self):
        from wise.packs import SEED_PACKS
        for pack in SEED_PACKS:
            for key in ("id", "name", "emoji", "system_prompt"):
                assert key in pack, f"Pack missing key '{key}': {pack.get('id')}"
            assert len(pack["system_prompt"]) > 20, f"system_prompt too short for pack {pack['id']}"

    def test_seed_packs_no_duplicates(self):
        from wise.packs import SEED_PACKS
        ids = [p["id"] for p in SEED_PACKS]
        assert len(ids) == len(set(ids)), f"Duplicate pack IDs: {ids}"

    def test_seed_packs_count(self):
        from wise.packs import SEED_PACKS
        assert len(SEED_PACKS) >= 4, "Expected at least 4 seed packs"

    @pytest.mark.asyncio
    async def test_seed_packs_inserts_when_empty(self):
        """seed_packs() should call insert_many when collection is empty."""
        mock_col = MagicMock()
        mock_col.count_documents = AsyncMock(return_value=0)
        mock_col.insert_many = AsyncMock()
        # seed_packs imports wise_packs_col locally: `from db import wise_packs_col`
        with patch("db.wise_packs_col", mock_col, create=True):
            # Re-import to pick up patched db
            import importlib
            import wise.packs as wp
            importlib.reload(wp)
            await wp.seed_packs()
        mock_col.insert_many.assert_called_once()

    @pytest.mark.asyncio
    async def test_seed_packs_skips_when_populated(self):
        mock_col = MagicMock()
        mock_col.count_documents = AsyncMock(return_value=6)
        mock_col.insert_many = AsyncMock()
        with patch("db.wise_packs_col", mock_col, create=True):
            import importlib
            import wise.packs as wp
            importlib.reload(wp)
            await wp.seed_packs()
        mock_col.insert_many.assert_not_called()


# ---------------------------------------------------------------------------
# wise/interview.py
# ---------------------------------------------------------------------------

class TestInterview:
    """SEED_QUESTIONS shape and _score_answer helper."""

    def test_seed_questions_have_required_keys(self):
        from wise.interview import SEED_QUESTIONS
        for q in SEED_QUESTIONS:
            for key in ("country", "visa_type", "question", "model_answer", "difficulty"):
                assert key in q, f"Missing key '{key}' in: {q}"

    def test_seed_questions_difficulty_valid(self):
        from wise.interview import SEED_QUESTIONS
        valid = {"easy", "medium", "hard"}
        for q in SEED_QUESTIONS:
            assert q["difficulty"] in valid, f"Invalid difficulty: {q['difficulty']}"

    def test_seed_questions_non_empty(self):
        from wise.interview import SEED_QUESTIONS
        assert len(SEED_QUESTIONS) >= 10

    @pytest.mark.asyncio
    async def test_score_answer_returns_dict_with_score(self):
        """_score_answer returns a dict with a numeric 'score' key."""
        # Patch LLM to avoid network
        mock_chat = AsyncMock(return_value='{"score": 75, "feedback": "Good answer."}')
        with patch("model_router.chat_with_profile", mock_chat, create=True):
            from wise.interview import _score_answer
            result = await _score_answer(
                question="Why do you want to study in the US?",
                answer="I want to pursue advanced research.",
                model_answer="I want to advance my career in research.",
                red_flags=[],
            )
        assert isinstance(result, dict)
        assert "score" in result

    @pytest.mark.asyncio
    async def test_score_answer_red_flag_scores_low(self):
        """Red flag in answer triggers rule-based low score."""
        from wise.interview import _score_answer
        result = await _score_answer(
            question="Why are you going to the US?",
            answer="I want to immigrate permanently and never come back.",
            model_answer="Study and return home to contribute.",
            red_flags=["immigrate permanently", "never come back"],
        )
        assert result["score"] <= 30

    @pytest.mark.asyncio
    async def test_score_answer_empty_answer_scores_low(self):
        """Empty answer should score low (rule-based, no network needed)."""
        from wise.interview import _score_answer
        # Empty answer with no red flags triggers LLM path; mock it
        mock_chat = AsyncMock(return_value='{"score": 5, "feedback": "No answer given."}')
        with patch("model_router.chat_with_profile", mock_chat, create=True):
            result = await _score_answer("Any question?", "", "A complete model answer here.", [])
        assert result["score"] <= 30

    @pytest.mark.asyncio
    async def test_score_answer_has_feedback_key(self):
        """Result dict always has a feedback key."""
        from wise.interview import _score_answer
        # Trigger rule-based path via red flag
        result = await _score_answer(
            question="Plans after graduation?",
            answer="I will immigrate and stay forever",
            model_answer="Return home and contribute.",
            red_flags=["immigrate"],
        )
        assert "feedback" in result


# ---------------------------------------------------------------------------
# wise/pipeline.py
# ---------------------------------------------------------------------------

class TestPipeline:
    """_upsert_chunk dedup logic and schedule_pipeline registration."""

    def _make_chunk(self, text: str, country="US", visa_type="F-1") -> dict:
        return {
            "country": country,
            "visa_type": visa_type,
            "source_url": "https://example.com/rules",
            "text": text,
            "hash": hashlib.sha256(text.encode()).hexdigest(),
        }

    @pytest.mark.asyncio
    async def test_upsert_chunk_skips_unchanged(self):
        """Same hash → no DB write."""
        text = "Immigration rule unchanged"
        chunk = self._make_chunk(text)

        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value={"hash": chunk["hash"]})
        mock_col.update_one = AsyncMock()
        mock_embed = AsyncMock(return_value=[0.0] * 768)

        with patch("wise.pipeline.visa_knowledge_col", mock_col), \
             patch("wise.embeddings.embed", mock_embed):
            from wise.pipeline import _upsert_chunk
            result = await _upsert_chunk(chunk)

        assert result is False
        mock_col.update_one.assert_not_called()

    @pytest.mark.asyncio
    async def test_upsert_chunk_writes_new_content(self):
        """New content (find_one returns None) → upsert called."""
        chunk = self._make_chunk("New OPT extension rule.")

        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value=None)
        mock_col.update_one = AsyncMock()
        mock_embed = AsyncMock(return_value=[0.1] * 768)

        with patch("wise.pipeline.visa_knowledge_col", mock_col), \
             patch("wise.embeddings.embed", mock_embed):
            from wise.pipeline import _upsert_chunk
            result = await _upsert_chunk(chunk)

        assert result is True
        mock_col.update_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_upsert_chunk_changed_hash_writes(self):
        """Stale hash in DB → update_one called (content changed)."""
        chunk = self._make_chunk("Updated rule text")

        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value={"hash": "old_hash_value"})
        mock_col.update_one = AsyncMock()
        mock_embed = AsyncMock(return_value=[0.0] * 768)

        with patch("wise.pipeline.visa_knowledge_col", mock_col), \
             patch("wise.embeddings.embed", mock_embed):
            from wise.pipeline import _upsert_chunk
            result = await _upsert_chunk(chunk)

        assert result is True
        mock_col.update_one.assert_called_once()

    def test_schedule_pipeline_registers_cron_job(self):
        from wise.pipeline import schedule_pipeline
        mock_scheduler = MagicMock()
        mock_scheduler.add_job = MagicMock()
        schedule_pipeline(mock_scheduler)
        mock_scheduler.add_job.assert_called_once()
        args, kwargs = mock_scheduler.add_job.call_args
        trigger = kwargs.get("trigger") or (args[1] if len(args) > 1 else None)
        assert trigger == "cron", f"Expected cron trigger, got: {trigger}"


# ---------------------------------------------------------------------------
# wise/travel.py
# ---------------------------------------------------------------------------

class TestTravel:
    """Marketplace catalogue shape and create_travel_plan helper."""

    def test_marketplace_categories_is_list(self):
        from wise.travel import MARKETPLACE_CATEGORIES
        assert isinstance(MARKETPLACE_CATEGORIES, list)

    def test_marketplace_has_expected_categories(self):
        from wise.travel import MARKETPLACE_CATEGORIES
        ids = {c["id"] for c in MARKETPLACE_CATEGORIES}
        expected = {"flights", "hotels", "esim", "forex", "insurance"}
        assert expected.issubset(ids), f"Missing categories: {expected - ids}"

    def test_each_category_has_items(self):
        from wise.travel import MARKETPLACE_CATEGORIES
        for cat in MARKETPLACE_CATEGORIES:
            assert len(cat["items"]) >= 2, f"Category '{cat['id']}' has fewer than 2 items"
            for item in cat["items"]:
                assert "name" in item
                assert "url" in item

    def test_featured_returns_list(self):
        from wise.travel import _get_featured
        result = _get_featured("GB")
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_featured_contains_dicts_with_category(self):
        from wise.travel import _get_featured
        featured = _get_featured("GB")
        for item in featured:
            assert "category" in item

    def test_featured_generic_destination(self):
        from wise.travel import _get_featured
        result = _get_featured("AU")
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_create_travel_plan_inserts_new(self):
        """When no existing plan, insert_one is called."""
        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value=None)
        mock_col.insert_one = AsyncMock()
        mock_apps = MagicMock()
        mock_apps.find_one = AsyncMock(return_value={
            "_id": "app_123",
            "destination_country": "US",
            "visa_type": "F-1",
        })

        with patch("wise.travel.travel_plans_col", mock_col), \
             patch("wise.travel.applications", mock_apps):
            from wise.travel import create_travel_plan
            await create_travel_plan("app_123")

        mock_col.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_travel_plan_skips_existing(self):
        """Already-existing plan should not be overwritten."""
        mock_col = MagicMock()
        existing = {"application_id": "app_456", "checklist": []}
        mock_col.find_one = AsyncMock(return_value=existing)
        mock_col.insert_one = AsyncMock()

        with patch("wise.travel.travel_plans_col", mock_col):
            from wise.travel import create_travel_plan
            await create_travel_plan("app_456")

        mock_col.insert_one.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_travel_plan_checklist_has_items(self):
        """New plan checklist must have items all done=False."""
        captured = {}
        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value=None)
        mock_apps = MagicMock()
        mock_apps.find_one = AsyncMock(return_value={
            "_id": "app_789",
            "destination_country": "US",
            "visa_type": "F-1",
        })

        async def fake_insert(doc):
            captured["doc"] = doc

        mock_col.insert_one = fake_insert

        with patch("wise.travel.travel_plans_col", mock_col), \
             patch("wise.travel.applications", mock_apps):
            from wise.travel import create_travel_plan
            await create_travel_plan("app_789")

        checklist = captured["doc"]["checklist"]
        assert len(checklist) >= 5
        for item in checklist:
            assert "item" in item or "task" in item
            assert item.get("done") is False


# ---------------------------------------------------------------------------
# wise/rag.py  (stream generator contract)
# ---------------------------------------------------------------------------

class TestRAG:
    """wise_chat() yields token strings then ends cleanly."""

    @pytest.mark.asyncio
    async def test_wise_chat_yields_tokens(self):
        from wise.rag import wise_chat

        async def fake_vector_search(*a, **kw):
            return [{"text": "F-1 visa requires SEVIS fee payment.", "country": "US"}]

        async def fake_llm_stream(*a, **kw):
            for token in ["The ", "SEVIS ", "fee ", "is ", "$350."]:
                yield token

        mock_feeds_col = MagicMock()
        mock_feeds_col.insert_one = AsyncMock()
        mock_embed = AsyncMock(return_value=[0.0] * 768)

        with patch("wise.rag.vector_search", fake_vector_search), \
             patch("wise.rag.llm_stream", fake_llm_stream), \
             patch("wise.embeddings.embed", mock_embed), \
             patch("db.ai_feeds_col", mock_feeds_col, create=True):
            tokens = []
            async for token in wise_chat(
                "What is SEVIS fee?",
                session_id="sess-1",
                ctx={"country": "US", "visa_type": "F-1"},
            ):
                tokens.append(token)

        assert len(tokens) >= 1
        full_text = "".join(tokens)
        assert len(full_text) > 0

    @pytest.mark.asyncio
    async def test_wise_chat_completes_without_error(self):
        """wise_chat() with empty vector results still completes."""
        from wise.rag import wise_chat

        async def fake_vector_search(*a, **kw):
            return []

        async def fake_llm_stream(*a, **kw):
            yield "ok"

        mock_feeds_col = MagicMock()
        mock_feeds_col.insert_one = AsyncMock()
        mock_embed = AsyncMock(return_value=[0.0] * 768)

        with patch("wise.rag.vector_search", fake_vector_search), \
             patch("wise.rag.llm_stream", fake_llm_stream), \
             patch("wise.embeddings.embed", mock_embed), \
             patch("db.ai_feeds_col", mock_feeds_col, create=True):
            events = []
            async for token in wise_chat("hello", session_id="sess-2", ctx={}):
                events.append(token)

        assert len(events) >= 1

    @pytest.mark.asyncio
    async def test_wise_chat_multiple_tokens_concatenate(self):
        """Tokens from wise_chat join into coherent response."""
        from wise.rag import wise_chat

        async def fake_vector_search(*a, **kw):
            return []

        expected_parts = ["Hello, ", "how can I help", " you today?"]

        async def fake_llm_stream(*a, **kw):
            for t in expected_parts:
                yield t

        mock_feeds_col = MagicMock()
        mock_feeds_col.insert_one = AsyncMock()
        mock_embed = AsyncMock(return_value=[0.0] * 768)

        with patch("wise.rag.vector_search", fake_vector_search), \
             patch("wise.rag.llm_stream", fake_llm_stream), \
             patch("wise.embeddings.embed", mock_embed), \
             patch("db.ai_feeds_col", mock_feeds_col, create=True):
            collected = []
            async for token in wise_chat("hi", session_id="sess-3", ctx={}):
                collected.append(token)

        assert "".join(collected) == "".join(expected_parts)
