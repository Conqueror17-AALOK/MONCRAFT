import { useMemo, useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

interface WorldLandmark {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  position: [number, number, number];
  color: string;
}

const LANDMARKS: WorldLandmark[] = [
  {
    id: 'marketplace',
    name: 'MARKETPLACE',
    subtitle: 'Trade • Economy • Negotiation',
    icon: '⚖️',
    position: [0, 4.2, 0],
    color: '#f59e0b'
  },
  {
    id: 'village',
    name: 'VILLAGE',
    subtitle: 'Residential • Tavern • Guilds',
    icon: '🏘️',
    position: [-22, 4.5, -5],
    color: '#38bdf8'
  },
  {
    id: 'farmland',
    name: 'FARM LAND',
    subtitle: 'Golden Wheat & Sustenance Mill',
    icon: '🌾',
    position: [22, 4.2, -18],
    color: '#10b981'
  },
  {
    id: 'castle',
    name: 'WARLORD CASTLE',
    subtitle: 'Fortress • Citadel of Lord Voldemort',
    icon: '🏰',
    position: [0, 8.8, 30],
    color: '#ef4444'
  },
  {
    id: 'iron_mine',
    name: 'IRON MINE',
    subtitle: 'Quarry & Smelting Furnace',
    icon: '⛏️',
    position: [24, 5.2, 20],
    color: '#fb923c'
  },
  {
    id: 'wilderness',
    name: 'WILDERNESS',
    subtitle: 'Deep Timber Woods & Pine Forest',
    icon: '🌲',
    position: [-22, 4.5, 22],
    color: '#059669'
  },
  {
    id: 'port',
    name: 'PORT',
    subtitle: 'Harbor • Pier • Lighthouse',
    icon: '⚓',
    position: [12, 3.8, -12],
    color: '#60a5fa'
  },
  {
    id: 'ruins',
    name: 'RUINS',
    subtitle: 'Ancient Gold Relics & Obelisk',
    icon: '🏛️',
    position: [0, 4.5, -32],
    color: '#f43f5e'
  }
];

export const GroundTerrain = memo(function GroundTerrain() {
  const waterRef = useRef<THREE.Mesh>(null);
  const waterfallRef = useRef<THREE.Group>(null);

  // Animate water shimmer and waterfall cascade flow with bounded baseline oscillation
  useFrame(() => {
    const t = Date.now() * 0.002;
    if (waterRef.current) {
      waterRef.current.position.y = -0.25 + Math.sin(t) * 0.035;
      if (waterRef.current.material) {
        (waterRef.current.material as THREE.MeshStandardMaterial).opacity = 0.88 + Math.sin(t * 1.8) * 0.04;
      }
    }
    if (waterfallRef.current) {
      const baseHeights = [1.8, 0.6, -0.4, -0.2];
      waterfallRef.current.children.forEach((child, i) => {
        const baseY = baseHeights[i] ?? child.position.y;
        child.position.y = baseY + Math.sin(t * 2.2 + i * 1.4) * 0.04;
      });
    }
  });

  // Pathways connecting Marketplace to key regions
  const pathways = useMemo(() => {
    const segments: Array<{ from: [number, number]; to: [number, number]; type: 'stone' | 'dirt' }> = [
      { from: [0, 0], to: [-22, -5], type: 'stone' },    // Market -> Village
      { from: [0, 0], to: [20, -16], type: 'stone' },    // Market -> Farms
      { from: [0, 0], to: [-20, 20], type: 'dirt' },     // Market -> Forest
      { from: [0, 0], to: [22, 18], type: 'stone' },     // Market -> Iron Mines
      { from: [0, 0], to: [0, 16.5], type: 'stone' },    // Market -> Castle Base Gateway Arch
      { from: [0, 0], to: [12, -12], type: 'stone' },    // Market -> Port
      { from: [0, 0], to: [0, -30], type: 'dirt' },      // Market -> Ruins
      { from: [-20, -5], to: [0, 16.5], type: 'stone' }  // Village -> Castle side road
    ];

    const blocks: Array<{ pos: [number, number, number]; rot: number; scale: [number, number, number]; isStone: boolean }> = [];

    segments.forEach((seg) => {
      const dx = seg.to[0] - seg.from[0];
      const dz = seg.to[1] - seg.from[1];
      const dist = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      const steps = Math.floor(dist / 2.0);

      for (let i = 1; i < steps; i++) {
        const ratio = i / steps;
        const x = seg.from[0] + dx * ratio + (Math.sin(i * 1.5) * 0.4);
        const z = seg.from[1] + dz * ratio + (Math.cos(i * 1.5) * 0.4);

        // Don't place stepping stones directly inside river channel (handled by bridges)
        const isRiver = Math.abs(x - (11 + Math.sin(z * 0.12) * 3.5)) < 3.2 && z >= -18 && z <= 30;
        if (!isRiver) {
          blocks.push({
            pos: [x, 0.05, z],
            rot: angle + (Math.sin(i * 3.7) * 0.15),
            scale: seg.type === 'stone' ? [1.8, 0.08, 1.4] : [1.6, 0.06, 1.3],
            isStone: seg.type === 'stone'
          });
        }
      }
    });

    return blocks;
  }, []);

  // Stepped Voxel Cliffs & Terraces
  const terrainTerraces = useMemo(() => {
    return [
      // 1. Northern High Cliff (Castle Foundation)
      { pos: [0, 2.2, 32], size: [28, 4.4, 18], color: '#475569', topColor: '#22c55e' },
      { pos: [0, 4.6, 33], size: [22, 0.4, 14], color: '#16a34a' },
      // Castle Promontory upper tier
      { pos: [0, 4.9, 32], size: [16, 0.4, 10], color: '#334155' },

      // 2. North-East Mountain Ridge (Iron Mine crags)
      { pos: [12, 0.4, 20], size: [4, 0.8, 12], color: '#374151', topColor: '#166534' }, // Step 1
      { pos: [15, 0.8, 20], size: [4, 1.6, 12], color: '#374151', topColor: '#166534' }, // Step 2
      { pos: [17, 1.2, 20], size: [4, 2.4, 12], color: '#374151', topColor: '#166534' }, // Step 3
      { pos: [28, 1.6, 22], size: [20, 3.2, 18], color: '#374151', topColor: '#166534' }, // Main cliff
      { pos: [28, 3.4, 24], size: [16, 0.4, 12], color: '#1f2937' },

      // 3. North-West Forest Ridge
      { pos: [-24, 1.0, 26], size: [20, 2.0, 16], color: '#334155', topColor: '#166534' },
      { pos: [-24, 2.1, 26], size: [18, 0.3, 14], color: '#15803d' },

      // 4. Farmland Terraced Steps
      { pos: [24, 0.25, -18], size: [20, 0.5, 20], color: '#78350f', topColor: '#84cc16' },
      { pos: [28, 0.65, -18], size: [12, 0.4, 16], color: '#78350f', topColor: '#ca8a04' },

      // 5. Village Terrace
      { pos: [-22, 0.2, -6], size: [22, 0.4, 20], color: '#475569', topColor: '#22c55e' },

      // 6. Ruins Plateau
      { pos: [0, 0.3, -32], size: [18, 0.6, 14], color: '#334155', topColor: '#16a34a' },

      // 7. Outer World Boundary Cliffs (framing the civilization)
      { pos: [-45, 2.5, 0], size: [16, 5.0, 80], color: '#334155', topColor: '#15803d' },
      { pos: [45, 2.5, 0], size: [16, 5.0, 80], color: '#334155', topColor: '#15803d' },
      { pos: [0, 3.5, 45], size: [80, 7.0, 16], color: '#1e293b', topColor: '#14532d' },
      { pos: [0, 2.0, -45], size: [80, 4.0, 16], color: '#334155', topColor: '#15803d' }
    ];
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* ================================================================== */}
      {/* 1. BASE MEADOW GRASS GROUND (Vibrant stylized green)               */}
      {/* ================================================================== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Decorative grass undertone patchwork for rich organic vibrancy */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, 0.01, -10]} receiveShadow>
        <planeGeometry args={[45, 40]} />
        <meshStandardMaterial color="#4ade80" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[16, 0.01, 15]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#16a34a" roughness={0.9} />
      </mesh>

      {/* ================================================================== */}
      {/* 2. STEPPED VOXEL CLIFFS & ELEVATION TERRACES                       */}
      {/* ================================================================== */}
      {terrainTerraces.map((t, idx) => (
        <group key={idx} position={t.pos as [number, number, number]}>
          {/* Main cliff rock body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={t.size as [number, number, number]} />
            <meshStandardMaterial color={t.color} roughness={0.9} />
          </mesh>
          {/* Green grass mantle on top of the cliff */}
          {t.topColor && (
            <mesh position={[0, t.size[1] / 2 + 0.05, 0]} receiveShadow>
              <boxGeometry args={[t.size[0] + 0.3, 0.1, t.size[2] + 0.3]} />
              <meshStandardMaterial color={t.topColor} roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}

      {/* ================================================================== */}
      {/* 3. CENTRAL AGORA CIRCULAR COBBLESTONE PLAZA                        */}
      {/* ================================================================== */}
      <group position={[0, 0.04, 0]}>
        {/* Outer circular stone boundary */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[8.8, 10.2, 32]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        {/* Main circular paved plaza floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[8.8, 32]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
        {/* Decorative inner plaza pattern */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[4.2, 4.8, 24]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.6} />
        </mesh>
        {/* Radial decorative flagstones */}
        {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((ang, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, ang]} position={[0, 0.025, 0]}>
            <planeGeometry args={[0.5, 17.2]} />
            <meshStandardMaterial color="#475569" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* ================================================================== */}
      {/* 4. ROADS & PATHWAYS                                                */}
      {/* ================================================================== */}
      {pathways.map((p, idx) => (
        <mesh key={idx} position={p.pos} rotation={[0, p.rot, 0]} receiveShadow>
          <boxGeometry args={p.scale} />
          <meshStandardMaterial
            color={p.isStone ? '#64748b' : '#92400e'}
            roughness={0.85}
          />
        </mesh>
      ))}

      {/* ================================================================== */}
      {/* 5. ENVIRONMENTAL WATER: RIVER, WATERFALL & LAKE                    */}
      {/* ================================================================== */}
      {/* Sunken Riverbed Canal */}
      <group position={[0, 0, 0]}>
        {/* Northern Mountain Waterfall Tiers */}
        <group ref={waterfallRef} position={[11, 2.5, 27]}>
          {/* Top cliff water crest */}
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[4.2, 0.3, 3]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.1} />
          </mesh>
          {/* Cascading falling water sheet 1 */}
          <mesh position={[0, 0.6, 1.2]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[3.8, 2.8, 0.4]} />
            <meshStandardMaterial color="#7dd3fc" roughness={0.1} transparent opacity={0.88} />
          </mesh>
          {/* Mid ledge pool */}
          <mesh position={[0, -0.4, 2.6]}>
            <boxGeometry args={[4.8, 0.4, 2.6]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.1} />
          </mesh>
          {/* Foam splash mesh */}
          <mesh position={[0, -0.2, 3.2]}>
            <boxGeometry args={[4.4, 0.2, 1.0]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
        </group>

        {/* Winding River Water Mesh */}
        <mesh
          ref={waterRef}
          position={[11, -0.25, 4]}
          rotation={[-Math.PI / 2, 0, -0.05]}
          receiveShadow
        >
          <planeGeometry args={[6.5, 46]} />
          <meshStandardMaterial
            color="#0284c7"
            roughness={0.15}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Southern Lake Basin (Port Harbor) */}
        <mesh
          position={[14, -0.26, -26]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[26, 22]} />
          <meshStandardMaterial
            color="#0369a1"
            roughness={0.12}
            metalness={0.1}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* Riverbank Stone Borders */}
        {[-16, -8, 0, 8, 16, 22].map((z, idx) => (
          <group key={idx} position={[11 + Math.sin(z * 0.12) * 3.5, 0, z]}>
            {/* Left Bank Rock Trim */}
            <mesh position={[-3.6, 0.05, 0]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.55 + (idx % 3) * 0.15]} />
              <meshStandardMaterial color="#475569" roughness={0.9} />
            </mesh>
            {/* Right Bank Rock Trim */}
            <mesh position={[3.6, 0.05, 0]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.5 + (idx % 2) * 0.2]} />
              <meshStandardMaterial color="#64748b" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* ============================================================== */}
        {/* 6. BRIDGES SPANNING THE RIVER                                 */}
        {/* ============================================================== */}
        {/* Classic Stepped Stone Arched Bridge (Central Crossing at z = 2) */}
        <group position={[11.5, 0, 2]}>
          {/* Bridge Roadway */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.8, 0.4, 3.4]} />
            <meshStandardMaterial color="#64748b" roughness={0.8} />
          </mesh>
          {/* North Stone Railing */}
          <mesh position={[0, 0.85, 1.5]} castShadow>
            <boxGeometry args={[7.8, 0.6, 0.35]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* South Stone Railing */}
          <mesh position={[0, 0.85, -1.5]} castShadow>
            <boxGeometry args={[7.8, 0.6, 0.35]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* Stone Pillar Support */}
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.9, 1.2, 1.4, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
          </mesh>
        </group>

        {/* Upper Timber Bridge (Forest Crossing at z = 18) */}
        <group position={[13, 0, 18]}>
          {/* Wooden Decking */}
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[6.8, 0.25, 2.6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Wooden Handrails */}
          <mesh position={[0, 0.7, 1.15]} castShadow>
            <boxGeometry args={[6.8, 0.5, 0.15]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.7, -1.15]} castShadow>
            <boxGeometry args={[6.8, 0.5, 0.15]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ================================================================== */}
      {/* 7. REFINED LANDMARK BILLBOARDS (Stylized Game-like Badges)        */}
      {/* ================================================================== */}
      {LANDMARKS.map((lm) => (
        <group key={lm.id} position={lm.position}>
          <Billboard position={[0, 0, 0]}>
            {/* Dark glass pill background badge */}
            <mesh position={[0, 0, -0.05]}>
              <planeGeometry args={[5.2, 1.35]} />
              <meshBasicMaterial color="#0f172a" transparent opacity={0.78} />
            </mesh>
            {/* Accent colored top border */}
            <mesh position={[0, 0.63, 0]}>
              <planeGeometry args={[5.2, 0.08]} />
              <meshBasicMaterial color={lm.color} />
            </mesh>

            {/* Landmark Title with Icon */}
            <Text
              position={[0, 0.2, 0.01]}
              fontSize={0.48}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="#090d16"
            >
              {`${lm.icon}  ${lm.name}`}
            </Text>

            {/* Subtitle / Description */}
            <Text
              position={[0, -0.25, 0.01]}
              fontSize={0.28}
              color="#cbd5e1"
              anchorX="center"
              anchorY="middle"
            >
              {lm.subtitle}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
});
