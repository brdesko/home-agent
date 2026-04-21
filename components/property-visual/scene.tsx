'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
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
  { id: 'barn',     name: 'Barn Complex',     color: '#fb923c', cx: -38, cz:   8, w: 40, d: 30 },
  { id: 'pasture',  name: 'Pasture',          color: '#a3e635', cx:  -8, cz:  30, w: 62, d: 18 },
  { id: 'woodland', name: 'Woodland & Creek', color: '#34d399', cx:   2, cz:  44, w: 80, d: 14 },
  { id: 'drive',    name: 'Entry Drive',      color: '#94a3b8', cx:  40, cz:  -8, w: 18, d: 28 },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function Building({ pos, size, color, roofColor }: {
  pos: [number, number, number]
  size: [number, number, number]
  color: string
  roofColor?: string
}) {
  const [w, h, d] = size
  return (
    <group position={[pos[0], h / 2, pos[2]]}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} flatShading roughness={0.9} metalness={0.05} />
      </mesh>
      {roofColor && (
        <mesh position={[0, h / 2 + (Math.max(w, d) * 0.18), 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.76, Math.max(w, d) * 0.36, 4]} />
          <meshStandardMaterial color={roofColor} flatShading roughness={0.95} />
        </mesh>
      )}
    </group>
  )
}

function Pool({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.12, 0]} scale={[1, 1, 0.72]} receiveShadow>
        <cylinderGeometry args={[7.2, 7.2, 0.2, 32]} />
        <meshStandardMaterial color="#334155" roughness={1} />
      </mesh>
      <mesh position={[0, 0.22, 0]} scale={[1, 1, 0.72]}>
        <cylinderGeometry args={[5.6, 5.6, 0.2, 32]} />
        <meshStandardMaterial color="#0369a1" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  )
}

function TreeCluster({ pos, count, spread, height }: {
  pos: [number, number, number]
  count: number
  spread: number
  height: number
}) {
  const trees = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + i * 0.5
      const r = (0.3 + (i % 3) * 0.35) * spread
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        h: height * (0.78 + (i % 4) * 0.08),
        r: 1.2 + (i % 3) * 0.6,
      }
    }), [count, spread, height])

  return (
    <group position={pos}>
      {trees.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2, t.z]} castShadow>
          <cylinderGeometry args={[t.r * 0.6, t.r, t.h, 6]} />
          <meshStandardMaterial color="#1a3320" flatShading roughness={1} />
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
    <group position={[zone.cx, 0.08, zone.cz]} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[zone.w, zone.d]} />
        <meshBasicMaterial
          color={zone.color}
          transparent
          opacity={active ? 0.18 : 0.07}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Html position={[0, 0.4, 0]} center distanceFactor={80}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: active ? '#fff' : 'rgba(255,255,255,0.45)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          textShadow: '0 1px 6px rgba(0,0,0,0.9)',
          fontFamily: 'system-ui, sans-serif',
          transition: 'color 0.2s',
        }}>
          {zone.name}
        </div>
      </Html>
    </group>
  )
}

// Ground grid using two primitives: fine + major
function PropertyGrid() {
  const fine  = useMemo(() => new THREE.GridHelper(200, 100, 0x1e2d40, 0x1e2d40), [])
  const major = useMemo(() => new THREE.GridHelper(200,  10, 0x2d4a6e, 0x2d4a6e), [])
  return (
    <>
      <primitive object={fine}  position={[0, 0, 0]} />
      <primitive object={major} position={[0, 0.005, 0]} />
    </>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export default function PropertyScene({
  activeZone,
  onZoneClick,
}: {
  activeZone: ZoneId | null
  onZoneClick: (id: ZoneId) => void
}) {
  return (
    <Canvas
      camera={{ position: [10, 65, 95], fov: 42 }}
      style={{ background: '#0d1117' }}
      shadows
      gl={{ antialias: true }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[60, 90, 40]} intensity={1.4} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-far={300}
        shadow-camera-left={-100} shadow-camera-right={100}
        shadow-camera-top={100} shadow-camera-bottom={-100}
      />
      <directionalLight position={[-40, 50, -30]} intensity={0.25} />

      {/* Ground */}
      <PropertyGrid />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#0a1520" roughness={1} />
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

      {/* ── Main house (L-shape: two boxes) ── */}
      <Building pos={[6, 0, -4]}  size={[22, 5.5, 28]} color="#7b96b2" roofColor="#4a6278" />
      <Building pos={[17, 0, 9]}  size={[13, 4.5, 14]} color="#7b96b2" roofColor="#4a6278" />

      {/* ── Pool area ── */}
      <Pool pos={[31, -22]} />

      {/* ── Small outbuilding east of house ── */}
      <Building pos={[36, 0, -10]} size={[9, 3.5, 11]} color="#607b90" />

      {/* ── Red barn ── */}
      <Building pos={[-20, 0, 12]} size={[15, 8, 22]} color="#8d6e63" roofColor="#5d3f38" />

      {/* ── Large white greenhouse / stable complex ── */}
      <Building pos={[-44, 0, 5]}  size={[28, 4, 20]} color="#b8ccd8" />
      <Building pos={[-52, 0, 8]}  size={[12, 5, 16]} color="#a8bcc8" roofColor="#7a9ab0" />

      {/* ── Tree masses ── */}
      {/* North belt (near road) */}
      <TreeCluster pos={[-20, 0, -32]} count={7} spread={6} height={10} />
      <TreeCluster pos={[8,   0, -34]} count={6} spread={5} height={9}  />
      <TreeCluster pos={[22,  0, -30]} count={5} spread={4} height={8}  />
      {/* Northwest corner */}
      <TreeCluster pos={[-55, 0, -22]} count={8} spread={7} height={10} />
      <TreeCluster pos={[-65, 0, -10]} count={6} spread={5} height={9}  />
      {/* South woodland belt (creek line) */}
      <TreeCluster pos={[-38, 0, 44]} count={8} spread={7} height={11} />
      <TreeCluster pos={[-15, 0, 46]} count={9} spread={7} height={12} />
      <TreeCluster pos={[10,  0, 45]} count={8} spread={7} height={11} />
      <TreeCluster pos={[32,  0, 43]} count={7} spread={6} height={10} />
      <TreeCluster pos={[50,  0, 42]} count={6} spread={5} height={9}  />

      {/* ── Driveway (flat dark planes) ── */}
      <mesh position={[40, 0.04, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 18]} />
        <meshBasicMaterial color="#111c2a" />
      </mesh>
      <mesh position={[36, 0.04, -16]} rotation={[-Math.PI / 2, 0.25, 0]}>
        <planeGeometry args={[7, 16]} />
        <meshBasicMaterial color="#111c2a" />
      </mesh>
      <mesh position={[26, 0.04, -6]} rotation={[-Math.PI / 2, 0.5, 0]}>
        <planeGeometry args={[7, 14]} />
        <meshBasicMaterial color="#111c2a" />
      </mesh>
      {/* Parking area near barn */}
      <mesh position={[-28, 0.04, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 14]} />
        <meshBasicMaterial color="#111c2a" />
      </mesh>

      {/* ── Fence lines ── */}
      <mesh position={[12, 0.4, 22]}>
        <boxGeometry args={[46, 0.5, 0.3]} />
        <meshStandardMaterial color="#2d4a6e" />
      </mesh>
      <mesh position={[34, 0.4, 8]}>
        <boxGeometry args={[0.3, 0.5, 28]} />
        <meshStandardMaterial color="#2d4a6e" />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.07}
        minDistance={18}
        maxDistance={160}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 5]}
      />
    </Canvas>
  )
}
