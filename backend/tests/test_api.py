from fastapi.testclient import TestClient
from backend.app.main import app


def test_health_and_invalid_path():
    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["local_only"] is True
        response = client.post("/api/repositories/index", json={"path":"Z:/definitely/missing"})
        assert response.status_code == 400

