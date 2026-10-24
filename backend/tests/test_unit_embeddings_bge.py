"""BGE-M3 embeddings + semantic chunking: backend choice, fallbacks, store separation.

FlagEmbedding / torch / chonkie are replaced with small fakes, so this runs
without the ML extras (requirements-ml.txt) or a model download.
"""
import os
import sys
import types

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import chunker  # noqa: E402
import embeddings_bge  # noqa: E402
import rag_ingest  # noqa: E402
import vector_store  # noqa: E402


class FakeBGE:
    def __init__(self, name, use_fp16):
        self.name, self.use_fp16, self.calls = name, use_fp16, []

    def _out(self, texts, return_sparse):
        if return_sparse:
            return {'lexical_weights': [{7: np.float32(0.5)} for _ in texts]}
        return {'dense_vecs': np.ones((len(texts), 1024), dtype=np.float32)}

    def encode(self, texts, return_sparse=False, **kw):
        self.calls.append(('encode', texts, kw))
        return self._out(texts, return_sparse)

    def encode_queries(self, texts, return_sparse=False, **kw):
        self.calls.append(('query', texts, kw))
        return self._out(texts, return_sparse)


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    embeddings_bge.reset()
    monkeypatch.setattr(embeddings_bge, 'EMBEDDINGS_BACKEND', 'bge-m3')
    yield
    embeddings_bge.reset()


def _install_fake_bge(monkeypatch):
    monkeypatch.setitem(sys.modules, 'FlagEmbedding', types.SimpleNamespace(BGEM3FlagModel=FakeBGE))
    monkeypatch.setitem(sys.modules, 'torch', types.SimpleNamespace(cuda=types.SimpleNamespace(is_available=lambda: False)))


@pytest.mark.asyncio
async def test_bge_m3_dense_query_and_sparse_vectors(monkeypatch):
    _install_fake_bge(monkeypatch)
    assert embeddings_bge.warm_up() == 'bge-m3'
    model = embeddings_bge._model
    assert model.name == 'BAAI/bge-m3' and model.use_fp16 is False  # no GPU -> fp32

    vecs = await embeddings_bge.embed_texts(['UK student visa', 'Canada PR'])
    assert len(vecs) == 2 and len(vecs[0]) == 1024 and isinstance(vecs[0][0], float)
    q = await embeddings_bge.embed_query('do I need a visa for Japan?')
    assert len(q) == 1024 and model.calls[-1][0] == 'query'
    assert model.calls[-1][2]['max_length'] == 512

    assert embeddings_bge.sparse_vectors(['visa']) == [{'7': 0.5}]


@pytest.mark.asyncio
async def test_falls_back_to_ollama_for_the_whole_process(monkeypatch):
    monkeypatch.setitem(sys.modules, 'FlagEmbedding', None)  # import raises ImportError
    seen = []

    async def fake_ollama(texts, model=None):
        seen.append((texts, model))
        return [[0.1] * 768 for _ in texts]

    monkeypatch.setattr(embeddings_bge.ollama_embeddings, 'embed_texts', fake_ollama)
    assert len((await embeddings_bge.embed_texts(['a'], model='nomic-embed-text'))[0]) == 768
    assert seen == [(['a'], 'nomic-embed-text')]
    assert embeddings_bge.current_backend() == 'ollama'
    _install_fake_bge(monkeypatch)  # becoming importable later does not switch backends mid-process
    assert embeddings_bge.active_backend() == 'ollama'
    assert embeddings_bge.sparse_vectors(['a']) == [{}]


def test_env_can_force_ollama(monkeypatch):
    _install_fake_bge(monkeypatch)
    monkeypatch.setattr(embeddings_bge, 'EMBEDDINGS_BACKEND', 'ollama')
    assert embeddings_bge.warm_up() == 'ollama' and embeddings_bge._model is None


def test_bge_vectors_get_their_own_chroma_store(monkeypatch, tmp_path):
    if not vector_store._USE_CHROMA:
        pytest.skip('chromadb not installed')
    _install_fake_bge(monkeypatch)
    monkeypatch.setattr(vector_store, 'CHROMA_PATH', str(tmp_path))
    vector_store.reset_client()
    try:
        vector_store.get_client()
        assert (tmp_path / 'bge-m3').is_dir()
    finally:
        vector_store.reset_client()


@pytest.mark.asyncio
async def test_chunk_document_uses_semantic_chunks_and_falls_back(monkeypatch):
    assert await rag_ingest.chunk_document('Short note.') == ['Short note.']
    long_text = ' '.join(f'Sentence {i} about visas.' for i in range(600))
    monkeypatch.setattr(rag_ingest, 'semantic_chunks', lambda t: ['topic one', 'topic two'])
    assert await rag_ingest.chunk_document(long_text) == ['topic one', 'topic two']
    monkeypatch.setattr(rag_ingest, 'semantic_chunks', lambda t: None)
    assert await rag_ingest.chunk_document(long_text) == rag_ingest.chunk_text(long_text)


def test_semantic_chunker_config_and_missing_chonkie(monkeypatch):
    made = {}

    class FakeChunker:
        def __init__(self, **kw):
            made.update(kw)

        def chunk(self, text):
            return [types.SimpleNamespace(text=' A. '), types.SimpleNamespace(text='  ')]

    monkeypatch.setattr(chunker, '_chunker', None)
    monkeypatch.setattr(chunker, '_unavailable', False)
    monkeypatch.setitem(sys.modules, 'chonkie', types.SimpleNamespace(SemanticChunker=FakeChunker))
    assert chunker.semantic_chunks('text') == ['A.']
    assert made == {'embedding_model': 'minishlab/potion-base-8M', 'chunk_size': 512, 'threshold': 0.5,
                    'min_sentences_per_chunk': 2}

    monkeypatch.setattr(chunker, '_chunker', None)
    monkeypatch.setattr(chunker, '_unavailable', False)
    monkeypatch.setitem(sys.modules, 'chonkie', None)
    assert chunker.semantic_chunks('text') is None
