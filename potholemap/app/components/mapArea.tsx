'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function MapArea() {
  // Fix for Next.js missing Leaflet marker icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // Set default center (e.g., NYC coordinates)
  const position: [number, number] = [40.7128, -74.0060]; 

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={position} 
        zoom={13} 
        className="w-full h-full"
        zoomControl={false} // Turn off default zoom to save mobile screen space
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Example Pothole Marker */}
        <Marker position={[40.7128, -74.0060]}>
          <Popup>
            <strong className="text-red-600">Severe Pothole</strong> <br /> Watch your suspension here!
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}