import asyncio
import json
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from backend.app.models.schemas import RepositoryCreate, SearchRequest, ChatRequest
from backend.app.rag.retrieval.service import format_context
from backend.app.llm.client import SYSTEM_PROMPT

router = APIRouter(prefix="/api")

COMMAND_HINTS = {
    "/explain": "Explain this file using its implementation, symbols, callers, and responsibilities:",
    "/search": "Search the repository for:",
    "/find": "Find the exact symbol or identifier and describe its definitions and uses:",
    "/architecture": "Describe the repository architecture, entry points, layers, and data flow.",
    "/dependencies": "Trace imports, dependencies, and dependents for:",
    "/summarize": "Summarize this file using its actual contents:",
    "/repo": "Give a grounded repository overview: stack, structure, important modules, and entry points.",
}


def command_query(message: str) -> tuple[str, str]:
    command, _, argument = message.strip().partition(" ")
    hint = COMMAND_HINTS.get(command.lower())
    if not hint:
        return message, message
    directed = f"{hint} {argument}".strip()
    return (argument or directed), directed


def choose_local_folder() -> str | None:
    """Open an OS-native picker on the same machine as the local backend."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(title="Select a repository for Codebase AI", mustexist=True)
        root.destroy()
        return selected or None
    except Exception as exc:
        raise RuntimeError("The native folder picker is unavailable on this machine") from exc


def services(request: Request):
    return request.app.state.services


@router.get("/health")
async def health(request: Request):
    status = await services(request)["llm"].health()
    return {"status": "ok", "llm": status, "local_only": True}


@router.post("/repositories/index", status_code=202)
async def index_repository(payload: RepositoryCreate, background: BackgroundTasks, request: Request):
    svc = services(request)["indexing"]
    try:
        root = Path(payload.path).expanduser().resolve(strict=True)
        repo_id = uuid.uuid5(uuid.NAMESPACE_URL, str(root).lower()).hex
    except OSError as exc:
        raise HTTPException(400, "Invalid repository path") from exc
    svc._progress(repo_id, "queued", 0, "Waiting to start local indexing…")
    background.add_task(svc.index, str(root), repo_id)
    return {"repository_id": repo_id, "status": "queued"}


@router.post("/repositories/select-folder")
async def select_repository_folder():
    try:
        path = await asyncio.to_thread(choose_local_folder)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    if not path:
        return {"cancelled": True}
    return {"cancelled": False, "path": path}


@router.post("/repositories/{repository_id}/sync", status_code=202)
async def sync_repository(repository_id: str, background: BackgroundTasks, request: Request):
    svc = services(request)
    with svc["db"].connect() as db:
        row = db.execute("SELECT path FROM repositories WHERE id=?", (repository_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Repository not found")
    svc["indexing"]._progress(repository_id, "queued", 0, "Checking the repository for changes…")
    background.add_task(svc["indexing"].index, row["path"], repository_id)
    return {"repository_id": repository_id, "status": "queued"}


@router.get("/repositories")
def repositories(request: Request):
    with services(request)["db"].connect() as db:
        return [dict(r) for r in db.execute("SELECT * FROM repositories ORDER BY updated_at DESC")]


@router.get("/repositories/{repository_id}")
def repository(repository_id: str, request: Request):
    with services(request)["db"].connect() as db:
        row = db.execute("SELECT * FROM repositories WHERE id=?", (repository_id,)).fetchone()
    if not row: raise HTTPException(404, "Repository not found")
    return dict(row)


@router.get("/repositories/{repository_id}/conversations")
def repository_conversations(repository_id: str, request: Request):
    with services(request)["db"].connect() as db:
        rows = db.execute("""
            SELECT c.id,c.repository_id,c.created_at,c.updated_at,
                   COALESCE((SELECT content FROM messages WHERE conversation_id=c.id AND role='user' ORDER BY id LIMIT 1),'New chat') AS title,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id) AS message_count
            FROM conversations c WHERE c.repository_id=? ORDER BY c.updated_at DESC
        """, (repository_id,)).fetchall()
    return [dict(row) for row in rows]


@router.get("/conversations/{conversation_id}/messages")
def conversation_messages(conversation_id: str, request: Request):
    with services(request)["db"].connect() as db:
        rows = db.execute("SELECT id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY id", (conversation_id,)).fetchall()
    return [dict(row) for row in rows]


@router.delete("/repositories/{repository_id}")
def delete_repository(repository_id: str, request: Request):
    svc = services(request)
    with svc["db"].connect() as db:
        db.execute("DELETE FROM chunks WHERE repository_id=?", (repository_id,))
        db.execute("DELETE FROM files WHERE repository_id=?", (repository_id,))
        db.execute("DELETE FROM repositories WHERE id=?", (repository_id,))
    index_dir = svc["settings"].vector_db_path / repository_id
    if index_dir.exists(): shutil.rmtree(index_dir)
    return {"deleted": True}


@router.get("/index/status")
def index_status(request: Request, repository_id: str = Query(...)):
    return services(request)["indexing"].progress.get(repository_id, {"repository_id": repository_id, "stage": "unknown", "percent": 0})


@router.post("/index/rebuild")
def rebuild(payload: SearchRequest, request: Request):
    svc = services(request)
    with svc["db"].connect() as db:
        row = db.execute("SELECT path FROM repositories WHERE id=?", (payload.repository_id,)).fetchone()
    if not row: raise HTTPException(404, "Repository not found")
    return svc["indexing"].index(row["path"], payload.repository_id, rebuild=True)


@router.post("/search")
def search(payload: SearchRequest, request: Request):
    return services(request)["retriever"].search(payload.repository_id, payload.query, payload.top_k)


@router.get("/files")
def files(request: Request, repository_id: str = Query(...)):
    with services(request)["db"].connect() as db:
        return [dict(r) for r in db.execute("SELECT path,modified_time,chunk_count FROM files WHERE repository_id=? ORDER BY path", (repository_id,))]


@router.get("/files/content")
def file_content(request: Request, repository_id: str = Query(...), path: str = Query(...)):
    with services(request)["db"].connect() as db:
        repo = db.execute("SELECT path FROM repositories WHERE id=?", (repository_id,)).fetchone()
    if not repo: raise HTTPException(404, "Repository not found")
    root = Path(repo["path"]).resolve()
    target = (root / path).resolve()
    if root not in target.parents or not target.is_file(): raise HTTPException(403, "File is outside the selected repository")
    try: return {"path": path, "content": target.read_text(encoding="utf-8", errors="replace")}
    except OSError as exc: raise HTTPException(400, "Unable to read file") from exc


@router.post("/chat")
async def chat(payload: ChatRequest, request: Request):
    svc = services(request)
    retrieval_query, user_intent = command_query(payload.message)
    chunks = svc["retriever"].search(payload.repository_id, retrieval_query)
    context = format_context(chunks, svc["settings"].max_context_tokens * 4)
    conversation_id = payload.conversation_id or uuid.uuid4().hex
    with svc["db"].connect() as db:
        db.execute("INSERT OR IGNORE INTO conversations(id,repository_id) VALUES(?,?)", (conversation_id, payload.repository_id))
        history = [dict(r) for r in db.execute("SELECT role,content FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT 8", (conversation_id,))][::-1]
        db.execute("INSERT INTO messages(conversation_id,role,content) VALUES(?, 'user', ?)", (conversation_id, payload.message))
        db.execute("UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (conversation_id,))
    messages = [{"role":"system","content":SYSTEM_PROMPT}, *history, {"role":"user","content":f"Repository context:\n\n{context or '[No relevant context retrieved]'}\n\nTask: {user_intent}"}]
    async def events():
        answer = ""
        yield f"data: {json.dumps({'type':'status','stage':'retrieval','message':f'Retrieved {len(chunks)} relevant code chunks'})}\n\n"
        yield f"data: {json.dumps({'type':'meta','conversation_id':conversation_id,'sources':chunks})}\n\n"
        yield f"data: {json.dumps({'type':'status','stage':'generation','message':'Generating a grounded answer with the local model'})}\n\n"
        try:
            async for token in svc["llm"].stream(messages):
                answer += token
                yield f"data: {json.dumps({'type':'token','content':token})}\n\n"
            with svc["db"].connect() as db:
                db.execute("INSERT INTO messages(conversation_id,role,content) VALUES(?, 'assistant', ?)", (conversation_id, answer))
                db.execute("UPDATE conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (conversation_id,))
            yield f"data: {json.dumps({'type':'done','message':'Answer complete'})}\n\n"
        except ConnectionError as exc:
            yield f"data: {json.dumps({'type':'error','message':str(exc)})}\n\n"
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control":"no-cache"})


@router.post("/repositories/{repository_id}/analyze")
async def analyze(repository_id: str, request: Request):
    query = "project architecture technology stack important modules entry points dependencies"
    chunks = services(request)["retriever"].search(repository_id, query, 12)
    return {"repository_id": repository_id, "context": chunks, "hint": "Ask /architecture in chat to generate a narrative overview."}

