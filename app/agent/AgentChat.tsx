'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ProjectCreated = {
  id: string
  name: string
}

const GREETER = "What would you like to add to your Notebook today? I can add a new project — just describe what you have in mind and we'll work through the details together."

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETER },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [projectCreated, setProjectCreated] = useState<ProjectCreated | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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

      const data = await res.json()

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (data.projectCreated) setProjectCreated(data.projectCreated)
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Property Agent</p>
          <h1 className="text-xl font-semibold text-zinc-900">5090 Durham Rd</h1>
        </div>
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          ← Notebook
        </Link>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
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

          {projectCreated && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-green-800 font-medium">
                "{projectCreated.name}" added to your Notebook.
              </p>
              <Link
                href="/"
                className="text-sm text-green-700 underline underline-offset-2 hover:text-green-900 shrink-0 ml-4"
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
