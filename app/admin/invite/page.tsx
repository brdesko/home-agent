'use client'

import { useState } from 'react'

export default function InvitePage() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setMessage('')

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'owner' }),
    })

    const data = await res.json()

    if (res.ok) {
      setStatus('sent')
      setMessage(`Invitation sent to ${email}`)
      setEmail('')
    } else {
      setStatus('error')
      setMessage(data.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 p-8 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Parcel</p>
          <h1 className="text-xl font-display text-zinc-800">Invite someone</h1>
          <p className="text-sm text-zinc-500 mt-1">They'll receive a branded email with a link to set their password and access the notebook.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
          >
            {status === 'sending' ? 'Sending…' : 'Send invitation'}
          </button>
        </form>

        {message && (
          <p className={`text-sm text-center ${status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
