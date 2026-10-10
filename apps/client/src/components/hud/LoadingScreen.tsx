import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  isReady: boolean;
  onFinish?: () => void;
}

const LOADING_STEPS = [
  'Generating Stepped Voxel Terrain...',
  'Instancing Oak & Pine Forest Biomes...',
  'Awakening 40 AI Brains (Harry Potter Core Personalities)...',
  'Connecting to Monad Testnet (Chain ID 10143)...',
  'Synchronizing Agora Market & Treaties...',
  'Entering Moncraft Civilization...'
];

const GAME_TIPS = [
  'Tip: 40 autonomous agents live here permanently—gathering, trading, and competing for wealth.',
  'Tip: Scan an audience agent QR code on your mobile phone to back them with testnet MON.',
  'Tip: Hermione Granger and Griphook formulate real-time economic strategies powered by NVIDIA NIM.',
  'Tip: Wheat is required for survival; famine shocks cause agent speeds to drop when food runs low.',
  'Tip: Press F3 anytime in game to toggle the real-time performance profiler.'
];

export function LoadingScreen({ isReady, onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(15);
  const [stepIndex, setStepIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * GAME_TIPS.length));
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);

  // Simulated initial loading progress ramp
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const inc = Math.max(2, Math.floor(Math.random() * 8));
        return Math.min(90, prev + inc);
      });
    }, 180);

    return () => clearInterval(timer);
  }, []);

  // Cycle status messages
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1100);

    return () => clearInterval(stepTimer);
  }, []);

  // Cycle tips
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 3000);

    return () => clearInterval(tipTimer);
  }, []);

  // When isReady becomes true (or after smooth loading ramp)
  useEffect(() => {
    if (isReady) {
      setProgress(100);
      setStepIndex(LOADING_STEPS.length - 1);

      // Brief delay at 100% before smooth fade-out
      const fadeDelay = setTimeout(() => {
        setIsFadingOut(true);

        const unmountDelay = setTimeout(() => {
          setIsRendered(false);
          if (onFinish) onFinish();
        }, 700);

        return () => clearTimeout(unmountDelay);
      }, 400);

      return () => clearTimeout(fadeDelay);
    }
  }, [isReady, onFinish]);

  if (!isRendered) return null;

  return (
    <div
      className={`loading-screen-backdrop ${isFadingOut ? 'fading-out' : ''}`}
      aria-label="Moncraft Loading Screen"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Ambient Cyber Grid & Glow */}
      <div className="loading-ambient-grid" />
      <div className="loading-ambient-glow" />

      {/* Main Hero: Perfectly Centered Logo + Game 3-Dots Animation */}
      <div className="loading-hero-lockup">
        <div className="loading-logo-box">
          <img
            src="/moncraft-logo.png"
            alt="MONCRAFT"
            className="loading-moncraft-logo"
          />
          {/* 3 Dots beside the logo (Game-style bounce & glow) */}
          <div className="loading-dots-flank" title="Loading Civilization...">
            <span className="game-dot dot-1" />
            <span className="game-dot dot-2" />
            <span className="game-dot dot-3" />
          </div>
        </div>
      </div>

      {/* Progress Bar & Status Text */}
      <div className="loading-progress-container">
        <div className="loading-bar-track">
          <div
            className="loading-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div className="loading-status-text">
            <span>{LOADING_STEPS[stepIndex]}</span>
          </div>
          <span className="loading-percent">{progress}%</span>
        </div>
      </div>

      {/* Monad Chain & Civilization Badge */}
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.72rem',
          color: '#836ef9',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#836ef9',
            boxShadow: '0 0 8px #836ef9'
          }}
        />
        <span>Monad Testnet • Chain ID 10143</span>
      </div>

      {/* Rotating Gameplay Tip */}
      <div className="loading-tip-box">
        {GAME_TIPS[tipIndex]}
      </div>
    </div>
  );
}
