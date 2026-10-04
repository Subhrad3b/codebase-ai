from backend.app.indexing.service import IndexingService
from backend.app.rag.retrieval.service import HybridRetriever, format_context


def test_incremental_index_and_hybrid_search(sample_repo, services):
    settings, db, embeddings = services
    indexer = IndexingService(db, embeddings, settings)
    first = indexer.index(str(sample_repo))
    assert first["added"] == 2 and first["chunk_count"] >= 2
    second = indexer.index(str(sample_repo), first["repository_id"])
    assert second["unchanged"] == 2 and second["added"] == 0
    results = HybridRetriever(db, embeddings, settings).search(first["repository_id"], "authenticate_user")
    assert results[0]["file_path"] == "auth.py"
    assert "FILE: auth.py" in format_context(results, 4000)


def test_modified_and_deleted_detection(sample_repo, services):
    settings, db, embeddings = services
    indexer = IndexingService(db, embeddings, settings)
    first = indexer.index(str(sample_repo))
    (sample_repo / "auth.py").write_text("def changed():\n    return 1\n", encoding="utf-8")
    (sample_repo / "README.md").unlink()
    result = indexer.index(str(sample_repo), first["repository_id"])
    assert result["modified"] == 1 and result["deleted"] == 1


def test_authorship_query_expansion():
    assert "developed" in HybridRetriever._expand_query("Who created this project?")

