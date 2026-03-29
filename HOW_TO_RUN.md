# How to run (development)

## Prerequisites

- **Python 3** (3.10+ recommended)
- **Node.js** (current LTS is fine; the app uses Next.js 16)

---

## 1. Backend — FastAPI + SQLite

From the **repository root**:

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r API/requirements.txt
python API/main_api.py
```

- **API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Database:** `potholes.db` is created next to `main_api.py` when the server runs.

Leave this process running while you work on the frontend.

---

## 2. Frontend — Next.js

In a **second terminal**, from the repo root:

```bash
cd potholemap
npm install
npm run dev
```

Open the URL Next prints (usually [http://localhost:3000](http://localhost:3000)).

The app talks to the API at `http://localhost:8000` by default. CORS in `main_api.py` allows all origins, so any port is fine.

---

## Testing from a phone or another device

The dev server is accessible from other devices on your network (LAN, Tailscale, etc.), but you need to configure two env vars so the app knows where to find the API and so Next.js allows cross-origin dev traffic.

**1. Copy the env template:**

```bash
cp potholemap/.env.local.example potholemap/.env.local
```

**2. Find your machine's IP** (the one the other device can reach — LAN or Tailscale):

```bash
# Linux / macOS
ip a        # look for your LAN (192.168.x.x) or Tailscale (100.x.x.x) address
```

**3. Edit `potholemap/.env.local`** and fill in that IP:

```
NEXT_PUBLIC_API_BASE=http://<your-ip>:8000
ALLOWED_DEV_ORIGINS=<your-ip>
```

Example:
```
NEXT_PUBLIC_API_BASE=http://192.168.1.42:8000
ALLOWED_DEV_ORIGINS=192.168.1.42
```

**4. Restart the dev server** (`Ctrl-C` → `npm run dev`) — env vars are only read at startup.

**5. Open `http://<your-ip>:3000` on the other device.**

> `NEXT_PUBLIC_API_BASE` tells the browser where to send API requests.
> `ALLOWED_DEV_ORIGINS` tells Next.js to allow that IP to load dev JS chunks and HMR — without it the map will show "Loading…" forever.

---

## Quick checklist

| Step | What to run |
|------|-------------|
| Python deps | `pip install -r requirements.txt` (inside a venv) |
| API | `python main_api.py` → port **8000** |
| JS deps | `cd potholemap && npm install` |
| Web app | `npm run dev` → usually port **3000** |

---

## Other files

- **`API.md`** — HTTP routes, curl examples, and request/response shapes for the FastAPI server.
- **`backend/app.py`** — separate minimal Flask sample (different API shape and SQLite file). The **map app uses `main_api.py`**, not this Flask app, unless you wire it up yourself.
