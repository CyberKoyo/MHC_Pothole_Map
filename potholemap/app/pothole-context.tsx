"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { fetchPotholes, type Pothole } from "@/lib/api";

type PotholeMapContextValue = {
  markerPosition: [number, number];
  setMarkerPosition: (pos: [number, number]) => void;
  potholes: Pothole[];
  refreshPotholes: () => Promise<void>;
  loading: boolean;
  loadError: string | null;
};

const PotholeMapContext = createContext<PotholeMapContextValue | null>(null);

export function PotholeMapProvider({ children }: { children: ReactNode }) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([
    40.7128, -74.006,
  ]);
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshPotholes = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const list = await fetchPotholes();
      setPotholes(list);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Failed to load potholes from API.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPotholes();
  }, [refreshPotholes]);

  return (
    <PotholeMapContext.Provider
      value={{
        markerPosition,
        setMarkerPosition,
        potholes,
        refreshPotholes,
        loading,
        loadError,
      }}
    >
      {children}
    </PotholeMapContext.Provider>
  );
}

export function usePotholeMap() {
  const ctx = useContext(PotholeMapContext);
  if (!ctx) {
    throw new Error("usePotholeMap must be used within PotholeMapProvider");
  }
  return ctx;
}
