"use client";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import type { Pothole } from "../page";

// 1. Create a child component to handle map clicks
function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}) {
  // useMapEvents listens to map interactions
  useMapEvents({
    click(e) {
      // Log the exact coordinates to the browser console for debugging
      console.log("📍 Pin dropped at Lat:", e.latlng.lat, "Lng:", e.latlng.lng);

      // Update the state with the exact latitude and longitude clicked
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker position={position}>
      <Popup>
        <strong className="text-red-600">Selected Location</strong> <br />
        Ready to report a pothole here.
      </Popup>
    </Marker>
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
function PotholeClusterLayer({ potholes }: { potholes: Pothole[] }) {
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
      const desc = p.location_description
        ? `<br/>${p.location_description}`
        : "";
      marker.bindPopup(
        `<strong style="color:#dc2626">Reported Pothole</strong>${desc}<br/>
         <span style="color:#64748b;font-size:12px">
           Reported ${p.occurrences} time${p.occurrences !== 1 ? "s" : ""}
         </span>`
      );
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      map.removeLayer(cluster);
    };
  }, [map, potholes]);

  return null;
}

type MapAreaProps = {
  markerPosition: [number, number];
  setMarkerPosition: (pos: [number, number]) => void;
  potholes: Pothole[];
};

export default function MapArea({ markerPosition, setMarkerPosition, potholes }: MapAreaProps) {

  // Fix for Next.js missing Leaflet marker icons
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

  return (
    <div className="w-full h-full relative z-0">
      {/* A little floating UI to show the user the live coordinates */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white px-4 py-2 rounded-full shadow-md border border-slate-200 pointer-events-none">
        <p className="text-xs font-mono text-slate-700">
          Lat: {markerPosition[0].toFixed(4)} | Lng:{" "}
          {markerPosition[1].toFixed(4)}
        </p>
      </div>

      <MapContainer
        center={[40.7128, -74.006]} // Initial map center
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Interactive marker for selecting a location to report */}
        <LocationMarker
          position={markerPosition}
          setPosition={setMarkerPosition}
        />

        {/* Clustered pothole markers */}
        <PotholeClusterLayer potholes={potholes} />
      </MapContainer>
    </div>
  );
}
