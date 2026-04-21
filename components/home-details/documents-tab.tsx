'use client'

import { useState, useRef } from 'react'
import { ParseConfirmation, type ParseResult } from './parse-confirmation'

type Doc = {
  name: string
  path: string
  size: number
  mimeType: string
  createdAt: string
  signedUrl: string | null
}

type Props = {
  initial: Doc[]
  isOwner: boolean
}

function fileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('image')) return '🖼️'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  return '📎'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsTab({ initial, isOwner }: Props) {
  const [docs,        setDocs]        = useState<Doc[]>(initial)
  const [uploading,   setUploading]   = useState(false)
  const [uploadErr,   setUploadErr]   = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [parseMode,   setParseMode]   = useState<'url' | 'text'>('url')
  const [parseUrl,    setParseUrl]    = useState('')
  const [pasteText,   setPasteText]   = useState('')
  const [parsing,     setParsing]     = useState<string | null>(null) // path, 'url', or 'text'
  const [parseErr,    setParseErr]    = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadErr(data.error ?? 'Upload failed'); return }
      // Refresh list
      const listRes = await fetch('/api/documents')
      if (listRes.ok) setDocs(await listRes.json())
    } catch (e) { setUploadErr(String(e)) } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deleteDoc(name: string) {
    setDeleting(name)
    try {
      await fetch(`/api/documents/${encodeURIComponent(name)}`, { method: 'DELETE' })
      setDocs(d => d.filter(f => f.name !== name))
    } finally { setDeleting(null) }
  }

  async function parseDoc(path: string) {
    setParsing(path); setParseResult(null); setParseErr(null)
    try {
      const res = await fetch('/api/agent/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'document', path }),
      })
      const data = await res.json().catch(() => ({ error: 'The server did not respond — the PDF may be too large or took too long to process. Try a smaller file.' }))
      setParsing(null)
      if (!res.ok || data.error) { setParseErr(data.error ?? 'Parse failed'); return }
      setParseResult(data as ParseResult)
    } catch (e) {
      setParsing(null)
      setParseErr(`Parse failed: ${String(e)}`)
    }
  }

  async function parseFromExternal() {
    const key  = parseMode === 'url' ? 'url' : 'text'
    const val  = parseMode === 'url' ? parseUrl.trim() : pasteText.trim()
    if (!val) return
    setParsing(parseMode); setParseErr(null)
    try {
      const res = await fetch('/api/agent/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: parseMode, [key]: val }),
      })
      const data = await res.json().catch(() => ({ error: 'The server did not respond — please try again.' }))
      setParsing(null)
      if (!res.ok || data.error) { setParseErr(data.error ?? 'Parse failed'); return }
      setParseResult(data as ParseResult)
    } catch (e) {
      setParsing(null)
      setParseErr(`Parse failed: ${String(e)}`)
    }
  }

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        {/* Upload */}
        {isOwner && (
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" onChange={upload} className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.md,.docx,.xlsx,.csv" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 text-sm font-medium border border-zinc-300 rounded-lg hover:border-zinc-500 transition-colors disabled:opacity-40">
              {uploading ? 'Uploading…' : '+ Upload document'}
            </button>
            {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
          </div>
        )}

        {/* File list */}
        {docs.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">No documents yet. Upload inspection reports, warranties, manuals, or permits.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map(doc => (
              <li key={doc.name} className="border border-zinc-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{fileIcon(doc.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{doc.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.signedUrl && (
                      <a href={doc.signedUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
                        Download
                      </a>
                    )}
                    {isOwner && (
                      <>
                        <button
                          onClick={() => parseDoc(doc.path)}
                          disabled={parsing === doc.path}
                          className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-40">
                          {parsing === doc.path ? 'Parsing…' : 'Parse with Agent'}
                        </button>
                        {parsing === doc.path && parseErr && (
                          <p className="text-xs text-red-500 mt-1">{parseErr}</p>
                        )}
                        <button
                          onClick={() => deleteDoc(doc.name)}
                          disabled={deleting === doc.name}
                          className="text-xs text-zinc-300 hover:text-red-500 transition-colors">
                          {deleting === doc.name ? '…' : '✕'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Parse error */}
        {parseErr && !parseResult && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parseErr}</p>
        )}

        {/* Parse from URL or pasted text */}
        {isOwner && (
          <section className="space-y-3 border-t border-zinc-100 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Parse with Agent</h2>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setParseMode('url')}
                  className={`px-2.5 py-1 rounded-full transition-colors ${parseMode === 'url' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                  URL
                </button>
                <button onClick={() => setParseMode('text')}
                  className={`px-2.5 py-1 rounded-full transition-colors ${parseMode === 'text' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                  Paste text
                </button>
              </div>
            </div>

            {parseMode === 'url' ? (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-400">Paste any property listing URL, including Zillow and Redfin.</p>
                <div className="flex gap-2">
                  <input value={parseUrl} onChange={e => setParseUrl(e.target.value)}
                    placeholder="https://…"
                    className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400" />
                  <button onClick={parseFromExternal} disabled={!!parsing || !parseUrl.trim()}
                    className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors shrink-0">
                    {parsing === 'url' ? 'Parsing…' : 'Parse'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-400">On the Zillow or Redfin listing, press Ctrl+A then Ctrl+C, then paste below.</p>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                  rows={5} placeholder="Paste listing text here…"
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 resize-none" />
                <button onClick={parseFromExternal} disabled={!!parsing || !pasteText.trim()}
                  className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors">
                  {parsing === 'text' ? 'Parsing…' : 'Parse'}
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {parseResult && (
        <ParseConfirmation
          result={parseResult}
          onClose={() => setParseResult(null)}
          onApplied={() => { setParseResult(null); window.location.reload() }}
        />
      )}
    </>
  )
}
