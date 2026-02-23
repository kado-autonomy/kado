def test_log_action(test_client):
    response = test_client.post(
        "/rl/log-action",
        json={"action": "edit_file", "context": {"path": "x"}, "result": {}},
    )
    assert response.status_code == 200
    data = response.json()
    assert "action_id" in data
    assert len(data["action_id"]) > 0


def test_log_action_missing_action(test_client):
    response = test_client.post(
        "/rl/log-action",
        json={"context": {}, "result": {}},
    )
    assert response.status_code == 400


def test_feedback(test_client):
    log_resp = test_client.post(
        "/rl/log-action",
        json={"action": "a", "context": {}, "result": {}},
    )
    action_id = log_resp.json()["action_id"]
    response = test_client.post(
        "/rl/feedback",
        json={"action_id": action_id, "accepted": True},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_feedback_missing_action_id(test_client):
    response = test_client.post(
        "/rl/feedback",
        json={"accepted": True},
    )
    assert response.status_code == 400


def test_feedback_missing_accepted(test_client):
    log_resp = test_client.post(
        "/rl/log-action",
        json={"action": "a", "context": {}, "result": {}},
    )
    action_id = log_resp.json()["action_id"]
    response = test_client.post(
        "/rl/feedback",
        json={"action_id": action_id},
    )
    assert response.status_code == 400


def test_get_stats(test_client):
    response = test_client.get("/rl/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_actions" in data
    assert "total_feedback" in data
    assert "accepted" in data
    assert "rejected" in data
    assert "acceptance_rate" in data
