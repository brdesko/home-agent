'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Photo = {
  name: string
  path: string
  size: number
  createdAt: string
  signedUrl: string | null
}

type ReviewMessage = { role: 'user' | 'assistant'; content: string }

type ReviewState = {
  photo: Photo
  status: 'prompt' | 'loading' | 'done'
  messages: ReviewMessage[]
  draft: string
}

export function PhotosTab() {
  const [photos,    setPhotos]    = useState<Photo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [lightbox,  setLightbox]  = useState<Photo | null>(null)
  const [review,    setReview]    = useState<ReviewState | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/photos')
      .then(r => r.json())
      .then((data: Photo[]) => { setPhotos(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr(null); setReview(null)
    try {
      const urlRes = await fetch('/api/photos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      const urlData = await urlRes.json()
      if (!urlRes.ok) { setUploadErr(urlData.error ?? 'Upload failed'); return }

      const supabase = createClient()
      const { error: upErr } = await supabase.storage
        .from('Home Agent')
        .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: file.type })

      if (upErr) { setUploadErr(upErr.message); return }

      const listRes = await fetch('/api/photos')
      if (listRes.ok) {
        const fresh: Photo[] = await listRes.json()
        setPhotos(fresh)
        const uploaded = fresh[0]
        if (uploaded?.signedUrl) {
          setReview({ photo: uploaded, status: 'prompt', messages: [], draft: '' })
        }
      }
    } catch (e) {
      setUploadErr(String(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function startReview() {
    if (!review) return
    setReview(r => r && { ...r, status: 'loading' })
    try {
      const res = await fetch('/api/photos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedUrl: review.photo.signedUrl, messages: [] }),
      })
      const data = await res.json()
      setReview(r => r && {
        ...r,
        status: 'done',
        messages: [{ role: 'assistant', content: data.response }],
      })
    } catch {
      setReview(r => r && { ...r, status: 'done', messages: [{ role: 'assistant', content: 'Could not reach the Agent. Try again.' }] })
    }
  }

  async function sendReply() {
    if (!review || !review.draft.trim()) return
    const userMsg: ReviewMessage = { role: 'user', content: review.draft.trim() }
    const nextMessages = [...review.messages, userMsg]
    setReview(r => r && { ...r, messages: nextMessages, draft: '', status: 'loading' })
    try {
      const res = await fetch('/api/photos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedUrl: review.photo.signedUrl, messages: nextMessages }),
      })
      const data = await res.json()
      setReview(r => r && {
        ...r,
        status: 'done',
        messages: [...nextMessages, { role: 'assistant', content: data.response }],
      })
    } catch {
      setReview(r => r && { ...r, status: 'done' })
    }
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl">

        {/* Upload */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            onChange={upload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium border border-zinc-300 rounded-lg hover:border-zinc-500 transition-colors disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : '+ Upload photo'}
          </button>
          {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
        </div>

        {/* Agent review panel */}
        {review && review.status !== 'prompt' || (review && review.status === 'prompt') ? (
          review && (
            <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-zinc-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  {review.photo.signedUrl && (
                    <img src={review.photo.signedUrl} alt={review.photo.name}
                      className="w-12 h-12 rounded-lg object-cover border border-zinc-200 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-zinc-700">Photo saved</p>
                    <p className="text-xs text-zinc-400">{review.photo.name}</p>
                  </div>
                </div>
                <button onClick={() => setReview(null)} className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0">Dismiss</button>
              </div>

              {review.status === 'prompt' && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-600">Have the Agent review this photo?</p>
                  <button
                    onClick={startReview}
                    className="px-3 py-1 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Review
                  </button>
                  <button onClick={() => setReview(null)} className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700">
                    Skip
                  </button>
                </div>
              )}

              {review.status === 'loading' && (
                <p className="text-xs text-zinc-400 italic">Agent is reviewing…</p>
              )}

              {review.status === 'done' && review.messages.length > 0 && (
                <div className="space-y-3">
                  {review.messages.map((m, i) => (
                    <div key={i} className={`text-xs leading-relaxed ${m.role === 'user' ? 'text-zinc-500 italic' : 'text-zinc-700'}`}>
                      {m.role === 'assistant' && <span className="text-zinc-400 font-medium uppercase tracking-wide text-[10px] block mb-0.5">Agent</span>}
                      {m.content}
                    </div>
                  ))}

                  {/* Only show reply if last message was from agent and we haven't gone too deep */}
                  {review.messages[review.messages.length - 1]?.role === 'assistant' && review.messages.length < 4 && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={review.draft}
                        onChange={e => setReview(r => r && { ...r, draft: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && sendReply()}
                        placeholder="Reply to Agent…"
                        className="flex-1 text-xs border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-400 bg-white"
                      />
                      <button
                        onClick={sendReply}
                        disabled={!review.draft.trim()}
                        className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ) : null}

        {/* Grid */}
        {loading ? (
          <p className="text-sm text-zinc-400">Loading photos…</p>
        ) : photos.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-medium text-zinc-500">No photos yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Upload property photos — they give the agent visual context when suggesting projects and adjustments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map(photo => (
              <button
                key={photo.name}
                onClick={() => setLightbox(photo)}
                className="aspect-square rounded-lg overflow-hidden border border-zinc-100 hover:border-zinc-300 transition-colors group relative"
              >
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
                    <span className="text-xs text-zinc-400">No preview</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            {lightbox.signedUrl && (
              <img
                src={lightbox.signedUrl}
                alt={lightbox.name}
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
              />
            )}
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-zinc-400">{lightbox.name}</p>
              <button
                onClick={() => setLightbox(null)}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
