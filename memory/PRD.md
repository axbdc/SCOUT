# SCOUT — Automotive Intelligence (PRD v2)

## Original Problem Statement
Build a mobile-first PWA based on a Stitch prototype, automotive events platform in PT-PT.

## Iterations
- **v1** — MVP with auth, spots+events, calendar, profile, Scout Black, partnerships
- **v2 (current)** — Spots removed (events-only), hidden admin area, paid event submission flow, photo gallery with mocked purchase, favorites, geolocation, .ics export, 3D premium card, PWA manifest

## Architecture
- Backend: FastAPI + MongoDB on :8001 with /api prefix
- Auth: JWT cookies (email/pwd) + Emergent Google Auth (session_token cookie)
- Frontend: React 19 + Tailwind + craco; mobile-first phone frame; bottom nav (member) / admin nav (admin)
- Map: Leaflet + OpenStreetMap (free)
- 3D: pure CSS perspective (no three.js dependency)

## User Personas
1. **Owner/Admin** — Real owner. Approves events, manages users, photos, sees stats/revenue.
2. **Member** — Books events, earns points, submits events (€10 fee), buys photos, can subscribe to Black.
3. **Scout Black Member** — VIP tier, exclusive partnerships, priority access.

## Implemented Features (v2)
- ✅ Hidden admin: same login form; admin email auto-redirects to /admin
- ✅ Admin Dashboard: stats (members, BLACK, events approved/pending/rejected, bookings, subs, revenue)
- ✅ Admin Events: tabs Pendentes/Aprovados/Rejeitados, approve/reject (with reason)/delete
- ✅ Admin Users: list, toggle BLACK, toggle ADMIN, delete (cannot self-delete)
- ✅ Admin Photos: select event, add photo (URL/photographer/car/price), delete
- ✅ "Modo Membro" button in admin → opens member view as the same admin user
- ✅ Spots collection dropped, all references removed
- ✅ Bottom nav: 4 tabs (Home/Eventos/Mapa/Perfil)
- ✅ Event submission flow: form → €10 mock payment → status=pending; payment_token single-use
- ✅ Required fields: title, type, categories, date/time, location+lat/lng, spots, organizer, description
- ✅ "Usar localização atual" auto-fill via geolocation
- ✅ Profile tabs: Reservados / Submetidos (com status colorido) / Favoritos
- ✅ Event detail tabs: Detalhes / Galeria
- ✅ Galeria: fotos com marca-de-água SCOUT em diagonal; comprar remove watermark e dá download HD
- ✅ Favoritos: heart toggle persistente
- ✅ Share: navigator.share API + clipboard fallback
- ✅ Calendário: default mês corrente; auto-jump para próximo mês com eventos se vazio
- ✅ Calendário export .ics (download via blob)
- ✅ Map: "Perto de mim" via geolocation, marker azul no utilizador
- ✅ Scout Black: 3D-tilting premium card (CSS perspective, segue rato)
- ✅ FAB "Submeter" flutuante em home/eventos/mapa
- ✅ PWA manifest.json (instalável)
- ✅ Backend tests: 24/24 passing

## Backend Endpoints (new in v2)
- POST /api/events/submission-fee
- POST /api/events/submit
- GET /api/events/me/submissions
- POST/DELETE /api/favorites/{event_id}
- GET /api/favorites/me
- GET /api/events/{id}/photos
- POST /api/photos/{id}/buy
- GET /api/photos/me
- /api/admin/* (stats, events approve/reject/delete, users patch/delete, photos add/delete)

## Backlog (P0/P1/P2)
- P1: Email notifications when event approved/rejected
- P1: Real Stripe integration (replace mocks)
- P1: Photo upload UI for admin (current uses URL field)
- P2: Sponsored/featured events
- P2: Comments per event
- P2: Multi-language (PT/EN)
- P2: Push notifications via service worker

## Test Credentials
See /app/memory/test_credentials.md

## v3 (current iteration)
- 🐛 FIXED: bottom nav era escondido para utilizadores admin em modo membro — agora sempre visível em rotas de membro
- ✅ FAB "Submeter" agora restrito apenas ao /calendar
- ✅ Detalhe de parceria (/partnerships/:id) com **código de barras** (CODE-128 SVG via react-barcode), instruções de uso, e bloqueio com upsell para parcerias BLACK
- ✅ Sistema de Pontos completo:
  - Ganhar: reservar (+50), confirmar presença "Eu Vou" (+10, uma vez por evento), comprar foto (+20), submissão aprovada (+200), subscrever Black (+500)
  - Gastar: 5 recompensas no catálogo (€5 OFF submissão, foto HD grátis, 1 mês Black, entrada evento até €30, voucher detailing)
  - /rewards com 3 tabs (Gastar/Ganhar/Histórico) + modal de resgate com barcode
- ✅ Botão "Eu Vou" no detalhe do evento + contagem de quem vai
- ✅ Modal de partilha com WhatsApp / Telegram / Email / X / Copiar link
- ✅ Admin Dashboard com **gráfico SVG de receita mensal** (stacked bars: Submissões/Subscrições/Fotos)
- ✅ Anti-farming: pontos de "Eu Vou" só uma vez por evento, +200 de aprovação só uma vez por submissão
- Tests: 40/40 backend passing, 100% frontend critical flows
