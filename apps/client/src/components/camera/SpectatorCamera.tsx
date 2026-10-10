import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { AgentRuntimeState } from '@civilization/shared';

export type CameraMode = 'ORBIT' | 'FOLLOW' | 'CINEMATIC';

export function SpectatorCamera({
  mode,
  selectedAgent
}: {
  mode: CameraMode;
  selectedAgent: AgentRuntimeState | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 2, 2));
  const desiredCamPos = useRef(new THREE.Vector3(-28, 32, -32));

  useFrame((_, delta) => {
    // Clamp delta to prevent erratic jumps on frame hitches
    const safeDelta = Math.min(0.1, delta);

    if (mode === 'FOLLOW' && selectedAgent) {
      if (controlsRef.current) controlsRef.current.enabled = false;

      // Desired third-person elevated follow position (smooth rear-diagonal perspective)
      desiredCamPos.current.set(
        selectedAgent.position.x + 8.5,
        selectedAgent.position.y + 7.5,
        selectedAgent.position.z + 8.5
      );

      // Frame-rate independent exponential smoothing
      const posLerp = 1 - Math.exp(-4.5 * safeDelta);
      camera.position.lerp(desiredCamPos.current, posLerp);

      // Smooth look-at target dampening toward agent center
      const lookLerp = 1 - Math.exp(-6.0 * safeDelta);
      targetLookAt.current.lerp(
        new THREE.Vector3(selectedAgent.position.x, selectedAgent.position.y + 1.2, selectedAgent.position.z),
        lookLerp
      );
      camera.lookAt(targetLookAt.current);

      // Keep OrbitControls target aligned for seamless transition back to ORBIT mode
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
      }
    } else if (mode === 'CINEMATIC') {
      if (controlsRef.current) controlsRef.current.enabled = false;

      // Harmonic orbital drone sweep across the civilization
      const time = Date.now() * 0.00012;
      desiredCamPos.current.set(
        Math.cos(time) * 56,
        26 + Math.sin(time * 2.2) * 5.5,
        Math.sin(time) * 56
      );
      const droneLerp = 1 - Math.exp(-2.2 * safeDelta);
      camera.position.lerp(desiredCamPos.current, droneLerp);

      const lookLerp = 1 - Math.exp(-3.5 * safeDelta);
      targetLookAt.current.lerp(new THREE.Vector3(0, 2.5, 0), lookLerp);
      camera.lookAt(targetLookAt.current);

      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAt.current);
      }
    } else {
      // Free Orbit mode with silky smooth physical inertia
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={true}
      dampingFactor={0.05}
      target={[0, 2, 2]}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={6}
      maxDistance={140}
    />
  );
}
