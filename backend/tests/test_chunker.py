from backend.app.rag.chunker.service import CodeChunker


def test_python_ast_metadata():
    chunks = CodeChunker(400, 30).chunk("import os\n\nclass UserService:\n    def login(self):\n        return True\n", "service.py", "python")
    assert any(c.symbol == "UserService" and c.chunk_type == "class" for c in chunks)
    assert all(c.start_line <= c.end_line for c in chunks)


def test_fallback_chunks_long_text():
    text = "\n".join(f"line {i} data data data" for i in range(100))
    chunks = CodeChunker(300, 30).chunk(text, "notes.txt", "text")
    assert len(chunks) > 1

