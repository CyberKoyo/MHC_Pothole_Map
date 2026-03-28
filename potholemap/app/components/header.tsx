'use client';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with localStorage on load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // MOVE handleLogout HERE so the button can see it
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    setIsLoginOpen(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        setIsLoggedIn(true);
        setIsLoginOpen(false);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Could not connect to the server');
    }
  };

  return (
    <header className="bg-slate-900 text-white p-4 flex justify-between items-center relative z-[500] shrink-0 shadow-md">
      <div className="font-bold text-xl tracking-tight">
        Pothole<span className="text-red-500">Map</span>
      </div>

      <div className="relative" ref={dropdownRef}>
        {/* Only one button should exist here, toggled by isLoggedIn */}
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors active:scale-95"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => setIsLoginOpen(!isLoginOpen)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-700 active:scale-95"
          >
            Login
          </button>
        )}

        {/* Dropdown Form - Only shows if NOT logged in */}
        {isLoginOpen && !isLoggedIn && (
        <div className="absolute right-0 mt-3 w-72 bg-white p-6 rounded-xl shadow-2xl border border-slate-200 ">
          <h3 className="text-lg font-bold mb-4 text-slate-900">Welcome Back</h3>
          
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-red-500 text-slate-900"
                placeholder="example@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-red-500 text-slate-900"
                required
              />
            </div>
            <button type="submit" className="w-full ... bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg">
              Sign In
            </button>
          </form>
        </div>
      )}
      </div>
    </header>
  );
}