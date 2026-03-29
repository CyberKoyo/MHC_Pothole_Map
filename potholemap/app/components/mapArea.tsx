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

// 1. Child component to handle map clicks for pin placement
function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      console.log("📍 Pin dropped at Lat:", e.latlng.lat, "Lng:", e.latlng.lng);
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker position={position} />
  );
}

const potholeIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.45)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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
        const size = count < 10 ? 36 : count < 50 ? 48 : 60;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:rgba(220,38,38,0.85);
            border:3px solid white;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:${size < 48 ? 13 : 15}px;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
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
      <div className="overflow-hidden rounded-lg bg-slate-100">
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
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none"
            aria-label="Next image"
          >
            ›
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

// Detail modal shown when a pothole marker is tapped
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-600">Reported Pothole</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Images */}
        {loadingImages ? (
          <div className="w-full h-20 flex items-center justify-center text-slate-400 text-sm animate-pulse">
            Loading photos…
          </div>
        ) : imageUrls.length > 0 ? (
          <ImageCarousel imageUrls={imageUrls} />
        ) : (
          <p className="text-slate-400 text-sm text-center py-2">No photos attached.</p>
        )}

        {/* Info */}
        <div className="flex flex-col gap-1 text-sm text-slate-700">
          {pothole.location_description && (
            <p>{pothole.location_description}</p>
          )}
          <p className="text-slate-500">
            Reported{" "}
            <span className="font-semibold text-slate-700">
              {occurrences} time{occurrences !== 1 ? "s" : ""}
            </span>
          </p>
        </div>

        {/* Report again */}
        <button
          onClick={handleReportAgain}
          disabled={reporting}
          className="w-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
        >
          {reporting ? "Reporting…" : "I've seen this pothole too"}
        </button>

        {/* Admin action */}
        {isAdmin && (
          <button
            onClick={() => onDelete(pothole.id)}
            className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold py-3 rounded-xl transition-all"
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
        alert("Pothole resolved!");
        setSelectedPothole(null);
        window.location.reload();
      } else {
        alert("Unauthorized or error occurred.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handlePotholeClick = useCallback((p: Pothole) => {
    setSelectedPothole(p);
    setMarkerPosition([p.latitude, p.longitude]);
  }, [setMarkerPosition]);

  return (
    <div className="w-full h-full relative z-0">
      {/* Live coordinate display */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white px-4 py-2 rounded-full shadow-md border border-slate-200 pointer-events-none">
        <p className="text-xs font-mono text-slate-700">
          Lat: {markerPosition[0].toFixed(4)} | Lng:{" "}
          {markerPosition[1].toFixed(4)}
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
