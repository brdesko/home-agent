export type TimelineEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  project_id: string | null
}

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TimelinePanel({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Upcoming</h2>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-400">Nothing upcoming.</p>
      ) : (
        <ul className="space-y-3">
          {events.map(event => (
            <li key={event.id} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 text-zinc-400 tabular-nums">{shortDate(event.event_date)}</span>
              <span className="text-zinc-700 leading-snug">{event.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
