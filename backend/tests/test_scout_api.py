"""SCOUT backend API tests - comprehensive regression suite."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://google-stitch-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "arthur@scout.pt"
ADMIN_PASSWORD = "ScoutBlack2024!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


# ---- Health ----
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data["app"] == "SCOUT"
        assert data["status"] == "live"


# ---- Auth ----
class TestAuth:
    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["is_black"] is True
        assert data["points"] == 1250
        assert data["license_id"] == "S-992-UK"
        assert "access_token" in r.cookies

    def test_login_bad_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me_logout(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        import uuid
        email = f"test_{uuid.uuid4().hex[:8]}@scout.pt"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Test User"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["points"] == 250
        assert data["is_black"] is False
        # me with cookies
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == email
        # logout
        r3 = s.post(f"{API}/auth/logout")
        assert r3.status_code == 200
        # me without cookies
        s2 = requests.Session()
        r4 = s2.get(f"{API}/auth/me")
        assert r4.status_code == 401

    def test_register_duplicate(self, session):
        r = session.post(f"{API}/auth/register", json={"email": ADMIN_EMAIL, "password": "AnyPass123", "name": "Dup"})
        assert r.status_code == 400

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_google_session_invalid(self, session):
        r = session.post(f"{API}/auth/google/session", headers={"X-Session-ID": "invalid-fake-session-id-xxxx"})
        assert r.status_code == 401

    def test_google_session_missing(self, session):
        r = session.post(f"{API}/auth/google/session")
        # Either 400 (missing) or 401 depending on body parsing
        assert r.status_code in (400, 401)


# ---- Spots ----
class TestSpots:
    def test_list_all(self, session):
        r = session.get(f"{API}/spots")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 6

    def test_filter_region(self, session):
        r = session.get(f"{API}/spots", params={"region": "Norte"})
        assert r.status_code == 200
        for s in r.json():
            assert s["region"] == "Norte"

    def test_filter_price_type(self, session):
        r = session.get(f"{API}/spots", params={"price_type": "Pago"})
        assert r.status_code == 200
        for s in r.json():
            assert s["price_type"] == "Pago"

    def test_filter_category(self, session):
        r = session.get(f"{API}/spots", params={"category": "JDM"})
        assert r.status_code == 200
        for s in r.json():
            assert s["category"] == "JDM"

    def test_search_q(self, session):
        r = session.get(f"{API}/spots", params={"q": "Ferrari"})
        assert r.status_code == 200
        results = r.json()
        assert len(results) >= 1
        assert any("Ferrari" in s["title"] for s in results)


# ---- Events ----
class TestEvents:
    def test_list(self, session):
        r = session.get(f"{API}/events")
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_get_event(self, session):
        r = session.get(f"{API}/events/ev_001")
        assert r.status_code == 200
        data = r.json()
        assert data["event_id"] == "ev_001"
        assert "Estoril" in data["title"]

    def test_get_event_404(self, session):
        r = session.get(f"{API}/events/INVALID")
        assert r.status_code == 404


# ---- Bookings ----
class TestBookings:
    def test_book_no_auth(self):
        r = requests.post(f"{API}/events/ev_002/book")
        assert r.status_code == 401

    def test_book_event(self):
        # Use a fresh user to avoid conflict
        import uuid
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"booker_{uuid.uuid4().hex[:8]}@scout.pt"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Booker"})
        # check event spots before
        before = s.get(f"{API}/events/ev_002").json()["spots_left"]

        r = s.post(f"{API}/events/ev_002/book")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["points_earned"] == 50

        # spots decremented
        after = s.get(f"{API}/events/ev_002").json()["spots_left"]
        assert after == before - 1

        # second booking should fail
        r2 = s.post(f"{API}/events/ev_002/book")
        assert r2.status_code == 400

        # bookings/me returns the booking
        r3 = s.get(f"{API}/bookings/me")
        assert r3.status_code == 200
        bookings = r3.json()
        assert any(b["event_id"] == "ev_002" for b in bookings)

    def test_book_event_404(self, admin_session):
        r = admin_session.post(f"{API}/events/INVALID/book")
        assert r.status_code == 404


# ---- Partnerships ----
class TestPartnerships:
    def test_all(self, session):
        r = session.get(f"{API}/partnerships")
        assert r.status_code == 200
        assert len(r.json()) == 8

    def test_open(self, session):
        r = session.get(f"{API}/partnerships", params={"tier": "open"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5
        assert all(p["tier"] == "open" for p in data)

    def test_black(self, session):
        r = session.get(f"{API}/partnerships", params={"tier": "black"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        assert all(p["tier"] == "black" for p in data)


# ---- Subscription (mocked) ----
class TestSubscription:
    def test_subscription_flow(self):
        # Use a fresh user
        import uuid
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"sub_{uuid.uuid4().hex[:8]}@scout.pt"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Sub"})
        assert r.status_code == 200
        assert r.json()["is_black"] is False

        # checkout
        r2 = s.post(f"{API}/subscription/checkout", json={"plan": "annual", "method": "card"})
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["ok"] is True
        assert body["plan"] == "annual"
        assert body["amount"] == 290.0

        # me reflects black
        me = s.get(f"{API}/auth/me").json()
        assert me["is_black"] is True

        # subscription/me
        sub = s.get(f"{API}/subscription/me").json()
        assert sub["status"] == "active"
        assert sub["plan"] == "annual"

        # cancel
        r3 = s.post(f"{API}/subscription/cancel")
        assert r3.status_code == 200
        me2 = s.get(f"{API}/auth/me").json()
        assert me2["is_black"] is False

    def test_checkout_no_auth(self):
        r = requests.post(f"{API}/subscription/checkout", json={"plan": "monthly", "method": "card"})
        assert r.status_code == 401


# ---- Notification prefs ----
class TestNotifications:
    def test_get_default_and_update(self):
        import uuid
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        email = f"notif_{uuid.uuid4().hex[:8]}@scout.pt"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "N"})

        r = s.get(f"{API}/notifications/prefs")
        assert r.status_code == 200
        defaults = r.json()
        assert defaults["new_events_national"] is True
        assert defaults["events_in_region"] is True
        assert defaults["black_circle"] is False

        new = {"new_events_national": False, "events_in_region": True, "black_circle": True}
        r2 = s.put(f"{API}/notifications/prefs", json=new)
        assert r2.status_code == 200

        r3 = s.get(f"{API}/notifications/prefs")
        assert r3.status_code == 200
        assert r3.json() == new

    def test_prefs_no_auth(self):
        r = requests.get(f"{API}/notifications/prefs")
        assert r.status_code == 401
