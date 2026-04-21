"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

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
        {/* Topographic / parcel-map SVG background */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 660 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer contour layers — land parcel / topo survey aesthetic */}
          <g fill="none" stroke="white">
            {/* Large irregular terrain shapes */}
            <path strokeWidth="0.8" strokeOpacity="0.10"
              d="M -60 720 C 80 680 200 560 310 480 C 420 400 540 380 640 420 C 720 450 740 560 700 660 C 660 760 560 820 420 840 C 280 860 100 820 0 770 Z" />
            <path strokeWidth="0.8" strokeOpacity="0.13"
              d="M -20 680 C 100 640 220 530 320 460 C 420 390 530 372 620 406 C 690 432 710 530 675 622 C 638 716 548 768 418 788 C 288 808 120 774 30 732 Z" />
            <path strokeWidth="0.8" strokeOpacity="0.16"
              d="M 20 640 C 130 602 238 500 330 440 C 422 380 522 364 602 394 C 665 416 682 504 650 586 C 616 670 534 716 414 736 C 294 756 138 728 60 694 Z" />
            <path strokeWidth="0.8" strokeOpacity="0.19"
              d="M 60 600 C 158 564 255 470 340 420 C 424 370 514 356 584 382 C 640 402 654 478 625 550 C 594 624 519 666 410 684 C 300 702 156 678 88 654 Z" />
            <path strokeWidth="0.9" strokeOpacity="0.22"
              d="M 100 560 C 186 526 271 440 350 398 C 426 358 506 347 566 370 C 615 388 627 454 600 516 C 572 580 504 618 406 634 C 306 650 174 630 116 610 Z" />
            <path strokeWidth="0.9" strokeOpacity="0.18"
              d="M 140 520 C 214 488 288 410 360 375 C 428 342 498 334 548 355 C 590 372 600 430 575 483 C 549 538 488 572 400 586 C 312 600 190 580 144 564 Z" />

            {/* Upper ridge group */}
            <path strokeWidth="0.7" strokeOpacity="0.10"
              d="M 80 280 C 160 220 280 180 380 190 C 460 198 520 240 540 300 C 556 348 530 400 480 430 C 420 464 340 468 260 450 C 180 432 110 388 88 340 Z" />
            <path strokeWidth="0.8" strokeOpacity="0.14"
              d="M 110 290 C 183 236 292 200 382 210 C 455 218 510 256 528 310 C 542 354 518 400 472 428 C 416 458 342 462 266 446 C 190 430 124 390 104 346 Z" />
            <path strokeWidth="0.8" strokeOpacity="0.18"
              d="M 140 300 C 206 252 304 220 385 230 C 450 238 500 272 516 320 C 528 360 506 402 462 426 C 412 453 343 456 271 441 C 200 428 138 392 120 352 Z" />
            <path strokeWidth="0.9" strokeOpacity="0.22"
              d="M 168 312 C 228 268 316 240 387 250 C 446 258 490 288 504 330 C 514 366 495 403 453 424 C 408 447 343 450 277 436 C 210 424 152 394 136 358 Z" />
            <path strokeWidth="0.9" strokeOpacity="0.20"
              d="M 194 324 C 250 284 328 260 390 270 C 442 278 480 304 492 340 C 501 372 484 405 445 422 C 403 442 345 444 283 432 C 220 420 166 396 152 364 Z" />

            {/* Property boundary lines — straight survey marks */}
            <line x1="0" y1="180" x2="660" y2="220" strokeWidth="0.6" strokeOpacity="0.09" />
            <line x1="0" y1="520" x2="660" y2="560" strokeWidth="0.6" strokeOpacity="0.09" />
            <line x1="0" y1="760" x2="660" y2="800" strokeWidth="0.6" strokeOpacity="0.08" />
            <line x1="180" y1="0" x2="220" y2="900" strokeWidth="0.6" strokeOpacity="0.09" />
            <line x1="440" y1="0" x2="480" y2="900" strokeWidth="0.6" strokeOpacity="0.08" />

            {/* Small parcel marker dots */}
            <circle cx="200" cy="192" r="3" fill="white" fillOpacity="0.15" />
            <circle cx="456" cy="214" r="3" fill="white" fillOpacity="0.15" />
            <circle cx="180" cy="535" r="3" fill="white" fillOpacity="0.15" />
            <circle cx="460" cy="548" r="3" fill="white" fillOpacity="0.12" />
            <circle cx="320" cy="375" r="2" fill="white" fillOpacity="0.18" />

            {/* Subtle elevation tick marks */}
            <line x1="210" y1="185" x2="210" y2="200" strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="465" y1="207" x2="465" y2="222" strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="185" y1="528" x2="185" y2="543" strokeWidth="0.7" strokeOpacity="0.18" />
            <line x1="469" y1="541" x2="469" y2="556" strokeWidth="0.7" strokeOpacity="0.15" />
          </g>
        </svg>

        {/* Brand wordmark + tagline */}
        <div className="relative z-10 space-y-2">
          <p
            className="font-display text-4xl font-normal tracking-tight"
            style={{ color: 'rgba(255,255,255,0.97)' }}
          >
            Parcel
          </p>
          <p
            className="text-[15px]"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            Your home, thoughtfully engineered.
          </p>
        </div>

        {/* Bottom spacer copy */}
        <div className="relative z-10">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
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
