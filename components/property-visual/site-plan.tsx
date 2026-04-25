'use client'

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

export type Zone = {
  id: string
  name: string
  color: string
  x: number
  y: number
  width: number
  height: number
  description?: string
  floor_plan_photo_url?: string | null
}

export type Building = {
  id: string
  label?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export type SiteConfig = {
  bounds?: { width: number; height: number }
  buildings?: Building[]
}

const GRID_STEP = 10

export function SitePlan({
  config,
  zones,
  activeZoneId,
  onZoneClick,
}: {
  config: SiteConfig
  zones: Zone[]
  activeZoneId: string | null
  onZoneClick: (id: string) => void
}) {
  const W = config.bounds?.width  ?? 100
  const H = config.bounds?.height ?? 80

  const vLines = Array.from({ length: Math.floor(W / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP)
  const hLines = Array.from({ length: Math.floor(H / GRID_STEP) + 1 }, (_, i) => i * GRID_STEP)

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.3}
      maxScale={12}
      wheel={{ step: 0.08 }}
      centerOnInit
      limitToBounds={false}
    >
      <TransformComponent
        wrapperStyle={{ width: '100%', height: '100%' }}
        contentStyle={{ width: '100%', height: '100%' }}
      >
        <svg
          width={880}
          height={704}
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          {/* Ground */}
          <rect x={0} y={0} width={W} height={H} fill="#0c1824" />

          {/* Fine grid */}
          {vLines.map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#1a2d40" strokeWidth="0.12" />)}
          {hLines.map(y => <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#1a2d40" strokeWidth="0.12" />)}

          {/* Zone overlays */}
          {zones.map(zone => {
            const active = activeZoneId === zone.id
            return (
              <g
                key={zone.id}
                onClick={() => onZoneClick(zone.id)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={zone.x} y={zone.y}
                  width={zone.width} height={zone.height}
                  fill={zone.color}
                  fillOpacity={active ? 0.24 : 0.10}
                  stroke={zone.color}
                  strokeWidth={active ? 0.45 : 0.22}
                  strokeOpacity={active ? 1 : 0.40}
                  rx="0.4"
                />
                <text
                  x={zone.x + zone.width / 2}
                  y={zone.y + zone.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="2.0"
                  fontWeight="700"
                  letterSpacing="0.18"
                  fill={active ? '#ffffff' : 'rgba(255,255,255,0.48)'}
                  style={{ textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none', fontFamily: 'system-ui, sans-serif' }}
                >
                  {zone.name}
                </text>
              </g>
            )
          })}

          {/* Buildings */}
          {(config.buildings ?? []).map(b => (
            <g key={b.id} style={{ pointerEvents: 'none' }}>
              <rect
                x={b.x} y={b.y}
                width={b.width} height={b.height}
                fill={b.color ?? '#8ba3b8'}
                fillOpacity={0.88}
                rx="0.3"
              />
              {b.label && (
                <text
                  x={b.x + b.width / 2}
                  y={b.y + b.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="1.3"
                  fill="rgba(255,255,255,0.65)"
                  style={{ userSelect: 'none', fontFamily: 'system-ui, sans-serif' }}
                >
                  {b.label}
                </text>
              )}
            </g>
          ))}

          {/* Compass — top-right corner */}
          <g style={{ pointerEvents: 'none', opacity: 0.5 }}>
            <text x={W - 3} y={4} textAnchor="middle" fontSize="2.2" fontWeight="700" fill="#fff"
              style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none' }}>N</text>
            <line x1={W - 3} y1={5.2} x2={W - 3} y2={8.5} stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
            <polygon points={`${W - 3.7},8.5 ${W - 3},6.8 ${W - 2.3},8.5`} fill="rgba(255,255,255,0.4)" />
          </g>
        </svg>
      </TransformComponent>
    </TransformWrapper>
  )
}
