import hashlib
import os
from dataclasses import dataclass
from pathlib import Path

SUPPORTED_NAMES = {"dockerfile", "docker-compose.yml", "docker-compose.yaml", "makefile"}
SUPPORTED_SUFFIXES = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".kt", ".cpp", ".c", ".h", ".hpp",
    ".go", ".rs", ".php", ".rb", ".swift", ".dart", ".html", ".css", ".scss", ".json",
    ".yaml", ".yml", ".md", ".txt", ".sql", ".sh", ".ps1", ".toml", ".xml", ".ini",
}

LANGUAGES = {".py":"python", ".js":"javascript", ".jsx":"javascript", ".ts":"typescript", ".tsx":"typescript", ".java":"java", ".kt":"kotlin", ".cpp":"cpp", ".c":"c", ".h":"c", ".hpp":"cpp", ".go":"go", ".rs":"rust", ".php":"php", ".rb":"ruby", ".swift":"swift", ".dart":"dart", ".html":"html", ".css":"css", ".scss":"scss", ".json":"json", ".yaml":"yaml", ".yml":"yaml", ".md":"markdown", ".sql":"sql", ".sh":"shell", ".ps1":"powershell"}


@dataclass(slots=True)
class SourceFile:
    path: Path
    relative_path: str
    size: int
    modified_time: float
    sha256: str
    language: str


def validate_repository(path: str, allowed_roots: list[Path] | None = None) -> Path:
    root = Path(path).expanduser().resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Repository path must be a directory")
    if allowed_roots and not any(root == allowed or allowed in root.parents for allowed in allowed_roots):
        raise PermissionError("Repository is outside ALLOWED_REPOSITORY_ROOTS")
    return root


def is_binary(path: Path) -> bool:
    try:
        sample = path.read_bytes()[:8192]
        if b"\0" in sample:
            return True
        sample.decode("utf-8")
        return False
    except (UnicodeDecodeError, OSError):
        return True


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def discover_files(root: Path, ignored_dirs: set[str], max_size_mb: int) -> list[SourceFile]:
    result: list[SourceFile] = []
    max_bytes = max_size_mb * 1024 * 1024
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [d for d in dirs if d not in ignored_dirs and not Path(current, d).is_symlink()]
        for name in files:
            path = Path(current, name)
            try:
                stat = path.stat()
                if path.is_symlink() or stat.st_size > max_bytes:
                    continue
                if path.suffix.lower() not in SUPPORTED_SUFFIXES and name.lower() not in SUPPORTED_NAMES:
                    continue
                if is_binary(path):
                    continue
                result.append(SourceFile(path, path.relative_to(root).as_posix(), stat.st_size, stat.st_mtime, hash_file(path), LANGUAGES.get(path.suffix.lower(), "text")))
            except (OSError, ValueError):
                continue
    return sorted(result, key=lambda item: item.relative_path.lower())

