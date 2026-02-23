def test_health_returns_200_and_ok(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_ready(test_client):
    response = test_client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert "ready" in data
