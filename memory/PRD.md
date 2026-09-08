# ABHYUDAYA-CHATURBHUJ — Product Requirements Document

**Tagline:** Solving civic problems through crowdsourcing and AI.
**Type:** Civic-tech mobile MVP (Smart India Hackathon prototype)
**Stack:** React Native (Expo Router) · FastAPI · MongoDB (motor) · JWT auth · Emergent Object Storage · Leaflet/OpenStreetMap

## Original problem statement
Citizens report civic issues (potholes, garbage, streetlights, water, drainage, traffic, pollution, infrastructure) with description, category, severity, image and geo-location. A rule-based "System Analysis" classifies the issue and suggests government action. Issues appear on a map. Community upvotes, adds suggestions, and makes simulated donations. Government employees prioritise issues, update status, and see "Recurring Issue Detection" (civic intelligence). Location-aware feed. Role-separated auth (government cannot self-register).

## Architecture
- **Backend** (`/app/backend`): modular services — `config.py`, `security.py` (bcrypt + JWT + role deps), `ai_service.py` (rule-based classifier, swappable via AI_PROVIDER), `recurring_service.py` (geo+time clustering), `priority.py` (transparent scoring), `storage_service.py` (Emergent object storage), `seed.py` (demo users + 16 issues), `geo.py` (haversine). Routes in `server.py` all prefixed `/api`. UUID string ids; soft-delete via `deleted_at`.
- **Frontend** (`/app/frontend`): expo-router groups `(citizen)` and `(gov)` bottom-tab layouts with role guards; shared `issue/[id]`; `map-picker` modal. Theme in `src/theme.ts` (monochrome + red accent). React Query for all server data. Reusable `LeafletMap` (native WebView + web iframe).

## User personas
1. **Citizen** — reports problems, browses nearby issues, upvotes, suggests solutions, donates.
2. **Government employee** — reviews/prioritises issues, updates status, reads suggestions, monitors recurring hotspots.
3. **Student/Faculty/Expert** (citizen sub-type) — contributes solution suggestions.

## Core requirements (static)
- Role-separated JWT auth; government provisioned via seed only.
- Full report workflow: description, category, severity (or auto), image upload, location (GPS + map picker), system analysis, submit.
- Interactive maps with real backend issue markers.
- Upvotes (dedup), community suggestions (gov "useful"), prototype donations.
- Recurring problem detection + priority classification.
- Location-aware citizen feed (Nearby/City/State/All).
- Government dashboard + insights (charts + recurring clusters).

## Implemented (2026-06)
- ✅ Auth (login/register/logout, role separation, demo accounts), 35/35 backend tests pass.
- ✅ Citizen: Home, Explore (search/scope/category + list/map toggle), Report (full form + live system analysis preview + image upload + GPS/map-picker), My Issues (status filters), Profile.
- ✅ Issue details: hero + scrim, description, mini-map, System Analysis, upvote, community funding + donate modal, suggestions + add modal, government status control.
- ✅ Government: Dashboard (metrics + priority), Map (filters), Issues (priority/recent sort + filters), Insights (recurring cards + bar charts + trend), Profile.
- ✅ Recurring detection returns 2 seeded clusters (5 potholes Bengaluru, 4 garbage Mumbai).
- ✅ 16 demo issues across Bengaluru/Mumbai/Delhi/Chennai with valid coordinates.

## Backlog (prioritized)
- **P1:** Real AI provider (Gemini) behind AI_PROVIDER env; reverse-geocode fallback via Nominatim on web.
- **P1:** Issue detail deep-link for recurring "underlying reports" list (currently opens first report).
- **P2:** Notifications when status changes; department routing; export/report PDF for officials.
- **P2:** Offline queueing of reports; image compression before upload.

## Next tasks
- Wire optional Gemini analysis; add per-cluster report list screen; add status-change history timeline.
