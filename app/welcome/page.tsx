import Link from 'next/link'

const SAGE     = 'oklch(0.50 0.10 155)'
const SAGE_LIGHT = 'oklch(0.94 0.04 155)'
const SIDEBAR_BG = 'oklch(0.16 0.012 80)'

const FEATURES = [
  {
    title: 'Property Notebook',
    body:  'Every project, task, budget line, and timeline event in one place — organized by domain (farm, renovation, maintenance, grounds) and tied to your goals.',
  },
  {
    title: 'Conversational Agent',
    body:  'Describe a project in plain language and the Agent structures it: tasks, budget estimates, timeline events, and effort flags. It cross-references your existing projects so nothing conflicts.',
  },
  {
    title: 'Quarterly Planning',
    body:  'A rolling 4-quarter view of financial and effort risk. See where you\'re overcommitted before it becomes a problem. Budget targets, actual spend, and effort load in one chart.',
  },
  {
    title: 'Calendar Awareness',
    body:  'Mark vacations, holidays, and busy periods on the property calendar. Overlay project timeline events to spot conflicts weeks before they happen.',
  },
  {
    title: 'Purchase History',
    body:  'Log what you buy, where, and for how much. The Agent learns your vendors and pricing over time — and uses that history when making recommendations.',
  },
  {
    title: 'Home Details & Assets',
    body:  'Upload closing documents or paste property listings. The Agent parses them and pre-fills your property profile, asset inventory, and first project suggestions.',
  },
]

const TAGLINES = [
  'Your property. Actually organized.',
  'For people who own more than they can keep track of.',
  'Part planner, part advisor, part memory.',
]

export default function WelcomePage() {
  const requestEmail  = 'brdesko@gmail.com'
  const mailtoSubject = encodeURIComponent('Parcel — Access Request')
  const mailtoBody    = encodeURIComponent(
    'Hi Brady,\n\nI came across Parcel and would love to try it for my property.\n\nMy name: \nMy email: \nMy property address: \n\nA bit about what I\'d use it for:\n'
  )
  const mailto = `mailto:${requestEmail}?subject=${mailtoSubject}&body=${mailtoBody}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.992 0.003 75)' }}>

      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: SAGE }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="font-display text-[18px] text-zinc-800 leading-none tracking-tight">Parcel</span>
        </div>
        <a href={mailto}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: SAGE }}>
          Request Access
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-8 pt-20 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: SAGE }}>
          Private beta
        </p>
        <h1 className="font-display text-[52px] text-zinc-800 leading-tight tracking-tight mb-6">
          A smarter way to manage<br />your property.
        </h1>
        <p className="text-lg text-zinc-500 leading-relaxed max-w-xl mx-auto mb-10">
          Parcel is a personal property management platform built for homeowners with real projects — renovations, farms, maintenance, grounds. It combines a structured notebook with a conversational AI agent that actually knows your property.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={mailto}
            className="px-6 py-3 rounded-xl text-base font-medium text-white"
            style={{ backgroundColor: SAGE }}>
            Request access →
          </a>
          <span className="text-sm text-zinc-400">Invitation-only during beta</span>
        </div>
      </section>

      {/* Tagline strip */}
      <section style={{ backgroundColor: SIDEBAR_BG }} className="py-10 px-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-around gap-6">
          {TAGLINES.map(t => (
            <p key={t} className="text-sm font-medium text-center" style={{ color: 'oklch(1 0 0 / 0.60)' }}>
              {t}
            </p>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-8 py-20">
        <h2 className="font-display text-[32px] text-zinc-800 text-center mb-12">Everything in one place.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-xl border border-zinc-200 p-6 space-y-2">
              <h3 className="font-semibold text-zinc-800 text-[15px]">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ backgroundColor: SAGE_LIGHT }} className="py-20 px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-[32px] text-zinc-800 text-center mb-12">How it works</h2>
          <div className="space-y-8">
            {[
              { n: '01', title: 'Add your property',     body: 'Paste a Zillow link or upload your closing documents. Parcel\'s Agent reads them and pre-populates your property profile — address, square footage, acreage, systems, and assets.' },
              { n: '02', title: 'Tell the Agent your plans', body: 'Describe a project in plain language — "I want to fence the back field this spring, probably $3,000 budget." The Agent builds a structured plan with tasks, budget lines, and a timeline event.' },
              { n: '03', title: 'Track as things happen', body: 'Log what you buy, what you complete, and what you hire out. The Agent keeps a running picture of where your money and effort are going — and flags when a quarter is getting overloaded.' },
              { n: '04', title: 'Stay ahead', body: 'The calendar shows when your vacation overlaps with a contractor visit. The quarterly risk view shows when you\'ve committed more than your budget can cover. No surprises.' },
            ].map(step => (
              <div key={step.n} className="flex gap-6">
                <span className="font-display text-[32px] leading-none shrink-0 w-10" style={{ color: SAGE }}>{step.n}</span>
                <div>
                  <h3 className="font-semibold text-zinc-800 mb-1">{step.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for */}
      <section className="max-w-3xl mx-auto px-8 py-20 text-center">
        <h2 className="font-display text-[32px] text-zinc-800 mb-6">Built for homeowners with real properties.</h2>
        <p className="text-zinc-500 text-base leading-relaxed max-w-xl mx-auto mb-8">
          Not a CRM. Not a task app. Not a spreadsheet. Parcel is purpose-built for the specific chaos of owning land, maintaining systems, running seasonal projects, and trying to stay on top of it all without losing your mind — or your budget.
        </p>
        <p className="text-sm text-zinc-400">
          Currently in private beta. Invitation only.
        </p>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: SIDEBAR_BG }} className="py-20 px-8 text-center">
        <h2 className="font-display text-[36px] text-white leading-tight mb-4">
          Interested?
        </h2>
        <p className="text-base mb-8" style={{ color: 'oklch(1 0 0 / 0.60)' }}>
          Send a quick note and I'll get you set up.
        </p>
        <a href={mailto}
          className="inline-block px-8 py-4 rounded-xl text-base font-medium text-white transition-colors"
          style={{ backgroundColor: SAGE }}>
          Request access →
        </a>
        <p className="mt-4 text-xs" style={{ color: 'oklch(1 0 0 / 0.35)' }}>
          Clicking opens a pre-filled email. No forms, no waitlists.
        </p>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
        <span>Parcel — private beta</span>
        <Link href="/login" className="hover:text-zinc-600 transition-colors">Sign in</Link>
      </footer>
    </div>
  )
}
