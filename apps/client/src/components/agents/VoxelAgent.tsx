import { useRef, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { AgentRuntimeState } from '@civilization/shared';
import { getTerrainHeight } from '../world/terrainHeight';

const ARCHETYPE_ICONS: Record<string, string> = {
  MERCHANT: '💰',
  WARLORD: '⚔️',
  DIPLOMAT: '📜',
  AGRARIAN: '🌾',
  FARMER: '🌾',
  INDUSTRIALIST: '⚙️',
  TREASURE_HUNTER: '🧭',
  STRATEGIST: '♟️',
  OPPORTUNIST: '🗡️',
  REBEL: '🔥',
  MYSTIC: '✨',
  ALCHEMIST: '🧪'
};

const AgentNameplate = memo(function AgentNameplate({
  agent,
  isSelected,
  icon
}: {
  agent: AgentRuntimeState;
  isSelected: boolean;
  icon: string;
}) {
  const shouldShowLabel = agent.category === 'CORE_AI' || isSelected;
  if (!shouldShowLabel) return null;

  return (
    <Billboard position={[0, 2.3, 0]}>
      {isSelected && (
        <>
          {/* Dark Glass Pill Container */}
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[3.4, 0.85]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.88} />
          </mesh>
          {/* Colored Top Accent Bar */}
          <mesh position={[0, 0.4, -0.01]}>
            <planeGeometry args={[3.4, 0.04]} />
            <meshBasicMaterial color={agent.colorHex} />
          </mesh>
        </>
      )}

      {/* Line 1: [Icon] Name (Static, zero glyph re-rasterization) */}
      <Text
        position={[0, isSelected ? 0.15 : 0, 0.01]}
        fontSize={isSelected ? 0.32 : 0.24}
        color={isSelected ? '#38bdf8' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.035}
        outlineColor="#000000"
      >
        {`${icon} ${agent.name}`}
      </Text>

      {/* Line 2: State / Activity (Only when selected to prevent 10Hz font re-rendering across all agents) */}
      {isSelected && (
        <Text
          position={[0, -0.2, 0.01]}
          fontSize={0.24}
          color={agent.actionState === 'TRADING' ? '#fbbf24' : '#94a3b8'}
          anchorX="center"
          anchorY="middle"
        >
          {`${agent.actionState} • ${agent.gold}G`}
        </Text>
      )}

      {/* Selected Agent Floating Speech / Thought Bubble */}
      {isSelected && agent.recentThought && (
        <group position={[0, 0.85, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[4.4, 0.7]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.92} />
          </mesh>
          <Text
            fontSize={0.24}
            maxWidth={4.2}
            textAlign="center"
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#090d16"
          >
            {`💬 "${agent.recentThought.length > 55 ? agent.recentThought.slice(0, 52) + '...' : agent.recentThought}"`}
          </Text>
        </group>
      )}
    </Billboard>
  );
}, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.agent.actionState === next.agent.actionState &&
    prev.agent.gold === next.agent.gold &&
    prev.agent.name === next.agent.name &&
    prev.agent.recentThought === next.agent.recentThought
  );
});

export const VoxelAgent = memo(function VoxelAgent({
  agent,
  isSelected,
  onSelect
}: {
  agent: AgentRuntimeState;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const initialY = getTerrainHeight(agent.position.x, agent.position.z) + 0.9;
  const currentPos = useRef(new THREE.Vector3(agent.position.x, initialY, agent.position.z));
  const targetPos = useRef(new THREE.Vector3(agent.position.x, initialY, agent.position.z));

  useEffect(() => {
    const groundY = getTerrainHeight(agent.position.x, agent.position.z);
    targetPos.current.set(agent.position.x, groundY + 0.9, agent.position.z);
  }, [agent.position.x, agent.position.z]);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    const safeDelta = Math.min(0.1, delta);

    // Frame-rate independent exponential smoothing for position interpolation
    const moveLerp = 1 - Math.exp(-12 * safeDelta);
    currentPos.current.lerp(targetPos.current, moveLerp);
    rootRef.current.position.copy(currentPos.current);

    // Shortest-arc smooth turning towards movement target
    const dx = agent.targetPosition.x - currentPos.current.x;
    const dz = agent.targetPosition.z - currentPos.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      const targetAngle = Math.atan2(dx, dz);
      let angleDiff = targetAngle - rootRef.current.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      rootRef.current.rotation.y += angleDiff * (1 - Math.exp(-12 * safeDelta));
    }

    // Animation cycle clock
    const time = Date.now() * 0.0085;
    const groundY = getTerrainHeight(currentPos.current.x, currentPos.current.z);

    if (agent.actionState === 'WALKING') {
      // Natural humanoid walk: leg swing, counter arm swing, body sway & bob
      const legCycle = Math.sin(time) * 0.75;
      const armCycle = -Math.sin(time) * 0.65;

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -armCycle;
        leftArmRef.current.rotation.z = -0.08;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = armCycle;
        rightArmRef.current.rotation.z = 0.08;
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = legCycle;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = -legCycle;
      }

      // Torso side sway & vertical step bounce
      if (torsoRef.current) {
        torsoRef.current.rotation.z = Math.sin(time) * 0.06;
        torsoRef.current.rotation.y = Math.sin(time) * 0.04;
      }
      if (headRef.current) {
        headRef.current.rotation.z = -Math.sin(time) * 0.03;
        headRef.current.rotation.y = 0;
      }
      rootRef.current.position.y = groundY + 0.9 + Math.abs(Math.sin(time * 2)) * 0.13;

    } else if (agent.actionState === 'GATHERING') {
      // Mining / Woodcutting power strike motion with full body recoil
      const strikeCycle = Math.sin(time * 1.8);
      const strikeArm = strikeCycle * 1.05;

      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = strikeArm;
        rightArmRef.current.rotation.z = 0.1;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.35 + Math.sin(time * 1.8) * 0.15;
        leftArmRef.current.rotation.z = -0.15;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.1;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.1;

      // Torso bend forward into the strike
      if (torsoRef.current) {
        torsoRef.current.rotation.x = Math.max(0, strikeCycle) * 0.22;
        torsoRef.current.rotation.z = 0;
        torsoRef.current.rotation.y = strikeCycle * 0.08;
      }
      if (headRef.current) {
        headRef.current.rotation.x = Math.max(0, strikeCycle) * 0.15;
      }
      rootRef.current.position.y = groundY + 0.9;

    } else if (agent.actionState === 'TRADING') {
      // Jubilant celebration bounce & dual arm wave
      const hop = Math.abs(Math.sin(time * 2.2)) * 0.2;
      const wave = Math.sin(time * 3);

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 2.4 + wave * 0.3;
        leftArmRef.current.rotation.z = -0.2;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 2.4 - wave * 0.3;
        rightArmRef.current.rotation.z = 0.2;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;

      if (torsoRef.current) {
        torsoRef.current.rotation.z = wave * 0.08;
        torsoRef.current.rotation.x = 0;
      }
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(time * 2) * 0.15;
      }
      rootRef.current.position.y = groundY + 0.9 + hop;

    } else {
      // IDLE: Living, breathing agent
      const breathe = Math.sin(time * 0.8) * 0.035;

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(time * 0.8) * 0.06;
        leftArmRef.current.rotation.z = -0.06 - breathe * 0.5;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -Math.sin(time * 0.8) * 0.06;
        rightArmRef.current.rotation.z = 0.06 + breathe * 0.5;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;

      if (torsoRef.current) {
        torsoRef.current.rotation.x = breathe * 0.4;
        torsoRef.current.rotation.z = 0;
        torsoRef.current.rotation.y = 0;
      }
      // Gentle curious head glance
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(time * 0.35) * 0.15;
        headRef.current.rotation.x = Math.sin(time * 0.7) * 0.04;
      }
      rootRef.current.position.y = groundY + 0.9 + breathe;
    }

    // Animated selection halo pulse & spin
    if (haloRef.current) {
      haloRef.current.rotation.z += safeDelta * 1.8;
      if (isSelected) {
        const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.1;
        haloRef.current.scale.set(pulse, pulse, 1);
      }
    }
  });

  const icon = ARCHETYPE_ICONS[agent.archetype] || (agent.category === 'CORE_AI' ? '🤖' : '👤');

  // AGGRESSIVE OVERLAP PREVENTION (Rule 13):
  // Only render floating billboard nameplate if this is a Core AI agent OR is currently selected!

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* ================================================================ */}
      {/* 1. CHARACTER HEAD & DISTINCT ARCHETYPE HATS / ACCESSORIES       */}
      {/* ================================================================ */}
      <group ref={headRef} position={[0, 1.25, 0]}>
        {/* Head Base */}
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.55, 0.55]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.4} />
        </mesh>
        {/* Face Eyes */}
        <mesh position={[-0.14, 0.05, 0.28]}>
          <boxGeometry args={[0.08, 0.12, 0.02]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.14, 0.05, 0.28]}>
          <boxGeometry args={[0.08, 0.12, 0.02]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, -0.12, 0.28]}>
          <boxGeometry args={[0.2, 0.04, 0.02]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* --- DISTINCT ARCHETYPE HEADGEAR --- */}
        {agent.archetype === 'WARLORD' && (
          // Iron Knight Helmet with Crimson Crest
          <group position={[0, 0.12, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.62, 0.35, 0.62]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Red Plume Crest */}
            <mesh position={[0, 0.32, -0.05]} castShadow>
              <boxGeometry args={[0.12, 0.35, 0.6]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
          </group>
        )}

        {(agent.archetype === 'AGRARIAN' || agent.archetype === 'FARMER') && (
          // Farmer Straw Hat with Wide Brim
          <group position={[0, 0.28, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.68, 0.72, 0.08, 12]} />
              <meshStandardMaterial color="#fef08a" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.14, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.38, 0.24, 12]} />
              <meshStandardMaterial color="#eab308" roughness={0.8} />
            </mesh>
          </group>
        )}

        {agent.archetype === 'MERCHANT' && (
          // Merchant Feathered Velvet Cap
          <group position={[0, 0.28, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.42, 0.45, 0.22, 8]} />
              <meshStandardMaterial color="#b45309" roughness={0.6} />
            </mesh>
            {/* Gold Feather */}
            <mesh position={[0.24, 0.24, 0]} rotation={[0, 0, -0.4]} castShadow>
              <boxGeometry args={[0.06, 0.35, 0.12]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.8} />
            </mesh>
          </group>
        )}

        {agent.archetype === 'INDUSTRIALIST' && (
          // Brass Welding Goggles on Forehead
          <group position={[0, 0.14, 0.29]}>
            <mesh castShadow>
              <boxGeometry args={[0.46, 0.14, 0.08]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
            {[-0.12, 0.12].map((x, i) => (
              <mesh key={i} position={[x, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.08, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
          </group>
        )}

        {agent.archetype === 'TREASURE_HUNTER' && (
          // Adventurer Fedora & Explorer Band
          <group position={[0, 0.28, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.62, 0.65, 0.07, 10]} />
              <meshStandardMaterial color="#78350f" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.38, 0.26, 10]} />
              <meshStandardMaterial color="#854d0e" roughness={0.7} />
            </mesh>
          </group>
        )}

        {agent.archetype === 'STRATEGIST' && (
          // Purple Scholar Mantle Hood
          <mesh position={[0, 0.1, -0.05]} castShadow>
            <boxGeometry args={[0.62, 0.58, 0.62]} />
            <meshStandardMaterial color="#581c87" roughness={0.7} />
          </mesh>
        )}

        {agent.archetype === 'REBEL' && (
          // Crimson Bandana
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.58, 0.15, 0.58]} />
            <meshStandardMaterial color="#ef4444" roughness={0.6} />
          </mesh>
        )}
      </group>

      {/* ================================================================ */}
      {/* 2. TORSO & CLOTHING ACCENTS                                      */}
      {/* ================================================================ */}
      <group ref={torsoRef} position={[0, 0.45, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.9, 0.45]} />
          <meshStandardMaterial
            color={agent.colorHex}
            roughness={0.35}
            emissive={isSelected ? agent.colorHex : '#000000'}
            emissiveIntensity={isSelected ? 0.35 : 0}
          />
        </mesh>
        {/* Belt with Gold Buckle */}
        <mesh position={[0, -0.32, 0.01]}>
          <boxGeometry args={[0.82, 0.12, 0.47]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.32, 0.25]}>
          <boxGeometry args={[0.16, 0.14, 0.02]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* ================================================================ */}
      {/* 3. ARMS, TOOLS & WEAPONS                                         */}
      {/* ================================================================ */}
      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.56, 0.75, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.28, 0.8, 0.32]} />
          <meshStandardMaterial color={agent.colorHex} roughness={0.4} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.56, 0.75, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.28, 0.8, 0.32]} />
          <meshStandardMaterial color={agent.colorHex} roughness={0.4} />
        </mesh>
        {/* Held Tool if gathering */}
        {agent.actionState === 'GATHERING' && (
          <mesh position={[0, -0.65, 0.2]} rotation={[Math.PI / 4, 0, 0]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        )}
      </group>

      {/* ================================================================ */}
      {/* 4. LEGS                                                          */}
      {/* ================================================================ */}
      <group ref={leftLegRef} position={[-0.22, 0, 0]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.32, 0.9, 0.36]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.22, 0, 0]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[0.32, 0.9, 0.36]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>

      {/* ================================================================ */}
      {/* 5. BACKER AURA & SELECTION RING                                  */}
      {/* ================================================================ */}
      {agent.backerAddress && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.95, 0.95, 2.2, 16]} />
          <meshBasicMaterial color="#836ef9" transparent opacity={0.25} wireframe />
        </mesh>
      )}

      {/* Ground Selection Halo */}
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0]}>
        <ringGeometry args={[0.55, isSelected ? 1.15 : 0.72, 24]} />
        <meshBasicMaterial
          color={isSelected ? '#38bdf8' : agent.colorHex}
          transparent
          opacity={isSelected ? 0.92 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ================================================================ */}
      {/* 6. CLEAN, UNCLUTTERED PILL BILLBOARD NAMEPLATE (Rule 13)         */}
      {/* ================================================================ */}
      <AgentNameplate agent={agent} isSelected={isSelected} icon={icon} />
    </group>
  );
});
