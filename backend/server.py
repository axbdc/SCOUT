"""SCOUT - Automotive Intelligence backend.

Unified auth (JWT email/pwd + Emergent Google) + events lifecycle
(pending → approved/rejected) with €10 submission fee, photo gallery
(watermarked previews) with mocked purchase, favorites, admin endpoints.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt as pyjwt
import httpx
import pyotp
import qrcode
import io
import base64
import json
import secrets as pysecrets
from webauthn import generate_registration_options, verify_registration_response, generate_authentication_options, verify_authentication_response
from webauthn.helpers import options_to_json as _wa_options_to_json
from webauthn.helpers.cose import COSEAlgorithmIdentifier
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria, UserVerificationRequirement, ResidentKeyRequirement,
    PublicKeyCredentialDescriptor, RegistrationCredential, AuthenticationCredential,
)
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ----------------- Setup -----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SUBMISSION_FEE = 10.0  # EUR per event submission

app = FastAPI(title="SCOUT API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scout")


# ----------------- Models -----------------
class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: str
    role: str = "member"
    is_black: bool = False
    points: int = 0
    license_id: Optional[str] = None


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    code: Optional[str] = None  # 2FA TOTP code, if enabled


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class TOTPVerifyIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


CarCategory = Literal["Clássicos", "Desportivos", "JDM", "Americanos", "Todos"]
EventType = Literal["Track Day", "Concours", "Rally", "Meet"]
EventStatus = Literal["pending", "approved", "rejected"]


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    title: str
    type: EventType
    image: str
    date: str
    time_start: str
    time_end: str
    price: float
    location_name: str
    lat: float
    lng: float
    spots_left: int
    spots_total: int
    description: str
    organizer: str
    categories: List[str] = []
    tags: List[str] = []
    live: bool = False
    exclusive: bool = False
    status: EventStatus = "approved"
    submitted_by: Optional[str] = None
    rejection_reason: Optional[str] = None


class EventSubmissionIn(BaseModel):
    title: str = Field(min_length=2)
    type: EventType
    image: str = ""
    date: str
    time_start: str
    time_end: str
    price: float = 0.0
    location_name: str
    lat: float
    lng: float
    spots_total: int = Field(ge=1)
    description: str
    organizer: str
    categories: List[str] = []
    payment_token: str  # required: from /events/submission-fee


class Partnership(BaseModel):
    partnership_id: str
    name: str
    icon: str
    discount: str
    tier: Literal["open", "black"]
    description: str = ""


class Photo(BaseModel):
    photo_id: str
    event_id: str
    photographer_name: str
    image_url: str
    price: float
    car_label: Optional[str] = None  # e.g., "Ferrari 458 #25"


class CheckoutIn(BaseModel):
    plan: Literal["monthly", "quarterly", "annual"]
    method: Literal["apple_pay", "mbway", "multibanco", "paypal", "card"]


class NotificationPrefs(BaseModel):
    new_events_national: bool = True
    events_in_region: bool = True
    black_circle: bool = False


class AdminUserUpdate(BaseModel):
    is_black: Optional[bool] = None
    role: Optional[Literal["member", "admin"]] = None
    points: Optional[int] = None


class RejectIn(BaseModel):
    reason: str = ""


# ----------------- Helpers -----------------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize_user(doc: dict) -> dict:
    return {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "picture": doc.get("picture"),
        "auth_provider": doc.get("auth_provider", "email"),
        "role": doc.get("role", "member"),
        "is_black": doc.get("is_black", False),
        "points": doc.get("points", 0),
        "license_id": doc.get("license_id"),
    }


async def get_user_by_session_token(token: str) -> Optional[dict]:
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})


async def get_user_by_jwt(token: str) -> Optional[dict]:
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        # Check device still trusted (revocation)
        device_id = payload.get("device_id")
        if device_id:
            dev = await db.user_devices.find_one({"device_id": device_id})
            if not dev:
                return None
            # Update last_seen
            await db.user_devices.update_one(
                {"device_id": device_id},
                {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
            )
        return await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    except Exception:
        return None


async def get_current_user(request: Request) -> dict:
    st = request.cookies.get("session_token")
    if st:
        u = await get_user_by_session_token(st)
        if u:
            return u
    at = request.cookies.get("access_token")
    if at:
        u = await get_user_by_jwt(at)
        if u:
            return u
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        tok = auth[7:]
        u = await get_user_by_session_token(tok) or await get_user_by_jwt(tok)
        if u:
            return u
    raise HTTPException(status_code=401, detail="Not authenticated")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def cookie_kwargs():
    return dict(httponly=True, secure=False, samesite="lax", max_age=7 * 24 * 60 * 60, path="/")


# ----------------- Auth Endpoints -----------------
@api.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já registado")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "auth_provider": "email",
        "role": "member",
        "is_black": False,
        "points": 250,
        "license_id": f"S-{uuid.uuid4().hex[:5].upper()}-PT",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    device_id = await create_session(user_id, request)
    response.set_cookie("access_token", create_access_token_with_device(user_id, device_id), **cookie_kwargs())
    return serialize_user(doc)


def parse_user_agent(ua: str) -> str:
    if not ua:
        return "Dispositivo Desconhecido"
    if "iPhone" in ua:
        return "iPhone"
    if "iPad" in ua:
        return "iPad"
    if "Android" in ua:
        if "Mobile" in ua:
            return "Android Phone"
        return "Android Tablet"
    if "Macintosh" in ua or "Mac OS X" in ua:
        return "Mac"
    if "Windows" in ua:
        return "Windows PC"
    if "Linux" in ua:
        return "Linux PC"
    return "Browser"


async def create_session(user_id: str, request: Request) -> str:
    """Create a trusted-device session record. Returns device_id."""
    device_id = f"dev_{uuid.uuid4().hex[:12]}"
    ua = request.headers.get("user-agent", "")
    await db.user_devices.insert_one({
        "device_id": device_id,
        "user_id": user_id,
        "label": parse_user_agent(ua),
        "user_agent": ua,
        "ip": request.client.host if request.client else "?",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "current": True,
    })
    return device_id


def create_access_token_with_device(user_id: str, device_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "device_id": device_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@api.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if user.get("two_factor_enabled"):
        if not payload.code:
            raise HTTPException(status_code=403, detail={"error": "2fa_required", "message": "Código 2FA necessário"})
        secret = user.get("two_factor_secret")
        if not secret or not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
            raise HTTPException(status_code=401, detail="Código 2FA inválido")
    device_id = await create_session(user["user_id"], request)
    response.set_cookie("access_token", create_access_token_with_device(user["user_id"], device_id), **cookie_kwargs())
    return serialize_user(user)


@api.post("/auth/logout")
async def logout(response: Response, request: Request):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_one({"session_token": st})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


# ----------------- Security: Password / 2FA / Sessions / Biometric -----------------
@api.get("/auth/security/status")
async def security_status(user: dict = Depends(get_current_user)):
    return {
        "has_password": bool(user.get("password_hash")),
        "two_factor_enabled": bool(user.get("two_factor_enabled")),
        "biometric_enabled": bool(user.get("biometric_credentials")),
        "auth_provider": user.get("auth_provider", "email"),
    }


@api.post("/auth/change-password")
async def change_password(payload: ChangePasswordIn, user: dict = Depends(get_current_user)):
    if not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Esta conta usa login social - não tem password definida")
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Password atual incorreta")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=400, detail="A nova password tem de ser diferente da atual")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"ok": True}


@api.post("/auth/2fa/setup")
async def two_factor_setup(user: dict = Depends(get_current_user)):
    if user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA já está ativada")
    secret = pyotp.random_base32()
    otpauth_url = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="SCOUT")
    # Generate QR PNG → base64
    img = qrcode.make(otpauth_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    # Store pending secret (not active yet until verified)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_factor_secret_pending": secret}},
    )
    return {"secret": secret, "otpauth_url": otpauth_url, "qr_png_base64": qr_b64}


@api.post("/auth/2fa/verify")
async def two_factor_verify(payload: TOTPVerifyIn, user: dict = Depends(get_current_user)):
    secret = user.get("two_factor_secret_pending") or user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Configura primeiro o 2FA")
    if not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Código inválido")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_factor_enabled": True, "two_factor_secret": secret}, "$unset": {"two_factor_secret_pending": ""}},
    )
    return {"enabled": True}


@api.post("/auth/2fa/disable")
async def two_factor_disable(payload: TOTPVerifyIn, user: dict = Depends(get_current_user)):
    secret = user.get("two_factor_secret")
    if not user.get("two_factor_enabled") or not secret:
        raise HTTPException(status_code=400, detail="2FA não está ativada")
    if not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
        raise HTTPException(status_code=401, detail="Código inválido")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"two_factor_enabled": False}, "$unset": {"two_factor_secret": "", "two_factor_secret_pending": ""}},
    )
    return {"enabled": False}


@api.get("/auth/sessions")
async def list_sessions(request: Request, user: dict = Depends(get_current_user)):
    devices = await db.user_devices.find({"user_id": user["user_id"]}, {"_id": 0}).sort("last_seen", -1).to_list(200)
    # Mark current device
    current_device_id = None
    at = request.cookies.get("access_token")
    if at:
        try:
            payload = pyjwt.decode(at, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_device_id = payload.get("device_id")
        except Exception:
            pass
    for d in devices:
        d["current"] = d["device_id"] == current_device_id
    return devices


@api.delete("/auth/sessions/{device_id}")
async def revoke_session(device_id: str, request: Request, response: Response, user: dict = Depends(get_current_user)):
    res = await db.user_devices.delete_one({"device_id": device_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    # If revoking current device, clear its cookie
    at = request.cookies.get("access_token")
    if at:
        try:
            payload = pyjwt.decode(at, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("device_id") == device_id:
                response.delete_cookie("access_token", path="/")
                response.delete_cookie("session_token", path="/")
        except Exception:
            pass
    return {"ok": True}


# --- Biometric (WebAuthn) ---
def _rp_id_from_request(request: Request) -> str:
    host = (request.headers.get("host") or "localhost").split(":")[0]
    return host


def _origin_from_request(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto") or "https"
    host = request.headers.get("host") or "localhost"
    return f"{proto}://{host}"


@api.post("/auth/biometric/register/options")
async def biometric_register_options(request: Request, user: dict = Depends(get_current_user)):
    challenge = pysecrets.token_bytes(32)
    rp_id = _rp_id_from_request(request)
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name="SCOUT",
        user_id=user["user_id"].encode("utf-8"),
        user_name=user["email"],
        user_display_name=user.get("name") or user["email"],
        challenge=challenge,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED,
            resident_key=ResidentKeyRequirement.PREFERRED,
        ),
        supported_pub_key_algs=[COSEAlgorithmIdentifier.ECDSA_SHA_256, COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256],
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"webauthn_challenge": base64.b64encode(challenge).decode("ascii")}},
    )
    return json.loads(_wa_options_to_json(options))


@api.post("/auth/biometric/register/verify")
async def biometric_register_verify(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    challenge_b64 = user.get("webauthn_challenge")
    if not challenge_b64:
        raise HTTPException(status_code=400, detail="No challenge in progress")
    rp_id = _rp_id_from_request(request)
    origin = _origin_from_request(request)
    try:
        verification = verify_registration_response(
            credential=body,
            expected_challenge=base64.b64decode(challenge_b64),
            expected_origin=origin,
            expected_rp_id=rp_id,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha de verificação: {e}")
    cred = {
        "credential_id": base64.b64encode(verification.credential_id).decode("ascii"),
        "public_key": base64.b64encode(verification.credential_public_key).decode("ascii"),
        "sign_count": verification.sign_count,
        "device_label": parse_user_agent(request.headers.get("user-agent", "")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$push": {"biometric_credentials": cred}, "$unset": {"webauthn_challenge": ""}},
    )
    return {"enabled": True, "device_label": cred["device_label"]}


@api.post("/auth/biometric/disable")
async def biometric_disable(user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"biometric_credentials": []}},
    )
    return {"enabled": False}


@api.post("/auth/biometric/auth/options")
async def biometric_auth_options(request: Request):
    body = await request.json()
    email = (body.get("email") or "").lower().strip()
    user = await db.users.find_one({"email": email}) if email else None
    if not user or not user.get("biometric_credentials"):
        raise HTTPException(status_code=404, detail="Biometria não disponível para este utilizador")
    challenge = pysecrets.token_bytes(32)
    rp_id = _rp_id_from_request(request)
    allowed = [
        PublicKeyCredentialDescriptor(id=base64.b64decode(c["credential_id"]))
        for c in user["biometric_credentials"]
    ]
    options = generate_authentication_options(
        rp_id=rp_id,
        challenge=challenge,
        allow_credentials=allowed,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"webauthn_challenge": base64.b64encode(challenge).decode("ascii")}},
    )
    return {"options": json.loads(_wa_options_to_json(options)), "user_id": user["user_id"]}


@api.post("/auth/biometric/auth/verify")
async def biometric_auth_verify(request: Request, response: Response):
    body = await request.json()
    user_id = body.get("user_id")
    user = await db.users.find_one({"user_id": user_id}) if user_id else None
    if not user or not user.get("biometric_credentials"):
        raise HTTPException(status_code=404, detail="User not found")
    challenge_b64 = user.get("webauthn_challenge")
    if not challenge_b64:
        raise HTTPException(status_code=400, detail="No challenge in progress")
    rp_id = _rp_id_from_request(request)
    origin = _origin_from_request(request)
    cred_data = body.get("credential")
    if not cred_data:
        raise HTTPException(status_code=400, detail="Missing credential")
    cred_id_b64 = cred_data.get("id") or cred_data.get("rawId")
    matched = next((c for c in user["biometric_credentials"] if c["credential_id"].rstrip("=") == (cred_id_b64 or "").rstrip("=")), None)
    if not matched:
        # Try to match by base64url decoding
        for c in user["biometric_credentials"]:
            try:
                if base64.urlsafe_b64decode(c["credential_id"] + "==").rstrip(b"=") == base64.urlsafe_b64decode((cred_id_b64 or "") + "==").rstrip(b"="):
                    matched = c
                    break
            except Exception:
                pass
    if not matched:
        raise HTTPException(status_code=400, detail="Credencial não reconhecida")
    try:
        verification = verify_authentication_response(
            credential=cred_data,
            expected_challenge=base64.b64decode(challenge_b64),
            expected_origin=origin,
            expected_rp_id=rp_id,
            credential_public_key=base64.b64decode(matched["public_key"]),
            credential_current_sign_count=matched.get("sign_count", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Falha biométrica: {e}")
    # Update sign count
    await db.users.update_one(
        {"user_id": user["user_id"], "biometric_credentials.credential_id": matched["credential_id"]},
        {"$set": {"biometric_credentials.$.sign_count": verification.new_sign_count}, "$unset": {"webauthn_challenge": ""}},
    )
    device_id = await create_session(user["user_id"], request)
    response.set_cookie("access_token", create_access_token_with_device(user["user_id"], device_id), **cookie_kwargs())
    return serialize_user(user)


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        try:
            body = await request.json()
        except Exception:
            body = {}
        if isinstance(body, dict):
            session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        r = await http_client.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = data["email"].lower().strip()
    user = await db.users.find_one({"email": email})
    now = datetime.now(timezone.utc)
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "password_hash": None,
            "auth_provider": "google",
            "role": "member",
            "is_black": False,
            "points": 250,
            "license_id": f"S-{uuid.uuid4().hex[:5].upper()}-PT",
            "created_at": now.isoformat(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": data.get("name") or user["name"], "picture": data.get("picture") or user.get("picture")}},
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    await db.user_sessions.update_one(
        {"session_token": data["session_token"]},
        {"$set": {
            "user_id": user["user_id"],
            "session_token": data["session_token"],
            "expires_at": (now + timedelta(days=7)).isoformat(),
            "created_at": now.isoformat(),
        }},
        upsert=True,
    )
    response.set_cookie("session_token", data["session_token"], **cookie_kwargs())
    return serialize_user(user)


# ----------------- Events (public) -----------------
@api.get("/events", response_model=List[Event])
async def list_events(type: Optional[str] = None, date: Optional[str] = None, category: Optional[str] = None):
    query: dict = {"status": "approved"}
    if type and type != "All":
        query["type"] = type
    if date:
        query["date"] = date
    if category and category not in ("Todos", "All"):
        query["categories"] = category
    docs = await db.events.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str, user: dict = Depends(get_current_user)):
    doc = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    # only allow approved + own submissions to non-admins
    if doc.get("status") != "approved" and user.get("role") != "admin" and doc.get("submitted_by") != user.get("user_id"):
        raise HTTPException(status_code=404, detail="Event not found")
    return doc


@api.post("/events/{event_id}/book")
async def book_event(event_id: str, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"event_id": event_id})
    if not ev or ev.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Event not found")
    if ev.get("spots_left", 0) <= 0:
        raise HTTPException(status_code=400, detail="Sem vagas disponíveis")
    if await db.bookings.find_one({"event_id": event_id, "user_id": user["user_id"]}):
        raise HTTPException(status_code=400, detail="Já tens reserva neste evento")
    booking = {
        "booking_id": f"bk_{uuid.uuid4().hex[:10]}",
        "event_id": event_id,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "confirmed",
    }
    await db.bookings.insert_one(booking)
    await db.events.update_one({"event_id": event_id}, {"$inc": {"spots_left": -1}})
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": 50}})
    return {"ok": True, "booking_id": booking["booking_id"], "points_earned": 50}


@api.post("/events/{event_id}/attend")
async def toggle_attend(event_id: str, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"event_id": event_id})
    if not ev or ev.get("status") != "approved":
        raise HTTPException(status_code=404, detail="Event not found")
    existing = await db.attendances.find_one({"user_id": user["user_id"], "event_id": event_id})
    if existing:
        await db.attendances.delete_one({"_id": existing["_id"]})
        return {"attending": False}
    # Track first-ever attendance to prevent point farming via toggle
    already_rewarded = await db.attendance_rewards.find_one({"user_id": user["user_id"], "event_id": event_id})
    points_earned = 0
    if not already_rewarded:
        await db.attendance_rewards.insert_one({"user_id": user["user_id"], "event_id": event_id, "ts": datetime.now(timezone.utc).isoformat()})
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": 10}})
        points_earned = 10
    await db.attendances.insert_one({
        "user_id": user["user_id"],
        "event_id": event_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"attending": True, "points_earned": points_earned}


@api.get("/events/{event_id}/attendance")
async def event_attendance(event_id: str, user: dict = Depends(get_current_user)):
    count = await db.attendances.count_documents({"event_id": event_id})
    mine = await db.attendances.find_one({"event_id": event_id, "user_id": user["user_id"]})
    return {"count": count, "attending": bool(mine)}


@api.get("/bookings/me")
async def my_bookings(user: dict = Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    return docs


# ----------------- Event submission (paid) -----------------
@api.post("/events/submission-fee")
async def pay_submission_fee(user: dict = Depends(get_current_user)):
    """MOCKED payment of €10 for event submission. Returns a one-time token."""
    token = f"pay_{uuid.uuid4().hex}"
    await db.payment_tokens.insert_one({
        "token": token,
        "user_id": user["user_id"],
        "amount": SUBMISSION_FEE,
        "purpose": "event_submission",
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "payment_token": token, "amount": SUBMISSION_FEE}


@api.post("/events/submit")
async def submit_event(payload: EventSubmissionIn, user: dict = Depends(get_current_user)):
    pt = await db.payment_tokens.find_one({"token": payload.payment_token, "user_id": user["user_id"], "used": False})
    if not pt:
        raise HTTPException(status_code=402, detail="Pagamento da submissão (€10) em falta ou já utilizado.")
    await db.payment_tokens.update_one({"token": payload.payment_token}, {"$set": {"used": True}})
    event_id = f"ev_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "event_id": event_id,
        "title": payload.title.strip(),
        "type": payload.type,
        "image": payload.image or "https://images.pexels.com/photos/9284135/pexels-photo-9284135.jpeg",
        "date": payload.date,
        "time_start": payload.time_start,
        "time_end": payload.time_end,
        "price": float(payload.price),
        "location_name": payload.location_name,
        "lat": float(payload.lat),
        "lng": float(payload.lng),
        "spots_left": int(payload.spots_total),
        "spots_total": int(payload.spots_total),
        "description": payload.description,
        "organizer": payload.organizer,
        "categories": payload.categories,
        "tags": [],
        "live": False,
        "exclusive": False,
        "status": "pending",
        "submitted_by": user["user_id"],
        "submitted_at": now,
    }
    await db.events.insert_one(doc)
    return {"ok": True, "event_id": event_id, "status": "pending"}


@api.get("/events/me/submissions")
async def my_submissions(user: dict = Depends(get_current_user)):
    docs = await db.events.find({"submitted_by": user["user_id"]}, {"_id": 0}).sort("submitted_at", -1).to_list(200)
    return docs


# ----------------- Favorites -----------------
@api.post("/favorites/{event_id}")
async def add_favorite(event_id: str, user: dict = Depends(get_current_user)):
    if not await db.events.find_one({"event_id": event_id}):
        raise HTTPException(status_code=404, detail="Event not found")
    await db.favorites.update_one(
        {"user_id": user["user_id"], "event_id": event_id},
        {"$set": {"user_id": user["user_id"], "event_id": event_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/favorites/{event_id}")
async def remove_favorite(event_id: str, user: dict = Depends(get_current_user)):
    await db.favorites.delete_one({"user_id": user["user_id"], "event_id": event_id})
    return {"ok": True}


@api.get("/favorites/me")
async def my_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    ids = [f["event_id"] for f in favs]
    if not ids:
        return []
    events = await db.events.find({"event_id": {"$in": ids}, "status": "approved"}, {"_id": 0}).to_list(500)
    return events


# ----------------- Photos (event gallery, mocked purchase) -----------------
@api.get("/events/{event_id}/photos")
async def event_photos(event_id: str, user: dict = Depends(get_current_user)):
    photos = await db.photos.find({"event_id": event_id}, {"_id": 0}).to_list(500)
    purchases = await db.photo_purchases.find({"user_id": user["user_id"], "event_id": event_id}, {"_id": 0}).to_list(500)
    purchased_ids = {p["photo_id"] for p in purchases}
    for p in photos:
        p["purchased"] = p["photo_id"] in purchased_ids
    return photos


@api.post("/photos/{photo_id}/buy")
async def buy_photo(photo_id: str, user: dict = Depends(get_current_user)):
    """MOCKED purchase of a photo - removes watermark for the buyer."""
    photo = await db.photos.find_one({"photo_id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    existing = await db.photo_purchases.find_one({"user_id": user["user_id"], "photo_id": photo_id})
    if existing:
        raise HTTPException(status_code=400, detail="Foto já comprada")
    await db.photo_purchases.insert_one({
        "purchase_id": f"pp_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "photo_id": photo_id,
        "event_id": photo["event_id"],
        "amount": photo["price"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # +20 pts for buying a photo
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": 20}})
    return {"ok": True, "amount": photo["price"], "points_earned": 20}


@api.get("/photos/me")
async def my_photos(user: dict = Depends(get_current_user)):
    purchases = await db.photo_purchases.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    return purchases


# ----------------- Partnerships -----------------
@api.get("/partnerships", response_model=List[Partnership])
async def list_partnerships(tier: Optional[str] = None):
    query: dict = {}
    if tier in ("open", "black"):
        query["tier"] = tier
    return await db.partnerships.find(query, {"_id": 0}).to_list(200)


# ----------------- Subscription (mocked) -----------------
@api.post("/subscription/checkout")
async def checkout(payload: CheckoutIn, user: dict = Depends(get_current_user)):
    plan_prices = {"monthly": 29.99, "quarterly": 79.99, "annual": 290.0}
    amount = plan_prices[payload.plan]
    sub = {
        "subscription_id": f"sub_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "plan": payload.plan,
        "method": payload.method,
        "amount": amount,
        "status": "active",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.subscriptions.insert_one(sub)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"is_black": True}})
    return {"ok": True, "subscription_id": sub["subscription_id"], "plan": payload.plan, "amount": amount}


@api.get("/subscription/me")
async def my_subscription(user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"user_id": user["user_id"], "status": "active"}, {"_id": 0})
    return sub or {"status": "none"}


@api.post("/subscription/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    await db.subscriptions.update_many({"user_id": user["user_id"]}, {"$set": {"status": "cancelled"}})
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"is_black": False}})
    return {"ok": True}


@api.get("/notifications/prefs", response_model=NotificationPrefs)
async def get_prefs(user: dict = Depends(get_current_user)):
    p = await db.notification_prefs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return p or NotificationPrefs().model_dump()


@api.put("/notifications/prefs", response_model=NotificationPrefs)
async def set_prefs(prefs: NotificationPrefs, user: dict = Depends(get_current_user)):
    await db.notification_prefs.update_one(
        {"user_id": user["user_id"]},
        {"$set": {**prefs.model_dump(), "user_id": user["user_id"]}},
        upsert=True,
    )
    return prefs


# ----------------- Admin -----------------
@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "members_black": await db.users.count_documents({"is_black": True}),
        "events_approved": await db.events.count_documents({"status": "approved"}),
        "events_pending": await db.events.count_documents({"status": "pending"}),
        "events_rejected": await db.events.count_documents({"status": "rejected"}),
        "bookings": await db.bookings.count_documents({}),
        "subscriptions_active": await db.subscriptions.count_documents({"status": "active"}),
        "submission_revenue_eur": await db.payment_tokens.count_documents({"used": True, "purpose": "event_submission"}) * SUBMISSION_FEE,
        "subscription_revenue_eur": sum(s.get("amount", 0) for s in await db.subscriptions.find({"status": "active"}, {"_id": 0, "amount": 1}).to_list(1000)),
    }


@api.get("/admin/events", response_model=List[Event])
async def admin_list_events(status: Optional[str] = None, _: dict = Depends(require_admin)):
    query: dict = {}
    if status in ("pending", "approved", "rejected"):
        query["status"] = status
    return await db.events.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(500)


@api.post("/admin/events/{event_id}/approve", response_model=Event)
async def admin_approve(event_id: str, _: dict = Depends(require_admin)):
    res = await db.events.find_one_and_update(
        {"event_id": event_id},
        {"$set": {"status": "approved", "rejection_reason": None}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Event not found")
    # Reward submitter ONCE — guard with submitter_rewarded flag
    if res.get("submitted_by") and not res.get("submitter_rewarded"):
        await db.users.update_one({"user_id": res["submitted_by"]}, {"$inc": {"points": 200}})
        await db.events.update_one({"event_id": event_id}, {"$set": {"submitter_rewarded": True}})
        res["submitter_rewarded"] = True
    return res


@api.post("/admin/events/{event_id}/reject", response_model=Event)
async def admin_reject(event_id: str, payload: RejectIn, _: dict = Depends(require_admin)):
    res = await db.events.find_one_and_update(
        {"event_id": event_id},
        {"$set": {"status": "rejected", "rejection_reason": payload.reason}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Event not found")
    return res


@api.delete("/admin/events/{event_id}")
async def admin_delete_event(event_id: str, _: dict = Depends(require_admin)):
    r = await db.events.delete_one({"event_id": event_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.bookings.delete_many({"event_id": event_id})
    return {"ok": True}


@api.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(2000)
    return users


@api.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: AdminUserUpdate, _: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        return {"ok": True}
    r = await db.users.update_one({"user_id": user_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, _: dict = Depends(require_admin)):
    if user_id == _["user_id"]:
        raise HTTPException(status_code=400, detail="Não te podes eliminar a ti próprio")
    r = await db.users.delete_one({"user_id": user_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# Admin - Photos management
class PhotoIn(BaseModel):
    event_id: str
    photographer_name: str
    image_url: str
    price: float = 5.0
    car_label: Optional[str] = None


@api.post("/admin/photos", response_model=Photo)
async def admin_add_photo(payload: PhotoIn, _: dict = Depends(require_admin)):
    if not await db.events.find_one({"event_id": payload.event_id}):
        raise HTTPException(status_code=404, detail="Event not found")
    photo = {
        "photo_id": f"ph_{uuid.uuid4().hex[:10]}",
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.photos.insert_one(photo)
    photo.pop("_id", None)
    return photo


@api.delete("/admin/photos/{photo_id}")
async def admin_delete_photo(photo_id: str, _: dict = Depends(require_admin)):
    r = await db.photos.delete_one({"photo_id": photo_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"ok": True}


@api.get("/admin/revenue/monthly")
async def admin_revenue_monthly(_: dict = Depends(require_admin)):
    """Aggregate revenue per month from submission fees + photo purchases + subscriptions."""
    out: dict = {}

    def add(month_key: str, source: str, amount: float):
        if month_key not in out:
            out[month_key] = {"month": month_key, "submissions": 0.0, "photos": 0.0, "subscriptions": 0.0, "total": 0.0}
        out[month_key][source] += amount
        out[month_key]["total"] += amount

    async for doc in db.payment_tokens.find({"used": True, "purpose": "event_submission"}):
        ts = doc.get("created_at") or ""
        if len(ts) >= 7:
            add(ts[:7], "submissions", float(doc.get("amount", 0)))

    async for doc in db.photo_purchases.find({}):
        ts = doc.get("created_at") or ""
        if len(ts) >= 7:
            add(ts[:7], "photos", float(doc.get("amount", 0)))

    async for doc in db.subscriptions.find({}):
        ts = doc.get("started_at") or ""
        if len(ts) >= 7:
            add(ts[:7], "subscriptions", float(doc.get("amount", 0)))

    return sorted(out.values(), key=lambda x: x["month"])


# ----------------- Rewards System -----------------
REWARDS_CATALOG = [
    {"reward_id": "rw_001", "title": "€5 OFF Submissão de Evento", "cost": 500, "icon": "ticket", "description": "Desconto de €5 na próxima submissão de evento.", "type": "submission_discount", "value": 5},
    {"reward_id": "rw_002", "title": "1 Foto HD Grátis", "cost": 1000, "icon": "camera", "description": "Resgata uma foto HD à tua escolha sem marca-de-água.", "type": "photo_credit", "value": 1},
    {"reward_id": "rw_003", "title": "1 Mês Scout Black", "cost": 2500, "icon": "stars", "description": "Acesso BLACK ativado durante 30 dias.", "type": "black_month", "value": 30},
    {"reward_id": "rw_004", "title": "Entrada Evento (até €30)", "cost": 3000, "icon": "trophy", "description": "Reserva grátis num evento pago até €30.", "type": "event_credit", "value": 30},
    {"reward_id": "rw_005", "title": "Pack Detailing -50%", "cost": 1500, "icon": "wrench", "description": "Voucher 50% OFF em parceiro detailing.", "type": "voucher", "value": 50},
]


@api.get("/rewards/catalog")
async def rewards_catalog():
    return REWARDS_CATALOG


@api.get("/rewards/me")
async def my_rewards(user: dict = Depends(get_current_user)):
    redemptions = await db.reward_redemptions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return redemptions


@api.post("/rewards/{reward_id}/redeem")
async def redeem_reward(reward_id: str, user: dict = Depends(get_current_user)):
    reward = next((r for r in REWARDS_CATALOG if r["reward_id"] == reward_id), None)
    if not reward:
        raise HTTPException(status_code=404, detail="Recompensa não encontrada")
    fresh_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if (fresh_user.get("points") or 0) < reward["cost"]:
        raise HTTPException(status_code=400, detail=f"Pontos insuficientes (precisas de {reward['cost']})")
    code = uuid.uuid4().hex[:10].upper()
    redemption = {
        "redemption_id": f"rd_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "reward_id": reward_id,
        "title": reward["title"],
        "cost": reward["cost"],
        "code": code,
        "type": reward["type"],
        "value": reward["value"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reward_redemptions.insert_one(redemption)
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": -reward["cost"]}})
    # If it's a Black month reward, activate black for 30 days
    if reward["type"] == "black_month":
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"is_black": True}})
    redemption.pop("_id", None)
    return redemption


# ----------------- Seed Data -----------------
SEED_EVENTS = [
    {"event_id": "ev_001", "title": "Track Day Estoril - Exclusive Edition", "type": "Track Day",
     "image": "https://images.pexels.com/photos/9284135/pexels-photo-9284135.jpeg",
     "date": "2026-02-15", "time_start": "09:00", "time_end": "18:00", "price": 145.0,
     "location_name": "Autódromo do Estoril, Cascais", "lat": 38.7506, "lng": -9.3937,
     "spots_left": 24, "spots_total": 50,
     "description": "Prepare o seu motor para uma experiência inesquecível no icónico traçado do Estoril. Inclui acesso total ao paddock, catering premium e sessões de briefing com pilotos profissionais.",
     "organizer": "Estoril Experience", "categories": ["Desportivos", "Clássicos"],
     "tags": ["High Speed", "Catering", "Open Track"], "live": True, "exclusive": True, "status": "approved"},
    {"event_id": "ev_002", "title": "Rali Histórico de Sintra", "type": "Rally",
     "image": "https://images.pexels.com/photos/3525540/pexels-photo-3525540.jpeg",
     "date": "2026-02-22", "time_start": "09:00", "time_end": "17:00", "price": 0.0,
     "location_name": "Vila de Sintra", "lat": 38.7972, "lng": -9.3905,
     "spots_left": 12, "spots_total": 30,
     "description": "Rali clássico pelas estradas sinuosas da Serra de Sintra.",
     "organizer": "Sintra Classic Club", "categories": ["Clássicos"],
     "tags": ["Classic", "Mountain"], "live": False, "exclusive": False, "status": "approved"},
    {"event_id": "ev_003", "title": "JDM Night Porto", "type": "Meet",
     "image": "https://images.unsplash.com/photo-1661840244226-2636d82a4035",
     "date": "2026-03-07", "time_start": "22:00", "time_end": "02:00", "price": 10.0,
     "location_name": "Porto - Zona Industrial", "lat": 41.1779, "lng": -8.6291,
     "spots_left": 80, "spots_total": 200,
     "description": "Encontro noturno dedicado à cultura JDM. Música, neon e o melhor do Japão tunado.",
     "organizer": "Porto Drift Crew", "categories": ["JDM"],
     "tags": ["Night", "JDM"], "live": False, "exclusive": False, "status": "approved"},
    {"event_id": "ev_004", "title": "Supercar Sunday Cascais", "type": "Concours",
     "image": "https://images.pexels.com/photos/9284135/pexels-photo-9284135.jpeg",
     "date": "2026-03-15", "time_start": "10:00", "time_end": "14:00", "price": 0.0,
     "location_name": "Cascais Marina", "lat": 38.6979, "lng": -9.4215,
     "spots_left": 35, "spots_total": 100,
     "description": "Domingo com o melhor da exotic culture - Ferraris, Lambos, Paganis.",
     "organizer": "Cascais Auto Club", "categories": ["Desportivos"],
     "tags": ["Exotic", "Marina"], "live": False, "exclusive": False, "status": "approved"},
    {"event_id": "ev_005", "title": "American Muscle Meet Lisboa", "type": "Meet",
     "image": "https://images.unsplash.com/photo-1618866157430-b4d2e6a8800b",
     "date": "2026-03-29", "time_start": "15:00", "time_end": "20:00", "price": 5.0,
     "location_name": "Lisboa - Parque das Nações", "lat": 38.7681, "lng": -9.0954,
     "spots_left": 40, "spots_total": 80,
     "description": "V8s, Mustangs, Camaros e Challengers - a tribo Americana junta-se em Lisboa.",
     "organizer": "Muscle Lisboa", "categories": ["Americanos"],
     "tags": ["V8", "Americana"], "live": False, "exclusive": False, "status": "approved"},
]

SEED_PARTNERSHIPS = [
    {"partnership_id": "pt_001", "name": "EcoWash Express", "icon": "car-wash", "discount": "5% OFF Lavagem Básica", "tier": "open", "description": "Lavagem ecológica para o teu carro."},
    {"partnership_id": "pt_002", "name": "Rodas & Brilho", "icon": "sparkles", "discount": "10% OFF Cera Rápida", "tier": "open", "description": "Polimento técnico premium."},
    {"partnership_id": "pt_003", "name": "Coffee & Cars", "icon": "coffee", "discount": "Café cortesia", "tier": "open", "description": "Cafetaria parceira em vários encontros."},
    {"partnership_id": "pt_004", "name": "Pneus Seguros", "icon": "tire", "discount": "Check-up gratuito", "tier": "open", "description": "Inspeção de suspensão e pneus."},
    {"partnership_id": "pt_005", "name": "Estacionamento VIP", "icon": "parking", "discount": "1ª hora grátis", "tier": "open", "description": "Rede de parques parceiros."},
    {"partnership_id": "pt_006", "name": "Red Line Detailing", "icon": "wrench", "discount": "20% OFF Detailing Premium", "tier": "black", "description": "Detalhamento de luxo para membros Black."},
    {"partnership_id": "pt_007", "name": "Elite Insure", "icon": "shield", "discount": "Seguro Clássicos exclusivo", "tier": "black", "description": "Seguros premium para clássicos."},
    {"partnership_id": "pt_008", "name": "Logística Black", "icon": "truck", "discount": "VIP Transport", "tier": "black", "description": "Transporte de viaturas em garage cover."},
]

SEED_PHOTOS = [
    {"photo_id": "ph_001", "event_id": "ev_001", "photographer_name": "Lente Estoril", "image_url": "https://images.unsplash.com/photo-1627667928346-5fc86d099a5c", "price": 8.0, "car_label": "Ferrari 458 Spider #08"},
    {"photo_id": "ph_002", "event_id": "ev_001", "photographer_name": "Lente Estoril", "image_url": "https://images.unsplash.com/photo-1672024110512-f7028b49db28", "price": 8.0, "car_label": "Porsche 911 GT3 RS #14"},
    {"photo_id": "ph_003", "event_id": "ev_001", "photographer_name": "FPAK Photo", "image_url": "https://images.pexels.com/photos/9284135/pexels-photo-9284135.jpeg", "price": 12.0, "car_label": "Lamborghini Huracán #22"},
    {"photo_id": "ph_004", "event_id": "ev_002", "photographer_name": "Sintra Lens", "image_url": "https://images.pexels.com/photos/3525540/pexels-photo-3525540.jpeg", "price": 6.0, "car_label": "Lancia Stratos"},
    {"photo_id": "ph_005", "event_id": "ev_003", "photographer_name": "Porto Night", "image_url": "https://images.unsplash.com/photo-1661840244226-2636d82a4035", "price": 5.0, "car_label": "Nissan Skyline R34"},
    {"photo_id": "ph_006", "event_id": "ev_003", "photographer_name": "Porto Night", "image_url": "https://images.pexels.com/photos/18320398/pexels-photo-18320398.jpeg", "price": 5.0, "car_label": "Toyota Supra MK4"},
]


async def seed():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.events.create_index("event_id", unique=True)
    await db.partnerships.create_index("partnership_id", unique=True)
    await db.photos.create_index("photo_id", unique=True)
    await db.favorites.create_index([("user_id", 1), ("event_id", 1)], unique=True)
    await db.payment_tokens.create_index("token", unique=True)

    # Drop old spots collection if exists (legacy)
    try:
        await db.spots.drop()
    except Exception:
        pass

    for e in SEED_EVENTS:
        await db.events.update_one({"event_id": e["event_id"]}, {"$set": e}, upsert=True)
    for p in SEED_PARTNERSHIPS:
        await db.partnerships.update_one({"partnership_id": p["partnership_id"]}, {"$set": p}, upsert=True)
    for ph in SEED_PHOTOS:
        await db.photos.update_one({"photo_id": ph["photo_id"]}, {"$set": ph}, upsert=True)

    # Admin user (real owner)
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    now = datetime.now(timezone.utc).isoformat()
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Alexandre",
            "password_hash": hash_password(admin_password),
            "auth_provider": "email",
            "role": "admin",
            "is_black": True,
            "points": 1500,
            "license_id": "S-OWNR-PT",
            "picture": None,
            "created_at": now,
        })
    else:
        update = {"role": "admin", "is_black": True}
        if not verify_password(admin_password, existing.get("password_hash", "")):
            update["password_hash"] = hash_password(admin_password)
        await db.users.update_one({"email": admin_email}, {"$set": update})

    # Demo member account (so admin can also test as member)
    demo_email = "alex.member@scout.pt"
    demo_password = "scoutcreator"
    if not await db.users.find_one({"email": demo_email}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": demo_email,
            "name": "Alexandre (Membro)",
            "password_hash": hash_password(demo_password),
            "auth_provider": "email",
            "role": "member",
            "is_black": False,
            "points": 400,
            "license_id": "S-MMBR-PT",
            "picture": None,
            "created_at": now,
        })

    # Legacy demo user (kept)
    legacy_email = "arthur@scout.pt"
    legacy_password = "ScoutBlack2024!"
    if not await db.users.find_one({"email": legacy_email}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": legacy_email,
            "name": "Arthur Shelby",
            "password_hash": hash_password(legacy_password),
            "auth_provider": "email",
            "role": "member",
            "is_black": True,
            "points": 1250,
            "license_id": "S-992-UK",
            "picture": None,
            "created_at": now,
        })

    logger.info("SCOUT seed complete.")


@app.on_event("startup")
async def on_startup():
    await seed()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "SCOUT", "status": "live", "version": "2.0.0"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
