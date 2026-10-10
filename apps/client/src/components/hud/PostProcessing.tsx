import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping, SMAA, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

interface PostProcessingProps {
  enabled?: boolean;
  bloomIntensity?: number;
  bloomThreshold?: number;
  vignetteIntensity?: number;
  chromaticAberration?: number;
  colorGradingEnabled?: boolean;
  smaaEnabled?: boolean;
}

export function PostProcessing({
  enabled = true,
  bloomIntensity = 0.6,
  bloomThreshold = 0.85,
  vignetteIntensity = 0.25,
  chromaticAberration = 0.03,
  smaaEnabled = true
}: PostProcessingProps) {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={4} autoClear={false}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette
        offset={0.35}
        darkness={vignetteIntensity}
      />
      <ChromaticAberration
        offset={new THREE.Vector2(chromaticAberration, chromaticAberration * 0.5)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={0.015} />
      <ToneMapping />
      {smaaEnabled ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

export function PostProcessingSettings() {
  return {
    bloomIntensity: 0.6,
    bloomThreshold: 0.85,
    vignetteIntensity: 0.25,
    chromaticAberration: 0.03,
    colorGradingEnabled: true,
    smaaEnabled: true
  };
}