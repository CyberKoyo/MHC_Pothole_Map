'use client';
import { useState } from 'react';

export type FilterState = {
  boroughs: string[];
  minOccurrences: number | '';
  showDeleted: boolean;
};

export const DEFAULT_FILTERS: FilterState = {
  boroughs: [],
  minOccurrences: '',
  showDeleted: false,
};

const NYC_BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalVisible: number;
};

function activeFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.boroughs.length > 0) count++;
  if (filters.minOccurrences !== '') count++;
  if (filters.showDeleted) count++;
  return count;
}

const sectionLabel = 'text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2';
const toggleBase =
  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1';

export default function FilterPanel({ filters, onChange, totalVisible }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = activeFilterCount(filters);

  function toggleBorough(borough: string) {
    const next = filters.boroughs.includes(borough)
      ? filters.boroughs.filter((b) => b !== borough)
      : [...filters.boroughs, borough];
    onChange({ ...filters, boroughs: next });
  }

  function handleMinOccurrences(val: string) {
    const parsed = val === '' ? '' : parseInt(val, 10);
    onChange({ ...filters, minOccurrences: isNaN(parsed as number) ? '' : parsed });
  }

  function resetAll() {
    onChange(DEFAULT_FILTERS);
  }

  return (
    <div className="absolute bottom-8 left-3 z-[400] flex flex-col items-start gap-2">
      {/* Panel */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-72 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Filters</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {totalVisible} pothole{totalVisible !== 1 ? 's' : ''}
              </p>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-red-600 font-semibold hover:underline shrink-0"
              >
                Reset all
              </button>
            )}
          </div>

          <div className="px-4 pb-4 flex flex-col gap-4">
            {/* Borough */}
            <div>
              <p className={sectionLabel}>Borough</p>
              <div className="flex flex-col gap-1.5">
                {NYC_BOROUGHS.map((borough) => (
                  <label
                    key={borough}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.boroughs.includes(borough)}
                      onChange={() => toggleBorough(borough)}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                      {borough}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Min occurrences */}
            <div>
              <label htmlFor="filter-min-occ" className={sectionLabel}>
                Min. occurrences
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="filter-min-occ"
                  type="number"
                  min={1}
                  placeholder="Any"
                  value={filters.minOccurrences}
                  onChange={(e) => handleMinOccurrences(e.target.value)}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-slate-900 bg-white"
                />
                <span className="text-xs text-slate-400">reports or more</span>
              </div>
            </div>

            {/* Show deleted / resolved */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-700">Show resolved</span>
                <p className="text-xs text-slate-400">Include fixed / removed potholes</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={filters.showDeleted}
                onClick={() => onChange({ ...filters, showDeleted: !filters.showDeleted })}
                className={`${toggleBase} ${filters.showDeleted ? 'bg-red-600' : 'bg-slate-200'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    filters.showDeleted ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle FAB */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close filters' : 'Open filters'}
        className={`flex items-center gap-2 rounded-full px-4 py-3 shadow-lg font-semibold text-sm transition-all active:scale-95 ${
          isOpen
            ? 'bg-slate-800 text-white hover:bg-slate-700'
            : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200'
        }`}
      >
        {/* Funnel icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
