"""SCOUT backend iteration 3 tests: rewards, attendance, points awards, admin revenue."""
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


def _register(name="User"):
    s = _new_session()
    email = f"it3_{uuid.uuid4().hex[:8]}@scout.pt"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test1234!", "name": name})
    assert r.status_code == 200
    return s, r.json()


@pytest.fixture(scope="module")
def admin_session():
    s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return s


@pytest.fixture(scope="module")
def member_session():
    s, _ = _login(MEMBER_EMAIL, MEMBER_PASSWORD)
    return s


# ---- Rewards Catalog ----
class TestRewardsCatalog:
    def test_catalog_5_rewards(self):
        r = requests.get(f"{API}/rewards/catalog")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 5
        ids = {x["reward_id"] for x in data}
        assert {"rw_001", "rw_002", "rw_003", "rw_004", "rw_005"}.issubset(ids)
        for r_ in data:
            for k in ("title", "cost", "icon", "description", "type", "value"):
                assert k in r_

    def test_catalog_no_auth_required(self):
        # fresh session no auth - should still work
        r = requests.get(f"{API}/rewards/catalog")
        assert r.status_code == 200


# ---- Rewards: redeem/me ----
class TestRewardsRedeem:
    def test_my_rewards_requires_auth(self):
        r = requests.get(f"{API}/rewards/me")
        assert r.status_code == 401

    def test_my_rewards_member_returns_list(self, member_session):
        r = member_session.get(f"{API}/rewards/me")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_redeem_insufficient_points(self):
        # Fresh user starts at 250 pts, rw_001 costs 500 -> 400
        s, user = _register("PoorRedeemer")
        assert user["points"] == 250
        r = s.post(f"{API}/rewards/rw_001/redeem")
        assert r.status_code == 400
        assert "insuficientes" in r.text.lower() or "pontos" in r.text.lower()

    def test_redeem_invalid_reward_404(self, member_session):
        r = member_session.post(f"{API}/rewards/rw_999/redeem")
        assert r.status_code == 404

    def test_redeem_sufficient_points_deducts_and_returns_code(self, admin_session):
        # Admin has 1500 pts. Use a fresh user instead so we don't pollute admin
        s, user = _register("RichRedeemer")
        # Top up via admin
        # We need a way to add points. Use admin patch.
        admin_s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        upd = admin_s.patch(f"{API}/admin/users/{user['user_id']}", json={"points": 800})
        assert upd.status_code == 200

        before = s.get(f"{API}/auth/me").json()
        assert before["points"] == 800

        r = s.post(f"{API}/rewards/rw_001/redeem")  # cost 500
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["reward_id"] == "rw_001"
        assert body["cost"] == 500
        assert body["status"] == "active"
        assert isinstance(body["code"], str) and len(body["code"]) >= 6
        assert body["title"]

        after = s.get(f"{API}/auth/me").json()
        assert after["points"] == 300

        # Listed in /rewards/me
        mine = s.get(f"{API}/rewards/me").json()
        assert any(x["redemption_id"] == body["redemption_id"] for x in mine)

    def test_redeem_black_month_sets_is_black(self):
        s, user = _register("BlackBuyer")
        admin_s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_s.patch(f"{API}/admin/users/{user['user_id']}", json={"points": 3000, "is_black": False})

        me = s.get(f"{API}/auth/me").json()
        assert me["is_black"] is False

        r = s.post(f"{API}/rewards/rw_003/redeem")  # black month, 2500
        assert r.status_code == 200, r.text
        assert r.json()["type"] == "black_month"

        me2 = s.get(f"{API}/auth/me").json()
        assert me2["is_black"] is True
        assert me2["points"] == 500


# ---- Attendance ----
class TestAttendance:
    def test_attendance_requires_auth(self):
        r = requests.post(f"{API}/events/ev_001/attend")
        assert r.status_code == 401

    def test_attendance_get_default(self, member_session):
        r = member_session.get(f"{API}/events/ev_001/attendance")
        assert r.status_code == 200
        body = r.json()
        assert "count" in body and "attending" in body
        assert isinstance(body["count"], int)
        assert isinstance(body["attending"], bool)

    def test_attendance_toggle_and_points(self):
        s, user = _register("Attendee")
        before_pts = s.get(f"{API}/auth/me").json()["points"]

        # 1st call -> attending=true, +10
        r = s.post(f"{API}/events/ev_001/attend")
        assert r.status_code == 200
        body = r.json()
        assert body["attending"] is True
        assert body.get("points_earned") == 10

        after_pts = s.get(f"{API}/auth/me").json()["points"]
        assert after_pts == before_pts + 10

        # GET shows attending=true
        att = s.get(f"{API}/events/ev_001/attendance").json()
        assert att["attending"] is True
        assert att["count"] >= 1

        # 2nd call -> attending=false (toggle off), no points
        r2 = s.post(f"{API}/events/ev_001/attend")
        assert r2.status_code == 200
        assert r2.json()["attending"] is False

        after2 = s.get(f"{API}/auth/me").json()["points"]
        assert after2 == after_pts  # no change

    def test_attend_invalid_event_404(self, member_session):
        r = member_session.post(f"{API}/events/INVALID_xxx/attend")
        assert r.status_code == 404


# ---- Points award on submission approval ----
class TestSubmissionApprovalAwardsPoints:
    def test_approve_user_submission_awards_200(self, admin_session):
        s, user = _register("Submitter")
        before = s.get(f"{API}/auth/me").json()["points"]

        tok = s.post(f"{API}/events/submission-fee").json()["payment_token"]
        ev_id = s.post(f"{API}/events/submit", json={
            "title": f"TEST_Approve_{uuid.uuid4().hex[:6]}", "type": "Meet",
            "image": "", "date": "2026-08-10", "time_start": "10:00", "time_end": "12:00",
            "price": 0.0, "location_name": "Lisboa", "lat": 38.7, "lng": -9.1,
            "spots_total": 5, "description": "x", "organizer": "T", "categories": [],
            "payment_token": tok,
        }).json()["event_id"]

        # admin approves
        r = admin_session.post(f"{API}/admin/events/{ev_id}/approve")
        assert r.status_code == 200

        after = s.get(f"{API}/auth/me").json()["points"]
        assert after == before + 200

        # cleanup
        admin_session.delete(f"{API}/admin/events/{ev_id}")


# ---- Points on photo purchase ----
class TestPhotoPurchasePoints:
    def test_buy_photo_awards_20(self):
        s, user = _register("PhotoBuyer")
        before = s.get(f"{API}/auth/me").json()["points"]
        photos = s.get(f"{API}/events/ev_001/photos").json()
        pid = photos[0]["photo_id"]
        r = s.post(f"{API}/photos/{pid}/buy")
        assert r.status_code == 200
        assert r.json().get("points_earned") == 20
        after = s.get(f"{API}/auth/me").json()["points"]
        assert after == before + 20


# ---- Admin: monthly revenue ----
class TestAdminRevenueMonthly:
    def test_member_forbidden(self, member_session):
        r = member_session.get(f"{API}/admin/revenue/monthly")
        assert r.status_code == 403

    def test_admin_returns_array(self, admin_session):
        r = admin_session.get(f"{API}/admin/revenue/monthly")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for row in data:
            for k in ("month", "submissions", "photos", "subscriptions", "total"):
                assert k in row
            # shape: month YYYY-MM
            assert len(row["month"]) == 7 and row["month"][4] == "-"
