# Codebase AI

A local-first, retrieval-augmented chat application for source repositories. Codebase AI scans a selected folder, creates code-aware chunks, embeds them locally, combines semantic and exact-identifier search, and streams grounded answers from a Qwen3 GGUF model served by llama.cpp. Source code, metadata, embeddings, and conversations remain on the machine.

## Features

- Incremental indexing using SHA-256 file hashes, with new/modified/deleted/unchanged counts
- Python AST chunking and symbol-aware chunking for common languages, with bounded line fallback
- Local embeddings with `sentence-transformers/all-MiniLM-L6-v2`; deterministic offline fallback
- FAISS-compatible local vector storage plus exact identifier/keyword scoring
- SQLite metadata and conversation history
- OpenAI-compatible llama.cpp streaming over Server-Sent Events
- Repository explorer, file viewer, source scores, Markdown, syntax highlighting, stop and clear controls
- Path containment, binary/oversized-file filtering, configurable ignores, and no code execution

## Architecture

```text
React/Vite UI
   ├─ Repository explorer ─────────── GET /api/files
   └─ Chat ── SSE ── FastAPI
                       ├─ Scanner → chunker → local embeddings → vector index
                       ├─ semantic + keyword retrieval → bounded context
                       ├─ SQLite metadata/conversation memory
                       └─ llama.cpp OpenAI-compatible server → Qwen3
```

The storage and embedding services are isolated from the indexing and retrieval layers, so a Qdrant/Chroma adapter or another local embedding backend can be added without changing the API workflow.

## Requirements

- Windows 10/11, Python 3.11+ and Node.js 20+
- A llama.cpp build with `llama-server.exe`
- A locally downloaded Qwen3 4B Q5_K_M GGUF model
- Roughly 4–6 GB free RAM for the model plus indexing headroom (actual use varies by context and GPU offload)

## Install on Windows

```powershell
git clone <your-repository-url> codebase-ai
Set-Location codebase-ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env

Set-Location frontend
npm install
Set-Location ..
```

The first use of the configured sentence-transformer may need its model files. For a strictly offline machine, download/cache that model beforehand or point `EMBEDDING_MODEL` at a local model directory. If it cannot be loaded, the application uses a lightweight local hashing embedder so indexing remains functional.

## llama.cpp and Qwen3

Download/build llama.cpp and place the GGUF anywhere outside this project if preferred. The model path belongs only in the llama.cpp command, not in this application's source:

```powershell
& "C:\tools\llama.cpp\llama-server.exe" `
  -m "D:\models\Qwen3-4B-Q5_K_M.gguf" `
  --host 127.0.0.1 `
  --port 8080 `
  -c 8192 `
  -ngl 0
```

Use `-ngl` with a suitable layer count when GPU offload is available. Confirm the server with `Invoke-RestMethod http://localhost:8080/health`. The backend uses the OpenAI-compatible `/v1/chat/completions` route.

## Configuration

Copy `.env.example` to `.env`. Important settings:

| Setting | Purpose |
|---|---|
| `LLM_BASE_URL` | llama.cpp server URL |
| `LLM_MODEL` | Model identifier sent to the server (not a path requirement) |
| `EMBEDDING_MODEL` | sentence-transformers name or local directory |
| `VECTOR_DB_PATH` | Local index directory |
| `TOP_K` | Final retrieved chunk count |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | Character budget for fallback splitting |
| `MAX_CONTEXT_TOKENS` | Approximate prompt context ceiling |
| `MAX_FILE_SIZE_MB` | Per-file indexing ceiling |
| `ALLOWED_REPOSITORY_ROOTS` | Optional comma-separated allowlist of parent directories |
| `IGNORE_DIRECTORIES` | Comma-separated directory names to skip |

No cloud LLM or paid API is used.

## Run

Terminal 1:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
Set-Location frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), choose **Select repository**, and enter an absolute local directory. Indexing runs in the backend; its status and counts appear in the sidebar. Select an indexed repository and ask a question. The context panel shows the exact chunks used, including path, line range, symbol, and score.

Useful prompts and commands include `/explain backend/auth.py`, `/search token validation`, `/find authenticate_user`, `/architecture`, `/dependencies backend/api.py`, `/summarize README.md`, and `/repo`. Slash commands are retrieval-directed prompts and remain grounded in the same local index.

## API

- `POST /api/repositories/index` — queue an incremental index
- `GET /api/repositories` / `GET /api/repositories/{id}`
- `DELETE /api/repositories/{id}`
- `GET /api/index/status?repository_id=...`
- `POST /api/index/rebuild`
- `POST /api/search`
- `POST /api/chat` — SSE (`meta`, `token`, `done`, or `error` events)
- `GET /api/files` / `GET /api/files/content`
- `POST /api/repositories/{id}/analyze`
- `GET /api/health`

Interactive OpenAPI documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Test and build

```powershell
python -m pytest backend/tests -q
Set-Location frontend
npm run build
```

## Project structure

```text
backend/app/
  api/             HTTP and SSE routes
  code/            safe discovery and hashing
  core/            settings and SQLite
  indexing/        incremental orchestration
  llm/             llama.cpp client and grounding prompt
  models/          API schemas
  rag/
    chunker/       AST/symbol/line chunking
    embeddings/    local embeddings
    retrieval/     hybrid ranking and context formatting
    vectorstore/   persisted vector adapter
frontend/src/
  components/      chat, explorer, context, Markdown
  services/        typed API/SSE client
  types/           shared UI contracts
data/              generated local metadata and indexes
```

## Troubleshooting

- **Unable to connect to llama.cpp:** verify `LLM_BASE_URL`, confirm `llama-server.exe` is running, and call `/api/health`.
- **Model unavailable:** ensure the `-m` path passed to llama.cpp exists and the GGUF fits available memory. The app never hard-codes that path.
- **Embedding model unavailable:** point `EMBEDDING_MODEL` at a cached/local directory. The fallback still works but offers lower semantic quality.
- **Empty repository:** confirm supported extensions exist and that files are not oversized, binary, or within ignored folders.
- **Permission errors:** run the app as a user that can read the selected directory; prefer configuring `ALLOWED_REPOSITORY_ROOTS` rather than elevating privileges.
- **Corrupt index:** use the rebuild endpoint or remove only that repository from the UI and index it again.
- **Slow CPU indexing:** reduce repository scope, lower `MAX_FILE_SIZE_MB`, or add generated directories to `IGNORE_DIRECTORIES`.

## Current boundaries and future improvements

The first implementation keeps conversation memory to the eight most recent messages and uses a bounded context. Natural-language summarization of older chat can be added once a llama.cpp server is available without changing storage. Other natural extensions are Tree-sitter parsers for deeper multi-language syntax, a cross-encoder reranker, persistent generated repository overviews, native directory-picker integration, Qdrant/Chroma adapters, and filesystem watching. Automatic execution of repository code or shell commands is intentionally out of scope.
