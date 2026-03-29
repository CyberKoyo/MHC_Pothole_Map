"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import type { Pothole } from "../page";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const SEVERITY_LABELS: Record<string, { label: string; class: string }> = {
  minor:    { label: "Minor",    class: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  moderate: { label: "Moderate", class: "bg-orange-100 text-orange-800 border-orange-200" },
  severe:   { label: "Severe",   class: "bg-red-100 text-red-800 border-red-200" },
};

// Handles map clicks to move the placement pin
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

  return <Marker position={position} />;
}

const potholeIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

// Native Leaflet cluster layer – react-leaflet v5 has no official cluster wrapper
function PotholeClusterLayer({
  potholes,
  onPotholeClick,
}: {
  potholes: Pothole[];
  onPotholeClick: (p: Pothole) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction(c) {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 56;
        const fontSize = size < 44 ? 13 : 15;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:rgba(220,38,38,0.88);
            border:2.5px solid white;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${fontSize}px;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            font-family:system-ui,sans-serif;
          ">${count}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    potholes.forEach((p) => {
      const marker = L.marker([p.latitude, p.longitude], { icon: potholeIcon });
      marker.on("click", () => onPotholeClick(p));
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      map.removeLayer(cluster);
    };
  }, [map, potholes, onPotholeClick]);

  return null;
}

// Image carousel inside the detail modal
function ImageCarousel({ imageUrls }: { imageUrls: string[] }) {
  const [current, setCurrent] = useState(0);

  if (imageUrls.length === 0) return null;

  const prev = () => setCurrent((i) => (i - 1 + imageUrls.length) % imageUrls.length);
  const next = () => setCurrent((i) => (i + 1) % imageUrls.length);

  return (
    <div className="relative w-full select-none">
      <div className="overflow-hidden rounded-xl bg-slate-100">
        <img
          src={imageUrls[current]}
          alt={`Pothole photo ${current + 1}`}
          className="w-full h-52 object-cover"
          draggable={false}
        />
      </div>

      {imageUrls.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            aria-label="Previous image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            aria-label="Next image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex justify-center gap-1.5 mt-2">
            {imageUrls.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-red-600" : "bg-slate-300"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Detail sheet shown when a pothole marker is tapped
function PotholeDetailModal({
  pothole,
  onClose,
  onDelete,
}: {
  pothole: Pothole;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [occurrences, setOccurrences] = useState(pothole.occurrences);
  const [reporting, setReporting] = useState(false);
  const isAdmin =
    typeof window !== "undefined" && !!localStorage.getItem("access_token");

  const severityConfig = pothole.severity ? SEVERITY_LABELS[pothole.severity] : null;

  async function handleReportAgain() {
    setReporting(true);
    try {
      const r = await fetch(`${API_BASE}/potholes/${pothole.id}/report`, { method: "POST" });
      if (r.ok) {
        const data = await r.json();
        setOccurrences(data.occurrences);
      }
    } finally {
      setReporting(false);
    }
  }

  useEffect(() => {
    setLoadingImages(true);
    fetch(`${API_BASE}/potholes/${pothole.id}/images`)
      .then((r) => r.json())
      .then((paths: string[]) =>
        setImageUrls(paths.map((p) => `${API_BASE}${p}`))
      )
      .catch(() => setImageUrls([]))
      .finally(() => setLoadingImages(false));
  }, [pothole.id]);

  return createPortal(
    <div
      className="fixed inset-0 z-[500] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col gap-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reported Pothole</h2>
            {pothole.location_description && (
              <p className="text-sm text-slate-500 mt-0.5">{pothole.location_description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Images */}
        {loadingImages ? (
          <div className="w-full h-20 flex items-center justify-center text-slate-400 text-sm animate-pulse">
            Loading photos…
          </div>
        ) : imageUrls.length > 0 ? (
          <ImageCarousel imageUrls={imageUrls} />
        ) : null}

        {/* Meta info row */}
        <div className="flex items-center gap-2 flex-wrap">
          {severityConfig && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${severityConfig.class}`}>
              {severityConfig.label}
            </span>
          )}
          <span className="text-sm text-slate-500">
            Reported{" "}
            <span className="font-semibold text-slate-700">
              {occurrences} time{occurrences !== 1 ? "s" : ""}
            </span>
          </span>
          {imageUrls.length === 0 && !loadingImages && (
            <span className="text-xs text-slate-400 ml-auto">No photos</span>
          )}
        </div>

        {/* Report again */}
        <button
          onClick={handleReportAgain}
          disabled={reporting}
          className="w-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
        >
          {reporting ? "Reporting…" : "I've seen this pothole too"}
        </button>

        {/* Admin: resolve */}
        {isAdmin && (
          <button
            onClick={() => onDelete(pothole.id)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold py-3 rounded-lg transition-all"
          >
            Mark as Resolved
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

type MapAreaProps = {
  markerPosition: [number, number];
  setMarkerPosition: (pos: [number, number]) => void;
  potholes: Pothole[];
};

export default function MapArea({
  markerPosition,
  setMarkerPosition,
  potholes,
}: MapAreaProps) {
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("access_token");

    if (!confirm("Are you sure you want to resolve and remove this pothole?"))
      return;

    try {
      const response = await fetch(`${API_BASE}/potholes/${id}`, {
        method: "DELETE",
        headers: {
          access_token: token || "",
        },
      });

      if (response.ok) {
        setSelectedPothole(null);
        window.location.reload();
      } else {
        alert("Unauthorized or error occurred.");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handlePotholeClick = useCallback(
    (p: Pothole) => {
      setSelectedPothole(p);
      setMarkerPosition([p.latitude, p.longitude]);
    },
    [setMarkerPosition]
  );

  return (
    <div className="w-full h-full relative z-0">
      {/* Coordinate chip */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-100 pointer-events-none">
        <p className="text-xs font-mono text-slate-500 tabular-nums">
          {markerPosition[0].toFixed(4)}, {markerPosition[1].toFixed(4)}
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

        <LocationMarker
          position={markerPosition}
          setPosition={setMarkerPosition}
        />

        <PotholeClusterLayer
          potholes={potholes}
          onPotholeClick={handlePotholeClick}
        />
      </MapContainer>

      {selectedPothole && (
        <PotholeDetailModal
          pothole={selectedPothole}
          onClose={() => setSelectedPothole(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
