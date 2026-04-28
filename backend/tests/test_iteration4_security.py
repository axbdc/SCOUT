"""Iteration 4 - Security features tests
Covers: /auth/security/status, change-password, 2FA setup/verify/disable,
sessions list/delete, biometric register/options + disable.
Also a regression smoke for v3 endpoints.
"""
import os
import uuid
import pyotp
import pytest
import requests

def _load_base_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fallback: read frontend/.env
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/") + "/api"


BASE_URL = _load_base_url()


def _new_user_session(name_prefix="it4"):
    s = requests.Session()
    email = f"{name_prefix}_{uuid.uuid4().hex[:8]}@scout.pt"
    pwd = "Password!123"
    r = s.post(f"{BASE_URL}/auth/register", json={"email": email, "password": pwd, "name": "It4"})
    assert r.status_code == 200, r.text
    return s, email, pwd


# ----- SECURITY STATUS -----
class TestSecurityStatus:
    def test_status_initial(self):
        s, email, _ = _new_user_session("status")
        r = s.get(f"{BASE_URL}/auth/security/status")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("has_password", "two_factor_enabled", "biometric_enabled", "auth_provider"):
            assert k in data
        assert data["has_password"] is True
        assert data["two_factor_enabled"] is False
        assert data["biometric_enabled"] is False
        assert data["auth_provider"] == "email"

    def test_status_requires_auth(self):
        r = requests.get(f"{BASE_URL}/auth/security/status")
        assert r.status_code in (401, 403)


# ----- CHANGE PASSWORD -----
class TestChangePassword:
    def test_wrong_current_returns_401(self):
        s, email, pwd = _new_user_session("cp1")
        r = s.post(f"{BASE_URL}/auth/change-password",
                   json={"current_password": "WRONG", "new_password": "BrandNew!1"})
        assert r.status_code == 401

    def test_change_password_and_relogin(self):
        s, email, pwd = _new_user_session("cp2")
        new_pwd = "BrandNew!2"
        r = s.post(f"{BASE_URL}/auth/change-password",
                   json={"current_password": pwd, "new_password": new_pwd})
        assert r.status_code == 200, r.text

        # Old password fails
        r2 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pwd})
        assert r2.status_code == 401

        # New works
        r3 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": new_pwd})
        assert r3.status_code == 200


# ----- 2FA -----
class TestTwoFactor:
    def test_setup_returns_qr_secret_otpauth(self):
        s, email, pwd = _new_user_session("tfa1")
        r = s.post(f"{BASE_URL}/auth/2fa/setup")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "secret" in data and len(data["secret"]) >= 16
        assert "otpauth_url" in data and data["otpauth_url"].startswith("otpauth://")
        assert "qr_png_base64" in data and len(data["qr_png_base64"]) > 100

    def test_verify_then_login_requires_code_then_disable(self):
        s, email, pwd = _new_user_session("tfa2")
        setup = s.post(f"{BASE_URL}/auth/2fa/setup").json()
        secret = setup["secret"]
        code = pyotp.TOTP(secret).now()

        # Verify enables
        r = s.post(f"{BASE_URL}/auth/2fa/verify", json={"code": code})
        assert r.status_code == 200, r.text
        assert r.json().get("enabled") is True

        # Login WITHOUT code -> 403 with 2fa_required
        r2 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pwd})
        assert r2.status_code == 403, r2.text
        detail = r2.json().get("detail")
        # detail can be dict
        if isinstance(detail, dict):
            assert detail.get("error") == "2fa_required"
        else:
            assert "2fa" in str(detail).lower() or "código" in str(detail).lower()

        # Login WITH code -> 200
        code_now = pyotp.TOTP(secret).now()
        r3 = requests.post(f"{BASE_URL}/auth/login",
                           json={"email": email, "password": pwd, "code": code_now})
        assert r3.status_code == 200, r3.text

        # Wrong code -> 401
        r4 = requests.post(f"{BASE_URL}/auth/login",
                           json={"email": email, "password": pwd, "code": "000000"})
        assert r4.status_code == 401

        # Disable: wrong code 401
        rd_bad = s.post(f"{BASE_URL}/auth/2fa/disable", json={"code": "000000"})
        assert rd_bad.status_code == 401

        # Disable with correct code
        code_disable = pyotp.TOTP(secret).now()
        rd = s.post(f"{BASE_URL}/auth/2fa/disable", json={"code": code_disable})
        assert rd.status_code == 200, rd.text
        assert rd.json().get("enabled") is False

        # Login no code now ok
        r5 = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pwd})
        assert r5.status_code == 200

    def test_verify_wrong_code_401(self):
        s, *_ = _new_user_session("tfa3")
        s.post(f"{BASE_URL}/auth/2fa/setup")
        r = s.post(f"{BASE_URL}/auth/2fa/verify", json={"code": "000000"})
        assert r.status_code == 401


# ----- SESSIONS -----
class TestSessions:
    def test_list_has_current_after_login(self):
        s, email, pwd = _new_user_session("sess1")
        r = s.get(f"{BASE_URL}/auth/sessions")
        assert r.status_code == 200, r.text
        sessions = r.json()
        assert isinstance(sessions, list) and len(sessions) >= 1
        for d in sessions:
            assert "device_id" in d and "label" in d
        assert any(d.get("current") for d in sessions)

    def test_delete_other_session(self):
        s, email, pwd = _new_user_session("sess2")
        # Create a second session by logging in fresh from another session
        s2 = requests.Session()
        r = s2.post(f"{BASE_URL}/auth/login", json={"email": email, "password": pwd})
        assert r.status_code == 200

        # From s, list and delete the non-current one
        sessions = s.get(f"{BASE_URL}/auth/sessions").json()
        assert len(sessions) >= 2
        non_current = [d for d in sessions if not d.get("current")]
        assert non_current
        target = non_current[0]["device_id"]
        r2 = s.delete(f"{BASE_URL}/auth/sessions/{target}")
        assert r2.status_code == 200, r2.text

        # Verify after delete
        sessions2 = s.get(f"{BASE_URL}/auth/sessions").json()
        assert all(d["device_id"] != target for d in sessions2)

    def test_delete_unknown_session_404(self):
        s, *_ = _new_user_session("sess3")
        r = s.delete(f"{BASE_URL}/auth/sessions/dev_doesnotexist")
        assert r.status_code == 404

    def test_revoke_current_clears_cookie(self):
        s, email, pwd = _new_user_session("sess4")
        sessions = s.get(f"{BASE_URL}/auth/sessions").json()
        current = next((d for d in sessions if d.get("current")), None)
        assert current is not None
        r = s.delete(f"{BASE_URL}/auth/sessions/{current['device_id']}")
        assert r.status_code == 200
        # access_token cookie should be cleared
        r2 = s.get(f"{BASE_URL}/auth/me")
        assert r2.status_code in (401, 403)


# ----- BIOMETRIC -----
class TestBiometric:
    def test_register_options_returns_pubkey_options(self):
        s, *_ = _new_user_session("bio1")
        r = s.post(f"{BASE_URL}/auth/biometric/register/options")
        assert r.status_code == 200, r.text
        data = r.json()
        # PublicKey credential creation options shape
        assert "challenge" in data
        assert "rp" in data
        assert "user" in data
        assert "pubKeyCredParams" in data

    def test_disable_resets(self):
        s, *_ = _new_user_session("bio2")
        # Even with no creds, disable is idempotent and returns enabled=False
        r = s.post(f"{BASE_URL}/auth/biometric/disable")
        assert r.status_code == 200
        assert r.json().get("enabled") is False
        # Status should reflect biometric_enabled false
        st = s.get(f"{BASE_URL}/auth/security/status").json()
        assert st["biometric_enabled"] is False


# ----- REGRESSION SMOKE (iter3 critical endpoints) -----
class TestRegressionSmoke:
    def test_events_list_and_rewards_catalog(self):
        s, *_ = _new_user_session("reg")
        r1 = s.get(f"{BASE_URL}/events")
        assert r1.status_code == 200
        assert isinstance(r1.json(), list)

        r2 = s.get(f"{BASE_URL}/rewards/catalog")
        assert r2.status_code == 200
        rewards = r2.json()
        assert isinstance(rewards, list) and len(rewards) >= 1

    def test_admin_login_and_stats(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/auth/login",
                   json={"email": "alexandrexbdcosme@gmail.com", "password": "Yanka.2003"})
        assert r.status_code == 200, r.text
        rs = s.get(f"{BASE_URL}/admin/stats")
        assert rs.status_code == 200
