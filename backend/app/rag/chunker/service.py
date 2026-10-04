import ast
import re
from dataclasses import dataclass, asdict


@dataclass(slots=True)
class CodeChunk:
    id: str
    file_path: str
    language: str
    start_line: int
    end_line: int
    symbol: str | None
    chunk_type: str
    content: str

    def metadata(self) -> dict:
        data = asdict(self)
        data.pop("content")
        return data


SYMBOL_PATTERNS = {
    "javascript": re.compile(r"^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface)\s+([\w$]+)"),
    "typescript": re.compile(r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum)\s+([\w$]+)"),
    "java": re.compile(r"^\s*(?:public|private|protected|static|final|abstract|\s)*(?:class|interface|enum|[\w<>\[\]]+)\s+(\w+)\s*[({]"),
    "go": re.compile(r"^\s*(?:func|type)\s+(?:\([^)]*\)\s*)?(\w+)"),
    "rust": re.compile(r"^\s*(?:pub\s+)?(?:async\s+)?(?:fn|struct|enum|trait|impl)\s+(\w+)"),
}


class CodeChunker:
    def __init__(self, max_chars: int = 1200, overlap: int = 120):
        self.max_chars = max(300, max_chars)
        self.overlap = min(max(0, overlap), self.max_chars // 3)

    def chunk(self, text: str, file_path: str, language: str) -> list[CodeChunk]:
        lines = text.splitlines()
        spans = self._python_spans(text) if language == "python" else self._pattern_spans(lines, language)
        if not spans:
            spans = [(1, len(lines), None, "module")]
        chunks: list[CodeChunk] = []
        for start, end, symbol, kind in spans:
            self._split_span(lines, file_path, language, start, end, symbol, kind, chunks)
        return chunks

    def _python_spans(self, text: str) -> list[tuple[int, int, str | None, str]]:
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return []
        spans = []
        imports = [n for n in tree.body if isinstance(n, (ast.Import, ast.ImportFrom))]
        if imports:
            spans.append((imports[0].lineno, imports[-1].end_lineno or imports[-1].lineno, None, "imports"))
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                spans.append((node.lineno, node.end_lineno or node.lineno, node.name, "class" if isinstance(node, ast.ClassDef) else "function"))
        return spans

    def _pattern_spans(self, lines: list[str], language: str) -> list[tuple[int, int, str | None, str]]:
        pattern = SYMBOL_PATTERNS.get(language)
        starts = []
        if pattern:
            for index, line in enumerate(lines, 1):
                match = pattern.match(line)
                if match:
                    starts.append((index, match.group(1), "symbol"))
        return [(start, (starts[i + 1][0] - 1 if i + 1 < len(starts) else len(lines)), symbol, kind) for i, (start, symbol, kind) in enumerate(starts)]

    def _split_span(self, lines, file_path, language, start, end, symbol, kind, output):
        cursor = start
        while cursor <= end:
            size, stop = 0, cursor
            while stop <= end and (size + len(lines[stop - 1]) + 1 <= self.max_chars or stop == cursor):
                size += len(lines[stop - 1]) + 1
                stop += 1
            stop -= 1
            content = "\n".join(lines[cursor - 1:stop])
            chunk_id = f"{file_path}:{cursor}:{stop}"
            output.append(CodeChunk(chunk_id, file_path, language, cursor, stop, symbol, kind, content))
            if stop >= end:
                break
            overlap_lines, chars = 0, 0
            for line in reversed(lines[cursor - 1:stop]):
                if chars + len(line) > self.overlap:
                    break
                chars += len(line) + 1
                overlap_lines += 1
            cursor = max(cursor + 1, stop - overlap_lines + 1)

