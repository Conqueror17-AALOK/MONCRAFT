import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ResourceNode } from '@civilization/shared';
import { getTerrainHeight } from './terrainHeight';

const SingleNodeView = memo(function SingleNodeView({ node }: { node: ResourceNode }) {
  const meshRef = useRef<THREE.Group>(null);
  const yBase = getTerrainHeight(node.position.x, node.position.z);

  const color =
    node.type === 'WHEAT'
      ? '#f59e0b'
      : node.type === 'WOOD'
      ? '#10b981'
      : node.type === 'IRON'
      ? '#94a3b8'
      : '#fbbf24';

  const icon =
    node.type === 'WHEAT'
      ? '🌾'
      : node.type === 'WOOD'
      ? '🪵'
      : node.type === 'IRON'
      ? '⛏️'
      : '🪙';

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.45;
      if (node.type === 'GOLD') {
        meshRef.current.position.y = 0.35 + Math.sin(Date.now() * 0.003) * 0.06;
      } else if (node.type === 'WHEAT') {
        meshRef.current.rotation.z = Math.sin(Date.now() * 0.002) * 0.04;
      }
    }
  });

  const capacityRatio = Math.max(0, Math.min(1, node.currentCapacity / node.maxCapacity));

  return (
    <group position={[node.position.x, yBase, node.position.z]}>
      {/* Physical Node Deposit Base */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, 0.2, 12]} />
        <meshStandardMaterial color={node.type === 'IRON' ? '#1f2937' : '#334155'} roughness={0.9} />
      </mesh>

      {/* Stylized Believable Deposit Structure */}
      <group ref={meshRef} position={[0, 0.35, 0]}>
        {node.type === 'GOLD' ? (
          // Sparkling Golden Crystal Cluster on Stone Pedestal
          <group>
            <mesh position={[0, 0.35, 0]} castShadow>
              <octahedronGeometry args={[0.65]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#f59e0b"
                emissiveIntensity={0.6}
                metalness={0.9}
                roughness={0.15}
              />
            </mesh>
            <mesh position={[0.3, 0.2, 0.2]} rotation={[0.4, 0.2, 0]}>
              <octahedronGeometry args={[0.35]} />
              <meshStandardMaterial color="#fcd34d" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ) : node.type === 'IRON' ? (
          // Rugged iron ore outcrop: charcoal rock, rust veins, and loose ore chunks.
          <group>
            <mesh position={[0, 0.4, 0]} castShadow>
              <dodecahedronGeometry args={[0.78]} />
              <meshStandardMaterial color="#273449" roughness={0.82} />
            </mesh>
            {[[-0.32, 0.54, 0.48, 0.35], [0.38, 0.38, 0.18, -0.55], [0.08, 0.72, -0.42, 0.15]].map(([x, y, z, rotation], index) => (
              <mesh key={index} position={[x, y, z]} rotation={[0.2, rotation, 0.45]} castShadow>
                <boxGeometry args={[0.12, 0.52, 0.08]} />
                <meshStandardMaterial color="#c2410c" emissive="#7c2d12" emissiveIntensity={0.18} roughness={0.62} />
              </mesh>
            ))}
            <mesh position={[0.2, 0.45, 0.2]} castShadow>
              <boxGeometry args={[0.38, 0.38, 0.38]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.82} roughness={0.28} />
            </mesh>
            <mesh position={[-0.62, 0.2, 0.25]} rotation={[0.2, 0.4, 0]} castShadow>
              <dodecahedronGeometry args={[0.24]} />
              <meshStandardMaterial color="#64748b" metalness={0.65} roughness={0.4} />
            </mesh>
          </group>
        ) : node.type === 'WHEAT' ? (
          // Wooden Grain Basket / Sheaves
          <group>
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.6, 0.45, 0.6, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.65, 0]} castShadow>
              <coneGeometry args={[0.55, 0.6, 8]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.5} />
            </mesh>
          </group>
        ) : (
          // Cut Timber Stump with Fresh Lumber
          <group>
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.65, 0.75, 0.6, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.05, 8]} />
              <meshStandardMaterial color="#d4a373" roughness={0.6} />
            </mesh>
          </group>
        )}
      </group>

      {/* Sleek Pill Badge Billboard */}
      <Billboard position={[0, 2.1, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[3.2, 0.85]} />
            <meshBasicMaterial color="#090d16" transparent opacity={0.88} />
        </mesh>
        <Text
          position={[0, 0.15, 0]}
          fontSize={0.34}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#090d16"
        >
          {`${icon} ${node.name}`}
        </Text>
        <Text
          position={[0, -0.18, 0]}
          fontSize={0.26}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {`${Math.round(node.currentCapacity)} / ${node.maxCapacity} ${node.type} (${Math.round(capacityRatio * 100)}%)`}
        </Text>
      </Billboard>
    </group>
  );
});

export const ResourceNodesView = memo(function ResourceNodesView({ nodes }: { nodes: ResourceNode[] }) {
  return (
    <group>
      {nodes.map((node) => (
        <SingleNodeView key={node.id} node={node} />
      ))}
    </group>
  );
});
