'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ProjectCreated = {
  id: string
  name: string
  taskCount: number
  budgetTotal: number
  eventCount: number
}

type ChangeResult = {
  type: string
  summary: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  return `Good ${time} — what are we working on today?`
}

export function AgentChat() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getGreeting() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [projectCreated, setProjectCreated] = useState<ProjectCreated | null>(null)
  const [changes, setChanges] = useState<ChangeResult[]>([])
  const [cascadeLabel, setCascadeLabel] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const sentCtx   = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const ctx       = searchParams.get('ctx')
    const taskTitle = searchParams.get('taskTitle')
    if (!ctx || sentCtx.current) return
    sentCtx.current = true
    router.replace('/agent')

    if (taskTitle) setCascadeLabel(`Completed: ${taskTitle}`)

    // Greeter is sent to API for context but not shown; only the response is rendered
    const greeter: Message = { role: 'assistant', content: getGreeting() }
    const userMessage: Message = { role: 'user', content: ctx }
    const apiMessages = [greeter, userMessage]
    setMessages([{ role: 'assistant', content: 'Looking across your projects…' }])
    setLoading(true)

    fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages }),
    })
      .then(async r => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error ?? 'Server error')
        return data
      })
      .then(data => {
        setMessages([{ role: 'assistant', content: data.response }])
        if (data.projectCreated) setProjectCreated(data.projectCreated)
        if (data.changes?.length) setChanges(prev => [...prev, ...data.changes])
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: 'Something went wrong. Please try again.' }])
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: Message = { role: 'user', content: text }
    const next = [...messages, userMessage]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Server error')

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (data.projectCreated) setProjectCreated(data.projectCreated)
      if (data.changes?.length) setChanges(prev => [...prev, ...data.changes])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">

      <div className="px-8 pt-7 pb-3 border-b border-zinc-100 shrink-0">
        <h1 className="text-[28px] font-display text-zinc-800 leading-tight">Agent</h1>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {cascadeLabel && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{cascadeLabel}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-prose rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white rounded-br-sm'
                    : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <span className="text-zinc-400 text-sm">Thinking…</span>
              </div>
            </div>
          )}

          {changes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-blue-800 font-medium">Notebook updated.</p>
                <p className="text-xs text-blue-700 mt-0.5">{changes.map(c => c.summary).join(' · ')}</p>
              </div>
              <Link href="/" className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900 shrink-0">
                View Notebook →
              </Link>
            </div>
          )}

          {projectCreated && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-green-800 font-medium">"{projectCreated.name}" added.</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {[
                    projectCreated.taskCount > 0 && `${projectCreated.taskCount} task${projectCreated.taskCount !== 1 ? 's' : ''}`,
                    projectCreated.budgetTotal > 0 && `$${projectCreated.budgetTotal.toLocaleString()} estimated`,
                    projectCreated.eventCount > 0 && `${projectCreated.eventCount} timeline event${projectCreated.eventCount !== 1 ? 's' : ''}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link
                href="/"
                className="text-sm text-green-700 underline underline-offset-2 hover:text-green-900 shrink-0"
              >
                View Notebook →
              </Link>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="border-t border-zinc-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe a project you'd like to add…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-zinc-900 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-zinc-700 transition-colors self-end"
          >
            Send
          </button>
        </div>
        <p className="max-w-2xl mx-auto mt-2 text-xs text-zinc-400">
          Press Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  )
}
