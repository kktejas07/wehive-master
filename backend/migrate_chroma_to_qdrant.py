"""One-time migration: ChromaDB → Qdrant. Run: python -m backend.migrate_chroma_to_qdrant"""
import asyncio, logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wehive.migrate")


async def migrate():
    try:
        import chromadb
    except ImportError:
        logger.error("chromadb not installed")
        return

    from qdrant_store import upsert_documents, init_qdrant_collections
    await init_qdrant_collections()

    chroma = chromadb.PersistentClient(path="./data/chroma")
    for col_name in ["wehive_kb", "wehive_countries", "wehive_universities", "kg_entities"]:
        try:
            col = chroma.get_collection(col_name)
            results = col.get(include=["documents", "metadatas"])
            docs = [
                {"id": id_, "text": text or "", "metadata": meta or {}}
                for id_, text, meta in zip(
                    results["ids"], results["documents"], results["metadatas"]
                )
                if text
            ]
            if not docs:
                logger.info("Skipping %s — empty", col_name)
                continue
            for i in range(0, len(docs), 50):
                await upsert_documents(col_name, docs[i:i+50])
                logger.info("%s: %d/%d", col_name, min(i+50, len(docs)), len(docs))
            logger.info("Migrated %d docs from %s", len(docs), col_name)
        except Exception as e:
            logger.warning("Skipping %s: %s", col_name, e)


if __name__ == "__main__":
    asyncio.run(migrate())
