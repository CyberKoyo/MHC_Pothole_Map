"use client";

import { useState } from "react";

import { createPotholeReport } from "@/lib/api";
import { usePotholeMap } from "../pothole-context";

const SEVERITY_LABELS: Record<string, string> = {
  minor: "Minor (bumpy)",
  moderate: "Moderate (might pop a tire)",
  severe: "Severe (crater)",
};

export default function ReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { markerPosition, refreshPotholes } = usePotholeMap();

  function resetForm() {
    setAddress("");
    setDescription("");
    setSeverity("moderate");
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = address.trim();
    if (!trimmed) {
      setFormError("Enter a short address or label (used as the unique id).");
      return;
    }

    const descParts = [description.trim(), `Severity: ${SEVERITY_LABELS[severity] ?? severity}`]
      .filter(Boolean);
    const location_description =
      descParts.length > 0 ? descParts.join("\n") : null;

    setSubmitting(true);
    try {
      await createPotholeReport({
        address: trimmed,
        latitude: markerPosition[0],
        longitude: markerPosition[1],
        location_description,
      });
      await refreshPotholes();
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-[400] bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl transition-transform active:scale-95 flex items-center justify-center font-bold text-lg"
      >
        Report
      </button>

      {isOpen ? (
        <div className="absolute inset-0 z-[500] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-slate-800">
              Report a pothole
            </h2>
            <p className="text-sm text-slate-600">
              Tap the map to place the pin, then describe the spot. The API
              stores this in SQLite via{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">
                main_api.py
              </code>
              .
            </p>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Address or label (unique)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 5th Ave & 42nd St"
                  className="w-full border border-slate-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-red-500 outline-none"
                  required
                  autoComplete="street-address"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Location description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Right lane, near the bus stop"
                  className="w-full border border-slate-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-black outline-none"
                >
                  <option value="minor">Minor (bumpy)</option>
                  <option value="moderate">Moderate (might pop a tire)</option>
                  <option value="severe">Severe (crater)</option>
                </select>
              </div>

              {formError ? (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsOpen(false);
                  }}
                  className="flex-1 py-3 rounded-lg font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
