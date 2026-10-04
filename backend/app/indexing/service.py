import json
import uuid
from pathlib import Path
from backend.app.code.scanner import discover_files, validate_repository
from backend.app.rag.chunker.service import CodeChunker
from backend.app.rag.vectorstore.faiss_store import FaissVectorStore


class IndexingService:
    def __init__(self, db, embeddings, settings):
        self.db, self.embeddings, self.settings = db, embeddings, settings
        self.progress: dict[str, dict] = {}

    def index(self, path: str, repository_id: str | None = None, rebuild: bool = False) -> dict:
        root = validate_repository(path, self.settings.allowed_roots)
        repo_id = repository_id or uuid.uuid5(uuid.NAMESPACE_URL, str(root).lower()).hex
        self._progress(repo_id, "scanning", 5, "Scanning repository…")
        files = discover_files(root, self.settings.ignored_dirs, self.settings.max_file_size_mb)
        if not files:
            raise ValueError("No supported text source files were found")
        with self.db.connect() as db:
            old = {r["path"]: dict(r) for r in db.execute("SELECT * FROM files WHERE repository_id=?", (repo_id,))}
        current = {f.relative_path: f for f in files}
        added = [p for p in current if p not in old]
        modified = [p for p in current if p in old and current[p].sha256 != old[p]["hash"]]
        deleted = [p for p in old if p not in current]
        unchanged = [p for p in current if p in old and current[p].sha256 == old[p]["hash"]]
        if rebuild:
            added, modified, unchanged = list(current), [], []
        chunker = CodeChunker(self.settings.chunk_size, self.settings.chunk_overlap)
        changed_chunks = []
        for index, rel in enumerate(added + modified):
            source = current[rel]
            text = source.path.read_text(encoding="utf-8", errors="replace")
            changed_chunks.extend(chunker.chunk(text, rel, source.language))
            self._progress(repo_id, "chunking", 10 + 50 * (index + 1) / max(1, len(added) + len(modified)), f"Parsing {rel}")
        with self.db.connect() as db:
            db.execute("INSERT INTO repositories(id,name,path,status) VALUES(?,?,?,'indexing') ON CONFLICT(id) DO UPDATE SET name=excluded.name,path=excluded.path,status='indexing',updated_at=CURRENT_TIMESTAMP", (repo_id, root.name, str(root)))
            targets = list(set(added + modified + deleted))
            for rel in targets:
                db.execute("DELETE FROM chunks WHERE repository_id=? AND file_path=?", (repo_id, rel))
                db.execute("DELETE FROM files WHERE repository_id=? AND path=?", (repo_id, rel))
            counts = {}
            for chunk in changed_chunks:
                counts[chunk.file_path] = counts.get(chunk.file_path, 0) + 1
                db.execute("INSERT OR REPLACE INTO chunks VALUES(?,?,?,?,?,?,?,?,?)", (chunk.id, repo_id, chunk.file_path, chunk.language, chunk.start_line, chunk.end_line, chunk.symbol, chunk.chunk_type, chunk.content))
            for rel in added + modified:
                f = current[rel]
                db.execute("INSERT OR REPLACE INTO files VALUES(?,?,?,?,?)", (repo_id, rel, f.sha256, f.modified_time, counts.get(rel, 0)))
            all_chunks = [dict(r) for r in db.execute("SELECT * FROM chunks WHERE repository_id=? ORDER BY file_path,start_line", (repo_id,))]
        self._progress(repo_id, "embedding", 70, f"Generating embeddings for {len(all_chunks)} chunks…")
        texts = [f"{c['file_path']} {c['symbol'] or ''}\n{c['content']}" for c in all_chunks]
        vectors = self.embeddings.encode(texts)
        FaissVectorStore(self.settings.vector_db_path, repo_id).replace(vectors, [c["id"] for c in all_chunks])
        with self.db.connect() as db:
            db.execute("UPDATE repositories SET status='ready',file_count=?,chunk_count=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", (len(files), len(all_chunks), repo_id))
        stats = dict(unchanged=len(unchanged), modified=len(modified), added=len(added), deleted=len(deleted))
        self._progress(repo_id, "complete", 100, f"Indexed {len(files)} files and {len(all_chunks)} chunks", **stats)
        return {"repository_id": repo_id, "file_count": len(files), "chunk_count": len(all_chunks), **stats}

    def _progress(self, repository_id, stage, percent, message, **stats):
        self.progress[repository_id] = {"repository_id": repository_id, "stage": stage, "percent": round(percent, 1), "message": message, **stats}

