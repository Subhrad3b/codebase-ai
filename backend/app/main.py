from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routes import router
from backend.app.core.config import get_settings
from backend.app.core.database import Database
from backend.app.indexing.service import IndexingService
from backend.app.rag.embeddings.service import EmbeddingService
from backend.app.rag.retrieval.service import HybridRetriever
from backend.app.llm.client import LlamaCppClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    db = Database(settings.data_dir / "metadata" / "codebase_ai.sqlite3")
    embeddings = EmbeddingService(settings.embedding_model)
    app.state.services = {"settings": settings, "db": db, "embeddings": embeddings, "indexing": IndexingService(db, embeddings, settings), "retriever": HybridRetriever(db, embeddings, settings), "llm": LlamaCppClient(settings)}
    yield


app = FastAPI(title="Codebase AI", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
