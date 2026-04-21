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
        {/* Site-plan illustration — artwork lives in the lower two-thirds, title area stays clear */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 660 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dot grid — full background, very faint */}
          <g fill="white" stroke="none">
            {Array.from({ length: 56 }, (_, i) => {
              const col = i % 8
              const row = Math.floor(i / 8)
              return <circle key={i} cx={30 + col * 86} cy={40 + row * 130} r="1.5" fillOpacity="0.07" />
            })}
          </g>

          <g fill="none" stroke="white">
            {/* Road / street edge — enters from bottom-left */}
            <path d="M 0 820 Q 50 790 80 750" strokeWidth="3" strokeOpacity="0.10" />
            <path d="M 0 840 Q 52 808 82 768" strokeWidth="1" strokeOpacity="0.08" strokeDasharray="8 6" />

            {/* Property boundary — kept in lower 65% of canvas */}
            <polygon
              points="82,340 490,295 595,500 545,760 225,810 68,660"
              strokeWidth="1.3" strokeOpacity="0.38"
            />
            {/* Inner setback — dashed */}
            <polygon
              points="108,368 464,326 566,503 518,730 232,778 96,658"
              strokeWidth="0.7" strokeOpacity="0.18" strokeDasharray="6 4"
            />

            {/* House footprint */}
            <rect x="195" y="440" width="178" height="138" rx="3"
              strokeWidth="1.3" strokeOpacity="0.52" />
            {/* Center ridge line (long axis of house) */}
            <line x1="284" y1="440" x2="284" y2="578" strokeWidth="0.7" strokeOpacity="0.22" />
            {/* Front door opening */}
            <rect x="262" y="548" width="44" height="30" rx="2"
              strokeWidth="0.9" strokeOpacity="0.35" />

            {/* Driveway — curves from street gap to house */}
            <path d="M 82 680 C 100 660 140 610 195 560"
              strokeWidth="1.1" strokeOpacity="0.22" />

            {/* Garden bed alongside house */}
            <rect x="195" y="596" width="70" height="22" rx="3"
              strokeWidth="0.8" strokeOpacity="0.22" />
            <rect x="280" y="596" width="52" height="22" rx="3"
              strokeWidth="0.8" strokeOpacity="0.18" />

            {/* Pond / water feature — lower right of parcel */}
            <ellipse cx="468" cy="638" rx="54" ry="36"
              strokeWidth="1.0" strokeOpacity="0.24" />
            <ellipse cx="468" cy="638" rx="36" ry="24"
              strokeWidth="0.5" strokeOpacity="0.12" />

            {/* Tree clusters */}
            {/* Upper right — three overlapping canopies */}
            <circle cx="462" cy="380" r="20" strokeWidth="0.9" strokeOpacity="0.24" />
            <circle cx="500" cy="414" r="15" strokeWidth="0.8" strokeOpacity="0.19" />
            <circle cx="436" cy="418" r="12" strokeWidth="0.7" strokeOpacity="0.16" />
            {/* Left side — two trees near driveway */}
            <circle cx="148" cy="490" r="17" strokeWidth="0.9" strokeOpacity="0.21" />
            <circle cx="138" cy="536" r="13" strokeWidth="0.8" strokeOpacity="0.17" />
            {/* Lower center */}
            <circle cx="368" cy="720" r="15" strokeWidth="0.7" strokeOpacity="0.18" />
            <circle cx="400" cy="704" r="11" strokeWidth="0.6" strokeOpacity="0.14" />
            <circle cx="384" cy="690" r="8"  strokeWidth="0.5" strokeOpacity="0.12" />

            {/* Survey corner pins */}
            <circle cx="82"  cy="340" r="4" fill="white" fillOpacity="0.32" />
            <circle cx="490" cy="295" r="4" fill="white" fillOpacity="0.28" />
            <circle cx="595" cy="500" r="4" fill="white" fillOpacity="0.24" />
            <circle cx="545" cy="760" r="4" fill="white" fillOpacity="0.22" />
            <circle cx="225" cy="810" r="4" fill="white" fillOpacity="0.22" />
            <circle cx="68"  cy="660" r="4" fill="white" fillOpacity="0.22" />

            {/* Tick marks at two corners */}
            <line x1="74"  y1="340" x2="90"  y2="340" strokeWidth="0.8" strokeOpacity="0.26" />
            <line x1="82"  y1="332" x2="82"  y2="348" strokeWidth="0.8" strokeOpacity="0.26" />
            <line x1="482" y1="295" x2="498" y2="295" strokeWidth="0.8" strokeOpacity="0.24" />
            <line x1="490" y1="287" x2="490" y2="303" strokeWidth="0.8" strokeOpacity="0.24" />

            {/* Bearing dimension line — top edge of parcel */}
            <line x1="82" y1="330" x2="490" y2="284" strokeWidth="0.5" strokeOpacity="0.18" />

            {/* Scale bar — bottom right, outside parcel */}
            <line x1="490" y1="858" x2="610" y2="858" strokeWidth="0.9" strokeOpacity="0.22" />
            <line x1="490" y1="852" x2="490" y2="864" strokeWidth="0.9" strokeOpacity="0.22" />
            <line x1="550" y1="852" x2="550" y2="864" strokeWidth="0.5" strokeOpacity="0.16" />
            <line x1="610" y1="852" x2="610" y2="864" strokeWidth="0.9" strokeOpacity="0.22" />
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
