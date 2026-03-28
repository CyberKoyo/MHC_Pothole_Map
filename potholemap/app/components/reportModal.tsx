'use client';
import { useState } from 'react';

type LocationSource = 'map' | 'gps';
type GpsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; latitude: number; longitude: number }
  | { status: 'error'; message: string };

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const API_BASE = 'http://localhost:8000';

type Props = {
  mapLocation: [number, number];
};

export default function ReportModal({ mapLocation }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [locationSource, setLocationSource] = useState<LocationSource>('map');
  const [gps, setGps] = useState<GpsState>({ status: 'idle' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fileNames = selectedFiles.length === 0
    ? "No files selected"
    : `${selectedFiles.length} file(s) selected`;
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

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
  }

  function closeModal() {
    setIsOpen(false);
    setGps({ status: 'idle' });
    setSubmitState('idle');
    setSelectedFiles([]);
  }

  function requestGps() {
    setLocationSource('gps');
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
        className="absolute bottom-6 right-6 z-[400] bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl transition-transform active:scale-95 flex items-center justify-center font-bold text-lg"
      >
        🚨 Report
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="absolute inset-0 z-[500] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-4">
            
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Report a Pothole</h2>
              <button
                type="button"
                className="rounded-lg bg-red-600 hover:bg-red-700 text-xl font-bold w-10 h-10"
                onClick={closeModal}
              >
                X
              </button>
            </div>

            <p className="text-sm text-slate-600">Pinpoint the hazard to warn others.</p>

            {/* Location source */}
            <div className="flex flex-col gap-2">
              <div className="rounded-lg p-3 text-sm font-medium flex items-center justify-between bg-slate-100 text-slate-600">
                <span>
                  {locationSource === 'map' && <>📍 Map pin: {mapLocation[0].toFixed(5)}, {mapLocation[1].toFixed(5)}</>}
                  {locationSource === 'gps' && gps.status === 'loading' && <><span className="animate-spin inline-block">⏳</span> Getting GPS…</>}
                  {locationSource === 'gps' && gps.status === 'ready' && <>📡 GPS: {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}</>}
                  {locationSource === 'gps' && gps.status === 'error' && <span className="text-red-600">⚠️ {gps.message}</span>}
                </span>
                {locationSource === 'map' ? (
                  <button type="button" onClick={requestGps} className="ml-3 text-xs text-blue-600 hover:underline whitespace-nowrap">
                    Use my GPS instead
                  </button>
                ) : (
                  <button type="button" onClick={() => { setLocationSource('map'); setGps({ status: 'idle' }); }} className="ml-3 text-xs text-blue-600 hover:underline whitespace-nowrap">
                    Use map pin instead
                  </button>
                )}
              </div>
              {locationSource === 'map' && (
                <p className="text-xs text-slate-400 pl-1">Tap the map behind this modal to move the pin.</p>
              )}
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div className="flex flex-col">
                <p className="text-slate-800">
                  Location Description
                </p>
                <input
                  type="text"
                  placeholder="Location Description (e.g. Right lane on 5th Ave)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-red-500 outline-none -mt-0.5"
                />
              </div>

              {/* Severity */}
              <div className="flex flex-col">
                <p className="text-slate-800">Severity</p>
                <select 
                  className="w-full border border-slate-300 rounded-lg p-3 text-black outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>--Select an option--</option>
                  <option value="" disabled>--Select an option--</option>
                  <option value="minor">Minor (Bumpy)</option>
                  <option value="moderate">Moderate (Might pop a tire)</option>
                  <option value="severe">Severe (Crater)</option>
                </select>
              </div>

              {/* Image upload */}
              <div className="flex flex-col">
                <p className="text-slate-800">Image(s)</p>
                
                {/* File input label */}
                <label className="w-full border border-slate-300 rounded-lg p-3 text-black flex justify-between items-center cursor-pointer">
                  {fileNames}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {/* Image previews with remove button */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFiles.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative w-16 h-16">
                          <img
                            src={url}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded-md border"
                            onLoad={() => URL.revokeObjectURL(url)}
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-700"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {submitState === 'success' && (
                <p className="text-green-600 font-semibold text-center">✅ Pothole reported!</p>
              )}
              {submitState === 'error' && (
                <p className="text-red-600 text-sm text-center">Failed to submit. Is the API running?</p>
              )}


              {/* Submit button */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-lg font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!locationReady || submitState === 'submitting'}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitState === 'submitting' ? 'Submitting…' : 'Submit Report'}
                  {submitState === 'success' && (
                    <p className="text-green-600 font-semibold text-center">✅ Pothole reported!</p>
                  )}
                  {submitState === 'error' && (
                    <p className="text-red-600 text-sm text-center">Failed to submit. Is the API running?</p>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
