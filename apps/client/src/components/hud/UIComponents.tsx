import { useState, useEffect, useRef } from 'react';
import { X, Settings, Monitor, Zap, Palette, Camera, Eye, Wifi, Database, Layers, HelpCircle, Users } from 'lucide-react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ children, content, position = 'top', delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const childRef = useRef<HTMLElement>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '120%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '120%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left: { right: '120%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
    right: { left: '120%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 }
  };

  const arrowStyles: Record<string, React.CSSProperties> = {
    top: { bottom: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    bottom: { top: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    left: { right: -5, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    right: { left: -5, top: '50%', transform: 'translateY(-50%) rotate(45deg)' }
  };

  return (
    <span
      ref={childRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            ...positionStyles[position],
            padding: '6px 10px',
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(131, 110, 249, 0.3)',
            borderRadius: 6,
            fontSize: '0.7rem',
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            animation: 'fadeIn 0.15s ease-out',
            pointerEvents: 'none'
          }}
        >
          {content}
          <div
            style={{
              position: 'absolute',
              ...arrowStyles[position],
              width: 10,
              height: 10,
              backgroundColor: 'rgba(15, 23, 42, 0.98)',
              borderLeft: '1px solid rgba(131, 110, 249, 0.3)',
              borderTop: '1px solid rgba(131, 110, 249, 0.3)'
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: ${position === 'top' ? 'translateX(-50%) translateY(4px)' : position === 'bottom' ? 'translateX(-50%) translateY(-4px)' : position === 'left' ? 'translateY(-50%) translateX(4px)' : 'translateY(-50%) translateX(-4px)'}; }
          to { opacity: 1; transform: ${position === 'top' ? 'translateX(-50%) translateY(0)' : position === 'bottom' ? 'translateX(-50%) translateY(0)' : position === 'left' ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(0)'}; }
        }
      `}</style>
    </span>
  );
}

export function SettingsPanel({
  isOpen,
  onClose,
  onTogglePostProcessing,
  onToggleAtmospheric,
  onToggleLOD,
  onToggleShadows,
  postProcessingEnabled,
  atmosphericEnabled,
  lodEnabled,
  shadowsEnabled
}: {
  isOpen: boolean;
  onClose: () => void;
  onTogglePostProcessing: () => void;
  onToggleAtmospheric: () => void;
  onToggleLOD: () => void;
  onToggleShadows: () => void;
  postProcessingEnabled: boolean;
  atmosphericEnabled: boolean;
  lodEnabled: boolean;
  shadowsEnabled: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'graphics' | 'performance' | 'gameplay'>('graphics');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        className="glass-panel"
        style={{
          width: 480,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 0,
          border: '1px solid rgba(131, 110, 249, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.02) inset',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'center'
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(131, 110, 249, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={16} color="#c084fc" />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Settings</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 12px' }}>
          {['graphics', 'performance', 'gameplay'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                flex: 1,
                padding: '12px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: activeTab === tab ? '#c084fc' : '#64748b',
                backgroundColor: activeTab === tab ? 'rgba(131, 110, 249, 0.12)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: `2px solid ${activeTab === tab ? '#c084fc' : 'transparent'}`,
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {tab === 'graphics' && <Monitor size={14} />}
              {tab === 'performance' && <Zap size={14} />}
              {tab === 'gameplay' && <HelpCircle size={14} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {activeTab === 'graphics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingToggle
                label="Post-Processing Effects"
                description="Bloom, color grading, vignette, chromatic aberration, SMAA anti-aliasing"
                icon={<Palette size={18} />}
                enabled={postProcessingEnabled}
                onToggle={onTogglePostProcessing}
              />
              <SettingToggle
                label="Atmospheric Effects"
                description="Dust motes, fire embers, pollen, mist particles, volumetric light beams"
                icon={<Layers size={18} />}
                enabled={atmosphericEnabled}
                onToggle={onToggleAtmospheric}
              />
              <SettingToggle
                label="Dynamic LOD System"
                description="Distance-based level of detail for foliage and props (improves FPS)"
                icon={<Camera size={18} />}
                enabled={lodEnabled}
                onToggle={onToggleLOD}
              />
              <SettingToggle
                label="Real-time Shadows"
                description="Directional light shadows with cascaded shadow maps"
                icon={<Eye size={18} />}
                enabled={shadowsEnabled}
                onToggle={onToggleShadows}
              />
            </div>
          )}

          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingInfo
                label="Target Framerate"
                value="60 FPS"
                description="The simulation runs at a fixed 10 Hz tick rate; rendering is decoupled"
                icon={<Zap size={18} />}
              />
              <SettingInfo
                label="Draw Call Budget"
                value="< 80 calls"
                description="Instanced rendering for foliage, agents use shared materials"
                icon={<Layers size={18} />}
              />
              <SettingInfo
                label="Triangle Budget"
                value="< 150k tris"
                description="Low-poly voxel style with LOD reduction at distance"
                icon={<Database size={18} />}
              />
              <SettingInfo
                label="WebSocket Latency"
                value="< 40 ms RTT"
                description="Real-time delta updates at 10 Hz from authoritative server"
                icon={<Wifi size={18} />}
              />
            </div>
          )}

          {activeTab === 'gameplay' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SettingInfo
                label="Agent Population"
                value="40 Fixed"
                description="10 Core AI (NVIDIA NIM) • 10 Audience (Human-backed) • 20 NPC (Deterministic)"
                icon={<Users size={18} />}
              />
              <SettingInfo
                label="Resources"
                value="4 Types"
                description="WOOD 🪵 • WHEAT 🌾 • IRON ⛏️ • GOLD 🪙"
                icon={<Layers size={18} />}
              />
              <SettingInfo
                label="Blockchain"
                value="Monad Testnet (10143)"
                description="Real transactions for alliances, betrayals, settlements, funding"
                icon={<Database size={18} />}
              />
              <SettingInfo
                label="AI Decisions"
                value="Event-Driven"
                description="NIM called on shocks, betrayals, funding, trade proposals — never per-frame"
                icon={<Zap size={18} />}
              />
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(131, 110, 249, 0.2)',
              border: '1px solid rgba(131, 110, 249, 0.4)',
              borderRadius: 8,
              color: '#c084fc',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.3)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.2)'}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}

function SettingToggle({ label, description, icon, enabled, onToggle }: SettingToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(131, 110, 249, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 52,
          height: 28,
          borderRadius: 14,
          backgroundColor: enabled ? '#836ef9' : '#334155',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0
        }}
        aria-pressed={enabled}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? 26 : 2,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      </button>
    </div>
  );
}

interface SettingInfoProps {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function SettingInfo({ label, value, description, icon }: SettingInfoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(131, 110, 249, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{description}</div>
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', fontFamily: 'monospace', flexShrink: 0 }}>{value}</div>
    </div>
  );
}