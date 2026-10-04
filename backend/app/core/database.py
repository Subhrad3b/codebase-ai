import sqlite3
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS repositories(id TEXT PRIMARY KEY,name TEXT,path TEXT UNIQUE,status TEXT,file_count INTEGER DEFAULT 0,chunk_count INTEGER DEFAULT 0,summary TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS files(repository_id TEXT,path TEXT,hash TEXT,modified_time REAL,chunk_count INTEGER,PRIMARY KEY(repository_id,path));
CREATE TABLE IF NOT EXISTS chunks(id TEXT,repository_id TEXT,file_path TEXT,language TEXT,start_line INTEGER,end_line INTEGER,symbol TEXT,chunk_type TEXT,content TEXT,PRIMARY KEY(repository_id,id));
CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,repository_id TEXT,summary TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id TEXT,role TEXT,content TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
"""


class Database:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript(SCHEMA)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, check_same_thread=False)
        db.row_factory = sqlite3.Row
        try:
            yield db
            db.commit()
        finally:
            db.close()

