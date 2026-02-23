def test_encode(test_client):
    response = test_client.post(
        "/embeddings/encode",
        json={"texts": ["hello", "world"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert "embeddings" in data
    assert len(data["embeddings"]) == 2
    assert len(data["embeddings"][0]) == 384


def test_upsert(test_client):
    response = test_client.post(
        "/embeddings/upsert",
        json={"id": "doc1", "text": "test content", "metadata": {"source": "test"}},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_query(test_client):
    test_client.post(
        "/embeddings/upsert",
        json={"id": "q1", "text": "query target", "metadata": {}},
    )
    response = test_client.post(
        "/embeddings/query",
        json={"text": "search", "top_k": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data


def test_delete_embedding(test_client):
    test_client.post(
        "/embeddings/upsert",
        json={"id": "del1", "text": "to delete", "metadata": {}},
    )
    response = test_client.delete("/embeddings/del1")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_delete_embedding_not_found(test_client):
    response = test_client.delete("/embeddings/nonexistent")
    assert response.status_code == 404
