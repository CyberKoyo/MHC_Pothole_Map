"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Pothole } from "@/lib/api";
import { usePotholeMap } from "../pothole-context";

function InitialFitBounds({ potholes }: { potholes: Pothole[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || potholes.length === 0) return;
    const pts = potholes.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );
    map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 });
    fitted.current = true;
  }, [map, potholes]);

  return null;
}

function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker position={position}>
      <Popup>
        <strong className="text-red-600">Selected location</strong>
        <br />
        Report uses this pin. Tap the map to move it.
      </Popup>
    </Marker>
  );
}

export default function MapArea() {
  const {
    markerPosition,
    setMarkerPosition,
    potholes,
    loading,
    loadError,
  } = usePotholeMap();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet default icon patch
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="w-full h-full relative z-0">
      {loadError ? (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 shadow-md">
          {loadError}
          <span className="block text-amber-700 mt-1">
            Start the API:{" "}
            <code className="rounded bg-amber-100 px-1">python main_api.py</code>
          </span>
        </div>
      ) : null}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white px-4 py-2 rounded-full shadow-md border border-slate-200 pointer-events-none">
        <p className="text-xs font-mono text-slate-700">
          Pin: {markerPosition[0].toFixed(4)}, {markerPosition[1].toFixed(4)}
          {loading ? (
            <span className="ml-2 text-slate-500">· loading…</span>
          ) : null}
        </p>
      </div>

      <MapContainer
        center={[40.7128, -74.006]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InitialFitBounds potholes={potholes} />
        {potholes.map((p) => (
          <Marker key={p.address} position={[p.latitude, p.longitude]}>
            <Popup>
              <div className="text-sm min-w-[10rem]">
                <strong className="text-slate-800">{p.address}</strong>
                {p.location_description ? (
                  <p className="mt-1 text-slate-600">{p.location_description}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  Reports: {p.occurrences}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        <LocationMarker
          position={markerPosition}
          setPosition={setMarkerPosition}
        />
      </MapContainer>
    </div>
  );
}
