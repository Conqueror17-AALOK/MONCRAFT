import { useLayoutEffect, useRef, memo } from 'react';
import * as THREE from 'three';

const dummy = new THREE.Object3D();

export const InstancedFoliage = memo(function InstancedFoliage() {
  const pineFoliageRef = useRef<THREE.InstancedMesh>(null);
  const pineTrunksRef = useRef<THREE.InstancedMesh>(null);

  const leafyFoliageRef = useRef<THREE.InstancedMesh>(null);
  const leafyTrunksRef = useRef<THREE.InstancedMesh>(null);

  const wheatRef = useRef<THREE.InstancedMesh>(null);
  const bushesRef = useRef<THREE.InstancedMesh>(null);
  const flowersRef = useRef<THREE.InstancedMesh>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);
  const hayBalesRef = useRef<THREE.InstancedMesh>(null);
  const fencesRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    // -------------------------------------------------------------
    // 1. Instanced Pine Trees (75 trees)
    // Placed in Forest (-22, 22), Northern Ridge, and World Borders
    // -------------------------------------------------------------
    if (pineFoliageRef.current && pineTrunksRef.current) {
      const pineCount = 75;
      for (let i = 0; i < pineCount; i++) {
        let x: number;
        let z: number;
        let yBase = 0;

        if (i < 42) {
          // Inside Deep Timber Forest zone
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 13;
          x = -22 + Math.cos(angle) * radius;
          z = 22 + Math.sin(angle) * radius;
          yBase = 0.4;
        } else if (i < 58) {
          // Northern mountain cliff ridges (flanking the castle fortress, leaving entrance clear)
          const sign = i % 2 === 0 ? 1 : -1;
          x = sign * (6.5 + Math.random() * 8.5);
          z = 28 + Math.random() * 10;
          yBase = 4.2;
        } else {
          // Outer scenic perimeter
          const angle = (i / 17) * Math.PI * 2;
          const dist = 52 + Math.random() * 12;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          yBase = 1.0;
        }

        const scale = 0.85 + Math.random() * 0.55;

        // Trunk
        dummy.position.set(x, yBase + 1.2 * scale, z);
        dummy.scale.set(scale * 0.35, scale * 2.4, scale * 0.35);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();
        pineTrunksRef.current.setMatrixAt(i, dummy.matrix);

        // Conical Foliage
        dummy.position.set(x, yBase + 3.0 * scale, z);
        dummy.scale.set(scale * 1.5, scale * 3.4, scale * 1.5);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();
        pineFoliageRef.current.setMatrixAt(i, dummy.matrix);
      }
      pineTrunksRef.current.instanceMatrix.needsUpdate = true;
      pineFoliageRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 2. Instanced Deciduous / Leafy Trees (45 trees)
    // Placed around Village, Marketplace perimeter, and Riverbanks
    // -------------------------------------------------------------
    if (leafyFoliageRef.current && leafyTrunksRef.current) {
      const leafyCount = 45;
      for (let i = 0; i < leafyCount; i++) {
        let x: number;
        let z: number;
        let yBase = 0.1;

        if (i < 20) {
          // Village & tavern gardens (pushed to the edge)
          const angle = Math.random() * Math.PI * 2;
          const radius = 6.5 + Math.random() * 4.5;
          x = -22 + Math.cos(angle) * radius;
          z = -5 + Math.sin(angle) * radius;
          yBase = 0.25;
        } else if (i < 32) {
          // Riverbanks & bridges
          const zPos = -12 + (i - 20) * 3.2;
          x = 11 + Math.sin(zPos * 0.12) * 3.5 + (i % 2 === 0 ? 5.5 : -5.5);
          z = zPos;
          yBase = 0.05;
        } else {
          // Marketplace outer promenade & Farmland borders
          const angle = (i / 13) * Math.PI * 2;
          x = Math.cos(angle) * (13 + Math.random() * 5);
          z = Math.sin(angle) * (13 + Math.random() * 5);
          yBase = 0.1;
        }

        const scale = 0.8 + Math.random() * 0.45;

        // Trunk
        dummy.position.set(x, yBase + 1.1 * scale, z);
        dummy.scale.set(scale * 0.4, scale * 2.2, scale * 0.4);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();
        leafyTrunksRef.current.setMatrixAt(i, dummy.matrix);

        // Fluffy Canopy Crown
        dummy.position.set(x, yBase + 2.7 * scale, z);
        dummy.scale.set(scale * 1.8, scale * 1.6, scale * 1.8);
        dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
        dummy.updateMatrix();
        leafyFoliageRef.current.setMatrixAt(i, dummy.matrix);
      }
      leafyTrunksRef.current.instanceMatrix.needsUpdate = true;
      leafyFoliageRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 3. Dense Instanced Wheat Crops (130 stalks)
    // Placed in Golden Wheat Plains (22, -18)
    // -------------------------------------------------------------
    if (wheatRef.current) {
      const wheatCount = 130;
      for (let i = 0; i < wheatCount; i++) {
        const row = Math.floor(i / 13);
        const col = i % 13;
        const x = 16 + col * 1.2 + (Math.random() - 0.5) * 0.4;
        const z = -25 + row * 1.3 + (Math.random() - 0.5) * 0.4;
        const yBase = x >= 24 ? 0.65 : 0.3;
        const scale = 0.75 + Math.random() * 0.4;

        dummy.position.set(x, yBase + 0.6 * scale, z);
        dummy.scale.set(scale * 0.4, scale * 1.3, scale * 0.4);
        dummy.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * Math.PI, 0);
        dummy.updateMatrix();

        wheatRef.current.setMatrixAt(i, dummy.matrix);
      }
      wheatRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 4. Flowering Bushes & Shrubs (60 bushes)
    // -------------------------------------------------------------
    if (bushesRef.current) {
      const bushCount = 60;
      for (let i = 0; i < bushCount; i++) {
        let x: number;
        let z: number;
        let yBase = 0.05;

        if (i < 25) {
          // Around Village & houses (pushed to the edge)
          const ang = Math.random() * Math.PI * 2;
          const rad = 7 + Math.random() * 4;
          x = -22 + Math.cos(ang) * rad;
          z = -5 + Math.sin(ang) * rad;
          yBase = 0.25;
        } else if (i < 45) {
          // Along main cobblestone paths
          const ratio = (i - 25) / 20;
          x = -18 + ratio * 32;
          z = -4 + Math.sin(ratio * 6) * 4;
          yBase = 0.1;
        } else {
          // Farmland & Riverbanks
          x = 10 + Math.random() * 15;
          z = -10 + Math.random() * 20;
          yBase = 0.1;
        }

        const scale = 0.55 + Math.random() * 0.45;
        dummy.position.set(x, yBase + 0.3 * scale, z);
        dummy.scale.set(scale * 1.2, scale * 0.85, scale * 1.2);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();

        bushesRef.current.setMatrixAt(i, dummy.matrix);
      }
      bushesRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 5. Flower Patches (80 flower clusters)
    // -------------------------------------------------------------
    if (flowersRef.current) {
      const flowerCount = 80;
      for (let i = 0; i < flowerCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 3 + Math.random() * 22;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad;
        const scale = 0.35 + Math.random() * 0.35;

        dummy.position.set(x, 0.15, z);
        dummy.scale.set(scale, scale * 0.8, scale);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();

        flowersRef.current.setMatrixAt(i, dummy.matrix);
      }
      flowersRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 6. Quarry Boulders & Rocks (45 rocks)
    // -------------------------------------------------------------
    if (rocksRef.current) {
      const rockCount = 45;
      for (let i = 0; i < rockCount; i++) {
        let x: number;
        let z: number;
        let yBase = 0.2;

        if (i < 24) {
          // Iron Mine quarry & crags
          const ang = Math.random() * Math.PI * 2;
          x = 24 + Math.cos(ang) * (Math.random() * 10);
          z = 20 + Math.sin(ang) * (Math.random() * 10);
          yBase = 1.6;
        } else if (i < 35) {
          // Ancient ruins
          const ang = Math.random() * Math.PI * 2;
          x = 0 + Math.cos(ang) * (Math.random() * 8);
          z = -32 + Math.sin(ang) * (Math.random() * 8);
          yBase = 0.35;
        } else {
          // Riverbed boulders
          x = 11 + (Math.random() - 0.5) * 6;
          z = -10 + Math.random() * 25;
          yBase = -0.1;
        }

        const scale = 0.5 + Math.random() * 0.8;
        dummy.position.set(x, yBase + 0.35 * scale, z);
        dummy.scale.set(scale * 1.2, scale * 0.8, scale * 1.1);
        dummy.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
        dummy.updateMatrix();

        rocksRef.current.setMatrixAt(i, dummy.matrix);
      }
      rocksRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 7. Golden Hay Bales (18 hay bales in farm)
    // -------------------------------------------------------------
    if (hayBalesRef.current) {
      const hayCount = 18;
      for (let i = 0; i < hayCount; i++) {
        const x = 18 + (i % 6) * 2.2 + (Math.random() - 0.5) * 0.6;
        const z = -14 - Math.floor(i / 6) * 3.5 + (Math.random() - 0.5) * 0.6;
        const scale = 0.7 + Math.random() * 0.2;

        dummy.position.set(x, 0.45 * scale + (x >= 24 ? 0.65 : 0.3), z);
        dummy.scale.set(scale * 1.2, scale * 0.8, scale * 0.9);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.updateMatrix();

        hayBalesRef.current.setMatrixAt(i, dummy.matrix);
      }
      hayBalesRef.current.instanceMatrix.needsUpdate = true;
    }

    // -------------------------------------------------------------
    // 8. Rustic Wooden Fences (36 fence posts)
    // -------------------------------------------------------------
    if (fencesRef.current) {
      const fenceCount = 36;
      for (let i = 0; i < fenceCount; i++) {
        let x = 0;
        let z = 0;
        let rot = 0;

        if (i < 20) {
          // North border of farmland
          x = 14 + (i * 1.4);
          z = -11;
          rot = 0;
        } else {
          // West border of farmland
          x = 14;
          z = -11 - ((i - 20) * 1.3);
          rot = Math.PI / 2;
        }

        dummy.position.set(x, 0.45, z);
        dummy.scale.set(0.18, 0.9, 0.18);
        dummy.rotation.set(0, rot, 0);
        dummy.updateMatrix();

        fencesRef.current.setMatrixAt(i, dummy.matrix);
      }
      fencesRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <group>
      {/* 1. Pine Trees (75 instances) */}
      <instancedMesh ref={pineTrunksRef} args={[undefined, undefined, 75]} castShadow>
        <cylinderGeometry args={[0.3, 0.45, 1.0, 6]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pineFoliageRef} args={[undefined, undefined, 75]} castShadow receiveShadow>
        <coneGeometry args={[1.0, 1.0, 6]} />
        <meshStandardMaterial color="#14532d" roughness={0.7} />
      </instancedMesh>

      {/* 2. Deciduous Leafy Trees (45 instances) */}
      <instancedMesh ref={leafyTrunksRef} args={[undefined, undefined, 45]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 1.0, 6]} />
        <meshStandardMaterial color="#5c2c08" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leafyFoliageRef} args={[undefined, undefined, 45]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.0]} />
        <meshStandardMaterial color="#22c55e" roughness={0.65} />
      </instancedMesh>

      {/* 3. Golden Wheat Crop Stalks (130 instances) */}
      <instancedMesh ref={wheatRef} args={[undefined, undefined, 130]} castShadow>
        <boxGeometry args={[0.25, 1.0, 0.25]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.5} />
      </instancedMesh>

      {/* 4. Flowering Bushes (60 instances) */}
      <instancedMesh ref={bushesRef} args={[undefined, undefined, 60]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 6, 5]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </instancedMesh>

      {/* 5. Flower Patches (80 instances) */}
      <instancedMesh ref={flowersRef} args={[undefined, undefined, 80]}>
        <cylinderGeometry args={[0.35, 0.1, 0.2, 5]} />
        <meshStandardMaterial color="#ec4899" roughness={0.6} />
      </instancedMesh>

      {/* 6. Quarry & River Boulders (45 instances) */}
      <instancedMesh ref={rocksRef} args={[undefined, undefined, 45]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.8]} />
        <meshStandardMaterial color="#475569" roughness={0.86} metalness={0.12} />
      </instancedMesh>

      {/* 7. Golden Hay Bales (18 instances) */}
      <instancedMesh ref={hayBalesRef} args={[undefined, undefined, 18]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.7, 1.1, 8]} />
        <meshStandardMaterial color="#eab308" roughness={0.6} />
      </instancedMesh>

      {/* 8. Rustic Wooden Fences (36 instances) */}
      <instancedMesh ref={fencesRef} args={[undefined, undefined, 36]} castShadow>
        <boxGeometry args={[1.0, 1.0, 1.0]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </instancedMesh>
    </group>
  );
});
