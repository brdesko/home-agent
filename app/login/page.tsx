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
      if (session) window.location.href = '/'
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
      window.location.href = '/';
    }
  }

  return (
    <main className="min-h-screen flex">

      {/* ── Left panel — brand + imagery ─────────────────────────────── */}
      <div
        className="hidden md:flex flex-col justify-between w-[55%] relative overflow-hidden p-14"
        style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
      >
        {/* Plat-map / cadastral survey SVG background */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 660 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fill="none" stroke="white">
            {/* Main parcel boundary — irregular polygon, clearly land-survey */}
            <polygon
              points="80,110 560,80 620,420 580,760 420,840 100,810 50,480 80,110"
              strokeWidth="1.2" strokeOpacity="0.35"
            />
            {/* Inner set-back line */}
            <polygon
              points="120,150 520,122 572,420 536,730 420,800 138,772 96,480 120,150"
              strokeWidth="0.7" strokeOpacity="0.18" strokeDasharray="6 4"
            />

            {/* Interior subdivision lines */}
            <line x1="80" y1="110" x2="580" y2="760" strokeWidth="0.6" strokeOpacity="0.16" />
            <line x1="560" y1="80" x2="100" y2="810" strokeWidth="0.6" strokeOpacity="0.16" />
            <line x1="50" y1="480" x2="620" y2="420" strokeWidth="0.6" strokeOpacity="0.20" />

            {/* Zone fill outlines — house area */}
            <rect x="200" y="220" width="180" height="140" rx="4"
              strokeWidth="0.9" strokeOpacity="0.30" />
            {/* Zone fill outlines — barn area */}
            <rect x="90" y="480" width="140" height="100" rx="4"
              strokeWidth="0.9" strokeOpacity="0.25" />
            {/* Zone fill outlines — pool */}
            <ellipse cx="490" cy="300" rx="55" ry="38"
              strokeWidth="0.9" strokeOpacity="0.25" />

            {/* Bearing / dimension annotation lines */}
            <line x1="80" y1="100" x2="560" y2="70" strokeWidth="0.5" strokeOpacity="0.22" />
            <line x1="80" y1="92" x2="80" y2="118" strokeWidth="0.8" strokeOpacity="0.30" />
            <line x1="560" y1="62" x2="560" y2="88" strokeWidth="0.8" strokeOpacity="0.30" />

            {/* Corner pins */}
            <circle cx="80"  cy="110" r="4" fill="white" fillOpacity="0.22" />
            <circle cx="560" cy="80"  r="4" fill="white" fillOpacity="0.22" />
            <circle cx="620" cy="420" r="4" fill="white" fillOpacity="0.20" />
            <circle cx="580" cy="760" r="4" fill="white" fillOpacity="0.20" />
            <circle cx="420" cy="840" r="4" fill="white" fillOpacity="0.20" />
            <circle cx="100" cy="810" r="4" fill="white" fillOpacity="0.20" />
            <circle cx="50"  cy="480" r="4" fill="white" fillOpacity="0.20" />

            {/* Tick marks at corners */}
            <line x1="72"  y1="110" x2="88"  y2="110" strokeWidth="0.8" strokeOpacity="0.28" />
            <line x1="80"  y1="102" x2="80"  y2="118" strokeWidth="0.8" strokeOpacity="0.28" />
            <line x1="552" y1="80"  x2="568" y2="80"  strokeWidth="0.8" strokeOpacity="0.28" />
            <line x1="560" y1="72"  x2="560" y2="88"  strokeWidth="0.8" strokeOpacity="0.28" />

            {/* Contour lines — organic background texture, lower layer */}
            <path strokeWidth="0.5" strokeOpacity="0.10"
              d="M 0 600 Q 200 540 400 580 Q 550 610 660 570" />
            <path strokeWidth="0.5" strokeOpacity="0.10"
              d="M 0 650 Q 180 600 380 630 Q 540 655 660 620" />
            <path strokeWidth="0.5" strokeOpacity="0.10"
              d="M 0 700 Q 200 660 420 680 Q 560 695 660 670" />
            <path strokeWidth="0.5" strokeOpacity="0.10"
              d="M 100 200 Q 300 170 480 210 Q 580 230 660 200" />
            <path strokeWidth="0.5" strokeOpacity="0.10"
              d="M 60 260 Q 260 230 460 265 Q 570 280 660 255" />
          </g>
        </svg>

        {/* Brand wordmark + tagline */}
        <div className="relative z-10 space-y-3">
          <p
            className="font-display tracking-tight leading-none"
            style={{ color: 'rgba(255,255,255,0.97)', fontSize: '72px', fontWeight: 300 }}
          >
            Parcel
          </p>
          <p
            className="text-base"
            style={{ color: 'rgba(255,255,255,0.60)' }}
          >
            Your home, thoughtfully managed.
          </p>
        </div>

        {/* Bottom caption */}
        <div className="relative z-10">
          <p className="text-[11px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Property intelligence
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
          style={{ color: 'oklch(0.50 0.10 155)' }}
        >
          Parcel
        </p>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-normal text-zinc-900">Welcome back.</h1>
            <p className="text-sm text-zinc-400">Sign in to your property notebook</p>
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
              style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
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
