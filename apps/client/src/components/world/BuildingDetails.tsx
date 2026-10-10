import { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ChimneySmoke({ position }: { position: [number, number, number]; emissionRate?: number }) {
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef1.current) {
      const prog1 = (t * 0.75) % 2.6;
      meshRef1.current.position.y = position[1] + prog1;
      meshRef1.current.position.x = Math.sin(t * 1.2) * 0.15;
      meshRef1.current.position.z = Math.cos(t * 0.9) * 0.12;
      const scale = 0.28 + prog1 * 0.22;
      meshRef1.current.scale.setScalar(scale);
      if (meshRef1.current.material) {
        (meshRef1.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 * (1 - prog1 / 2.6));
      }
    }
    if (meshRef2.current) {
      const prog2 = ((t * 0.75) + 1.3) % 2.6;
      meshRef2.current.position.y = position[1] + prog2;
      meshRef2.current.position.x = Math.sin((t + 1.5) * 1.2) * 0.15;
      meshRef2.current.position.z = Math.cos((t + 1.5) * 0.9) * 0.12;
      const scale = 0.28 + prog2 * 0.22;
      meshRef2.current.scale.setScalar(scale);
      if (meshRef2.current.material) {
        (meshRef2.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 * (1 - prog2 / 2.6));
      }
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh ref={meshRef1}>
        <sphereGeometry args={[0.3, 5, 4]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef2}>
        <sphereGeometry args={[0.3, 5, 4]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function AnimatedBanner({ position, rotation = [0, 0, 0], color = '#ef4444', size = [1.5, 2.0, 0.05] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  size?: [number, number, number];
}) {
  const bannerRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (bannerRef.current) {
      bannerRef.current.rotation.z = rotation[2] + Math.sin(timeRef.current * 0.8) * 0.15;
      bannerRef.current.rotation.x = rotation[0] + Math.sin(timeRef.current * 0.6) * 0.05;
      bannerRef.current.position.y = position[1] + Math.sin(timeRef.current * 0.5) * 0.05;
    }
  });

  return (
    <mesh ref={bannerRef} position={position} rotation={rotation} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function WindowGlow({ position, color = '#fef08a', intensity = 0.8, flicker = true, size = [0.6, 0.5] }: {
  position: [number, number, number];
  color?: string;
  intensity?: number;
  flicker?: boolean;
  size?: [number, number];
}) {
  const windowRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (windowRef.current && windowRef.current.material) {
      const mat = windowRef.current.material as THREE.MeshStandardMaterial;
      if (flicker) {
        // Natural multi-harmonic warm fireplace flicker
        const flickerVal = 0.82 + Math.sin(timeRef.current * 5.5) * 0.12 + Math.sin(timeRef.current * 11.2) * 0.06;
        mat.emissiveIntensity = intensity * flickerVal;
        mat.opacity = 0.65 + flickerVal * 0.15;
      } else {
        mat.emissiveIntensity = intensity;
      }
    }
  });

  return (
    <mesh ref={windowRef} position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function MarketActivity({ position, agentCount = 5 }: { position: [number, number, number]; agentCount?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const agentsRef = useRef<Array<{ mesh: THREE.Mesh; offset: THREE.Vector3; phase: number; speed: number }>>([]);
  const timeRef = useRef(0);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    for (let i = 0; i < agentCount; i++) {
      const angle = (i / agentCount) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1.5;
      const offset = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      const geo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
      const mat = new THREE.MeshStandardMaterial({
        color: ['#f59e0b', '#38bdf8', '#fbbf24', '#22c55e', '#c084fc', '#ec4899'][i % 6],
        roughness: 0.4
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(offset).add(new THREE.Vector3(position[0], position[1] + 0.35, position[2]));
      mesh.castShadow = true;
      groupRef.current.add(mesh);
      agentsRef.current.push({
        mesh,
        offset,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      });
    }

    return () => {
      agentsRef.current.forEach(a => {
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
      });
    };
  }, [position, agentCount]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    agentsRef.current.forEach((a) => {
      const t = timeRef.current * a.speed + a.phase;
      a.mesh.position.x = position[0] + a.offset.x + Math.sin(t) * 0.4;
      a.mesh.position.z = position[2] + a.offset.z + Math.cos(t * 0.7) * 0.4;
      a.mesh.position.y = position[1] + 0.35 + Math.abs(Math.sin(t * 2)) * 0.05;
      a.mesh.rotation.y = t * 0.5;
    });
  });

  return <group ref={groupRef} />;
}

export function FlagPole({ position, flagColor = '#ef4444', height = 5 }: { position: [number, number, number]; flagColor?: string; height?: number }) {
  const poleRef = useRef<THREE.Mesh>(null);
  const flagRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (flagRef.current) {
      flagRef.current.rotation.z = Math.sin(timeRef.current * 0.7) * 0.3;
      flagRef.current.rotation.x = Math.sin(timeRef.current * 0.5) * 0.15;
      flagRef.current.position.y = position[1] + height - 0.5 + Math.sin(timeRef.current * 0.4) * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={poleRef} position={[position[0], position[1] + height / 2, position[2]]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, height, 6]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      <mesh ref={flagRef} position={[position[0], position[1] + height - 0.5, position[2]]} castShadow>
        <boxGeometry args={[2.0, 1.2, 0.05]} />
        <meshStandardMaterial color={flagColor} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function BuildingDetails() {
  return (
    <group>
      {/* Tavern Chimney Smoke */}
      <ChimneySmoke position={[-22, 4.5, -0.5]} emissionRate={4} />
      <ChimneySmoke position={[-22 + 2.2, 6.5, -5 + 1.4]} emissionRate={2} />

      {/* Blacksmith Forge Smoke */}
      <ChimneySmoke position={[-22 + 5.2 + 1.4, 6.5, -5 + 4.5 - 1.0]} emissionRate={5} />
      <ChimneySmoke position={[-22 + 5.2, 6.5, -5 + 4.5]} emissionRate={3} />

      {/* Castle Braziers Smoke */}
      <ChimneySmoke position={[0 - 6.8, 4.4 + 6.5, 32 - 1.8]} emissionRate={3} />
      <ChimneySmoke position={[0 + 6.8, 4.4 + 6.5, 32 - 1.8]} emissionRate={3} />

      {/* Windmill Area */}
      <ChimneySmoke position={[22, 8.5, -18]} emissionRate={2} />

      {/* Iron Quarry Furnace */}
      <ChimneySmoke position={[24 + 3.2, 4.5, 20 - 1.0]} emissionRate={4} />

      {/* Ancient Ruins Campfire */}
      <ChimneySmoke position={[0, 1.0, -32 - 1.5]} emissionRate={2} />

      {/* Logging Camp */}
      <ChimneySmoke position={[-22, 3.5, 22]} emissionRate={2} />

      {/* Animated Banners */}
      <AnimatedBanner position={[0, 4.4 + 2.4, 32 - 4.62]} rotation={[0, 0, 0]} color="#b91c1c" size={[1.2, 2.8, 0.05]} />
      <AnimatedBanner position={[0, 4.4 + 2.4, 32 + 4.2 + 0.2]} rotation={[0, Math.PI, 0]} color="#b91c1c" size={[1.2, 2.8, 0.05]} />
      <AnimatedBanner position={[-22, 4.5, -5 - 4]} rotation={[0, 0, 0]} color="#38bdf8" size={[1.0, 1.8, 0.05]} />
      <AnimatedBanner position={[12 - 3.8, 9.2, -18 + 2.5]} rotation={[0, 0, 0]} color="#fbbf24" size={[1.0, 1.5, 0.05]} />
      <AnimatedBanner position={[24, 4.5, 20 - 3]} rotation={[0, 0, 0]} color="#c2410c" size={[1.0, 1.8, 0.05]} />
      <AnimatedBanner position={[0, 4.5, -32 + 2]} rotation={[0, 0, 0]} color="#f43f5e" size={[1.0, 1.5, 0.05]} />

      {/* Flag Poles */}
      <FlagPole position={[0, 0, 0]} flagColor="#836ef9" height={8} />
      <FlagPole position={[-22, 0.2, -5]} flagColor="#38bdf8" height={6} />
      <FlagPole position={[22, 0.3, -18]} flagColor="#fbbf24" height={6} />
      <FlagPole position={[24, 1.6, 20]} flagColor="#ea580c" height={5} />
      <FlagPole position={[12, 0, -18]} flagColor="#0284c7" height={5} />
      <FlagPole position={[0, 0.35, -32]} flagColor="#f43f5e" height={4} />

      {/* Window Glows - Tavern */}
      <WindowGlow position={[-22, 2.2, -5 + 2.85]} color="#fef08a" intensity={0.8} size={[1.4, 0.9]} />
      <WindowGlow position={[-22 - 1.5, 2.2, -5 + 2.85]} color="#fef08a" intensity={0.7} size={[0.8, 0.7]} />
      <WindowGlow position={[-22 + 1.5, 2.2, -5 + 2.85]} color="#fef08a" intensity={0.7} size={[0.8, 0.7]} />
      <WindowGlow position={[-22, 3.8, -5 + 2.85]} color="#fef08a" intensity={0.6} size={[1.0, 0.6]} />

      {/* Window Glows - Cottage */}
      <WindowGlow position={[-22 - 5.4, 1.4, -5 - 4.5 + 1.85]} color="#fef08a" intensity={0.7} size={[1.0, 0.8]} />
      <WindowGlow position={[-22 - 5.4 + 1.5, 1.4, -5 - 4.5 + 1.85]} color="#fef08a" intensity={0.6} size={[0.8, 0.6]} />

      {/* Window Glows - Guild Hall */}
      <WindowGlow position={[-22 + 3.6, 1.5, -5 - 6.5 + 1.7]} color="#fef08a" intensity={0.7} size={[1.0, 0.8]} />
      <WindowGlow position={[-22 + 3.6 + 1.2, 1.5, -5 - 6.5 + 1.7]} color="#fef08a" intensity={0.6} size={[0.8, 0.6]} />

      {/* Window Glows - Blacksmith */}
      <WindowGlow position={[-22 + 5.2 - 1.2, 1.5, -5 + 4.5 + 1.9]} color="#ea580c" intensity={1.0} flicker={true} size={[0.8, 0.8]} />
      <WindowGlow position={[-22 + 5.2 + 1.2, 1.5, -5 + 4.5 + 1.9]} color="#ea580c" intensity={0.8} flicker={true} size={[0.8, 0.8]} />

      {/* Window Glows - Farm Cottage */}
      <WindowGlow position={[22 - 5.2, 1.4, -18 + 2.5 + 1.6]} color="#fef08a" intensity={0.7} size={[1.0, 0.8]} />
      <WindowGlow position={[22 - 5.2 + 1.2, 1.4, -18 + 2.5 + 1.6]} color="#fef08a" intensity={0.6} size={[0.8, 0.6]} />

      {/* Window Glows - Castle Keep */}
      <WindowGlow position={[0 - 3, 4.4 + 1.5, 32 - 2]} color="#fef08a" intensity={0.6} size={[0.8, 1.0]} />
      <WindowGlow position={[0 + 3, 4.4 + 1.5, 32 - 2]} color="#fef08a" intensity={0.6} size={[0.8, 1.0]} />
      <WindowGlow position={[0 - 3, 4.4 + 3.5, 32 - 2]} color="#fef08a" intensity={0.5} size={[0.6, 0.8]} />
      <WindowGlow position={[0 + 3, 4.4 + 3.5, 32 - 2]} color="#fef08a" intensity={0.5} size={[0.6, 0.8]} />

      {/* Window Glows - Lighthouse */}
      <WindowGlow position={[12 - 3.8, 3.5, -18 + 2.5]} color="#fbbf24" intensity={1.5} size={[0.5, 1.5]} />
      <WindowGlow position={[12 - 3.8, 5.5, -18 + 2.5]} color="#fbbf24" intensity={1.2} size={[0.5, 1.0]} />
      <WindowGlow position={[12 - 3.8, 7.5, -18 + 2.5]} color="#fbbf24" intensity={1.0} size={[0.5, 1.0]} />

      {/* Market Activity in Agora */}
      <MarketActivity position={[0, 0.35, 0]} agentCount={6} />
    </group>
  );
}
