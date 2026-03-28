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

The app talks to the API at `http://127.0.0.1:8000` by default (see `potholemap/lib/api.ts`). CORS in `main_api.py` allows `localhost` / `127.0.0.1` on any port, so a different dev port is fine.

---

## Optional: custom API URL

If the API is not at `127.0.0.1:8000`, set this before `npm run dev`:

```bash
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

(Windows CMD: `set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.)

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
