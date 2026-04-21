'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function InvitePage() {
  const [email, setEmail]     = useState('')
  const [link, setLink]       = useState('')
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setLink('')

    const res  = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'owner' }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
    setLink(data.link)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 p-8 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">Parcel</p>
          <h1 className="text-xl font-display text-zinc-800">Invite someone</h1>
          <p className="text-sm text-zinc-500 mt-1">Generate a one-time link you can send directly.</p>
        </div>

        {!link ? (
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
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'oklch(0.50 0.10 155)' }}
            >
              {loading ? 'Generating…' : 'Generate invite link'}
            </button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <p className="text-xs text-zinc-400 mb-1.5">Invite link for {email}</p>
              <p className="text-xs text-zinc-600 font-mono break-all leading-relaxed">{link}</p>
            </div>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: copied ? 'oklch(0.55 0.12 168)' : 'oklch(0.50 0.10 155)' }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <p className="text-xs text-zinc-400 text-center">Send this link via text, email, or however you like. It expires after use.</p>
            <button
              onClick={() => { setLink(''); setEmail('') }}
              className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Invite someone else
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
