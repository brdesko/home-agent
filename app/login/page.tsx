"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  // Redirect immediately if a valid session already exists
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/lattice'
    })
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/lattice';
    }
  }

  return (
    <main className="min-h-screen flex">

      {/* ── Left panel — brand + imagery ─────────────────────────────── */}
      <div
        className="hidden md:flex flex-col justify-between w-[55%] relative overflow-hidden p-14"
        style={{ backgroundColor: 'oklch(0.90 0.10 88)' }}
      >
        {/* Geometric lattice illustration */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 660 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Regular dot grid */}
          <defs>
            <pattern id="latticeDots" width="66" height="66" patternUnits="userSpaceOnUse">
              <circle cx="33" cy="33" r="1.6" fill="oklch(0.48 0.14 72)" fillOpacity="0.22" />
            </pattern>
          </defs>
          <rect width="660" height="900" fill="url(#latticeDots)" />

          {/* Connecting lines — suggests lattice structure */}
          <g stroke="oklch(0.48 0.14 72)" fill="none">
            <line x1="33"  y1="99"  x2="297" y2="99"  strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="165" y1="231" x2="561" y2="231" strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="99"  y1="363" x2="429" y2="363" strokeWidth="0.7" strokeOpacity="0.15" />
            <line x1="231" y1="495" x2="627" y2="495" strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="33"  y1="627" x2="363" y2="627" strokeWidth="0.7" strokeOpacity="0.15" />
            <line x1="165" y1="759" x2="495" y2="759" strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="297" y1="891" x2="627" y2="891" strokeWidth="0.7" strokeOpacity="0.15" />

            <line x1="297" y1="99"  x2="231" y2="495" strokeWidth="0.7" strokeOpacity="0.14" />
            <line x1="561" y1="231" x2="627" y2="495" strokeWidth="0.7" strokeOpacity="0.14" />
            <line x1="99"  y1="363" x2="165" y2="759" strokeWidth="0.7" strokeOpacity="0.12" />
            <line x1="429" y1="363" x2="495" y2="759" strokeWidth="0.7" strokeOpacity="0.14" />
            <line x1="231" y1="495" x2="297" y2="891" strokeWidth="0.7" strokeOpacity="0.12" />
          </g>

          {/* Key nodes — larger dots at structural intersections */}
          <g fill="oklch(0.48 0.14 72)">
            <circle cx="297" cy="99"  r="4.5" fillOpacity="0.40" />
            <circle cx="165" cy="231" r="3.5" fillOpacity="0.35" />
            <circle cx="561" cy="231" r="4.5" fillOpacity="0.40" />
            <circle cx="99"  cy="363" r="3.0" fillOpacity="0.30" />
            <circle cx="429" cy="363" r="4.0" fillOpacity="0.38" />
            <circle cx="231" cy="495" r="4.5" fillOpacity="0.42" />
            <circle cx="627" cy="495" r="3.0" fillOpacity="0.28" />
            <circle cx="165" cy="759" r="4.0" fillOpacity="0.35" />
            <circle cx="495" cy="759" r="4.5" fillOpacity="0.40" />
            <circle cx="297" cy="891" r="3.5" fillOpacity="0.30" />
          </g>
        </svg>

        {/* Brand wordmark + tagline */}
        <div className="relative z-10 space-y-3">
          <p
            className="font-display tracking-tight leading-none"
            style={{ color: 'oklch(0.28 0.10 70)', fontSize: '72px', fontWeight: 300 }}
          >
            Lattice
          </p>
          <p
            className="text-base"
            style={{ color: 'oklch(0.46 0.08 74)' }}
          >
            Your personal operating system.
          </p>
        </div>

        {/* Bottom caption */}
        <div className="relative z-10">
          <p className="text-[11px] tracking-widest uppercase" style={{ color: 'oklch(0.55 0.06 76)' }}>
            Life, organized.
          </p>
        </div>
      </div>

      {/* ── Right panel — login form ───────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 py-16"
        style={{ backgroundColor: '#faf9f7' }}
      >
        {/* Mobile-only wordmark */}
        <p
          className="md:hidden font-display text-3xl font-normal mb-10"
          style={{ color: 'oklch(0.56 0.16 70)' }}
        >
          Lattice
        </p>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-normal text-zinc-900">Welcome back.</h1>
            <p className="text-sm text-zinc-400">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-zinc-200 rounded-lg px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 bg-white transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-zinc-200 rounded-lg px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 bg-white transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'oklch(0.56 0.16 70)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-center text-zinc-300">
            Access by invitation only
          </p>
        </div>
      </div>

    </main>
  );
}
