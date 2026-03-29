<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Project digest — MHC Pothole Map

Read this file instead of exploring the whole repo. It is the authoritative agent context document.

---

## Purpose

Crowdsourced pothole map (NYC-oriented). Users view potholes on a Leaflet map, report new ones by dropping a pin or using GPS, attach photos, and "report again" to bump an occurrence counter. Admins log in to get a token and can delete (resolve) potholes.

---

## Monorepo layout

```
MHC_Pothole_Map/
├── API/
│   ├── main_api.py        # FastAPI app — the entire backend
│   ├── requirements.txt
│   └── uploads/           # uploaded pothole images (gitignored)
├── potholemap/            # Next.js frontend (this directory)
│   ├── app/               # App Router — all pages and components
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── components/
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       ├── mapArea.tsx
│   │       └── reportModal.tsx
│   ├── components/
│   │   └── RequestGeolocation.tsx
│   ├── next.config.ts
│   └── .env.local.example
├── HOW_TO_RUN.md          # authoritative local dev guide
├── render.yaml            # Render deploy config for the API
└── potholes.db            # SQLite DB — gitignored, created at runtime
```

> `HOW_TO_RUN.md` references `API.md` and `backend/app.py` — those files **do not exist**. Ignore those references.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 (no `tailwind.config.ts` — configured via `globals.css` + PostCSS only) |
| Map | Leaflet, `leaflet.markercluster`, `react-leaflet` |
| Backend | FastAPI, SQLAlchemy 2, SQLite, Pydantic v2, Uvicorn |
| Geocoding | OpenStreetMap Nominatim (reverse geocoding in `main_api.py`) |
| Deploy | Render (API only, via `render.yaml`) |
| Tests | None |

---

## Frontend file map

All routes live under `potholemap/app/` (Next.js App Router). There is no `src/` directory.

| File | Role |
|------|------|
| `app/page.tsx` | Single route `/` — mounts all child components |
| `app/layout.tsx` | Root layout |
| `app/globals.css` | Tailwind v4 import, CSS variables, mobile tap/input tweaks |
| `app/components/header.tsx` | Admin login/logout form; stores `access_token` in `localStorage` and sends it as the `access_token` request header on admin actions |
| `app/components/mapArea.tsx` | Leaflet map, marker clustering (imperative `L.markerClusterGroup`), pothole detail modal, admin delete button |
| `app/components/reportModal.tsx` | Floating report FAB, report form, optional photo upload, GPS flow |
| `app/components/footer.tsx` | Footer |
| `components/RequestGeolocation.tsx` | Centers map on user's GPS fix at mount; used from `page.tsx` with `requestOnMount` prop |

No `lib/`, `hooks/`, or `utils/` directories exist.

---

## Backend API endpoints

All defined in `API/main_api.py`. CORS is `*`. Swagger UI at `http://localhost:8000/docs`.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | — | Health check |
| POST | `/login` | — | Body: `{email, password}` → `{access_token, token_type}` |
| GET | `/potholes/` | — | Query params: `skip` (int), `limit` (1–1000), `borough`, `zip_code`, `address`, `min_occurrences`, `max_occurrences`, `sort_by_frequency` (bool) |
| POST | `/potholes/` | — | Body: `{latitude, longitude, address?, zip_code?, borough?, location_description?, severity?}`; Nominatim fills address fields if omitted |
| PUT | `/potholes/{id}` | Admin | Header `access_token`; body: any subset of `PotholeUpdate` fields |
| POST | `/potholes/{id}/report` | — | Increments `occurrences` and updates `last_reported` |
| DELETE | `/potholes/{id}` | Admin | Header `access_token`; returns 204 |
| POST | `/potholes/{id}/images` | — | Multipart `files` (list); returns `{uploaded: ["/uploads/…"]}` |
| GET | `/potholes/{id}/images` | — | Returns array of `/uploads/{filename}` paths |
| GET | `/stats/` | — | Returns `{total_potholes, total_occurrences, average_occurrences}` |

Static files: `/uploads/**` served directly from `API/uploads/`.

**Admin auth:** the backend uses `APIKeyHeader(name="access_token")` and compares the value to the `ADMIN_TOKEN` env var. Send it as a plain header named `access_token`, not as `Authorization: Bearer`.

---

## Database schema

SQLAlchemy declarative; no Alembic or migration files. Tables are created with `Base.metadata.create_all()` on API startup.

**`potholes`**
- `id` (PK), `latitude`, `longitude`
- `address`, `zip_code`, `borough`, `location_description`
- `severity` — **not a separate DB column**; embedded into `location_description` by `_compose_location_description()` in `main_api.py`
- `occurrences` (int, default 1), `first_reported`, `last_reported` (datetime)

**`pothole_images`**
- `id` (PK), `pothole_id` (FK → `potholes.id`), `filename`

---

## Environment variables

### Frontend (`potholemap/.env.local`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE` | API origin used by the browser | `http://localhost:8000` (hardcoded fallback in each component) |
| `ALLOWED_DEV_ORIGINS` | Comma-separated IPs allowed to load Next.js dev assets cross-origin (set in `next.config.ts`) | — |

Template: `potholemap/.env.local.example`

### Backend (process env or Render dashboard)

| Variable | Purpose | Default in code |
|----------|---------|----------------|
| `ADMIN_EMAIL` | Admin login email | `admin@example.com` |
| `ADMIN_PASSWORD` | Admin login password | `adminpassword` |
| `ADMIN_TOKEN` | Shared token returned on login and verified on protected routes | `supersecrettoken` |
| `DB_PATH` | SQLite file path | `potholes.db` next to `main_api.py` |

---

## How to run locally

See `HOW_TO_RUN.md` for the full guide. Quick version:

```bash
# Terminal 1 — backend
python -m venv .venv && source .venv/bin/activate
pip install -r API/requirements.txt
python API/main_api.py          # → http://localhost:8000

# Terminal 2 — frontend
cd potholemap
npm install
npm run dev                     # → http://localhost:3000
```

For testing from a phone/other device, set `NEXT_PUBLIC_API_BASE` and `ALLOWED_DEV_ORIGINS` in `potholemap/.env.local` to your machine's LAN or Tailscale IP, then restart the dev server.

---

## Key conventions and gotchas

- **Leaflet requires `ssr: false`** — any component that imports Leaflet must be loaded with `dynamic(() => import('…'), { ssr: false })`. SSR will crash otherwise.
- **`NEXT_PUBLIC_API_BASE` is not centralized** — it is copy-pasted with a `?? 'http://localhost:8000'` fallback in `header.tsx`, `mapArea.tsx`, `reportModal.tsx`, and `page.tsx`. Add a shared `lib/api.ts` before adding any new fetch calls, or mirror the pattern exactly.
- **Tailwind v4** — there is no `tailwind.config.ts`. All theme customization goes in `app/globals.css` or the PostCSS config.
- **`severity` is not a DB column** — it is baked into `location_description` on write via `_compose_location_description()`. The frontend sends `severity` in the POST body; the backend merges it. Do not add a `severity` column without updating that function.
- **Marker clustering is imperative** — `mapArea.tsx` uses `L.markerClusterGroup()` inside `useMap()` because `react-leaflet` v5 has no official cluster component. Keep cluster logic inside that component.
- **SQLite DB location** — the database is created in the same directory as `main_api.py` (i.e., `API/potholes.db`). Root-level `potholes.db` and `API/potholes.db` are both gitignored.
- **No test suite** — there are no test files and no test script in `package.json`. Add tests in a `__tests__/` or `*.test.ts` convention if needed.
