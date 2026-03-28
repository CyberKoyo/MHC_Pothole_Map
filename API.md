# Pothole Tracker API — how to call it

## Run the server

From the project root (with your virtualenv activated and dependencies installed):

```bash
python main_api.py
```

Default base URL: **`http://127.0.0.1:8000`**

Interactive docs (Swagger UI): **`http://127.0.0.1:8000/docs`**

---

## Conventions

- **`address`** is the natural primary key: unique per pothole. Send it in JSON on create and in the URL for single-resource routes.
- **URL-encoding:** In paths, encode special characters in `address` (e.g. spaces → `%20`). Example: `123 Main St` → `123%20Main%20St`.
- **Trailing slashes:** Paths are defined with a trailing slash where noted (`/potholes/`, `/stats/`). Using the exact path avoids redirects.
- **JSON:** Use `Content-Type: application/json` for bodies.

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API running check |

```bash
curl -s http://127.0.0.1:8000/
```

---

## Potholes

### Create

| Method | Path | Body |
|--------|------|------|
| POST | `/potholes/` | JSON (see below) |

**Body (`PotholeCreate`):**

| Field | Type | Required |
|-------|------|----------|
| `address` | string | yes (unique) |
| `latitude` | number | yes |
| `longitude` | number | yes |
| `location_description` | string | no |

**Responses:** **200** with a full pothole object on success. **409** if `address` already exists.

```bash
curl -s -X POST http://127.0.0.1:8000/potholes/ \
  -H 'Content-Type: application/json' \
  -d '{"address":"123 Main St","latitude":40.7128,"longitude":-74.0060,"location_description":"near hall"}'
```

### List

| Method | Path | Query parameters |
|--------|------|------------------|
| GET | `/potholes/` | `skip` (default 0), `limit` (1–1000, default 100), `min_occurrences` (default 0) |

```bash
curl -s 'http://127.0.0.1:8000/potholes/?skip=0&limit=10&min_occurrences=1'
```

### Get one (by address)

| Method | Path |
|--------|------|
| GET | `/potholes/{address}` |

**404** if not found.

```bash
curl -s http://127.0.0.1:8000/potholes/123%20Main%20St
```

### Update (partial)

| Method | Path | Body |
|--------|------|------|
| PUT | `/potholes/{address}` | JSON (all fields optional) |

**Body (`PotholeUpdate`):** any of `location_description`, `last_reported` (ISO datetime string), `occurrences`.

```bash
curl -s -X PUT http://127.0.0.1:8000/potholes/123%20Main%20St \
  -H 'Content-Type: application/json' \
  -d '{"occurrences":3}'
```

### Report again (increment count)

| Method | Path |
|--------|------|
| POST | `/potholes/{address}/report` |

Response includes `message` and updated `occurrences`.

```bash
curl -s -X POST http://127.0.0.1:8000/potholes/123%20Main%20St/report
```

### Delete

| Method | Path |
|--------|------|
| DELETE | `/potholes/{address}` |

```bash
curl -s -X DELETE http://127.0.0.1:8000/potholes/123%20Main%20St
```

---

## Stats

| Method | Path |
|--------|------|
| GET | `/stats/` |

Returns JSON: `total_potholes`, `total_occurrences`, `average_occurrences`.

```bash
curl -s http://127.0.0.1:8000/stats/
```

---

## Response shape (single pothole)

Example fields returned for one pothole:

| Field | Type |
|-------|------|
| `address` | string |
| `latitude` | number |
| `longitude` | number |
| `location_description` | string or null |
| `first_reported` | string (ISO datetime) |
| `last_reported` | string (ISO datetime) |
| `occurrences` | integer |

---

## HTTPie examples

```bash
http POST http://127.0.0.1:8000/potholes/ \
  address="123 Main St" latitude:=40.7128 longitude:=-74.0060

http GET http://127.0.0.1:8000/potholes/

http GET http://127.0.0.1:8000/potholes/123%20Main%20St
```
