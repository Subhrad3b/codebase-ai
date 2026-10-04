import re
from collections import Counter
from backend.app.rag.vectorstore.faiss_store import FaissVectorStore


class HybridRetriever:
    def __init__(self, db, embeddings, settings):
        self.db, self.embeddings, self.settings = db, embeddings, settings

    def search(self, repository_id: str, query: str, top_k: int | None = None) -> list[dict]:
        limit = top_k or self.settings.top_k
        expanded_query = self._expand_query(query)
        authorship_query = any(phrase in query.lower() for phrase in ("who created", "who made", "who built", "author", "creator"))
        with self.db.connect() as db:
            chunks = {r["id"]: dict(r) for r in db.execute("SELECT * FROM chunks WHERE repository_id=?", (repository_id,))}
        semantic = FaissVectorStore(self.settings.vector_db_path, repository_id).search(self.embeddings.encode([expanded_query])[0], limit * 3)
        semantic_rank = {chunk_id: score for chunk_id, score in semantic}
        terms = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", expanded_query.lower())
        keyword = {}
        for chunk_id, chunk in chunks.items():
            haystack = f"{chunk['file_path']} {chunk['symbol'] or ''} {chunk['content']}".lower()
            hits = sum(haystack.count(term) for term in terms)
            if hits:
                keyword[chunk_id] = min(1.0, hits / max(2, len(terms)))
        candidates = set(semantic_rank) | set(keyword)
        ranked = []
        for chunk_id in candidates:
            item = chunks.get(chunk_id)
            if not item:
                continue
            attribution_bonus = 0.0
            if authorship_query:
                attribution_text = f"{item['file_path']} {item['content']}".lower()
                if "footer" in item["file_path"].lower():
                    attribution_bonus += 0.3
                if re.search(r"(?:designed|developed|built|made)(?:\s+and\s+\w+)?\s+by\b|copyright|©", attribution_text):
                    attribution_bonus += 0.7
            item["score"] = round(0.65 * max(0, semantic_rank.get(chunk_id, 0)) + 0.35 * keyword.get(chunk_id, 0) + attribution_bonus, 4)
            ranked.append(item)
        return sorted(ranked, key=lambda x: x["score"], reverse=True)[:limit]

    @staticmethod
    def _expand_query(query: str) -> str:
        lowered = query.lower()
        additions: list[str] = []
        if any(phrase in lowered for phrase in ("who created", "who made", "who built", "author", "creator")):
            additions.append("designed developed built by made by copyright footer attribution author creator")
        if any(term in lowered for term in ("dependency", "dependencies", "imports")):
            additions.append("import require from package dependency")
        return f"{query} {' '.join(additions)}".strip()


def format_context(chunks: list[dict], max_chars: int) -> str:
    sections, used = [], 0
    for chunk in chunks:
        section = f"FILE: {chunk['file_path']}\nLANGUAGE: {chunk['language']}\nLINES: {chunk['start_line']}-{chunk['end_line']}\nSYMBOL: {chunk['symbol'] or 'module'}\n\n```{chunk['language']}\n{chunk['content']}\n```"
        if used + len(section) > max_chars:
            break
        sections.append(section)
        used += len(section)
    return "\n\n---\n\n".join(sections)

