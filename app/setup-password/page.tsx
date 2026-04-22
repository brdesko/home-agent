'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetupPasswordPage() {
  const router = useRouter()
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) { setError(updateError.message); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-display text-2xl text-zinc-800">Parcel</p>
          <p className="text-sm text-zinc-400 mt-1">Your property, thoughtfully managed.</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 space-y-6">
          <div>
            <h1 className="text-lg font-display text-zinc-800">Set your password</h1>
            <p className="text-sm text-zinc-500 mt-1">
              You&apos;ll use this to sign in next time.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                required
                placeholder="Same password again"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
            >
              {loading ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
