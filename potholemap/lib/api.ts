const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type Pothole = {
  address: string;
  latitude: number;
  longitude: number;
  location_description: string | null;
  first_reported: string;
  last_reported: string;
  occurrences: number;
};

export type PotholeCreate = {
  address: string;
  latitude: number;
  longitude: number;
  location_description?: string | null;
};

export async function fetchPotholes(): Promise<Pothole[]> {
  const r = await fetch(`${BASE}/potholes/`);
  if (!r.ok) {
    throw new Error(`Could not load potholes (${r.status})`);
  }
  return r.json();
}

export async function createPotholeReport(
  body: PotholeCreate,
): Promise<Pothole> {
  const r = await fetch(`${BASE}/potholes/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 409) {
    let detail = "A pothole with this address already exists.";
    try {
      const d = (await r.json()) as { detail?: unknown };
      if (typeof d.detail === "string") detail = d.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try {
      const d = (await r.json()) as { detail?: unknown };
      if (typeof d.detail === "string") msg = d.detail;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return r.json();
}
