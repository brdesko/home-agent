'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const [status, setStatus] = useState('Setting up your account…')

  useEffect(() => {
    const supabase = createClient()

    // Handle hash-based tokens from Supabase invite links
    const hash   = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token  = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      setStatus('Invalid or expired link. Redirecting…')
      setTimeout(() => { window.location.href = '/login?error=auth' }, 2000)
      return
    }

    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data, error }) => {
      if (error || !data.user) {
        setStatus('Something went wrong. Redirecting…')
        setTimeout(() => { window.location.href = '/login?error=auth' }, 2000)
        return
      }

      window.location.href = '/setup-password'
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center space-y-3">
        <p className="font-display text-xl text-zinc-700">Parcel</p>
        <p className="text-sm text-zinc-400">{status}</p>
      </div>
    </div>
  )
}
