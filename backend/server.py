"""SCOUT - Automotive Intelligence backend.

Unified auth supporting:
- Email/password (JWT cookies)
- Emergent-managed Google OAuth (session_token cookie)
Plus domain endpoints for spots, events, calendar, partnerships, bookings, subscription (mocked).
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt as pyjwt
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
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


class Spot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    spot_id: str
    title: str
    image: str
    region: Literal["Norte", "Centro", "Sul", "Ilhas"]
    price_type: Literal["Gratuito", "Pago"]
    category: Literal["Clássicos", "Desportivos", "JDM", "Americanos"]
    location_name: str
    lat: float
    lng: float
    description: str
    live: bool = False


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    title: str
    type: Literal["Track Day", "Concours", "Rally", "Meet"]
    image: str
    date: str  # ISO date
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
    tags: List[str] = []
    live: bool = False
    exclusive: bool = False


class Partnership(BaseModel):
    partnership_id: str
    name: str
    icon: str
    discount: str
    tier: Literal["open", "black"]
    description: str = ""


class BookingIn(BaseModel):
    event_id: str


class CheckoutIn(BaseModel):
    plan: Literal["monthly", "quarterly", "annual"]
    method: Literal["apple_pay", "mbway", "multibanco", "paypal", "card"]


class NotificationPrefs(BaseModel):
    new_events_national: bool = True
    events_in_region: bool = True
    black_circle: bool = False


# ----------------- Helpers -----------------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
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
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return user


async def get_user_by_jwt(token: str) -> Optional[dict]:
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        return user
    except Exception:
        return None


async def get_current_user(request: Request) -> dict:
    # Try session_token cookie (Emergent Google)
    st = request.cookies.get("session_token")
    if st:
        u = await get_user_by_session_token(st)
        if u:
            return u
    # Try access_token cookie (JWT)
    at = request.cookies.get("access_token")
    if at:
        u = await get_user_by_jwt(at)
        if u:
            return u
    # Fallback Authorization header
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        tok = auth[7:]
        u = await get_user_by_session_token(tok) or await get_user_by_jwt(tok)
        if u:
            return u
    raise HTTPException(status_code=401, detail="Not authenticated")


def set_jwt_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


# ----------------- Auth Endpoints -----------------
@api.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response):
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
    token = create_access_token(user_id)
    set_jwt_cookie(response, token)
    return serialize_user(doc)


@api.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(user["user_id"])
    set_jwt_cookie(response, token)
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


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    """Exchange session_id (from Emergent OAuth) for a session_token cookie."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
        session_id = (body or {}).get("session_id") if isinstance(body, dict) else None
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    async with httpx.AsyncClient(timeout=10.0) as client_http:
        r = await client_http.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()
    email = data["email"].lower().strip()
    user = await db.users.find_one({"email": email})
    now = datetime.now(timezone.utc)
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
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
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": data.get("name") or user["name"], "picture": data.get("picture") or user.get("picture")}},
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    sess_doc = {
        "user_id": user["user_id"],
        "session_token": data["session_token"],
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    }
    await db.user_sessions.insert_one(sess_doc)
    set_session_cookie(response, data["session_token"])
    return serialize_user(user)


# ----------------- Domain Endpoints -----------------
@api.get("/spots", response_model=List[Spot])
async def list_spots(
    region: Optional[str] = None,
    price_type: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
):
    query: dict = {}
    if region and region != "Todos":
        query["region"] = region
    if price_type and price_type != "Todos":
        query["price_type"] = price_type
    if category and category != "Todos":
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    docs = await db.spots.find(query, {"_id": 0}).to_list(500)
    return docs


@api.get("/events", response_model=List[Event])
async def list_events(
    type: Optional[str] = None,
    date: Optional[str] = None,
):
    query: dict = {}
    if type and type != "All":
        query["type"] = type
    if date:
        query["date"] = date
    docs = await db.events.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    doc = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    return doc


@api.post("/events/{event_id}/book")
async def book_event(event_id: str, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"event_id": event_id})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    if ev.get("spots_left", 0) <= 0:
        raise HTTPException(status_code=400, detail="Sem vagas disponíveis")
    existing = await db.bookings.find_one({"event_id": event_id, "user_id": user["user_id"]})
    if existing:
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


@api.get("/bookings/me")
async def my_bookings(user: dict = Depends(get_current_user)):
    docs = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    return docs


@api.get("/partnerships", response_model=List[Partnership])
async def list_partnerships(tier: Optional[str] = None):
    query: dict = {}
    if tier in ("open", "black"):
        query["tier"] = tier
    docs = await db.partnerships.find(query, {"_id": 0}).to_list(200)
    return docs


@api.post("/subscription/checkout")
async def checkout(payload: CheckoutIn, user: dict = Depends(get_current_user)):
    """Mocked Scout Black checkout. Activates is_black=True instantly."""
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


# ----------------- Seed Data -----------------
SEED_SPOTS = [
    {"spot_id": "sp_001", "title": "Ferrari 458 Spider", "image": "https://images.unsplash.com/photo-1627667928346-5fc86d099a5c", "region": "Centro", "price_type": "Gratuito", "category": "Desportivos", "location_name": "Cascais Marina", "lat": 38.6979, "lng": -9.4215, "description": "Avistamento raro à beira-mar.", "live": True},
    {"spot_id": "sp_002", "title": "Nissan Skyline R34", "image": "https://images.pexels.com/photos/18320398/pexels-photo-18320398.jpeg", "region": "Norte", "price_type": "Gratuito", "category": "JDM", "location_name": "Porto - Zona Industrial", "lat": 41.1496, "lng": -8.6109, "description": "JDM legend in pristine condition.", "live": False},
    {"spot_id": "sp_003", "title": "Porsche 911 Carrera RS", "image": "https://images.unsplash.com/photo-1672024110512-f7028b49db28", "region": "Sul", "price_type": "Pago", "category": "Clássicos", "location_name": "Loulé Concours", "lat": 37.1391, "lng": -8.0237, "description": "Clássico de coleção em exposição.", "live": False},
    {"spot_id": "sp_004", "title": "Ford Mustang Shelby GT500", "image": "https://images.unsplash.com/photo-1618866157430-b4d2e6a8800b", "region": "Centro", "price_type": "Gratuito", "category": "Americanos", "location_name": "Lisboa - Parque das Nações", "lat": 38.7681, "lng": -9.0954, "description": "Muscle car em encontro mensal.", "live": True},
    {"spot_id": "sp_005", "title": "Toyota Supra MK4", "image": "https://images.pexels.com/photos/18320398/pexels-photo-18320398.jpeg", "region": "Centro", "price_type": "Gratuito", "category": "JDM", "location_name": "Lisboa - 25 de Abril", "lat": 38.7136, "lng": -9.1772, "description": "Lendário 2JZ em ação.", "live": False},
    {"spot_id": "sp_006", "title": "Lamborghini Huracán", "image": "https://images.unsplash.com/photo-1627667928346-5fc86d099a5c", "region": "Ilhas", "price_type": "Pago", "category": "Desportivos", "location_name": "Madeira - Funchal", "lat": 32.6669, "lng": -16.9241, "description": "Evento exclusivo na ilha.", "live": False},
]

SEED_EVENTS = [
    {
        "event_id": "ev_001",
        "title": "Track Day Estoril - Exclusive Edition",
        "type": "Track Day",
        "image": "https://images.pexels.com/photos/9284135/pexels-photo-9284135.jpeg",
        "date": "2024-10-09",
        "time_start": "09:00",
        "time_end": "18:00",
        "price": 145.0,
        "location_name": "Autódromo do Estoril, Cascais",
        "lat": 38.7506,
        "lng": -9.3937,
        "spots_left": 24,
        "spots_total": 50,
        "description": "Prepare o seu motor para uma experiência inesquecível no icónico traçado do Estoril. Esta edição exclusiva foi desenhada para condutores que procuram o equilíbrio perfeito entre adrenalina e técnica. Inclui acesso total ao paddock, catering premium e sessões de briefing com pilotos profissionais.",
        "organizer": "Estoril Experience",
        "tags": ["High Speed", "Catering", "Open Track"],
        "live": True,
        "exclusive": True,
    },
    {
        "event_id": "ev_002",
        "title": "Rali Histórico de Sintra",
        "type": "Rally",
        "image": "https://images.pexels.com/photos/3525540/pexels-photo-3525540.jpeg",
        "date": "2024-10-14",
        "time_start": "09:00",
        "time_end": "17:00",
        "price": 0.0,
        "location_name": "Vila de Sintra",
        "lat": 38.7972,
        "lng": -9.3905,
        "spots_left": 12,
        "spots_total": 30,
        "description": "Rali clássico pelas estradas sinuosas da Serra de Sintra.",
        "organizer": "Sintra Classic Club",
        "tags": ["Classic", "Mountain"],
        "live": False,
        "exclusive": False,
    },
    {
        "event_id": "ev_003",
        "title": "JDM Night Porto",
        "type": "Meet",
        "image": "https://images.unsplash.com/photo-1661840244226-2636d82a4035",
        "date": "2024-10-21",
        "time_start": "22:00",
        "time_end": "02:00",
        "price": 10.0,
        "location_name": "Porto - Zona Industrial",
        "lat": 41.1779,
        "lng": -8.6291,
        "spots_left": 80,
        "spots_total": 200,
        "description": "Encontro noturno dedicado à cultura JDM. Música, neon e o melhor do Japão tunado.",
        "organizer": "Porto Drift Crew",
        "tags": ["Night", "JDM"],
        "live": False,
        "exclusive": False,
    },
    {
        "event_id": "ev_004",
        "title": "Supercar Sunday Cascais",
        "type": "Concours",
        "image": "https://images.pexels.com/photos/9284135/pexels-photo-9284135.jpeg",
        "date": "2024-10-29",
        "time_start": "10:00",
        "time_end": "14:00",
        "price": 0.0,
        "location_name": "Cascais Marina",
        "lat": 38.6979,
        "lng": -9.4215,
        "spots_left": 35,
        "spots_total": 100,
        "description": "Domingo com o melhor da exotic culture - Ferraris, Lambos, Paganis.",
        "organizer": "Cascais Auto Club",
        "tags": ["Exotic", "Marina"],
        "live": False,
        "exclusive": False,
    },
    {
        "event_id": "ev_005",
        "title": "Aero-Dynamic Testing Phase",
        "type": "Track Day",
        "image": "https://images.unsplash.com/photo-1672024110512-f7028b49db28",
        "date": "2024-10-09",
        "time_start": "09:00",
        "time_end": "11:30",
        "price": 89.0,
        "location_name": "Silverstone Circuit - Main Track",
        "lat": 52.0786,
        "lng": -1.0169,
        "spots_left": 18,
        "spots_total": 30,
        "description": "Sessão técnica de aerodinâmica em pista.",
        "organizer": "SCOUT Labs",
        "tags": ["Technical", "Pro"],
        "live": False,
        "exclusive": True,
    },
    {
        "event_id": "ev_006",
        "title": "Midnight Run Photo Shoot",
        "type": "Meet",
        "image": "https://images.unsplash.com/photo-1661840244226-2636d82a4035",
        "date": "2024-10-09",
        "time_start": "18:00",
        "time_end": "20:00",
        "price": 25.0,
        "location_name": "Lisboa - Marquês",
        "lat": 38.7253,
        "lng": -9.1500,
        "spots_left": 8,
        "spots_total": 20,
        "description": "Sessão fotográfica nocturna com fotógrafo profissional.",
        "organizer": "SCOUT Lens",
        "tags": ["Photography", "Night"],
        "live": False,
        "exclusive": False,
    },
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


async def seed():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.spots.create_index("spot_id", unique=True)
    await db.events.create_index("event_id", unique=True)
    await db.partnerships.create_index("partnership_id", unique=True)

    # Seed reference data
    for s in SEED_SPOTS:
        await db.spots.update_one({"spot_id": s["spot_id"]}, {"$set": s}, upsert=True)
    for e in SEED_EVENTS:
        await db.events.update_one({"event_id": e["event_id"]}, {"$set": e}, upsert=True)
    for p in SEED_PARTNERSHIPS:
        await db.partnerships.update_one({"partnership_id": p["partnership_id"]}, {"$set": p}, upsert=True)

    # Seed admin / demo user
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    now = datetime.now(timezone.utc).isoformat()
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Arthur Shelby",
            "password_hash": hash_password(admin_password),
            "auth_provider": "email",
            "role": "admin",
            "is_black": True,
            "points": 1250,
            "license_id": "S-992-UK",
            "picture": None,
            "created_at": now,
        })
    else:
        # Re-sync password if changed in env
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    logger.info("SCOUT seed complete.")


@app.on_event("startup")
async def on_startup():
    await seed()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "SCOUT", "status": "live", "version": "1.0.0"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
