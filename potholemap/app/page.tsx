"use client"
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Footer from './components/footer';
import ReportModal from './components/reportModal';
import { RequestGeolocation } from '@/components/RequestGeolocation';
import Header from './components/header';

const API_BASE = 'http://localhost:8000';

export type Pothole = {
  id: number;
  latitude: number;
  longitude: number;
  location_description?: string | null;
  occurrences: number;
};

// Dynamically import the map so it doesn't break SSR
const MapArea = dynamic(() => import('./components/mapArea'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-500 font-semibold animate-pulse">
      Loading Map...
    </div>
  ),
});

export default function Home() {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([40.7128, -74.006]);
  const [potholes, setPotholes] = useState<Pothole[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/potholes/?limit=1000`)
      .then((res) => res.json())
      .then((data: Pothole[]) => setPotholes(data))
      .catch((err) => console.error('Failed to load potholes:', err));
  }, []);

  const addPothole = useCallback((pothole: Pothole) => {
    setPotholes((prev) => [...prev, pothole]);
  }, []);

  return (
    // h-[100dvh] is crucial for mobile: it accounts for the dynamic browser UI bars (like Safari's address bar)
    <main className="flex flex-col h-[100dvh] w-full overflow-hidden bg-white">
      <Header />
      
      <RequestGeolocation
        requestOnMount
        onLocationFound={(lat, lng) => setMarkerPosition([lat, lng])}
      />
      
      {/* Map Section - Takes up all available space */}
      <div className="flex-grow relative w-full h-full">
        <MapArea markerPosition={markerPosition} setMarkerPosition={setMarkerPosition} potholes={potholes} />
        <ReportModal mapLocation={markerPosition} onPotholeAdded={addPothole} />
      </div>

      {/* Footer Section */}
      <Footer />
      
    </main>
  );
}
