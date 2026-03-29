"use client"
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Footer from './components/footer';
import ReportModal from './components/reportModal';
import FilterPanel, { DEFAULT_FILTERS, type FilterState } from './components/filterPanel';
import { RequestGeolocation } from '@/components/RequestGeolocation';
import Header from './components/header';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

export type Pothole = {
  id: number;
  latitude: number;
  longitude: number;
  location_description?: string | null;
  severity?: string | null;
  occurrences: number;
  borough?: string | null;
  deleted?: string | null;
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
  const [allPotholes, setAllPotholes] = useState<Pothole[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Re-fetch only when showDeleted changes (it determines which rows the API returns).
  useEffect(() => {
    const params = new URLSearchParams({ limit: '1000' });
    if (filters.showDeleted) params.set('include_deleted', 'true');
    fetch(`${API_BASE}/potholes/?${params}`)
      .then((res) => res.json())
      .then((data: Pothole[]) => setAllPotholes(data))
      .catch((err) => console.error('Failed to load potholes:', err));
  }, [filters.showDeleted]);

  // All other filtering is client-side so it's instant.
  const potholes = useMemo(() => {
    let list = allPotholes;
    if (!filters.showDeleted) list = list.filter((p) => !p.deleted);
    if (filters.boroughs.length > 0)
      list = list.filter((p) =>
        filters.boroughs.some((b) => p.borough?.toLowerCase().includes(b.toLowerCase()))
      );
    if (filters.minOccurrences !== '')
      list = list.filter((p) => p.occurrences >= (filters.minOccurrences as number));
    return list;
  }, [allPotholes, filters]);

  const addPothole = useCallback((pothole: Pothole) => {
    setAllPotholes((prev) => [...prev, pothole]);
  }, []);

  const handleOccurrenceUpdated = useCallback((id: number, newCount: number) => {
    setAllPotholes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, occurrences: newCount } : p))
    );
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
        <MapArea markerPosition={markerPosition} setMarkerPosition={setMarkerPosition} potholes={potholes} onOccurrenceUpdated={handleOccurrenceUpdated} />
        <FilterPanel filters={filters} onChange={setFilters} totalVisible={potholes.length} />
        <ReportModal mapLocation={markerPosition} onPotholeAdded={addPothole} />
      </div>

      {/* Footer Section */}
      <Footer />
      
    </main>
  );
}
