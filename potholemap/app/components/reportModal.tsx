'use client';
import { useState } from 'react';
import type { Pothole } from '../page';

type LocationSource = 'map' | 'gps';
type GpsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; latitude: number; longitude: number }
  | { status: 'error'; message: string };

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

type Props = {
  mapLocation: [number, number];
  onPotholeAdded: (pothole: Pothole) => void;
};

const fieldClass =
  'border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-slate-900 bg-white w-full';

const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

export default function ReportModal({ mapLocation, onPotholeAdded }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [locationSource, setLocationSource] = useState<LocationSource>('map');
  const [gps, setGps] = useState<GpsState>({ status: 'idle' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    // Reset input so the same file can be re-added after removal
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const activeLatitude  = locationSource === 'map' ? mapLocation[0] : (gps.status === 'ready' ? gps.latitude  : null);
  const activeLongitude = locationSource === 'map' ? mapLocation[1] : (gps.status === 'ready' ? gps.longitude : null);
  const locationReady   = activeLatitude !== null && activeLongitude !== null;

  function openModal() {
    setIsOpen(true);
    setSubmitState('idle');
    setDescription('');
    setSeverity('');
    setLocationSource('map');
    setGps({ status: 'idle' });
    setSelectedFiles([]);
  }

  function closeModal() {
    setIsOpen(false);
    setGps({ status: 'idle' });
    setSubmitState('idle');
    setSelectedFiles([]);
  }

  function requestGps() {
    setGps({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ status: 'ready', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => setGps({ status: 'error', message: err.message }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationReady) return;

    setSubmitState('submitting');
    try {
      const res = await fetch(`${API_BASE}/potholes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: activeLatitude,
          longitude: activeLongitude,
          location_description: description || undefined,
          severity: severity || undefined,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const newPothole: Pothole = await res.json();

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('files', file));
        await fetch(`${API_BASE}/potholes/${newPothole.id}/images`, {
          method: 'POST',
          body: formData,
        });
      }

      onPotholeAdded(newPothole);
      setSubmitState('success');
      setTimeout(closeModal, 1500);
    } catch (err) {
      console.error(err);
      setSubmitState('error');
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={openModal}
        aria-label="Report a pothole"
        className="absolute bottom-6 right-6 z-[400] bg-red-600 hover:bg-red-700 text-white rounded-full pl-4 pr-5 py-3.5 shadow-lg transition-all active:scale-95 flex items-center gap-2 font-semibold text-sm"
      >
        {/* Plus icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Report
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 p-6 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Report a Pothole</h2>
                <p className="text-sm text-slate-500 mt-0.5">Help keep your neighborhood safe.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Location source segmented control */}
            <div className="flex flex-col gap-2">
              <span className={labelClass}>Pin location</span>
              <div className="flex rounded-lg bg-slate-100 p-1 gap-1" role="group" aria-label="Location source">
                <button
                  type="button"
                  onClick={() => setLocationSource('map')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    locationSource === 'map'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Map pin
                </button>
                <button
                  type="button"
                  onClick={() => { setLocationSource('gps'); if (gps.status === 'idle') requestGps(); }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    locationSource === 'gps'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  My GPS
                </button>
              </div>

              {/* Location status row */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-600 min-h-[2.5rem] flex items-center gap-2">
                {locationSource === 'map' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true">
                      <path fillRule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
                    </svg>
                    <span className="font-mono text-xs">{mapLocation[0].toFixed(5)}, {mapLocation[1].toFixed(5)}</span>
                    <span className="text-slate-400 text-xs ml-auto">Tap map to move pin</span>
                  </>
                )}
                {locationSource === 'gps' && gps.status === 'loading' && (
                  <>
                    <svg className="w-4 h-4 animate-spin text-red-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Acquiring GPS fix&hellip;</span>
                  </>
                )}
                {locationSource === 'gps' && gps.status === 'ready' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                    <span className="font-mono text-xs">{gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}</span>
                  </>
                )}
                {locationSource === 'gps' && gps.status === 'error' && (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true">
                      <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-600 text-xs">{gps.message}</span>
                    <button type="button" onClick={requestGps} className="ml-auto text-xs text-red-600 font-medium hover:underline shrink-0">
                      Retry
                    </button>
                  </>
                )}
                {locationSource === 'gps' && gps.status === 'idle' && (
                  <span className="text-slate-400 text-xs">Waiting for GPS&hellip;</span>
                )}
              </div>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Description */}
              <div>
                <label htmlFor="report-description" className={labelClass}>
                  Location description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="report-description"
                  type="text"
                  placeholder="e.g. Right lane on 5th Ave near the bus stop"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={fieldClass}
                />
              </div>

              {/* Severity */}
              <div>
                <label htmlFor="report-severity" className={labelClass}>
                  Severity <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  id="report-severity"
                  className={fieldClass}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="">Select severity&hellip;</option>
                  <option value="minor">Minor — Bumpy but driveable</option>
                  <option value="moderate">Moderate — May damage tires</option>
                  <option value="severe">Severe — Crater / major hazard</option>
                </select>
              </div>

              {/* Image upload */}
              <div>
                <label className={labelClass}>
                  Photos <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-red-400 transition-colors group">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-slate-400 group-hover:text-red-400 transition-colors" aria-hidden="true">
                    <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-500 group-hover:text-slate-700">
                    {selectedFiles.length === 0
                      ? 'Tap to add photos'
                      : `${selectedFiles.length} photo${selectedFiles.length !== 1 ? 's' : ''} selected`}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {/* Image previews */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFiles.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative w-16 h-16 shrink-0">
                          <img
                            src={url}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                            onLoad={() => URL.revokeObjectURL(url)}
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            aria-label={`Remove photo ${idx + 1}`}
                            className="absolute -top-1.5 -right-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status feedback */}
              {submitState === 'success' && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                  Pothole reported — thank you!
                </div>
              )}
              {submitState === 'error' && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  Submission failed. Is the API running?
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!locationReady || submitState === 'submitting' || submitState === 'success'}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  {submitState === 'submitting' ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
