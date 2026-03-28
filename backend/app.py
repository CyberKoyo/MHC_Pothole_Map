"""Minimal Flask API backed by SQLite."""

import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request

# DB file lives next to this script (easy to find, good for dev)
DB_PATH = Path(__file__).resolve().parent / "app.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS potholes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                note TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )


app = Flask(__name__)


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/potholes")
def list_potholes():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, lat, lng, note, created_at FROM potholes ORDER BY id DESC"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/potholes")
def create_pothole():
    data = request.get_json(silent=True) or {}
    try:
        lat = float(data["lat"])
        lng = float(data["lng"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "lat and lng are required numbers"}), 400
    note = data.get("note")
    if note is not None and not isinstance(note, str):
        return jsonify({"error": "note must be a string"}), 400

    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO potholes (lat, lng, note) VALUES (?, ?, ?)",
            (lat, lng, note),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute(
            "SELECT id, lat, lng, note, created_at FROM potholes WHERE id = ?",
            (new_id,),
        ).fetchone()

    return jsonify(dict(row)), 201


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="127.0.0.1", port=5000)
