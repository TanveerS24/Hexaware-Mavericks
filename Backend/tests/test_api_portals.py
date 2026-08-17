import pytest
from fastapi.testclient import TestClient
from citizen_api.main import app as citizen_app
from officer_api.main import app as officer_app
from admin_api.main import app as admin_app
from gateway_api.main import app as gateway_app


def test_citizen_health():
    client = TestClient(citizen_app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "citizen-api"
    assert resp.json()["status"] == "healthy"


def test_officer_health():
    client = TestClient(officer_app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "officer-api"
    assert resp.json()["status"] == "healthy"


def test_admin_health():
    client = TestClient(admin_app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "admin-api"
    assert resp.json()["status"] == "healthy"


def test_gateway_health():
    client = TestClient(gateway_app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "api-gateway"
    assert "citizen" in resp.json()["portals"]
    assert "officer" in resp.json()["portals"]
    assert "admin" in resp.json()["portals"]
    assert "callcentre" not in resp.json()["portals"]


def test_auth_middleware_blocks_unauthorized_protected_routes():
    # Admin issues endpoint requires authentication
    client = TestClient(admin_app)
    resp = client.get("/admin/issues")
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "UNAUTHORIZED"


def test_chatbot_public_access():
    client = TestClient(gateway_app)
    resp = client.post("/citizen/chatbot", json={"message": "Hello, who are you?"})
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert "response" in data
    assert len(data["reply"]) > 0


def test_chatbot_auto_file_extraction():
    client = TestClient(gateway_app)
    resp = client.post("/citizen/chatbot", json={"message": "There is a severe water leakage and broken pipe on 5th main street."})
    assert resp.status_code == 200
    data = resp.json()
    assert data["can_auto_file"] is True
    assert data["extracted_issue_draft"] is not None
    assert data["extracted_issue_draft"]["category"] == "Water & Sanitation"

