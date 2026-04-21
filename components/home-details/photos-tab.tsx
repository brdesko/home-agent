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

export function PhotosTab() {
  const [photos,    setPhotos]    = useState<Photo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [lightbox,  setLightbox]  = useState<Photo | null>(null)
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
    setUploading(true); setUploadErr(null)
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
      if (listRes.ok) setPhotos(await listRes.json())
    } catch (e) {
      setUploadErr(String(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
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
