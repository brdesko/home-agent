'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(JSON.stringify({
      level: 'error',
      event: 'client:unhandled-error',
      ts: new Date().toISOString(),
      message: error.message,
      digest: error.digest,
    }))
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center space-y-4 max-w-sm px-6">
        <p className="font-display text-xl text-zinc-700">Something went wrong</p>
        <p className="text-sm text-zinc-400">An unexpected error occurred. You can try again or reload the page.</p>
        <button
          onClick={reset}
          className="text-sm text-zinc-500 underline hover:text-zinc-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
