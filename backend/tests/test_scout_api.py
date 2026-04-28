"""SCOUT backend API regression suite (iteration 2)."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "alexandrexbdcosme@gmail.com"
ADMIN_PASSWORD = "Yanka.2003"
MEMBER_EMAIL = "alex.member@scout.pt"
MEMBER_PASSWORD = "scoutcreator"


def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email, password):
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def admin_session():
    s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return s


@pytest.fixture(scope="module")
def member_session():
    s, _ = _login(MEMBER_EMAIL, MEMBER_PASSWORD)
    return s


# ---- Health ----
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data["app"] == "SCOUT"
        assert data["version"] == "2.0.0"


# ---- Auth ----
class TestAuth:
    def test_admin_login_role(self):
        _, data = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert data["role"] == "admin"
        assert data["is_black"] is True

    def test_member_login_role(self):
        _, data = _login(MEMBER_EMAIL, MEMBER_PASSWORD)
        assert data["role"] == "member"

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_and_logout(self):
        s = _new_session()
        email = f"test_{uuid.uuid4().hex[:8]}@scout.pt"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Tester"})
        assert r.status_code == 200
        assert r.json()["email"] == email
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        s.post(f"{API}/auth/logout")
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_google_session_missing(self):
        r = requests.post(f"{API}/auth/google/session")
        assert r.status_code in (400, 401)


# ---- Events (public) ----
class TestEvents:
    def test_list_only_approved(self):
        r = requests.get(f"{API}/events")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        for ev in data:
            assert ev["status"] == "approved"

    def test_event_dates_2026(self):
        r = requests.get(f"{API}/events")
        dates = [e["date"] for e in r.json()]
        assert any(d.startswith("2026") for d in dates)

    def test_get_event_404(self, member_session):
        r = member_session.get(f"{API}/events/INVALID_xxx")
        assert r.status_code == 404


# ---- Spots removed ----
class TestSpotsRemoved:
    def test_spots_endpoint_gone(self):
        r = requests.get(f"{API}/spots")
        assert r.status_code in (404, 405)


# ---- Submission flow ----
class TestSubmission:
    @pytest.fixture(scope="class")
    def fresh_member(self):
        s = _new_session()
        email = f"sub_{uuid.uuid4().hex[:8]}@scout.pt"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Submitter"})
        assert r.status_code == 200
        return s

    def _payload(self, payment_token):
        return {
            "title": f"TEST_Event_{uuid.uuid4().hex[:6]}",
            "type": "Meet",
            "image": "",
            "date": "2026-06-01",
            "time_start": "10:00",
            "time_end": "14:00",
            "price": 0.0,
            "location_name": "Lisboa",
            "lat": 38.7,
            "lng": -9.1,
            "spots_total": 20,
            "description": "Submitted by automated test",
            "organizer": "TEST",
            "categories": ["JDM"],
            "payment_token": payment_token,
        }

    def test_submit_without_token_returns_402(self, fresh_member):
        p = self._payload("FAKE_TOKEN_NOPE")
        r = fresh_member.post(f"{API}/events/submit", json=p)
        assert r.status_code == 402

    def test_submission_full_flow(self, fresh_member):
        # 1) get token
        r = fresh_member.post(f"{API}/events/submission-fee")
        assert r.status_code == 200
        token = r.json()["payment_token"]
        assert r.json()["amount"] == 10.0

        # 2) submit with token -> pending
        r2 = fresh_member.post(f"{API}/events/submit", json=self._payload(token))
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["status"] == "pending"
        ev_id = body["event_id"]

        # 3) reuse token -> 402
        r3 = fresh_member.post(f"{API}/events/submit", json=self._payload(token))
        assert r3.status_code == 402

        # 4) my submissions includes it
        r4 = fresh_member.get(f"{API}/events/me/submissions")
        assert r4.status_code == 200
        ids = [e["event_id"] for e in r4.json()]
        assert ev_id in ids

        # 5) public list does NOT include pending event
        pub = requests.get(f"{API}/events").json()
        assert all(e["event_id"] != ev_id for e in pub)


# ---- Admin ----
class TestAdmin:
    def test_stats_requires_admin(self, member_session):
        r = member_session.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_stats_admin_ok(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ("users", "members_black", "events_approved", "events_pending",
                  "events_rejected", "bookings", "subscriptions_active",
                  "submission_revenue_eur", "subscription_revenue_eur"):
            assert k in data

    def test_admin_list_users(self, admin_session):
        r = admin_session.get(f"{API}/admin/users")
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        assert all("password_hash" not in u for u in users)

    def test_admin_event_lifecycle(self, admin_session):
        # Need a pending event - create via a member
        s = _new_session()
        email = f"sub2_{uuid.uuid4().hex[:8]}@scout.pt"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "S"})
        tok = s.post(f"{API}/events/submission-fee").json()["payment_token"]
        ev_id = s.post(f"{API}/events/submit", json={
            "title": f"TEST_AdminFlow_{uuid.uuid4().hex[:6]}", "type": "Meet",
            "image": "", "date": "2026-07-10", "time_start": "10:00", "time_end": "12:00",
            "price": 0.0, "location_name": "Porto", "lat": 41.1, "lng": -8.6,
            "spots_total": 10, "description": "x", "organizer": "T", "categories": [],
            "payment_token": tok,
        }).json()["event_id"]

        # list pending
        r = admin_session.get(f"{API}/admin/events", params={"status": "pending"})
        assert r.status_code == 200
        assert any(e["event_id"] == ev_id for e in r.json())

        # approve
        r2 = admin_session.post(f"{API}/admin/events/{ev_id}/approve")
        assert r2.status_code == 200
        assert r2.json()["status"] == "approved"

        # appears in public list
        pub = requests.get(f"{API}/events").json()
        assert any(e["event_id"] == ev_id for e in pub)

        # reject it
        r3 = admin_session.post(f"{API}/admin/events/{ev_id}/reject", json={"reason": "test reject"})
        assert r3.status_code == 200
        assert r3.json()["status"] == "rejected"
        assert r3.json()["rejection_reason"] == "test reject"

        # delete
        r4 = admin_session.delete(f"{API}/admin/events/{ev_id}")
        assert r4.status_code == 200

    def test_admin_user_update_and_delete(self, admin_session):
        # Create a throwaway user
        s = _new_session()
        email = f"del_{uuid.uuid4().hex[:8]}@scout.pt"
        reg = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Del"})
        uid = reg.json()["user_id"]

        r = admin_session.patch(f"{API}/admin/users/{uid}", json={"is_black": True, "role": "admin"})
        assert r.status_code == 200
        # verify
        users = admin_session.get(f"{API}/admin/users").json()
        u = next((x for x in users if x["user_id"] == uid), None)
        assert u and u["is_black"] is True and u["role"] == "admin"

        # cannot delete self
        admin_me = admin_session.get(f"{API}/auth/me").json()
        r_self = admin_session.delete(f"{API}/admin/users/{admin_me['user_id']}")
        assert r_self.status_code == 400

        # delete other
        r2 = admin_session.delete(f"{API}/admin/users/{uid}")
        assert r2.status_code == 200

    def test_admin_photo_create_delete(self, admin_session):
        r = admin_session.post(f"{API}/admin/photos", json={
            "event_id": "ev_001",
            "photographer_name": "TEST Photographer",
            "image_url": "https://example.com/p.jpg",
            "price": 7.5,
            "car_label": "TEST Car",
        })
        assert r.status_code == 200, r.text
        pid = r.json()["photo_id"]
        # delete
        r2 = admin_session.delete(f"{API}/admin/photos/{pid}")
        assert r2.status_code == 200


# ---- Favorites ----
class TestFavorites:
    def test_fav_flow(self, member_session):
        r = member_session.post(f"{API}/favorites/ev_001")
        assert r.status_code == 200
        favs = member_session.get(f"{API}/favorites/me").json()
        assert any(e["event_id"] == "ev_001" for e in favs)
        # remove
        member_session.delete(f"{API}/favorites/ev_001")
        favs2 = member_session.get(f"{API}/favorites/me").json()
        assert all(e["event_id"] != "ev_001" for e in favs2)

    def test_fav_invalid_event(self, member_session):
        r = member_session.post(f"{API}/favorites/INVALID_ev_xxx")
        assert r.status_code == 404


# ---- Photos (gallery + purchase) ----
class TestPhotos:
    def test_event_photos_unpurchased(self, member_session):
        r = member_session.get(f"{API}/events/ev_001/photos")
        assert r.status_code == 200
        photos = r.json()
        assert len(photos) >= 1
        for p in photos:
            assert "purchased" in p

    def test_buy_photo_flow(self):
        s = _new_session()
        email = f"buyer_{uuid.uuid4().hex[:8]}@scout.pt"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": "Buyer"})
        photos = s.get(f"{API}/events/ev_001/photos").json()
        pid = photos[0]["photo_id"]

        r = s.post(f"{API}/photos/{pid}/buy")
        assert r.status_code == 200
        # second buy -> 400
        r2 = s.post(f"{API}/photos/{pid}/buy")
        assert r2.status_code == 400

        # purchased flag flips
        ph2 = s.get(f"{API}/events/ev_001/photos").json()
        bought = next(p for p in ph2 if p["photo_id"] == pid)
        assert bought["purchased"] is True

        # /photos/me lists it
        mine = s.get(f"{API}/photos/me").json()
        assert any(p["photo_id"] == pid for p in mine)


# ---- Partnerships (regression) ----
class TestPartnerships:
    def test_all(self):
        r = requests.get(f"{API}/partnerships")
        assert r.status_code == 200
        assert len(r.json()) >= 8
