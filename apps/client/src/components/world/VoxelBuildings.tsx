import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const VoxelBuildings = memo(function VoxelBuildings() {
  const windmillBladesRef = useRef<THREE.Group>(null);
  const goldObeliskRef = useRef<THREE.Mesh>(null);
  const boatRef = useRef<THREE.Group>(null);
  const fireBrazier1Ref = useRef<THREE.Mesh>(null);
  const fireBrazier2Ref = useRef<THREE.Mesh>(null);
  const monadCoinRef = useRef<THREE.Group>(null);
  const campFireRef = useRef<THREE.Mesh>(null);
  const lighthouseLightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    // 1. Spin Windmill Blades
    if (windmillBladesRef.current) {
      windmillBladesRef.current.rotation.z += delta * 1.4;
    }

    // 2. Float & Rotate Ancient Gold Ruins Obelisk and Monad Coin
    if (goldObeliskRef.current) {
      goldObeliskRef.current.rotation.y += delta * 0.8;
      goldObeliskRef.current.position.y = 3.6 + Math.sin(Date.now() * 0.0025) * 0.25;
    }
    
    if (monadCoinRef.current) {
      monadCoinRef.current.rotation.y += delta * 1.5;
      monadCoinRef.current.position.y = 4.4 + Math.sin(Date.now() * 0.003) * 0.15;
    }

    // 3. Gentle Rowboat Bobbing in Harbor
    if (boatRef.current) {
      const t = Date.now() * 0.0018;
      boatRef.current.position.y = -0.22 + Math.sin(t) * 0.05;
      boatRef.current.rotation.z = Math.sin(t * 0.8) * 0.04;
      boatRef.current.rotation.x = Math.cos(t * 0.6) * 0.03;
    }

    // 4. Castle Braziers & Campfire Flicker
    const flicker1 = 0.85 + Math.sin(Date.now() * 0.015) * 0.2;
    const flicker2 = 0.85 + Math.cos(Date.now() * 0.018) * 0.2;
    if (fireBrazier1Ref.current) fireBrazier1Ref.current.scale.set(flicker1, flicker1, flicker1);
    if (fireBrazier2Ref.current) fireBrazier2Ref.current.scale.set(flicker2, flicker2, flicker2);
    if (campFireRef.current) campFireRef.current.scale.set(flicker1, flicker1 * 1.1, flicker1);

    // 5. Lighthouse Lantern Rotation
    if (lighthouseLightRef.current) {
      const t = Date.now() * 0.002;
      lighthouseLightRef.current.position.x = 12 + Math.cos(t) * 1.2;
      lighthouseLightRef.current.position.z = -18 + Math.sin(t) * 1.2;
    }
  });

  return (
    <group>
      {/* ================================================================== */}
      {/* 1. CENTRAL AGORA & MARKETPLACE (0, 0, 0)                            */}
      {/* ================================================================== */}
      <group position={[0, 0, 0]}>
        {/* Central Hero Monument & Fountain Pool */}
        <group position={[0, 0, 0]}>
          {/* Stone Basin Base */}
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.6, 3.0, 0.7, 16]} />
            <meshStandardMaterial color="#475569" roughness={0.7} />
          </mesh>
          {/* Water in Basin */}
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[2.3, 2.3, 0.1, 16]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.6} />
          </mesh>
          {/* Monument Pedestal */}
          <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 1.8, 1.2]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
          {/* Stone Heroic Founder Statue */}
          <mesh position={[0, 3.0, 0]} castShadow>
            <boxGeometry args={[0.7, 1.1, 0.6]} />
            <meshStandardMaterial color="#64748b" roughness={0.5} />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} />
          </mesh>
          {/* Raised Founder's Blade */}
          <mesh position={[0.45, 3.9, 0.2]} rotation={[0, 0, -Math.PI / 6]} castShadow>
            <boxGeometry args={[0.1, 1.6, 0.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Spinning 3D Monad Coin */}
          <group ref={monadCoinRef} position={[0, 4.4, 0]}>
            {/* Outer Coin Body */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
              <meshStandardMaterial color="#836ef9" emissive="#836ef9" emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Inner Gold Inlay */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.11, 32]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} metalness={1} roughness={0} />
            </mesh>
            {/* Monad Logo Core (Diamond shape inside) */}
            <mesh position={[0, 0, 0.06]}>
              <circleGeometry args={[0.2, 4]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[0.2, 4]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
            </mesh>
          </group>
          <pointLight position={[0, 3.5, 0]} color="#836ef9" intensity={1.5} distance={10} />
        </group>

        {/* 6 Vibrant Market Stalls with Striped Canopies */}
        {/* Stall 1: Wheat & Bread (North-East, [4.8, 0, -2.8]) */}
        <group position={[4.8, 0, -2.8]} rotation={[0, -Math.PI / 3, 0]}>
          {/* Countertop */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.5, 1.2, 1.3]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          {/* Striped Canopy */}
          <mesh position={[0, 2.0, 0]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[2.8, 0.2, 1.8]} />
            <meshStandardMaterial color="#eab308" roughness={0.5} />
          </mesh>
          {/* Goods on Table: Bread Baskets & Grain Bags */}
          <mesh position={[-0.6, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 0.3, 8]} />
            <meshStandardMaterial color="#fef08a" roughness={0.7} />
          </mesh>
          <mesh position={[0.5, 1.35, 0]} castShadow>
            <boxGeometry args={[0.4, 0.4, 0.5]} />
            <meshStandardMaterial color="#d97706" roughness={0.9} />
          </mesh>
        </group>

        {/* Stall 2: Wood & Timber (North-West, [-4.8, 0, -2.8]) */}
        <group position={[-4.8, 0, -2.8]} rotation={[0, Math.PI / 3, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.5, 1.2, 1.3]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.0, 0]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[2.8, 0.2, 1.8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.5} />
          </mesh>
          {/* Wood Planks & Bundles */}
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[1.2, 0.2, 0.6]} />
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </mesh>
        </group>

        {/* Stall 3: Iron & Weapons (East, [5.5, 0, 1.5]) */}
        <group position={[5.5, 0, 1.5]} rotation={[0, -Math.PI / 1.5, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.5, 1.2, 1.3]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.0, 0]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[2.8, 0.2, 1.8]} />
            <meshStandardMaterial color="#2563eb" roughness={0.5} />
          </mesh>
          {/* Iron Ingots */}
          <mesh position={[-0.4, 1.3, 0]} castShadow>
            <boxGeometry args={[0.5, 0.25, 0.4]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>

        {/* Stall 4: Gold & Treasures (West, [-5.5, 0, 1.5]) */}
        <group position={[-5.5, 0, 1.5]} rotation={[0, Math.PI / 1.5, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.5, 1.2, 1.3]} />
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.0, 0]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[2.8, 0.2, 1.8]} />
            <meshStandardMaterial color="#dc2626" roughness={0.5} />
          </mesh>
          {/* Gold Goblet & Chest */}
          <mesh position={[0.2, 1.35, 0]} castShadow>
            <boxGeometry args={[0.45, 0.35, 0.4]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>

        {/* Stall 5: Potions & Alchemy (South-East, [3.2, 0, 5.0]) */}
        <group position={[3.2, 0, 5.0]} rotation={[0, -Math.PI / 1.15, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.4, 1.2, 1.3]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.0, 0]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[2.7, 0.2, 1.8]} />
            <meshStandardMaterial color="#9333ea" roughness={0.5} />
          </mesh>
        </group>

        {/* Stall 6: Port & Fishery Goods (South-West, [-3.2, 0, 5.0]) */}
        <group position={[-3.2, 0, 5.0]} rotation={[0, Math.PI / 1.15, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[2.4, 1.2, 1.3]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.0, 0]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[2.7, 0.2, 1.8]} />
            <meshStandardMaterial color="#0284c7" roughness={0.5} />
          </mesh>
        </group>

        {/* Ambient Warm Marketplace Lanterns */}
        {[-7, 7].map((x) =>
          [-7, 7].map((z) => (
            <group key={`lamp_${x}_${z}`} position={[x, 0, z]}>
              <mesh position={[0, 1.4, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 2.8, 6]} />
                <meshStandardMaterial color="#1e293b" roughness={0.7} />
              </mesh>
              <mesh position={[0, 2.7, 0]} castShadow>
                <octahedronGeometry args={[0.25]} />
                <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.0} />
              </mesh>
              <pointLight position={[0, 2.7, 0]} color="#f59e0b" intensity={0.4} distance={6} />
            </group>
          ))
        )}
      </group>

      {/* ================================================================== */}
      {/* 2. THE COMMONER VILLAGE (-22, 0, -5)                                */}
      {/* ================================================================== */}
      <group position={[-22, 0.2, -5]}>
        {/* House 1: The Grand Tavern & Inn (Centerpiece of Village) */}
        <group position={[0, 0, 0]}>
          {/* Stone Base */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.2, 1.2, 5.4]} />
            <meshStandardMaterial color="#475569" roughness={0.85} />
          </mesh>
          {/* Timber Upper Floor */}
          <mesh position={[0, 2.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.4, 2.4, 5.6]} />
            <meshStandardMaterial color="#d4a373" roughness={0.7} />
          </mesh>
          {/* Cobalt Blue Pitch Roof with Overhang */}
          <mesh position={[0, 4.4, 0]} rotation={[0, 0, 0]} castShadow>
            <coneGeometry args={[5.2, 2.6, 4]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
          </mesh>
          {/* Stone Chimney */}
          <mesh position={[2.2, 4.2, 1.4]} castShadow>
            <boxGeometry args={[0.8, 3.2, 0.8]} />
            <meshStandardMaterial color="#334155" roughness={0.9} />
          </mesh>
          {/* Warm Glowing Windows */}
          <mesh position={[0, 2.2, 2.85]}>
            <planeGeometry args={[1.4, 0.9]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
          {/* Wooden Tavern Porch */}
          <mesh position={[0, 0.15, 3.2]} castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.3, 1.6]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        </group>

        {/* House 2: Blacksmith Guild Workshop (South-East, [5, 0, 4]) */}
        <group position={[5.2, 0, 4.5]} rotation={[0, -0.4, 0]}>
          <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.8, 2.8, 3.8]} />
            <meshStandardMaterial color="#475569" roughness={0.85} />
          </mesh>
          {/* Terracotta Peaked Roof */}
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[3.8, 2.0, 4]} />
            <meshStandardMaterial color="#c2410c" roughness={0.6} />
          </mesh>
          {/* Forge Chimney */}
          <mesh position={[1.4, 3.6, -1.0]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, 2.8, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
          {/* Glowing Forge Fire */}
          <mesh position={[-1.2, 0.8, 2.0]}>
            <boxGeometry args={[0.8, 0.8, 0.3]} />
            <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={1.4} />
          </mesh>
          {/* Outdoor Anvil */}
          <mesh position={[-1.2, 0.4, 2.8]} castShadow>
            <boxGeometry args={[0.6, 0.7, 0.9]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>

        {/* House 3: Residential Cottage (North-West, [-5, 0, -4]) */}
        <group position={[-5.4, 0, -4.5]} rotation={[0, 0.5, 0]}>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.4, 2.4, 3.6]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          {/* Terracotta Peaked Roof */}
          <mesh position={[0, 3.1, 0]} castShadow>
            <coneGeometry args={[3.4, 1.8, 4]} />
            <meshStandardMaterial color="#ea580c" roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.4, 1.85]}>
            <planeGeometry args={[1.0, 0.8]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.7} />
          </mesh>
        </group>

        {/* House 4: Guild Hall / Residence (North-East, [3, 0, -6]) */}
        <group position={[3.6, 0, -6.5]} rotation={[0, -0.3, 0]}>
          <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.2, 2.6, 3.4]} />
            <meshStandardMaterial color="#d4a373" roughness={0.75} />
          </mesh>
          {/* Blue Roof */}
          <mesh position={[0, 3.2, 0]} castShadow>
            <coneGeometry args={[3.2, 1.8, 4]} />
            <meshStandardMaterial color="#1e40af" roughness={0.6} />
          </mesh>
        </group>

        {/* Village Centerpiece: The Stone Water Well */}
        <group position={[0, 0, 5.5]}>
          {/* Well Rim */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.1, 1.2, 0.9, 12]} />
            <meshStandardMaterial color="#475569" roughness={0.85} />
          </mesh>
          {/* Water Surface Inside Well */}
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.9, 0.9, 0.05, 12]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.7} />
          </mesh>
          {/* Wooden Roof Pillars */}
          {[-0.8, 0.8].map((x, i) => (
            <mesh key={i} position={[x, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 1.6, 6]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
          ))}
          {/* Well Wooden Canopy */}
          <mesh position={[0, 2.1, 0]} castShadow>
            <coneGeometry args={[1.3, 0.7, 4]} />
            <meshStandardMaterial color="#92400e" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ================================================================== */}
      {/* ================================================================== */}
      {/* 3. WARLORD CASTLE CITADEL OF KAELEN & GRAND ASCENT STAIRCASE       */}
      {/* ================================================================== */}
      <group position={[0, 0, 0]}>
        {/* --- A. GRAND BASE GATEWAY ARCH (z = 16.5, y = 0.05) --- */}
        <group position={[0, 0, 16.5]}>
          {/* Stone Threshold Paving */}
          <mesh position={[0, 0.06, 0]} receiveShadow>
            <boxGeometry args={[7.2, 0.1, 2.2]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
          {/* Left Gateway Bastion Pillar */}
          <group position={[-3.6, 0, 0]}>
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.6, 0.6, 1.6]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, 3.2, 1.2]} />
              <meshStandardMaterial color="#334155" roughness={0.85} />
            </mesh>
            <mesh position={[0, 3.8, 0]} castShadow>
              <coneGeometry args={[1.0, 1.0, 4]} />
              <meshStandardMaterial color="#991b1b" roughness={0.6} />
            </mesh>
            {/* Glowing Amber Lantern */}
            <mesh position={[0, 2.4, -0.7]}>
              <boxGeometry args={[0.3, 0.45, 0.3]} />
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={1.5} />
            </mesh>
            <pointLight position={[0, 2.4, -0.7]} color="#f59e0b" intensity={1.5} distance={7} />
          </group>
          {/* Right Gateway Bastion Pillar */}
          <group position={[3.6, 0, 0]}>
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.6, 0.6, 1.6]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, 3.2, 1.2]} />
              <meshStandardMaterial color="#334155" roughness={0.85} />
            </mesh>
            <mesh position={[0, 3.8, 0]} castShadow>
              <coneGeometry args={[1.0, 1.0, 4]} />
              <meshStandardMaterial color="#991b1b" roughness={0.6} />
            </mesh>
            {/* Glowing Amber Lantern */}
            <mesh position={[0, 2.4, -0.7]}>
              <boxGeometry args={[0.3, 0.45, 0.3]} />
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={1.5} />
            </mesh>
            <pointLight position={[0, 2.4, -0.7]} color="#f59e0b" intensity={1.5} distance={7} />
          </group>
          {/* Massive Carved Archway Lintel */}
          <mesh position={[0, 3.3, 0]} castShadow>
            <boxGeometry args={[8.4, 0.7, 1.4]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          {/* Citadel Inscription Stone */}
          <mesh position={[0, 3.4, -0.72]}>
            <boxGeometry args={[3.2, 0.4, 0.05]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          {/* Crimson Faction Crest Shield */}
          <mesh position={[0, 3.4, -0.76]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.45, 0.45, 0.06]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.4} />
          </mesh>
        </group>

        {/* --- B. FLIGHT 1 — LOWER MONUMENTAL STONE STEPS (z = 17.5 to 21.5) --- */}
        {[
          { z: 17.7, y: 0.22, h: 0.44 },
          { z: 18.9, y: 0.66, h: 0.44 },
          { z: 20.1, y: 1.10, h: 0.44 },
          { z: 21.3, y: 1.54, h: 0.44 }
        ].map((s, idx) => (
          <group key={`step_low_${idx}`} position={[0, s.y, s.z]}>
            {/* Stone Step Block */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[6.6, s.h, 1.35]} />
              <meshStandardMaterial color="#475569" roughness={0.85} />
            </mesh>
            {/* Cobblestone Tread Top */}
            <mesh position={[0, s.h / 2 + 0.02, 0]} receiveShadow>
              <boxGeometry args={[6.7, 0.04, 1.36]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>
            {/* Left Balustrade Railing */}
            <mesh position={[-3.4, s.h / 2 + 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.7, 1.35]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
            {/* Right Balustrade Railing */}
            <mesh position={[3.4, s.h / 2 + 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.7, 1.35]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* --- C. MID-ASCENT GRAND WATCHPOST LANDING (z = 22.7, y = 1.95) --- */}
        <group position={[0, 1.95, 22.7]}>
          {/* Main Landing Terrace */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[7.8, 0.45, 2.2]} />
            <meshStandardMaterial color="#334155" roughness={0.85} />
          </mesh>
          {/* Flagstone paving */}
          <mesh position={[0, 0.24, 0]} receiveShadow>
            <boxGeometry args={[7.9, 0.04, 2.22]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
          {/* Left Watch Bastion Pedestal & Fire Brazier */}
          <group position={[-3.7, 0.25, 0]}>
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 1.0, 0.9]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <octahedronGeometry args={[0.3]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
            </mesh>
            <pointLight position={[0, 1.2, 0]} color="#ea580c" intensity={1.4} distance={8} />
          </group>
          {/* Right Watch Bastion Pedestal & Fire Brazier */}
          <group position={[3.7, 0.25, 0]}>
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 1.0, 0.9]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.1, 0]}>
              <octahedronGeometry args={[0.3]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
            </mesh>
            <pointLight position={[0, 1.2, 0]} color="#ea580c" intensity={1.4} distance={8} />
          </group>
        </group>

        {/* --- D. FLIGHT 2 — UPPER CLIFF CARVED STAIRWAY (z = 24.0 to 27.2) --- */}
        {[
          { z: 24.0, y: 2.48, h: 0.52 },
          { z: 25.2, y: 3.02, h: 0.54 },
          { z: 26.4, y: 3.58, h: 0.56 },
          { z: 27.4, y: 4.12, h: 0.56 }
        ].map((s, idx) => (
          <group key={`step_high_${idx}`} position={[0, s.y, s.z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[6.6, s.h, 1.35]} />
              <meshStandardMaterial color="#475569" roughness={0.85} />
            </mesh>
            <mesh position={[0, s.h / 2 + 0.02, 0]} receiveShadow>
              <boxGeometry args={[6.7, 0.04, 1.36]} />
              <meshStandardMaterial color="#64748b" roughness={0.7} />
            </mesh>
            <mesh position={[-3.4, s.h / 2 + 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.7, 1.35]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
            <mesh position={[3.4, s.h / 2 + 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.3, 0.7, 1.35]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* --- E. UPPER CITADEL COURTYARD / DRAWBRIDGE FORECOURT (z = 29.2, y = 4.4) --- */}
        <group position={[0, 4.4, 29.2]}>
          {/* Courtyard Floor Flagstones */}
          <mesh position={[0, 0.02, 0]} receiveShadow>
            <boxGeometry args={[11.6, 0.2, 4.2]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.13, 0]} receiveShadow>
            <boxGeometry args={[11.8, 0.04, 4.24]} />
            <meshStandardMaterial color="#64748b" roughness={0.65} />
          </mesh>
          {/* Low Battlement Parapets overlooking valley */}
          {[-5.0, -2.5, 2.5, 5.0].map((x, i) => (
            <mesh key={`para_${i}`} position={[x, 0.5, -2.0]} castShadow>
              <boxGeometry args={[1.8, 0.7, 0.35]} />
              <meshStandardMaterial color="#334155" roughness={0.85} />
            </mesh>
          ))}
          {/* Courtyard Torches */}
          <mesh position={[-4.5, 1.0, 1.0]}>
            <cylinderGeometry args={[0.1, 0.12, 1.8, 6]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-4.5, 2.0, 1.0]}>
            <octahedronGeometry args={[0.25]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[-4.5, 2.0, 1.0]} color="#ea580c" intensity={1.2} distance={8} />

          <mesh position={[4.5, 1.0, 1.0]}>
            <cylinderGeometry args={[0.1, 0.12, 1.8, 6]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[4.5, 2.0, 1.0]}>
            <octahedronGeometry args={[0.25]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[4.5, 2.0, 1.0]} color="#ea580c" intensity={1.2} distance={8} />
        </group>

        {/* --- F. NATURAL MOUNTAIN EMBANKMENT WEDGES --- */}
        {/* Left Mountain Stepped Terraces */}
        <mesh position={[-6.2, 1.0, 19.5]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 2.0, 5.2]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        <mesh position={[-6.2, 2.05, 19.5]} receiveShadow>
          <boxGeometry args={[4.4, 0.1, 5.4]} />
          <meshStandardMaterial color="#166534" roughness={0.8} />
        </mesh>
        <mesh position={[-7.4, 2.4, 24.5]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 3.2, 5.8]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
        <mesh position={[-7.4, 4.05, 24.5]} receiveShadow>
          <boxGeometry args={[5.4, 0.1, 6.0]} />
          <meshStandardMaterial color="#15803d" roughness={0.8} />
        </mesh>

        {/* Right Mountain Stepped Terraces */}
        <mesh position={[6.2, 1.0, 19.5]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 2.0, 5.2]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        <mesh position={[6.2, 2.05, 19.5]} receiveShadow>
          <boxGeometry args={[4.4, 0.1, 5.4]} />
          <meshStandardMaterial color="#166534" roughness={0.8} />
        </mesh>
        <mesh position={[7.4, 2.4, 24.5]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 3.2, 5.8]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>
        <mesh position={[7.4, 4.05, 24.5]} receiveShadow>
          <boxGeometry args={[5.4, 0.1, 6.0]} />
          <meshStandardMaterial color="#15803d" roughness={0.8} />
        </mesh>

        {/* --- G. THE WARLORD KEEP FORTRESS ([0, 4.4, 32]) --- */}
        <group position={[0, 4.4, 32]}>
          {/* Massive Stone Keep Base */}
          <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
            <boxGeometry args={[14, 4.0, 9]} />
            <meshStandardMaterial color="#334155" roughness={0.85} />
          </mesh>

          {/* South Battlements (Facing Players & Agora) */}
          {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
            <mesh key={`cren_s_${x}`} position={[x, 4.4, -4.2]} castShadow>
              <boxGeometry args={[1.2, 0.8, 0.6]} />
              <meshStandardMaterial color="#475569" roughness={0.85} />
            </mesh>
          ))}
          {/* North Battlements */}
          {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
            <mesh key={`cren_n_${x}`} position={[x, 4.4, 4.2]} castShadow>
              <boxGeometry args={[1.2, 0.8, 0.6]} />
              <meshStandardMaterial color="#475569" roughness={0.85} />
            </mesh>
          ))}

          {/* West Watchtower */}
          <group position={[-6.8, 0, 0]}>
            <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[2.0, 2.4, 6.4, 8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} />
            </mesh>
            <mesh position={[0, 7.2, 0]} castShadow>
              <coneGeometry args={[2.4, 2.4, 8]} />
              <meshStandardMaterial color="#991b1b" roughness={0.6} />
            </mesh>
            {/* Front-Facing Fire Brazier */}
            <mesh ref={fireBrazier1Ref} position={[0, 6.5, -1.8]}>
              <octahedronGeometry args={[0.4]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
            </mesh>
            <pointLight position={[0, 6.5, -1.8]} color="#ea580c" intensity={1.5} distance={12} />
          </group>

          {/* East Watchtower */}
          <group position={[6.8, 0, 0]}>
            <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[2.0, 2.4, 6.4, 8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} />
            </mesh>
            <mesh position={[0, 7.2, 0]} castShadow>
              <coneGeometry args={[2.4, 2.4, 8]} />
              <meshStandardMaterial color="#991b1b" roughness={0.6} />
            </mesh>
            {/* Front-Facing Fire Brazier */}
            <mesh ref={fireBrazier2Ref} position={[0, 6.5, -1.8]}>
              <octahedronGeometry args={[0.4]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
            </mesh>
            <pointLight position={[0, 6.5, -1.8]} color="#ea580c" intensity={1.5} distance={12} />
          </group>

          {/* MAIN ENTRANCE PORTCULLIS ARCHWAY GATE (Facing South!) */}
          <group position={[0, 0, -4.5]}>
            {/* Dark Iron Portcullis Grate */}
            <mesh position={[0, 1.4, -0.05]}>
              <boxGeometry args={[3.2, 2.8, 0.2]} />
              <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.35} />
            </mesh>
            {/* Stone Jambs & Archway Frame */}
            <mesh position={[-1.9, 1.4, -0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.7, 2.8, 0.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} />
            </mesh>
            <mesh position={[1.9, 1.4, -0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.7, 2.8, 0.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} />
            </mesh>
            <mesh position={[0, 3.0, -0.1]} castShadow>
              <boxGeometry args={[4.6, 0.6, 0.5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} />
            </mesh>
            {/* Iron Banding on Archway */}
            <mesh position={[0, 3.35, -0.12]}>
              <boxGeometry args={[4.7, 0.1, 0.54]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>

            {/* Warlord Overlook Command Balcony */}
            <mesh position={[0, 3.7, -0.5]} receiveShadow>
              <boxGeometry args={[4.0, 0.3, 1.2]} />
              <meshStandardMaterial color="#475569" roughness={0.8} />
            </mesh>
            <mesh position={[0, 4.15, -1.05]} castShadow>
              <boxGeometry args={[4.0, 0.6, 0.15]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
          </group>

          {/* Crimson Warlord Faction Banners (Facing South) */}
          {[-3.2, 3.2].map((x, i) => (
            <mesh key={i} position={[x, 2.4, -4.62]} castShadow>
              <boxGeometry args={[1.2, 2.8, 0.05]} />
              <meshStandardMaterial color="#b91c1c" roughness={0.5} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================================================================== */}
      {/* 4. WHEAT MILL & WINDMILL (Farmland, [22, 0.3, -18])                 */}
      {/* ================================================================== */}
      <group position={[22, 0.3, -18]}>
        {/* Windmill Stone Base */}
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.4, 3.2, 3.0, 12]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>
        {/* Windmill White Timber Tower */}
        <mesh position={[0, 5.0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.8, 2.4, 4.5, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>
        {/* Conical Red Cap */}
        <mesh position={[0, 8.2, 0]} castShadow>
          <coneGeometry args={[2.2, 2.2, 12]} />
          <meshStandardMaterial color="#991b1b" roughness={0.6} />
        </mesh>

        {/* Rotating 4-Blade Windmill Propeller */}
        <group position={[0, 6.6, 2.0]} ref={windmillBladesRef}>
          {/* Center Hub */}
          <mesh castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.4, 8]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
          {/* 4 Canvas Propeller Blades */}
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((rot, i) => (
            <group key={i} rotation={[0, 0, rot]}>
              <mesh position={[0, 2.4, 0]} castShadow>
                <boxGeometry args={[0.55, 4.0, 0.06]} />
                <meshStandardMaterial color="#fef08a" roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Farm Cottage / Granary next to mill */}
        <group position={[-5.2, 0, 2.5]} rotation={[0, 0.3, 0]}>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.2, 2.4, 3.2]} />
            <meshStandardMaterial color="#78350f" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.9, 0]} castShadow>
            <coneGeometry args={[3.2, 1.6, 4]} />
            <meshStandardMaterial color="#92400e" roughness={0.7} />
          </mesh>
        </group>

        {/* Farm Wooden Hay Cart */}
        <group position={[4.0, 0.4, 2.0]} rotation={[0, -0.4, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.8, 0.6, 2.4]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Spoked Wheels */}
          {[-1.0, 1.0].map((x, i) => (
            <mesh key={i} position={[x, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.35, 0.35, 0.15, 8]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================================================================== */}
      {/* 5. IRON QUARRY & SMELTING FURNACE (North-East, [24, 1.6, 20])       */}
      {/* ================================================================== */}
      <group position={[24, 1.6, 20]}>
        {/* Timber Mine Shaft Entrance carved into the rock wall */}
        <group position={[-3.5, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
          {/* Dark rock shoulders make the shaft read as an opening in a cliff. */}
          <mesh position={[-1.65, 1.8, 0]} castShadow>
            <boxGeometry args={[0.8, 3.8, 1.3]} />
            <meshStandardMaterial color="#1f2937" roughness={0.95} />
          </mesh>
          <mesh position={[1.65, 1.8, 0]} castShadow>
            <boxGeometry args={[0.8, 3.8, 1.3]} />
            <meshStandardMaterial color="#1f2937" roughness={0.95} />
          </mesh>
          {/* Dark Mine Opening */}
          <mesh position={[0, 1.35, 0.62]}>
            <planeGeometry args={[2.0, 2.4]} />
            <meshBasicMaterial color="#050811" />
          </mesh>
          {/* Heavy timber headframe: unmistakable mine-shaft silhouette. */}
          <mesh position={[0, 2.82, 0.76]} castShadow>
            <boxGeometry args={[2.9, 0.42, 0.42]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Left / Right Support Posts */}
          {[-1.2, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 1.4, 0.7]} castShadow>
              <boxGeometry args={[0.35, 2.8, 0.35]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
          ))}
          {/* Rust-colored ore strata exposed around the portal. */}
          <mesh position={[-1.45, 2.45, 0.72]} rotation={[0, 0, -0.25]} castShadow>
            <boxGeometry args={[0.18, 1.7, 0.12]} />
            <meshStandardMaterial color="#c2410c" roughness={0.72} />
          </mesh>
          <mesh position={[1.42, 1.0, 0.72]} rotation={[0, 0, 0.35]} castShadow>
            <boxGeometry args={[0.16, 1.35, 0.12]} />
            <meshStandardMaterial color="#9a3412" roughness={0.72} />
          </mesh>
        </group>

        {/* Mine Cart Tracks with Ore Cart */}
        <group position={[-1.2, 0.05, 2.2]} rotation={[0, Math.PI / 4, 0]}>
          {/* Rails */}
          {[-0.45, 0.45].map((x, i) => (
            <mesh key={i} position={[x, 0.06, 0]} castShadow>
              <boxGeometry args={[0.08, 0.06, 4.0]} />
              <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
            </mesh>
          ))}
          {/* Wooden Ties */}
          {[-1.5, -0.7, 0, 0.7, 1.5].map((z, i) => (
            <mesh key={i} position={[0, 0.02, z]} castShadow>
              <boxGeometry args={[1.2, 0.05, 0.18]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
          ))}
          {/* Wooden Ore Cart */}
          <group position={[0, 0.45, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.0, 0.65, 1.4]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            {/* Raw Iron Ore in Cart */}
            <mesh position={[0, 0.25, 0]} castShadow>
              <dodecahedronGeometry args={[0.42]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0.32, 0.3, -0.18]} castShadow>
              <dodecahedronGeometry args={[0.25]} />
              <meshStandardMaterial color="#c2410c" roughness={0.6} />
            </mesh>
          </group>
        </group>

        {/* Stone Blast Smelter Furnace */}
        <group position={[3.2, 0, -1.0]}>
          <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.6, 2.5, 4.4, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
          {/* Glowing Fiery Aperture */}
          <mesh position={[0, 0.9, 1.5]}>
            <boxGeometry args={[1.1, 1.1, 0.3]} />
            <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.6} />
          </mesh>
          <pointLight position={[0, 1.0, 2.0]} color="#ea580c" intensity={1.8} distance={8} />
          {/* Blacksmith Anvil */}
          <mesh position={[2.4, 0.5, 1.0]} castShadow>
            <boxGeometry args={[0.7, 0.8, 1.1]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* ================================================================== */}
      {/* 6. SOUTHERN PORT, PIER & LIGHTHOUSE (Lake, [12, 0, -18])            */}
      {/* ================================================================== */}
      <group position={[12, 0, -18]}>
        {/* Wooden Pier / Docking Boardwalk */}
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.25, 8.5]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
        {/* Pier Pilings extending into water */}
        {[-1.8, 1.8].map((x) =>
          [-3.5, 0, 3.5].map((z) => (
            <mesh key={`pile_${x}_${z}`} position={[x, -0.6, z]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 1.4, 6]} />
              <meshStandardMaterial color="#451a03" roughness={0.9} />
            </mesh>
          ))
        )}

        {/* Coastal Stone & Timber Lighthouse */}
        <group position={[-3.8, 0, 2.5]}>
          {/* Stone Base */}
          <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.8, 2.4, 3.0, 8]} />
            <meshStandardMaterial color="#475569" roughness={0.85} />
          </mesh>
          {/* White/Red Lighthouse Tower */}
          <mesh position={[0, 5.0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1.7, 4.5, 8]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          {/* Lantern Room Gallery Deck */}
          <mesh position={[0, 7.4, 0]} castShadow>
            <cylinderGeometry args={[1.6, 1.4, 0.3, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          {/* Glass Lantern Room with Glowing Lamp */}
          <mesh position={[0, 8.1, 0]}>
            <cylinderGeometry args={[0.9, 0.9, 1.2, 8]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={1.8} transparent opacity={0.9} />
          </mesh>
          {/* Conical Copper Roof */}
          <mesh position={[0, 9.2, 0]} castShadow>
            <coneGeometry args={[1.4, 1.4, 8]} />
            <meshStandardMaterial color="#b45309" roughness={0.5} />
          </mesh>
          {/* Rotating / Sweeping Beacon Light */}
          <pointLight ref={lighthouseLightRef} position={[0, 8.1, 0]} color="#fef08a" intensity={2.0} distance={20} />
        </group>

        {/* Bobbing Wooden Rowboat with Oars */}
        <group ref={boatRef} position={[3.6, -0.25, 1.5]}>
          {/* Boat Hull */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.3, 0.55, 3.2]} />
            <meshStandardMaterial color="#78350f" roughness={0.85} />
          </mesh>
          {/* Hollow Boat Interior */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.95, 0.45, 2.7]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>
          {/* Seat Plank */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[1.0, 0.08, 0.4]} />
            <meshStandardMaterial color="#92400e" />
          </mesh>
        </group>
      </group>

      {/* ================================================================== */}
      {/* 7. ANCIENT WILDERNESS RUINS & EXPEDITION (South, [0, 0.35, -32])     */}
      {/* ================================================================== */}
      <group position={[0, 0.35, -32]}>
        {/* Ancient Stone Flagstone Foundation */}
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[16, 0.2, 14]} />
          <meshStandardMaterial color="#334155" roughness={0.95} />
        </mesh>

        {/* Weathered Stone Pillars & Broken Arches */}
        {[-5, 0, 5].map((x) =>
          [-4, 4].map((z) => (
            <mesh key={`ruin_col_${x}_${z}`} position={[x, 2.0, z]} castShadow receiveShadow>
              <cylinderGeometry args={[0.55, 0.7, 4.0, 8]} />
              <meshStandardMaterial color="#475569" roughness={0.9} />
            </mesh>
          ))
        )}
        {/* Broken Lintel Archway */}
        <mesh position={[0, 4.2, 4]} rotation={[0, 0, 0.05]} castShadow>
          <boxGeometry args={[6.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>

        {/* Floating Spinning Glowing Gold Obelisk */}
        <mesh ref={goldObeliskRef} position={[0, 3.6, 0]} castShadow>
          <octahedronGeometry args={[1.3]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={1.2}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <pointLight position={[0, 3.6, 0]} color="#fbbf24" intensity={1.8} distance={10} />

        {/* Glowing Ancient Rune Crystals on Ground */}
        {[-2.2, 2.2].map((x, i) => (
          <mesh key={`cryst_${i}`} position={[x, 0.6, -1.5]} rotation={[0.2, i, -0.3]}>
            <octahedronGeometry args={[0.4]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.4} roughness={0.1} />
          </mesh>
        ))}

        {/* Adventurer Campsite (Tent & Campfire) */}
        <group position={[-5.8, 0, -2.5]}>
          {/* Canvas A-Frame Tent */}
          <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.6, 1.8, 3]} />
            <meshStandardMaterial color="#d4a373" roughness={0.8} />
          </mesh>
          {/* Campfire Ring & Fire */}
          <group position={[2.5, 0, 1.2]}>
            <mesh position={[0, 0.1, 0]}>
              <ringGeometry args={[0.4, 0.6, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.9} />
            </mesh>
            <mesh ref={campFireRef} position={[0, 0.4, 0]}>
              <octahedronGeometry args={[0.3]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.8} />
            </mesh>
            <pointLight position={[0, 0.6, 0]} color="#ea580c" intensity={1.2} distance={6} />
          </group>
        </group>
      </group>

      {/* ================================================================== */}
      {/* 8. FOREST LOGGING CAMP (-22, 0.4, 22)                               */}
      {/* ================================================================== */}
      <group position={[-22, 0.4, 22]}>
        {/* Timber Log Cabin */}
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.8, 2.8, 3.8]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} />
        </mesh>
        {/* Forest Green Peaked Roof */}
        <mesh position={[0, 3.2, 0]} castShadow>
          <coneGeometry args={[3.8, 1.6, 4]} />
          <meshStandardMaterial color="#14532d" roughness={0.8} />
        </mesh>
        {/* Woodcutter's Chopping Block & Axe */}
        <group position={[3.6, 0, 1.5]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, 0.8, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.95, 0]} rotation={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.5, 0.25]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
        {/* Stacked Timber Logs */}
        <group position={[-3.6, 0, 1.2]}>
          {[0, 0.5, 1.0].map((y, idx) => (
            <mesh key={idx} position={[0, 0.25 + y * 0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.25, 0.25, 2.8, 8]} />
              <meshStandardMaterial color="#92400e" roughness={0.85} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
});
