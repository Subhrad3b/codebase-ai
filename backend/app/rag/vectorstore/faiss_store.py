from pathlib import Path
import json
import numpy as np


class FaissVectorStore:
    def __init__(self, directory: Path, repository_id: str):
        self.directory = directory / repository_id
        self.directory.mkdir(parents=True, exist_ok=True)
        self.vectors = np.empty((0, 384), dtype="float32")
        self.ids: list[str] = []
        self.load()

    def replace(self, vectors: np.ndarray, ids: list[str]) -> None:
        self.vectors = np.asarray(vectors, dtype="float32")
        self.ids = ids
        self.save()

    def search(self, query: np.ndarray, top_k: int) -> list[tuple[str, float]]:
        if not len(self.ids):
            return []
        try:
            import faiss
            index_file = self.directory / "index.faiss"
            if index_file.exists():
                index = faiss.read_index(str(index_file))
                scores, positions = index.search(np.asarray(query, dtype="float32").reshape(1, -1), min(top_k, len(self.ids)))
                return [(self.ids[int(i)], float(score)) for i, score in zip(positions[0], scores[0]) if i >= 0]
        except (ImportError, RuntimeError, OSError):
            pass
        scores = self.vectors @ query.reshape(-1)
        positions = np.argsort(-scores)[:top_k]
        return [(self.ids[int(i)], float(scores[int(i)])) for i in positions]

    def save(self):
        np.save(self.directory / "vectors.npy", self.vectors)
        (self.directory / "ids.json").write_text(json.dumps(self.ids), encoding="utf-8")
        if len(self.ids):
            try:
                import faiss
                index = faiss.IndexFlatIP(self.vectors.shape[1])
                index.add(self.vectors)
                faiss.write_index(index, str(self.directory / "index.faiss"))
            except (ImportError, RuntimeError, OSError):
                pass

    def load(self):
        vector_file, ids_file = self.directory / "vectors.npy", self.directory / "ids.json"
        if vector_file.exists() and ids_file.exists():
            try:
                self.vectors = np.load(vector_file, allow_pickle=False)
                self.ids = json.loads(ids_file.read_text(encoding="utf-8"))
            except (ValueError, OSError, json.JSONDecodeError):
                self.vectors = np.empty((0, 384), dtype="float32")
                self.ids = []

