# SCOUT — Automotive Intelligence (PRD)

## Original Problem Statement
"ve esta app e constroi a app, foi um prototipo que fiz no stitch
https://stitch.withgoogle.com/preview/6284725454176638332?node-id=c12d0a1d125a4c99ad5804cf5b207382"

User confirmed: mobile-first PWA, both email/password + Google auth, mocked Scout Black payment, free Leaflet/OpenStreetMap, Portuguese (PT) language, free improvements over prototype welcome.

## Architecture
- Backend: FastAPI + MongoDB (Motor) on :8001 with /api prefix
- Auth: JWT cookie (email/pwd) + Emergent Google Auth (session_token cookie) — unified `/api/auth/me`
- Frontend: React 19 + Tailwind + craco; mobile-first phone-frame layout (max-w 430px) with bottom nav
- Map: Leaflet + OpenStreetMap (free, no key)
- Fonts: Unbounded (display) + Manrope (body) + JetBrains Mono (tech labels)

## User Personas
1. **Pilot Member** — Free tier, books events, earns SCOUT points, sees open partnerships.
2. **Scout Black Member** — Premium tier, unlocked exclusive events, gold-tier partnerships, VIP access.
3. **Admin** — Manage seed (CRUD endpoints reserved for future).

## Core Requirements (static)
- Mobile PWA UX with bottom-tab navigation (Home, Spots, Mapa, Eventos, Perfil)
- Auth (email/pwd + Google), points balance, ranks
- Spots Feed with filters (Região, Preço, Categoria)
- Map of events/spots with markers
- Calendar of events with day-detail
- Event detail + booking
- Profile (license, points, partnerships)
- Settings (Profile, Notifications toggles, Security, About)
- Scout Black subscription page with mocked checkout (€29,99/mo, €79,99/qtr, €290/yr)

## What's been implemented (2026-01)
- ✅ Auth: register/login/logout/me/google-session, JWT + Emergent OAuth
- ✅ Splash with auto-redirect, Login (with Google + Apple-disabled), Register
- ✅ Dashboard with greeting, points, quick actions, partnerships, Black promo
- ✅ Spots Feed with search + bottom-sheet filters (Região/Preço/Categoria)
- ✅ Map (Leaflet OSM, dark-tiled) with red event markers + gold exclusive markers + spot markers + popup → event detail
- ✅ Calendar (Oct 2024 default to match seed data) with event dots and day list
- ✅ Event Detail with hero, stats, availability, organizer, book button → +50 SCOUT points
- ✅ Profile with avatar, points balance + progress, rank, partnerships, logout
- ✅ Settings: Profile (read-only), Notifications (persisted prefs), Security (UI + trusted devices), About
- ✅ Scout Black page with perks, black partnerships, subscribe CTA
- ✅ Checkout (mocked) - 3 plans + 5 methods + card form + success state activates is_black
- ✅ Partnerships full page (Open + Black with lock icons for non-members)
- ✅ Seed data: 6 spots, 6 events, 8 partnerships, admin user
- ✅ Backend tests pass (96%); CRITICAL Map fix (StrictMode removed for react-leaflet)

## Backlog (P0/P1/P2)
- P1: Add Forgot/Reset Password flow (UI placeholder exists)
- P1: Real Stripe integration (currently mocked) — when user provides Stripe key
- P1: Photo upload for spots ("Fotografa." pillar) — needs storage layer
- P2: Push notifications (PWA service worker)
- P2: Calendar default-to-current-month UX with empty state copy
- P2: Apple Pay button (currently disabled)
- P2: Friend system / live chat for events

## Deferred
- Production Google Maps (using free OSM)
- Multi-language (currently PT-PT only)
- Native iOS/Android via Expo

## Test Credentials
See /app/memory/test_credentials.md
