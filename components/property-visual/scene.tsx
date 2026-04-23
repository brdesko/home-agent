'use client'

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

// ─── Property layout ──────────────────────────────────────────────────────────
// Coordinate system: +X = east, +Z = south, Y = up
// 1 unit ≈ 2.5 metres. Property ~5.3 acres (≈ 80×60 units)
// Based on aerial photography of 5090 Durham Rd, Pipersville PA

export type ZoneId = 'house' | 'pool' | 'barn' | 'pasture' | 'woodland' | 'drive'

export const ZONES: { id: ZoneId; name: string; color: string; cx: number; cz: number; w: number; d: number }[] = [
  { id: 'house',    name: 'House & Gardens',  color: '#4ade80', cx:   5, cz:  -2, w: 50, d: 42 },
  { id: 'pool',     name: 'Pool & Patio',     color: '#38bdf8', cx:  32, cz: -22, w: 24, d: 22 },
  { id: 'barn',     name: 'Barn Complex',     color: '#fb923c', cx: -36, cz:   7, w: 44, d: 30 },
  { id: 'pasture',  name: 'Pasture',          color: '#a3e635', cx:  -8, cz:  30, w: 62, d: 18 },
  { id: 'woodland', name: 'Woodland & Creek', color: '#34d399', cx:   2, cz:  44, w: 80, d: 14 },
  { id: 'drive',    name: 'Entry Drive',      color: '#94a3b8', cx:  40, cz:  -8, w: 18, d: 28 },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function Building({ pos, size, color }: {
  pos: [number, number, number]
  size: [number, number, number]
  color: string
}) {
  const [w, h, d] = size
  return (
    <group position={[pos[0], h / 2, pos[2]]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Flat roof cap — slightly different shade so edges read clearly */}
      <mesh position={[0, h / 2 + 0.05, 0]}>
        <boxGeometry args={[w + 0.1, 0.12, d + 0.1]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  )
}

function Pool({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* Pool surround */}
      <mesh position={[0, 0.08, 0]} scale={[1, 1, 0.72]} receiveShadow>
        <cylinderGeometry args={[6.4, 6.4, 0.16, 32]} />
        <meshStandardMaterial color="#1e3a55" roughness={1} />
      </mesh>
      {/* Water */}
      <mesh position={[0, 0.18, 0]} scale={[1, 1, 0.72]}>
        <cylinderGeometry args={[5.0, 5.0, 0.12, 32]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.2} metalness={0.3} />
      </mesh>
    </group>
  )
}

// Flat canopy disc — reads as plan-view tree mass
function TreeCluster({ pos, count, spread, radius }: {
  pos: [number, number, number]
  count: number
  spread: number
  radius: number
}) {
  const trees = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + i * 0.9
      const r = (0.25 + (i % 3) * 0.38) * spread
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        r: radius * (0.65 + (i % 4) * 0.15),
      }
    }), [count, spread, radius])

  return (
    <group position={pos}>
      {trees.map((t, i) => (
        <mesh key={i} position={[t.x, 0.25, t.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[t.r, 7]} />
          <meshStandardMaterial color="#1a3322" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function ZoneOverlay({ zone, active, onClick }: {
  zone: typeof ZONES[0]
  active: boolean
  onClick: () => void
}) {
  return (
    <group position={[zone.cx, 0.06, zone.cz]} onClick={(e) => { e.stopPropagation(); onClick() }}>
      {/* Fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zone.w, zone.d]} />
        <meshBasicMaterial
          color={zone.color}
          transparent
          opacity={active ? 0.22 : 0.10}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Border */}
      <lineSegments position={[0, 0.01, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(zone.w, zone.d)]} />
        <lineBasicMaterial color={zone.color} transparent opacity={active ? 0.7 : 0.28} />
      </lineSegments>
      <Html position={[0, 0.5, 0]} center distanceFactor={70}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: active ? '#fff' : 'rgba(255,255,255,0.50)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          textShadow: '0 1px 8px rgba(0,0,0,0.95)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {zone.name}
        </div>
      </Html>
    </group>
  )
}

function PropertyGrid() {
  const fine  = useMemo(() => new THREE.GridHelper(200, 80, 0x1a2d40, 0x1a2d40), [])
  const major = useMemo(() => new THREE.GridHelper(200, 10, 0x253d5a, 0x253d5a), [])
  return (
    <>
      <primitive object={fine}  position={[0, 0, 0]} />
      <primitive object={major} position={[0, 0.005, 0]} />
    </>
  )
}

// ─── Compass rose (N indicator) ───────────────────────────────────────────────
function Compass() {
  return (
    <Html position={[-68, 0.1, -44]} center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        pointerEvents: 'none',
        opacity: 0.55,
      }}>
        <div style={{ fontSize: '10px', color: '#fff', fontFamily: 'system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.1em' }}>N</div>
        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ width: '7px', height: '7px', borderLeft: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)', transform: 'rotate(-45deg)', marginTop: '-5px' }} />
      </div>
    </Html>
  )
}

// ─── Unconfigured placeholder ─────────────────────────────────────────────────

function UnconfiguredScene() {
  return (
    <Canvas camera={{ position: [0, 60, 40], fov: 36 }} style={{ background: '#0e1520' }}>
      <ambientLight intensity={0.4} />
      <PropertyGrid />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#0c1824" roughness={1} />
      </mesh>
      <Html position={[0, 2, 0]} center>
        <div style={{
          textAlign: 'center',
          pointerEvents: 'none',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
            Property map not yet configured
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '6px' }}>
            Use the Agent to add zones and buildings
          </p>
        </div>
      </Html>
      <OrbitControls enableDamping dampingFactor={0.07} minDistance={18} maxDistance={180} maxPolarAngle={Math.PI / 2.05} target={[0, 0, 0]} />
    </Canvas>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export default function PropertyScene({
  activeZone,
  onZoneClick,
  isConfigured,
}: {
  activeZone: ZoneId | null
  onZoneClick: (id: ZoneId) => void
  isConfigured: boolean
}) {
  if (!isConfigured) return <UnconfiguredScene />

  return (
    <Canvas
      camera={{ position: [8, 95, 58], fov: 36 }}
      style={{ background: '#0e1520' }}
      shadows
      gl={{ antialias: true }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[50, 80, 30]} intensity={1.2} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-far={300}
        shadow-camera-left={-100} shadow-camera-right={100}
        shadow-camera-top={100} shadow-camera-bottom={-100}
      />
      <directionalLight position={[-30, 50, -20]} intensity={0.30} />

      {/* Ground */}
      <PropertyGrid />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#0c1824" roughness={1} />
      </mesh>

      {/* Zone overlays */}
      {ZONES.map(z => (
        <ZoneOverlay
          key={z.id}
          zone={z}
          active={activeZone === z.id}
          onClick={() => onZoneClick(z.id)}
        />
      ))}

      {/* ── Main house (L-shape: two volumes) ── */}
      <Building pos={[4, 0, -4]}   size={[22, 3.0, 26]} color="#8ba3b8" />
      <Building pos={[16, 0, 8]}   size={[12, 2.5, 13]} color="#8ba3b8" />

      {/* ── Pool area ── */}
      <Pool pos={[31, -22]} />
      {/* Pool deck */}
      <mesh position={[31, 0.04, -22]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 16]} />
        <meshStandardMaterial color="#152236" roughness={1} />
      </mesh>

      {/* ── Small outbuilding east of house ── */}
      <Building pos={[35, 0, -10]} size={[8, 1.8, 10]} color="#6b8299" />

      {/* ── Red barn ── */}
      <Building pos={[-30, 0, 10]} size={[14, 4.5, 20]} color="#7a5c52" />

      {/* ── Large white stable / greenhouse complex ── */}
      <Building pos={[-46, 0, 4]}  size={[26, 2.5, 18]} color="#b0c4d4" />
      <Building pos={[-48, 0, 18]} size={[10, 3.0, 12]} color="#a0b4c4" />

      {/* ── Tree masses — flat canopy discs ── */}
      {/* North belt near road */}
      <TreeCluster pos={[-18, 0, -34]} count={6} spread={5} radius={2.8} />
      <TreeCluster pos={[6,   0, -36]} count={5} spread={4} radius={2.5} />
      <TreeCluster pos={[22,  0, -32]} count={4} spread={3.5} radius={2.2} />
      {/* Northwest corner */}
      <TreeCluster pos={[-56, 0, -20]} count={7} spread={6} radius={3.0} />
      <TreeCluster pos={[-64, 0, -8]}  count={5} spread={4.5} radius={2.8} />
      {/* South woodland belt */}
      <TreeCluster pos={[-40, 0, 44]} count={8} spread={7} radius={3.5} />
      <TreeCluster pos={[-18, 0, 46]} count={9} spread={7} radius={3.5} />
      <TreeCluster pos={[6,   0, 45]} count={8} spread={6} radius={3.2} />
      <TreeCluster pos={[28,  0, 44]} count={7} spread={5.5} radius={3.0} />
      <TreeCluster pos={[46,  0, 43]} count={5} spread={4.5} radius={2.8} />

      {/* ── Driveway ── */}
      <mesh position={[40, 0.04, -32]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 16]} />
        <meshBasicMaterial color="#0f1f30" />
      </mesh>
      <mesh position={[36, 0.04, -18]} rotation={[-Math.PI / 2, 0.22, 0]}>
        <planeGeometry args={[6, 14]} />
        <meshBasicMaterial color="#0f1f30" />
      </mesh>
      <mesh position={[26, 0.04, -7]} rotation={[-Math.PI / 2, 0.48, 0]}>
        <planeGeometry args={[6, 14]} />
        <meshBasicMaterial color="#0f1f30" />
      </mesh>
      {/* Barn parking */}
      <mesh position={[-32, 0.04, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 12]} />
        <meshBasicMaterial color="#0f1f30" />
      </mesh>

      {/* ── Fence lines ── */}
      <mesh position={[10, 0.3, 22]}>
        <boxGeometry args={[44, 0.35, 0.25]} />
        <meshStandardMaterial color="#2a4060" />
      </mesh>
      <mesh position={[32, 0.3, 8]}>
        <boxGeometry args={[0.25, 0.35, 24]} />
        <meshStandardMaterial color="#2a4060" />
      </mesh>

      {/* ── Compass ── */}
      <Compass />

      <OrbitControls
        enableDamping
        dampingFactor={0.07}
        minDistance={18}
        maxDistance={180}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 8]}
      />
    </Canvas>
  )
}
