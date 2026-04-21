'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Minimize2 } from 'lucide-react'

const SAGE     = 'oklch(0.50 0.10 155)'
const SAGE_HEX = '#4a7c6a'

type Message = { role: 'user' | 'assistant'; content: string }

function getGreeting(): string {
  const h = new Date().getHours()
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${t}. Ask me anything about your property.`
}

export function FloatingChat() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getGreeting() },
  ])
  const [draft, setDraft]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  async function send() {
    const text = draft.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setDraft('')
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      const reply = typeof data.response === 'string'
        ? data.response
        : data.message ?? 'Something went wrong.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong — try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Open panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 360, height: 480, border: '1px solid oklch(0.88 0.04 155)', backgroundColor: 'white' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: SAGE }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-white/80" />
              <span className="text-sm font-medium text-white">Agent</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                <div className={`text-sm leading-relaxed max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-zinc-100 text-zinc-700 px-3 py-2 rounded-2xl rounded-tr-sm'
                    : 'text-zinc-700'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-1 items-center pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 flex gap-2 px-3 py-3 border-t border-zinc-100">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-400 disabled:opacity-50 bg-zinc-50"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || loading}
              className="p-2 rounded-xl text-white disabled:opacity-40 transition-colors shrink-0"
              style={{ backgroundColor: SAGE }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: SAGE }}
        aria-label="Open Agent chat"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageSquare className="w-5 h-5 text-white" />
        }
      </button>
    </>
  )
}
