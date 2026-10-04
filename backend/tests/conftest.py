from pathlib import Path
import pytest
from backend.app.core.database import Database
from backend.app.rag.embeddings.service import EmbeddingService


class TestSettings:
    def __init__(self, root: Path):
        self.data_dir = root / "data"
        self.vector_db_path = root / "indexes"
        self.vector_db_path.mkdir(parents=True)
        self.allowed_roots = []
        self.ignored_dirs = {".git", "node_modules", "__pycache__"}
        self.max_file_size_mb = 1
        self.chunk_size = 400
        self.chunk_overlap = 40
        self.top_k = 4
        self.max_context_tokens = 1000
        self.llm_base_url = "http://127.0.0.1:1"
        self.llm_model = "test.gguf"
        self.llm_timeout_seconds = 1


@pytest.fixture
def sample_repo(tmp_path):
    root = tmp_path / "sample"
    root.mkdir()
    (root / "auth.py").write_text("import hashlib\n\ndef authenticate_user(name: str):\n    return hashlib.sha256(name.encode()).hexdigest()\n", encoding="utf-8")
    (root / "README.md").write_text("# Sample\nLocal authentication service.", encoding="utf-8")
    (root / "node_modules").mkdir()
    (root / "node_modules" / "skip.js").write_text("ignored", encoding="utf-8")
    return root


@pytest.fixture
def services(tmp_path):
    settings = TestSettings(tmp_path)
    db = Database(settings.data_dir / "test.sqlite3")
    embeddings = EmbeddingService("unavailable-test-model")
    embeddings._model = False
    return settings, db, embeddings

