import { NextResponse } from 'next/server'

// PDF text extraction on Vercel Hobby (10s limit) is not feasible with any
// current server-side library. Users should use the Paste text option instead.
export async function POST() {
  return NextResponse.json({
    error: 'Direct PDF parsing is not supported in this environment. Open the PDF, press Ctrl+A then Ctrl+C to copy all text, then use the "Paste text" option in the Parse with Agent section below.',
  }, { status: 422 })
}
