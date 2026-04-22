'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPropertyPage() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res  = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), address: address.trim() || null }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
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
            <h1 className="text-lg font-display text-zinc-800">Set up your property</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Give it a name and an address. You can fill in more details later with the Agent.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Property name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 123 Main St or The Farm"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Address <span className="normal-case font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Street address, city, state"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
            >
              {loading ? 'Creating…' : 'Create my notebook'}
            </button>
          </form>
        </div>

        <p className="text-xs text-zinc-400 text-center">
          Once inside, use the Agent to add details, projects, and goals.
        </p>
      </div>
    </div>
  )
}
