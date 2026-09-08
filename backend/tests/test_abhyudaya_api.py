"""End-to-end backend API tests for ABHYUDAYA-CHATURBHUJ."""
import io
import os
import uuid
import time
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://civic-crowdsource.preview.emergentagent.com").rstrip("/")


# ---------------- Meta / health ----------------
class TestMeta:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_meta(self, api):
        r = api.get(f"{BASE_URL}/api/meta")
        assert r.status_code == 200
        j = r.json()
        assert "categories" in j and "severities" in j and "statuses" in j
        assert "Pothole / Road Damage" in j["categories"]


# ---------------- Auth ----------------
class TestAuth:
    def test_citizen_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": "citizen@abhyudaya.in", "password": "citizen123"})
        assert r.status_code == 200
        j = r.json()
        assert "access_token" in j
        assert j["user"]["role"] == "citizen"

    def test_gov_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": "admin@abhyudaya.in", "password": "admin123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "government"

    def test_wrong_password(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": "citizen@abhyudaya.in", "password": "wrong"})
        assert r.status_code == 401

    def test_role_mismatch_rejected(self, api):
        # citizen account with role hint government should 403
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": "citizen@abhyudaya.in", "password": "citizen123",
                           "role": "government"})
        assert r.status_code == 403

    def test_register_creates_citizen_even_if_gov_hinted(self, api):
        email = f"test_{uuid.uuid4().hex[:8]}@abhyudaya.in"
        r = api.post(f"{BASE_URL}/api/auth/register",
                     json={"name": "TEST User", "email": email, "password": "pass1234",
                           "contributor_type": "Government"})
        assert r.status_code == 201
        assert r.json()["user"]["role"] == "citizen"

    def test_register_duplicate(self, api):
        r = api.post(f"{BASE_URL}/api/auth/register",
                     json={"name": "Dup", "email": "citizen@abhyudaya.in", "password": "pass1234"})
        assert r.status_code == 409

    def test_me_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_returns_stats(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=citizen_auth)
        assert r.status_code == 200
        j = r.json()
        assert "reports_submitted" in j and "issues_resolved" in j


# ---------------- Role guarding ----------------
class TestRoleGuards:
    def test_citizen_cannot_get_stats(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/stats", headers=citizen_auth)
        assert r.status_code == 403

    def test_citizen_cannot_get_insights(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/insights", headers=citizen_auth)
        assert r.status_code == 403

    def test_citizen_cannot_patch_status(self, api, citizen_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=citizen_auth).json()
        assert issues, "seed issues missing"
        iid = issues[0]["id"]
        r = api.patch(f"{BASE_URL}/api/issues/{iid}/status",
                      json={"status": "Verified"}, headers=citizen_auth)
        assert r.status_code == 403


# ---------------- System analysis ----------------
class TestAnalyze:
    def test_analyze_returns_ai_fields(self, api, citizen_auth):
        r = api.post(f"{BASE_URL}/api/analyze",
                     json={"description": "Large deep pothole near college gate is dangerous",
                           "category": "Pothole / Road Damage", "has_image": True,
                           "latitude": 12.97, "longitude": 77.59}, headers=citizen_auth)
        assert r.status_code == 200
        j = r.json()
        for k in ("ai_category", "ai_severity", "ai_summary", "ai_suggested_solution", "ai_confidence"):
            assert k in j
        assert j["ai_category"] == "Pothole / Road Damage"
        assert j["ai_severity"] in ("Low", "Medium", "High", "Critical")


# ---------------- Issues CRUD + filters ----------------
class TestIssues:
    def test_list_issues(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/issues", headers=citizen_auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 10

    def test_filter_category(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/issues?category=Garbage / Waste", headers=citizen_auth)
        assert r.status_code == 200
        assert all(i["category"] == "Garbage / Waste" for i in r.json())

    def test_filter_severity(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/issues?severity=High", headers=citizen_auth)
        assert r.status_code == 200
        assert all(i["severity"] == "High" for i in r.json())

    def test_search_query(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/issues?q=pothole", headers=citizen_auth)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_scope_nearby(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/issues?scope=nearby&lat=12.9716&lng=77.5946",
                    headers=citizen_auth)
        assert r.status_code == 200
        for it in r.json():
            assert "distance_km" in it

    def test_create_issue_with_auto_severity(self, api, citizen_auth):
        payload = {
            "title": "TEST_pothole crater",
            "description": "There is a critical hazard pothole causing accidents",
            "category": "Pothole / Road Damage",
            "severity": "auto",
            "latitude": 12.9716, "longitude": 77.5946,
            "location_name": "TEST_MG Road",
        }
        r = api.post(f"{BASE_URL}/api/issues", json=payload, headers=citizen_auth)
        assert r.status_code == 201, r.text
        j = r.json()
        assert j["ai_category"] == "Pothole / Road Damage"
        # 'critical'/'hazard' should trigger Critical severity
        assert j["severity"] == "Critical"
        assert "priority_score" in j and "priority_label" in j
        # Verify persistence via GET
        rid = j["id"]
        g = api.get(f"{BASE_URL}/api/issues/{rid}", headers=citizen_auth)
        assert g.status_code == 200
        assert g.json()["title"] == "TEST_pothole crater"

    def test_create_invalid_category(self, api, citizen_auth):
        r = api.post(f"{BASE_URL}/api/issues", json={
            "title": "TEST bad", "description": "invalid category description",
            "category": "NopeCategory", "severity": "auto",
            "latitude": 12.9, "longitude": 77.5}, headers=citizen_auth)
        assert r.status_code == 400


# ---------------- Upvote toggle ----------------
class TestUpvote:
    def test_toggle_upvote(self, api, citizen_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=citizen_auth).json()
        iid = issues[0]["id"]
        initial = issues[0]["upvote_count"]
        initial_has = issues[0].get("has_upvoted", False)

        # Toggle once
        r1 = api.post(f"{BASE_URL}/api/issues/{iid}/upvote", headers=citizen_auth)
        assert r1.status_code == 200
        j1 = r1.json()
        # Toggle again -> reverse
        r2 = api.post(f"{BASE_URL}/api/issues/{iid}/upvote", headers=citizen_auth)
        assert r2.status_code == 200
        j2 = r2.json()
        assert j1["has_upvoted"] != j2["has_upvoted"]
        # After even toggles, count should be back to initial
        assert j2["upvote_count"] == initial
        assert j2["has_upvoted"] == initial_has


# ---------------- Suggestions ----------------
class TestSuggestions:
    def test_add_and_list_suggestion(self, api, citizen_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=citizen_auth).json()
        iid = issues[0]["id"]
        r = api.post(f"{BASE_URL}/api/issues/{iid}/suggestions", json={
            "title": "TEST_barricade approach",
            "description": "Barricade the pothole and add reflective signage until fix.",
            "approach": "Traffic safety"
        }, headers=citizen_auth)
        assert r.status_code == 201
        sid = r.json()["id"]
        lst = api.get(f"{BASE_URL}/api/issues/{iid}/suggestions", headers=citizen_auth).json()
        assert any(s["id"] == sid for s in lst)
        return sid, iid

    def test_gov_mark_useful(self, api, citizen_auth, gov_auth):
        sid, _ = self.test_add_and_list_suggestion(api, citizen_auth)
        r = api.post(f"{BASE_URL}/api/suggestions/{sid}/useful", headers=gov_auth)
        assert r.status_code == 200
        assert r.json()["helpful_count"] >= 1

    def test_citizen_cannot_mark_useful(self, api, citizen_auth):
        sid, _ = self.test_add_and_list_suggestion(api, citizen_auth)
        r = api.post(f"{BASE_URL}/api/suggestions/{sid}/useful", headers=citizen_auth)
        assert r.status_code == 403


# ---------------- Donations ----------------
class TestDonations:
    def test_donation_flow(self, api, citizen_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=citizen_auth).json()
        iid = issues[0]["id"]
        before = api.get(f"{BASE_URL}/api/issues/{iid}/donations", headers=citizen_auth).json()
        r = api.post(f"{BASE_URL}/api/issues/{iid}/donations",
                     json={"amount": 250}, headers=citizen_auth)
        assert r.status_code == 201
        j = r.json()
        assert j["amount"] == 250
        after = api.get(f"{BASE_URL}/api/issues/{iid}/donations", headers=citizen_auth).json()
        assert after["total"] >= before["total"] + 250
        assert after["contributors"] == before["contributors"] + 1

    def test_donation_zero_rejected(self, api, citizen_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=citizen_auth).json()
        iid = issues[0]["id"]
        r = api.post(f"{BASE_URL}/api/issues/{iid}/donations",
                     json={"amount": 0}, headers=citizen_auth)
        assert r.status_code == 422


# ---------------- Government analytics ----------------
class TestGovAnalytics:
    def test_stats(self, api, gov_auth):
        r = api.get(f"{BASE_URL}/api/stats", headers=gov_auth)
        assert r.status_code == 200
        j = r.json()
        for k in ("total", "by_status", "high_critical", "recurring_count", "priority_issues"):
            assert k in j
        assert j["total"] >= 10
        assert j["recurring_count"] >= 2
        assert len(j["priority_issues"]) <= 6

    def test_insights(self, api, gov_auth):
        r = api.get(f"{BASE_URL}/api/insights", headers=gov_auth)
        assert r.status_code == 200
        j = r.json()
        for k in ("by_category", "by_severity", "by_status", "trend", "recurring"):
            assert k in j
        assert len(j["trend"]) == 6

    def test_recurring_has_two_clusters(self, api, citizen_auth):
        r = api.get(f"{BASE_URL}/api/recurring", headers=citizen_auth)
        assert r.status_code == 200
        clusters = r.json()
        assert len(clusters) >= 2
        # Verify pothole cluster (5) and garbage cluster (4) exist
        counts_by_cat = {c["category"]: c["report_count"] for c in clusters}
        assert counts_by_cat.get("Pothole / Road Damage", 0) >= 5
        assert counts_by_cat.get("Garbage / Waste", 0) >= 4

    def test_gov_status_update_persists(self, api, gov_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=gov_auth).json()
        # find a reported one
        target = next((i for i in issues if i["status"] == "Reported"), issues[0])
        iid = target["id"]
        r = api.patch(f"{BASE_URL}/api/issues/{iid}/status",
                      json={"status": "Verified"}, headers=gov_auth)
        assert r.status_code == 200
        g = api.get(f"{BASE_URL}/api/issues/{iid}", headers=gov_auth).json()
        assert g["status"] == "Verified"

    def test_status_invalid_value(self, api, gov_auth):
        issues = api.get(f"{BASE_URL}/api/issues", headers=gov_auth).json()
        iid = issues[0]["id"]
        r = api.patch(f"{BASE_URL}/api/issues/{iid}/status",
                      json={"status": "Bogus"}, headers=gov_auth)
        assert r.status_code == 400


# ---------------- Upload ----------------
class TestUpload:
    def _tiny_png(self):
        # 1x1 transparent PNG
        return bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )

    def test_upload_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/upload",
                          files={"file": ("t.png", self._tiny_png(), "image/png")})
        assert r.status_code == 401

    def test_upload_image_success(self, citizen_token):
        r = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {citizen_token}"},
            files={"file": ("t.png", self._tiny_png(), "image/png")},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        j = r.json()
        assert "path" in j and "url" in j
        # fetch it back
        g = requests.get(f"{BASE_URL}{j['url']}", timeout=15)
        assert g.status_code == 200
        assert g.headers.get("Content-Type", "").startswith("image/")

    def test_upload_rejects_non_image(self, citizen_token):
        r = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {citizen_token}"},
            files={"file": ("t.txt", b"hello", "text/plain")},
            timeout=15,
        )
        assert r.status_code == 400
