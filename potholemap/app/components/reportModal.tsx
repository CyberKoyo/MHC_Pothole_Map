'use client';
import { useState } from 'react';

export default function ReportModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-[400] bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl transition-transform active:scale-95 flex items-center justify-center font-bold text-lg"
      >
        🚨 Report
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="absolute inset-0 z-[500] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Report a Pothole</h2>
            <p className="text-sm text-slate-600">Pinpoint the hazard to warn others.</p>
            
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setIsOpen(false); }}>
              <input 
                type="text" 
                placeholder="Location Description (e.g. Right lane on 5th Ave)" 
                className="w-full border border-slate-300 rounded-lg p-3 text-black focus:ring-2 focus:ring-red-500 outline-none"
                required
              />
              <select className="w-full border border-slate-300 rounded-lg p-3 text-black outline-none">
                <option value="minor">Minor (Bumpy)</option>
                <option value="moderate">Moderate (Might pop a tire)</option>
                <option value="severe">Severe (Crater)</option>
              </select>
              <div className="flex gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 rounded-lg font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}