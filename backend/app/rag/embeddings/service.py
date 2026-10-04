import hashlib
import re
import numpy as np


class EmbeddingService:
    """Lazy local embeddings; deterministic hashing fallback keeps tests/offline setup usable."""
    def __init__(self, model_name: str, dimensions: int = 384):
        self.model_name = model_name
        self.dimensions = dimensions
        self._model = None

    def _load(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name, local_files_only=True)
            except Exception:
                self._model = False
        return self._model

    def encode(self, texts: list[str]) -> np.ndarray:
        model = self._load()
        if model:
            vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.asarray(vectors, dtype="float32")
        vectors = np.zeros((len(texts), self.dimensions), dtype="float32")
        for row, text in enumerate(texts):
            for token in re.findall(r"[A-Za-z_][A-Za-z0-9_]*|\S", text.lower()):
                digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
                index = int.from_bytes(digest, "little") % self.dimensions
                vectors[row, index] += 1.0
            norm = np.linalg.norm(vectors[row])
            if norm:
                vectors[row] /= norm
        return vectors

