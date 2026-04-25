'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Minimize2 } from 'lucide-react'
import { useAgentContext, type AgentMessage } from './agent-context'

const SAGE = 'oklch(0.50 0.10 155)'

export function FloatingChat() {
  const { messages, setMessages, messagesRef, loading, setLoading, loadingRef } = useAgentContext()
  const [open, setOpen]   = useState(false)
  const [draft, setDraft] = useState('')
  const bottomRef         = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // Listen for open-chat events from onboarding banner chips
  useEffect(() => {
    function onOpenChat(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setOpen(true)
      if (detail?.message) {
        setTimeout(() => sendText(detail.message!), 250)
      }
    }
    window.addEventListener('parcel:open-chat', onOpenChat)
    return () => window.removeEventListener('parcel:open-chat', onOpenChat)
  }, [])

  async function sendText(text: string) {
    if (!text.trim() || loadingRef.current) return
    const userMsg: AgentMessage = { role: 'user', content: text.trim() }
    const next = [...messagesRef.current, userMsg]
    messagesRef.current = next
    setMessages(next)
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
      setMessages(m => {
        const updated = [...m, { role: 'assistant' as const, content: reply }]
        messagesRef.current = updated
        return updated
      })
    } catch {
      setMessages(m => {
        const updated = [...m, { role: 'assistant' as const, content: 'Something went wrong — try again.' }]
        messagesRef.current = updated
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await sendText(text)
  }

  return (
    <>
      {/* Open panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ width: 360, height: 480, border: '1px solid oklch(0.88 0.04 155)', backgroundColor: 'oklch(0.992 0.003 75)' }}
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
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className="text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap"
                  style={m.role === 'user'
                    ? { backgroundColor: 'oklch(0.93 0.02 75)', color: 'oklch(0.40 0.015 75)', padding: '8px 12px', borderRadius: '16px 16px 4px 16px' }
                    : { backgroundColor: 'oklch(0.965 0.006 155)', color: 'oklch(0.38 0.015 75)', padding: '8px 12px', borderRadius: '4px 16px 16px 16px', border: '1px solid oklch(0.92 0.02 155)' }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-1 items-center pt-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'oklch(0.70 0.06 155)', animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'oklch(0.70 0.06 155)', animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'oklch(0.70 0.06 155)', animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 flex gap-2 px-3 py-3 border-t" style={{ borderColor: 'oklch(0.92 0.01 75)' }}>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 text-sm rounded-xl px-3 py-2 focus:outline-none disabled:opacity-50"
              style={{ border: '1px solid oklch(0.88 0.02 75)', backgroundColor: 'oklch(0.985 0.004 75)', color: 'oklch(0.42 0.015 75)' }}
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
