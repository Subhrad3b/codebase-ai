from backend.app.code.scanner import discover_files, validate_repository


def test_discovery_skips_ignored(sample_repo):
    files = discover_files(sample_repo, {"node_modules"}, 1)
    assert [f.relative_path for f in files] == ["auth.py", "README.md"]
    assert len(files[0].sha256) == 64


def test_validate_repository(sample_repo):
    assert validate_repository(str(sample_repo)) == sample_repo.resolve()

