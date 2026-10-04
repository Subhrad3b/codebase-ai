from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field


class RepositoryCreate(BaseModel):
    path: str


class Repository(BaseModel):
    id: str
    name: str
    path: str
    status: str
    file_count: int = 0
    chunk_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class IndexProgress(BaseModel):
    repository_id: str
    stage: str
    percent: float = 0
    message: str = ""
    unchanged: int = 0
    modified: int = 0
    added: int = 0
    deleted: int = 0


class SearchRequest(BaseModel):
    repository_id: str
    query: str = Field(min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=50)


class ChatRequest(BaseModel):
    repository_id: str
    conversation_id: str | None = None
    message: str = Field(min_length=1)
    regenerate: bool = False


class FileRef(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    symbol: str | None = None
    score: float = 0

