'use client'

import { createContext, useContext, useState, useRef, useEffect } from 'react'

export type AgentMessage = { role: 'user' | 'assistant'; content: string }

type AgentContextValue = {
  messages: AgentMessage[]
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>
  messagesRef: React.MutableRefObject<AgentMessage[]>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  loadingRef: React.MutableRefObject<boolean>
}

const AgentContext = createContext<AgentContextValue | null>(null)

function initialGreeting(): AgentMessage {
  const h = new Date().getHours()
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return { role: 'assistant', content: `Good ${t}. What would you like to work on?` }
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const initial = [initialGreeting()]
  const [messages, setMessages] = useState<AgentMessage[]>(initial)
  const [loading, setLoading]   = useState(false)
  const messagesRef = useRef<AgentMessage[]>(initial)
  const loadingRef  = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { loadingRef.current  = loading  }, [loading])

  return (
    <AgentContext.Provider value={{ messages, setMessages, messagesRef, loading, setLoading, loadingRef }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgentContext() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgentContext must be used within AgentProvider')
  return ctx
}
