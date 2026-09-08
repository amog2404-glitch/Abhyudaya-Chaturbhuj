"""Shared fixtures for ABHYUDAYA-CHATURBHUJ backend tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://civic-crowdsource.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(api, email, password, role=None):
    payload = {"email": email, "password": password}
    if role:
        payload["role"] = role
    r = api.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=15)
    return r


@pytest.fixture
def citizen_token(api):
    r = _login(api, "citizen@abhyudaya.in", "citizen123")
    if r.status_code != 200:
        pytest.skip(f"Citizen login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture
def gov_token(api):
    r = _login(api, "admin@abhyudaya.in", "admin123")
    if r.status_code != 200:
        pytest.skip(f"Government login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture
def citizen_auth(citizen_token):
    return {"Authorization": f"Bearer {citizen_token}", "Content-Type": "application/json"}


@pytest.fixture
def gov_auth(gov_token):
    return {"Authorization": f"Bearer {gov_token}", "Content-Type": "application/json"}
