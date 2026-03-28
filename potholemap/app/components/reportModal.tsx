'use client';
import { useState } from 'react';

type LocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; latitude: number; longitude: number }
  | { status: 'error'; message: string };

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const API_BASE = 'http://localhost:8000';

export default function ReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  function openModal() {
    setIsOpen(true);
    setSubmitState('idle');
    setDescription('');
    setSeverity('');
    setLocation({ status: 'loading' });

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ status: 'ready', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => setLocation({ status: 'error', message: err.message }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function closeModal() {
    setIsOpen(false);
    setLocation({ status: 'idle' });
    setSubmitState('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (location.status !== 'ready') return;

    setSubmitState('submitting');
    try {
      const res = await fetch(`${API_BASE}/potholes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Report a Pothole</h2>
              <button
                type="button"
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xl font-bold w-10 h-10"
                onClick={closeModal}
              >
                X
              </button>
            </div>
            <p className="text-sm text-slate-600">Pinpoint the hazard to warn others.</p>

            {/* Location status */}
            <div className="rounded-lg p-3 text-sm font-medium flex items-center gap-2 bg-slate-100 text-slate-600">
              {location.status === 'loading' && <><span className="animate-spin">⏳</span> Getting your location…</>}
              {location.status === 'ready' && <>📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</>}
              {location.status === 'error' && <span className="text-red-600">⚠️ {location.message}</span>}
              {location.status === 'idle' && '📍 Location pending…'}
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
              <div className="flex flex-col">
                <p className="text-slate-800">
                  Severity <span className="text-red-600"> * </span>
                </p>
                <select
                  className="w-full border border-slate-300 rounded-lg p-3 text-black outline-none"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  required
                >
                  <option value="" disabled>--Select an option--</option>
                  <option value="minor">Minor (Bumpy)</option>
                  <option value="moderate">Moderate (Might pop a tire)</option>
                  <option value="severe">Severe (Crater)</option>
                </select>
              </div>
              <div className="flex flex-col">
                <p className="text-slate-800">Image(s)</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="w-full border border-slate-300 rounded-lg p-3 text-black outline-none"
                />
              </div>

              {submitState === 'success' && (
                <p className="text-green-600 font-semibold text-center">✅ Pothole reported!</p>
              )}
              {submitState === 'error' && (
                <p className="text-red-600 text-sm text-center">Failed to submit. Is the API running?</p>
              )}

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
                  disabled={location.status !== 'ready' || submitState === 'submitting'}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
