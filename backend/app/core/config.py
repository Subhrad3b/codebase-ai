from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "Codebase AI"
    llm_base_url: str = "http://localhost:8080"
    llm_model: str = "qwen3-4b-q5_k_m.gguf"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    data_dir: Path = Path("./data")
    vector_db_path: Path = Path("./data/indexes")
    top_k: int = 8
    chunk_size: int = 1200
    chunk_overlap: int = 120
    max_context_tokens: int = 5000
    max_file_size_mb: int = 2
    llm_timeout_seconds: int = 180
    allowed_repository_roots: str = ""
    ignore_directories: str = ".git,node_modules,venv,.venv,__pycache__,dist,build,target,coverage,.next,.cache,.idea,.vscode"

    @property
    def ignored_dirs(self) -> set[str]:
        return {x.strip() for x in self.ignore_directories.split(",") if x.strip()}

    @property
    def allowed_roots(self) -> list[Path]:
        return [Path(x.strip()).expanduser().resolve() for x in self.allowed_repository_roots.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.vector_db_path.mkdir(parents=True, exist_ok=True)
    return settings

