import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AtmosphericParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  type: 'dust' | 'ember' | 'pollen' | 'mist';
}

export function AtmosphericEffects() {
  const particleGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<AtmosphericParticle[]>([]);
  const emittersRef = useRef<Array<{ position: THREE.Vector3; type: AtmosphericParticle['type']; rate: number; timer: number }>>([]);
  const materialCacheRef = useRef<Map<string, THREE.MeshBasicMaterial>>(new Map());

  useEffect(() => {
    const emitters = [
      { position: new THREE.Vector3(-22, 2.5, -5), type: 'ember' as const, rate: 8, timer: 0 },
      { position: new THREE.Vector3(0, 7, 32), type: 'ember' as const, rate: 6, timer: 0 },
      { position: new THREE.Vector3(0, 6.5, 30.2), type: 'ember' as const, rate: 6, timer: 0 },
      { position: new THREE.Vector3(24, 2.5, 20), type: 'ember' as const, rate: 4, timer: 0 },
      { position: new THREE.Vector3(-22, 2.5, 22), type: 'dust' as const, rate: 5, timer: 0 },
      { position: new THREE.Vector3(12, 8, -18), type: 'ember' as const, rate: 3, timer: 0 },
      { position: new THREE.Vector3(22, 2, -18), type: 'pollen' as const, rate: 4, timer: 0 },
      { position: new THREE.Vector3(0, 3.5, -32), type: 'mist' as const, rate: 3, timer: 0 },
      { position: new THREE.Vector3(0, 1, 0), type: 'dust' as const, rate: 12, timer: 0 },
    ];
    emittersRef.current = emitters;
  }, []);

  useFrame((_, delta) => {

    emittersRef.current.forEach((emitter) => {
      emitter.timer += delta;
      const interval = 1 / emitter.rate;

      while (emitter.timer >= interval) {
        emitter.timer -= interval;

        const p: AtmosphericParticle = {
          position: emitter.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.5
          )),
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 0,
          size: 0,
          color: '',
          opacity: 0,
          type: emitter.type
        };

        switch (emitter.type) {
          case 'ember':
            p.velocity.set((Math.random() - 0.5) * 0.3, Math.random() * 1.2 + 0.5, (Math.random() - 0.5) * 0.3);
            p.maxLife = 1.5 + Math.random() * 1.0;
            p.size = 0.08 + Math.random() * 0.06;
            p.color = ['#f97316', '#fb923c', '#fef08a', '#ffffff'][Math.floor(Math.random() * 4)];
            p.opacity = 0.8;
            break;
          case 'dust':
            p.velocity.set((Math.random() - 0.5) * 0.4, Math.random() * 0.3 + 0.1, (Math.random() - 0.5) * 0.4);
            p.maxLife = 3.0 + Math.random() * 2.0;
            p.size = 0.04 + Math.random() * 0.03;
            p.color = ['#cbd5e1', '#94a3b8', '#f59e0b'][Math.floor(Math.random() * 3)];
            p.opacity = 0.3;
            break;
          case 'pollen':
            p.velocity.set((Math.random() - 0.5) * 0.2, Math.random() * 0.2 + 0.05, (Math.random() - 0.5) * 0.2);
            p.maxLife = 4.0 + Math.random() * 3.0;
            p.size = 0.03 + Math.random() * 0.02;
            p.color = ['#fef08a', '#fde047', '#eab308'][Math.floor(Math.random() * 3)];
            p.opacity = 0.5;
            break;
          case 'mist':
            p.velocity.set((Math.random() - 0.5) * 0.15, Math.random() * 0.15 + 0.05, (Math.random() - 0.5) * 0.15);
            p.maxLife = 2.5 + Math.random() * 1.5;
            p.size = 0.15 + Math.random() * 0.1;
            p.color = '#bae6fd';
            p.opacity = 0.25;
            break;
        }

        p.life = p.maxLife;
        particlesRef.current.push(p);
      }
    });

    if (!particleGroupRef.current) return;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= delta;
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= delta * 0.5;

      if (p.type === 'ember') {
        p.velocity.y += delta * 0.3;
        p.velocity.multiplyScalar(0.995);
      } else if (p.type === 'mist') {
        p.velocity.multiplyScalar(0.98);
      } else {
        p.velocity.multiplyScalar(0.99);
      }
    }

    while (particleGroupRef.current.children.length > 0) {
      particleGroupRef.current.remove(particleGroupRef.current.children[0]);
    }

    const geoCache = new Map<number, THREE.BufferGeometry>();
    particlesRef.current.forEach(p => {
      const lifeRatio = p.life / p.maxLife;
      const currentOpacity = p.opacity * lifeRatio * (p.type === 'ember' ? 1 : Math.sin(lifeRatio * Math.PI));
      const currentSize = p.size * (p.type === 'ember' ? (1 + (1 - lifeRatio) * 0.5) : lifeRatio);

      let geo = geoCache.get(Math.round(currentSize * 100));
      if (!geo) {
        geo = new THREE.SphereGeometry(currentSize, 4, 3);
        geoCache.set(Math.round(currentSize * 100), geo);
      }

      let mat = materialCacheRef.current.get(p.color);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({
          color: p.color,
          transparent: true,
          opacity: currentOpacity,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        materialCacheRef.current.set(p.color, mat);
      } else {
        mat.opacity = currentOpacity;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p.position);
      particleGroupRef.current!.add(mesh);
    });

    if (particlesRef.current.length > 800) {
      particlesRef.current = particlesRef.current.slice(-800);
    }
  });

  return (
    <group ref={particleGroupRef} />
  );
}

export function VolumetricLightBeams() {
  const beamsRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!beamsRef.current) return;

    beamsRef.current.children.forEach((beam, i) => {
      const intensity = 0.15 + Math.sin(timeRef.current * 0.8 + i) * 0.05;
      const mesh = beam as THREE.Mesh;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = intensity;
      }
      beam.rotation.y += delta * 0.02;
    });
  });

  const beamPositions: Array<{
    pos: [number, number, number];
    rot: [number, number, number];
    scale: [number, number, number];
  }> = useMemo(() => [
    { pos: [11, 2, 27], rot: [-0.3, 0, 0], scale: [5, 8, 5] },
    { pos: [0, 7, 32], rot: [-0.2, 0, 0], scale: [6, 10, 6] },
    { pos: [0, 6.5, 30], rot: [-0.2, 0, 0], scale: [5, 9, 5] },
    { pos: [24, 3, 20], rot: [-0.15, 0, 0], scale: [4, 8, 4] },
    { pos: [12, 9, -18], rot: [-0.1, 0, 0], scale: [4, 12, 4] },
  ], []);

  return (
    <group ref={beamsRef}>
      {beamPositions.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={b.rot} scale={b.scale}>
          <coneGeometry args={[1, 1, 8, 1, true]} />
          <meshBasicMaterial
            color={i === 4 ? '#fbbf24' : '#f59e0b'}
            transparent
            opacity={0.12}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function DynamicFog() {
  const fogRef = useRef<THREE.FogExp2>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (fogRef.current) {
      const density = 0.008 + Math.sin(timeRef.current * 0.05) * 0.0015;
      fogRef.current.density = density;
    }
  });

  return (
    <fogExp2
      ref={fogRef}
      attach="fog"
      args={['#bae6fd', 0.008]}
    />
  );
}