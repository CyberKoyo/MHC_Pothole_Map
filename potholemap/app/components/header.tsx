'use client';
import { useState, useRef, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

export default function Header() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    setIsLoginOpen(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        setIsLoggedIn(true);
        setIsLoginOpen(false);
        setEmail('');
        setPassword('');
      } else {
        setError('Invalid email or password.');
      }
    } catch {
      setError('Could not connect to the server.');
    }
  };

  return (
    <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center relative z-[500] shrink-0 shadow-sm">
      {/* Brand */}
      <div className="font-bold text-lg tracking-tight select-none">
        Pothole<span className="text-red-500">Map</span>
      </div>

      {/* Auth */}
      <div className="relative" ref={dropdownRef}>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors active:scale-95"
          >
            Log out
          </button>
        ) : (
          <button
            onClick={() => setIsLoginOpen(!isLoginOpen)}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-sm font-medium transition-colors active:scale-95"
          >
            Log in
          </button>
        )}

        {/* Login dropdown */}
        {isLoginOpen && !isLoggedIn && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 pt-5 pb-1">
              <h3 className="text-base font-bold text-slate-900">Welcome back</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to your account</p>
            </div>

            <form className="flex flex-col gap-3 p-5" onSubmit={handleLogin}>
              {error && (
                <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-1">
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-slate-900 bg-white w-full"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-slate-900 bg-white w-full"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors active:scale-95 mt-1"
              >
                Sign in
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
