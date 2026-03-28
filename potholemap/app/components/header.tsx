'use client';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if the user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    // z-[500] ensures the header stays above the Leaflet map tiles
    <header className="bg-slate-900 text-white p-4 flex justify-between items-center relative z-[500] shrink-0 shadow-md">
      
      {/* Brand / Logo */}
      <div className="font-bold text-xl tracking-tight">
        Pothole<span className="text-red-500">Map</span>
      </div>

      {/* Login Section */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsLoginOpen(!isLoginOpen)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700 active:scale-95"
        >
          Login
        </button>

        {/* Dropdown Form */}
        {isLoginOpen && (
          <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 text-slate-800 origin-top-right transition-all">
            <h3 className="text-lg font-bold mb-4 text-slate-900">Welcome Back</h3>
            
            <form 
              className="flex flex-col gap-4" 
              onSubmit={(e) => { 
                e.preventDefault(); 
                console.log('Login submitted!'); 
                setIsLoginOpen(false); // Close dropdown on submit
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="citizen@nyc.gov"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm"
              >
                Sign In
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}