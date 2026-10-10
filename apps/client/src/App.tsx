import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';

import {
  QrCode,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  Eye,
  Video,
  Gauge,
  ArrowDownUp,
  X,
  Settings,
  Edit3,
  Check,
  XCircle
} from 'lucide-react';
import {
  AgentRuntimeState,
  ResourceNode,
  ResourceType,
  MarketPriceBook,
  MarketDeskSnapshot,
  TOTAL_AGENTS
} from '@civilization/shared';

import { GroundTerrain } from './components/world/GroundTerrain';
import { VoxelBuildings } from './components/world/VoxelBuildings';
import { InstancedFoliage } from './components/world/InstancedFoliage';
import { ResourceNodesView } from './components/world/ResourceNodesView';
import { AtmosphericEffects, VolumetricLightBeams } from './components/world/AtmosphericEffects';
import { BuildingDetails } from './components/world/BuildingDetails';
import { SettingsPanel } from './components/hud/UIComponents';
import { PostProcessing } from './components/hud/PostProcessing';
import { VoxelAgent } from './components/agents/VoxelAgent';
import { AgentAvatar, RESOURCE_ICONS } from './components/agents/AgentAvatar';
import { SpectatorCamera, CameraMode } from './components/camera/SpectatorCamera';
import { PerformanceHUDInsideCanvas, PerformanceOverlay } from './components/hud/PerformanceHUD';
import { QRClaimModal } from './components/hud/QRClaimModal';
import { MarketDeskModal } from './components/hud/MarketDeskModal';
import { ResourceGraphModal } from './components/hud/ResourceGraphModal';
import { EventsFeed, FeedEvent } from './components/hud/EventsFeed';
import { ConnectWalletButton } from './components/hud/ConnectWalletButton';
import { MobileClaimPortal } from './components/mobile/MobileClaimPortal';
import { LoadingScreen } from './components/hud/LoadingScreen';

export default function App() {
  const [claimSlotFromUrl, setClaimSlotFromUrl] = useState<number | null>(() => {
    const match = window.location.pathname.match(/\/claim\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  });

  const [agents, setAgents] = useState<AgentRuntimeState[]>([]);
  const [resourceNodes, setResourceNodes] = useState<ResourceNode[]>([]);
  const [marketBook, setMarketBook] = useState<MarketPriceBook | null>(null);
  const [marketDesk, setMarketDesk] = useState<MarketDeskSnapshot | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentRuntimeState | null>(null);
  const agentsRef = useRef<AgentRuntimeState[]>([]);
  const lastTradeToastRef = useRef<number>(0);

  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsLatencyMs, setWsLatencyMs] = useState<number>(12);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CORE_AI' | 'AUDIENCE' | 'NPC'>('ALL');
  const [cameraMode, setCameraMode] = useState<CameraMode>('ORBIT');

  const [showProfiler, setShowProfiler] = useState<boolean>(false);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [showMarketDesk, setShowMarketDesk] = useState<boolean>(false);
  const [selectedResourceForGraph, setSelectedResourceForGraph] = useState<ResourceType | null>(null);
  const [isEditingAgentName, setIsEditingAgentName] = useState<boolean>(false);
  const [editNameInput, setEditNameInput] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [recentShocks, setRecentShocks] = useState<any[]>([]);

  // Cinematic game loading screen timer
  const [minLoadingTimerPassed, setMinLoadingTimerPassed] = useState<boolean>(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTimerPassed(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const isWorldReady = (agents.length > 0 || wsConnected) && minLoadingTimerPassed;

  const [metrics, setMetrics] = useState({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 42,
    triangles: 38500,
    geometries: 28,
    textures: 6
  });

  // Graphics Settings State (Optimized for ~60 FPS Target)
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [postProcessingEnabled, setPostProcessingEnabled] = useState<boolean>(false);
  const [atmosphericEnabled, setAtmosphericEnabled] = useState<boolean>(false);
  const [lodEnabled, setLodEnabled] = useState<boolean>(false);
  const [shadowsEnabled, setShadowsEnabled] = useState<boolean>(false);

  const togglePostProcessing = useCallback(() => setPostProcessingEnabled(p => !p), []);
  const toggleAtmospheric = useCallback(() => setAtmosphericEnabled(p => !p), []);
  const toggleLOD = useCallback(() => setLodEnabled(p => !p), []);
  const toggleShadows = useCallback(() => setShadowsEnabled(p => !p), []);

  // Toggle profiler on F3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowProfiler((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectAgent = useCallback((id: string) => {
    const ag = agentsRef.current.find(a => a.id === id);
    if (ag) {
      setSelectedAgent(ag);
    }
  }, []);

  // Fetch initial state & setup WebSocket
  useEffect(() => {
    const apiFetch = async (path: string) => {
      try {
        const res = await fetch(path);
        if (res.ok) return await res.json();
      } catch {
        // fallback to direct server port 4000
      }
      const res2 = await fetch(`http://${window.location.hostname}:4000${path}`);
      return await res2.json();
    };

    apiFetch('/api/agents')
      .then((data: AgentRuntimeState[]) => {
        setAgents(data);
        agentsRef.current = data;
        if (data.length > 0) setSelectedAgent(data[0]);
      })
      .catch((err) => console.warn('Game server REST unavailable', err));

    apiFetch('/api/market')
      .then((book: MarketPriceBook) => setMarketBook(book))
      .catch((err) => console.warn('Market API unavailable', err));

    apiFetch('/api/economy/desk')
      .then((desk: MarketDeskSnapshot) => setMarketDesk(desk))
      .catch((err) => console.warn('Desk API unavailable', err));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.port === '3000' ? `${window.location.hostname}:4000` : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/ws`;
    const socket = new WebSocket(wsUrl);

    const pushFeedEvent = (item: Omit<FeedEvent, 'id' | 'timestamp'>) => {
      const newEvt: FeedEvent = {
        ...item,
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now()
      };
      setFeedEvents((prev) => [newEvt, ...prev.slice(0, 5)]);
    };

    socket.onopen = () => {
      setWsConnected(true);
      // Measure ping latency
      const pingStart = Date.now();
      socket.send(JSON.stringify({ type: 'PING', timestamp: pingStart }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'PONG') {
          const rtt = Date.now() - msg.timestamp;
          setWsLatencyMs(Math.max(4, rtt));
        } else if (msg.type === 'INIT_WORLD') {
          setAgents(msg.payload.agents);
          agentsRef.current = msg.payload.agents;
          setResourceNodes(msg.payload.resourceNodes || []);
          setMarketBook(msg.payload.market);
          if (msg.payload.marketDesk) {
            setMarketDesk(msg.payload.marketDesk);
          }
          if (msg.payload.agents.length > 0) {
            setSelectedAgent(msg.payload.agents[0]);
          }
        } else if (msg.type === 'DELTA_UPDATE') {
          if (msg.payload.marketPrices) {
            setMarketBook(msg.payload.marketPrices);
          }
          if (msg.payload.marketDesk) {
            setMarketDesk(msg.payload.marketDesk);
          }
          if (msg.payload.resourceNodeCapacities) {
            setResourceNodes((prev) =>
              prev.map((node) => {
                const updated = msg.payload.resourceNodeCapacities.find(
                  (c: { id: string }) => c.id === node.id
                );
                return updated ? { ...node, currentCapacity: updated.currentCapacity } : node;
              })
            );
          }

          // Apply agent deltas
          setAgents((prevAgents) => {
            const deltaMap = new Map(msg.payload.agentDeltas.map((d: any) => [d.id, d]));
            const next = prevAgents.map((agent) => {
              const delta = deltaMap.get(agent.id) as any;
              if (!delta) return agent;
              return {
                ...agent,
                position: delta.position || agent.position,
                targetPosition: delta.targetPosition || agent.targetPosition,
                actionState: delta.actionState || agent.actionState,
                gold: delta.gold !== undefined ? delta.gold : agent.gold,
                inventory: delta.inventory || agent.inventory,
                recentThought: delta.recentThought || agent.recentThought,
                backerAddress: delta.backerAddress !== undefined ? delta.backerAddress : agent.backerAddress,
                stakedMonAmount: delta.stakedMonAmount !== undefined ? delta.stakedMonAmount : agent.stakedMonAmount,
                onChainTxStatus: delta.onChainTxStatus || agent.onChainTxStatus,
                lastOnChainTxHash: delta.lastOnChainTxHash || agent.lastOnChainTxHash
              };
            });

            agentsRef.current = next;

            setSelectedAgent((currentSelected) => {
              if (currentSelected) {
                const updatedSel = next.find((a) => a.id === currentSelected.id);
                if (updatedSel) return updatedSel;
              }
              return currentSelected;
            });

            return next;
          });
        } else if (msg.type === 'ALLIANCE_EVENT') {
          pushFeedEvent({
            type: 'ALLIANCE_EVENT',
            title: 'Diplomatic Alliance',
            description: `${msg.payload.agentA} allied with ${msg.payload.agentB}: ${msg.payload.terms}`,
            color: '#a855f7'
          });
        } else if (msg.type === 'BETRAYAL_EVENT') {
          pushFeedEvent({
            type: 'BETRAYAL_EVENT',
            title: 'Betrayal Committed!',
            description: `${msg.payload.betrayerId} betrayed ${msg.payload.victimId} (-${msg.payload.goldStolen}G stolen): "${msg.payload.details}"`,
            color: '#ef4444'
          });
        } else if (msg.type === 'ECONOMIC_SHOCK') {
          pushFeedEvent({
            type: 'ECONOMIC_SHOCK',
            title: `Shock: ${msg.payload.shockName}`,
            description: msg.payload.description,
            color: '#f59e0b'
          });
          setRecentShocks((prev) => [
            {
              shockName: msg.payload.shockName,
              resource: msg.payload.resource,
              description: msg.payload.description,
              timestamp: Date.now()
            },
            ...prev.slice(0, 7)
          ]);
        } else if (msg.type === 'TRADE_EVENT') {
          const now = Date.now();
          // Rate limit trade toast banners to at least 14s apart so spectator HUD stays calm & realistic
          if (now - lastTradeToastRef.current >= 14000) {
            lastTradeToastRef.current = now;
            const sId = String(msg.payload.sellerId || '');
            const bId = String(msg.payload.buyerId || '');
            const seller = agentsRef.current.find((a) => a.id === sId);
            const buyer = agentsRef.current.find((a) => a.id === bId);
            const sellerName = seller ? seller.name : sId;
            const buyerName = buyer ? buyer.name : bId;

            pushFeedEvent({
              type: 'TRADE_EVENT',
              title: 'Market Trade Executed',
              description: `${sellerName} sold ${msg.payload.amount} ${msg.payload.resource} to ${buyerName} for ${msg.payload.price}G`,
              color: '#10b981'
            });
          }
        } else if (msg.type === 'TREATY_EVENT') {
          pushFeedEvent({
            type: 'TREATY_EVENT',
            title: `Treaty ${msg.payload.kind}`,
            description: msg.payload.detail,
            color: '#c084fc'
          });
        } else if (msg.type === 'BLOCKCHAIN_TX') {
          pushFeedEvent({
            type: 'BLOCKCHAIN_TX',
            title: `Monad Tx (${msg.payload.status})`,
            description: msg.payload.summary,
            txHash: msg.payload.txHash,
            color: '#836ef9'
          });
        } else if (msg.type === 'PARTICIPANT_FUNDED') {
          pushFeedEvent({
            type: 'PARTICIPANT_FUNDED',
            title: 'Agent Backed on Monad',
            description: `Audience Slot #${msg.payload.slotId} backed with ${msg.payload.amountMon} MON by ${msg.payload.backerAddress.slice(0, 6)}...`,
            color: '#06b6d4'
          });
        }
      } catch (err) {
        console.error('Failed to parse WS payload', err);
      }
    };

    socket.onclose = () => setWsConnected(false);
    socket.onerror = () => setWsConnected(false);

    // Periodic ping
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, 4000);

    return () => {
      clearInterval(pingInterval);
      socket.close();
    };
  }, []);

  const handleFundSuccess = useCallback(
    (slotId: number, amountMon: number, backerAddress: string, directive?: string, customName?: string) => {
      setAgents((prev) =>
        prev.map((a) => {
          if (a.slotId === slotId) {
            return {
              ...a,
              name: customName || a.name,
              backerAddress,
              stakedMonAmount: (a.stakedMonAmount || 0) + amountMon,
              gold: a.gold + Math.round(amountMon * 100),
              customDirective: directive || a.customDirective,
              recentThought: `Backed by ${backerAddress.slice(0, 6)}... on Monad (+${amountMon} MON)`
            };
          }
          return a;
        })
      );
      setSelectedAgent((prev) => (prev && prev.slotId === slotId ? {
        ...prev,
        name: customName || prev.name,
        backerAddress,
        stakedMonAmount: (prev.stakedMonAmount || 0) + amountMon,
        gold: prev.gold + Math.round(amountMon * 100)
      } : prev));
    },
    []
  );

  const handleSaveAgentName = useCallback(async (slotId: number, newName: string) => {
    if (!newName.trim()) return;
    setIsSavingName(true);
    try {
      const storedAddr = localStorage.getItem('civilization_wallet_address') || undefined;
      let res: Response | null = null;
      try {
        res = await fetch(`/api/agents/${slotId}/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim(), backerAddress: storedAddr })
        });
      } catch {
        res = null;
      }
      if (!res || !res.ok) {
        res = await fetch(`http://${window.location.hostname}:4000/api/agents/${slotId}/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim(), backerAddress: storedAddr })
        });
      }
      const data = await res.json();
      if (data.success) {
        setAgents((prev) =>
          prev.map((a) => (a.slotId === slotId ? { ...a, name: data.name } : a))
        );
        setSelectedAgent((prev) => (prev ? { ...prev, name: data.name } : null));
        setIsEditingAgentName(false);
      } else {
        alert(data.message || 'Could not rename agent');
      }
    } catch (err) {
      console.error('Rename agent failed', err);
    } finally {
      setIsSavingName(false);
    }
  }, []);

  const handleDismissFeedEvent = useCallback((id: string) => {
    setFeedEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const filteredAgents = agents.filter((a) => {
    if (activeTab === 'ALL') return true;
    return a.category === activeTab;
  });

  if (claimSlotFromUrl !== null) {
    return (
      <MobileClaimPortal
        slotId={claimSlotFromUrl}
        onEnterSpectator={() => {
          window.history.pushState({}, '', '/');
          setClaimSlotFromUrl(null);
        }}
      />
    );
  }

  return (
    <div className="dashboard-shell" style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      {/* MONCRAFT Game Loading Screen with Logo & 3-Dots Animation */}
      <LoadingScreen isReady={isWorldReady} />

      {/* 3D Canvas Viewport */}
      <Canvas
        shadows={shadowsEnabled}
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', antialias: true, stencil: false }}
        camera={{ position: [-28, 32, -32], fov: 46 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #60a5fa 0%, #93c5fd 60%, #dbeafe 100%)'
        }}
      >
        <fog attach="fog" args={['#93c5fd', 85, 200]} />
        <ambientLight intensity={0.45} color="#dbeafe" />
        <directionalLight
          position={[50, 80, 40]}
          intensity={2.0}
          castShadow={shadowsEnabled}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-75}
          shadow-camera-right={75}
          shadow-camera-top={75}
          shadow-camera-bottom={-75}
          shadow-camera-near={0.5}
          shadow-camera-far={200}
          shadow-bias={-0.0001}
          color="#fffef0"
        />
        <hemisphereLight args={['#dbeafe', '#166534', 0.7]} />
        {/* Fill light for deeper shadows */}
        <directionalLight
          position={[-40, 50, -30]}
          intensity={0.6}
          color="#c7d2fe"
        />
        {/* Rim light for agent silhouettes */}
        <directionalLight
          position={[0, 30, -50]}
          intensity={0.4}
          color="#fef3c7"
        />


        {/* 3D World Environment Components */}
        <GroundTerrain />
        <VoxelBuildings />
        <InstancedFoliage />
        <ResourceNodesView nodes={resourceNodes} />
        {atmosphericEnabled && <BuildingDetails />}

        {/* Atmospheric Effects: dust motes, fire embers, pollen, mist, volumetric light beams */}
        {atmosphericEnabled && <AtmosphericEffects />}
        {atmosphericEnabled && <VolumetricLightBeams />}

        {/* 40 Autonomous Agents in 3D */}
        {agents.map((agent) => (
          <VoxelAgent
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onSelect={() => handleSelectAgent(agent.id)}
          />
        ))}

        {/* Spectator Camera Modes */}
        <SpectatorCamera mode={cameraMode} selectedAgent={selectedAgent} />

        {/* Performance Profiler Metric Collector */}
        <PerformanceHUDInsideCanvas onMetricsUpdate={setMetrics} />

        {/* Post-Processing Effects (Bloom, Color Grading, Vignette, SMAA) */}
        {postProcessingEnabled && (
          <PostProcessing
            enabled={true}
            bloomIntensity={0.55}
            bloomThreshold={0.82}
            vignetteIntensity={0.22}
            chromaticAberration={0.025}
            colorGradingEnabled={true}
            smaaEnabled={true}
          />
        )}
      </Canvas>

      {/* Top HUD Container */}
      <div style={{ position: 'absolute', top: 12, left: 16, right: 16, display: 'flex', gap: 16, zIndex: 20 }}>
        {/* Main Header / Command Bar */}
        <header
          className="glass-panel hud-topbar"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box'
          }}
        >
        {/* Left: Branding */}
        <div className="hud-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: wsConnected ? '#10b981' : '#f59e0b',
              boxShadow: wsConnected ? '0 0 8px #10b981' : 'none',
              flexShrink: 0
            }}
          />
          <div className="hud-brand-lockup" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <img className="hud-logo" src="/moncraft-logo.png" alt="Moncraft" />
          </div>
        </div>

        {/* Center: Live Market Price Ticker */}
        {marketBook && (
          <div className="hud-market-strip" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {(['WOOD', 'WHEAT', 'IRON', 'GOLD'] as const).map((res) => {
              const trend = marketBook.priceTrends[res];
              return (
                <div
                  key={res}
                  className="hud-market-chip"
                  onClick={() => setSelectedResourceForGraph(res)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.5)';
                    e.currentTarget.style.transform = 'scale(1.04)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={`Click to view ${res} economic price graph & market metrics`}
                >
                  <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{RESOURCE_ICONS[res]}</span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>{res}</span>
                  <strong style={{ fontSize: '0.8rem', color: '#f8fafc' }}>{marketBook.prices[res]}G</strong>
                  {trend === 'UP' && <TrendingUp size={11} color="#10b981" />}
                  {trend === 'DOWN' && <TrendingDown size={11} color="#ef4444" />}
                  {trend === 'STABLE' && <Minus size={11} color="#64748b" />}
                </div>
              );
            })}

            {marketBook.agoraTreasury !== undefined && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  padding: '3px 7px',
                  borderRadius: 6,
                  border: '1px solid rgba(245, 158, 11, 0.25)'
                }}
                title="Agora Municipal Treasury reserve collected from trade tariffs and civic dues"
              >
                <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>🏛️</span>
                <span style={{ fontSize: '0.66rem', color: '#f59e0b', fontWeight: 700 }}>Agora</span>
                <strong style={{ fontSize: '0.78rem', color: '#fbbf24' }}>{marketBook.agoraTreasury}G</strong>
              </div>
            )}
          </div>
        )}

        {/* Right: Actions & Wallet */}
        <div className="hud-command-group" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            className="hud-command-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.76rem',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <Activity size={13} color="#38bdf8" />
            <span style={{ color: '#94a3b8' }}>Pop:</span>
            <strong style={{ color: '#f8fafc' }}>{agents.length || TOTAL_AGENTS}</strong>
          </div>

          <button
            onClick={() => setShowMarketDesk(true)}
            className="hud-command-button"
            style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(131, 110, 249, 0.2)',
              border: '1px solid rgba(131, 110, 249, 0.4)',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <ArrowDownUp size={13} color="#c084fc" />
            Market Desk
            <span
              style={{
                backgroundColor: '#836ef9',
                color: '#fff',
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: 10,
                fontWeight: 800
              }}
            >
              {marketDesk?.openOrders?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setShowProfiler((prev) => !prev)}
            className="mono-text hud-command-button"
            style={{
              fontSize: '0.76rem',
              color: metrics.fps >= 55 ? '#10b981' : '#f59e0b',
              backgroundColor: showProfiler ? 'rgba(131, 110, 249, 0.3)' : 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '4px 8px',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Gauge size={13} />
            {metrics.fps} FPS
          </button>

          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'rgba(131, 110, 249, 0.2)',
              border: '1px solid rgba(131, 110, 249, 0.4)',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.2)'; }}
            title="Settings (Graphics, Performance, Gameplay)"
          >
            <Settings size={13} color="#c084fc" />
          </button>

        </div>
        </header>

        {/* Floating Wallet Connect Block */}
        <div 
          className="glass-panel"
          style={{ 
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            boxSizing: 'border-box',
            flexShrink: 0
          }}
        >
          <ConnectWalletButton
            agents={agents}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            onFocusAgent={(agent) => {
              setSelectedAgent(agent);
              setCameraMode('FOLLOW');
            }}
            onOpenClaim={(agent) => {
              setSelectedAgent(agent);
              setShowClaimModal(true);
            }}
          />
        </div>
      </div>

      {/* Camera Mode Toolbar (Bottom-Center) */}
      <div
        className="glass-panel hud-camera-dock"
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 10px',
          display: 'flex',
          gap: 8,
          zIndex: 10
        }}
      >
        <button
          onClick={() => setCameraMode('ORBIT')}
          className="hud-camera-button"
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: cameraMode === 'ORBIT' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
            color: cameraMode === 'ORBIT' ? '#fff' : '#94a3b8',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: cameraMode === 'ORBIT' ? 'scale(1.02)' : 'scale(1)'
          }}
          onMouseOver={(e) => { if (cameraMode !== 'ORBIT') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseOut={(e) => { if (cameraMode !== 'ORBIT') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
        >
          <Camera size={14} /> Free Orbit
        </button>

        <button
          onClick={() => setCameraMode('FOLLOW')}
          className="hud-camera-button"
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: cameraMode === 'FOLLOW' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
            color: cameraMode === 'FOLLOW' ? '#fff' : '#94a3b8',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: cameraMode === 'FOLLOW' ? 'scale(1.02)' : 'scale(1)'
          }}
          onMouseOver={(e) => { if (cameraMode !== 'FOLLOW') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseOut={(e) => { if (cameraMode !== 'FOLLOW') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
        >
          <Eye size={14} /> Follow Agent
        </button>

        <button
          onClick={() => setCameraMode('CINEMATIC')}
          className="hud-camera-button"
          style={{
            padding: '7px 14px',
            borderRadius: 6,
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: cameraMode === 'CINEMATIC' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
            color: cameraMode === 'CINEMATIC' ? '#fff' : '#94a3b8',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: cameraMode === 'CINEMATIC' ? 'scale(1.02)' : 'scale(1)'
          }}
          onMouseOver={(e) => { if (cameraMode !== 'CINEMATIC') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseOut={(e) => { if (cameraMode !== 'CINEMATIC') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
        >
          <Video size={14} /> Drone Cam
        </button>
      </div>

      {/* Left Roster Sidebar */}
      <aside
        className="glass-panel hud-roster"
        style={{
          position: 'absolute',
          top: 68,
          left: 16,
          width: 275,
          bottom: 16,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          animation: 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <style>{`
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        <div className="hud-panel-heading">
          <div>
            <div className="hud-panel-kicker">Civilization</div>
            <div className="hud-panel-title">Agent roster</div>
          </div>
          <div className="hud-panel-kicker">{filteredAgents.length} active</div>
        </div>
        <div className="hud-tabs" style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {(['ALL', 'CORE_AI', 'AUDIENCE', 'NPC'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="hud-tab"
              style={{
                flex: 1,
                padding: '5px 2px',
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === tab ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
                color: activeTab === tab ? '#fff' : '#94a3b8',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: activeTab === tab ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseOver={(e) => { if (activeTab !== tab) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
              onMouseOut={(e) => { if (activeTab !== tab) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
            >
              {tab === 'CORE_AI' ? 'CORE' : tab}
            </button>
          ))}
        </div>

        <div className="hud-agent-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filteredAgents.map((agent) => {
            const isSel = selectedAgent?.id === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="hud-agent-row"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedAgent(agent); }}
                style={{
                  padding: '6px 8px',
                  borderRadius: 8,
                  backgroundColor: isSel ? 'rgba(131, 110, 249, 0.25)' : 'rgba(255,255,255,0.03)',
                  border: isSel ? '1px solid var(--monad-purple)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isSel ? 'translateX(4px)' : 'translateX(0)'
                }}
                onMouseOver={(e) => {
                  if (!isSel) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSel) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <AgentAvatar agent={agent} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: agent.colorHex, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {agent.actionState} • {agent.archetype}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.7rem' }}>🪙</span>
                    <span>{agent.gold}G</span>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                    #{agent.slotId}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Selected Agent Telemetry Drawer */}
      {selectedAgent && (
        <aside
          className="glass-panel hud-inspector"
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 340,
            padding: 16,
            zIndex: 10,
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <AgentAvatar agent={selectedAgent} size={54} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    color: selectedAgent.colorHex,
                    letterSpacing: '0.05em'
                  }}
                >
                  {selectedAgent.category} • {selectedAgent.archetype}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#94a3b8',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    #{selectedAgent.slotId}
                  </span>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 2
                    }}
                    title="Close agent telemetry"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {isEditingAgentName && selectedAgent.category === 'AUDIENCE' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    maxLength={24}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--monad-purple)',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      outline: 'none',
                      width: 140
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveAgentName(selectedAgent.slotId, editNameInput)}
                    disabled={isSavingName}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Save custom name"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setIsEditingAgentName(false)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Cancel"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 0 0' }}>
                    {selectedAgent.name}
                  </h2>
                  {selectedAgent.category === 'AUDIENCE' && (
                    <button
                      onClick={() => {
                        setEditNameInput(selectedAgent.name);
                        setIsEditingAgentName(true);
                      }}
                      style={{
                        background: 'rgba(131, 110, 249, 0.15)',
                        border: '1px solid rgba(131, 110, 249, 0.3)',
                        borderRadius: 6,
                        color: '#c084fc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '3px 6px',
                        gap: 4,
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}
                      title="Rename this audience agent"
                    >
                      <Edit3 size={12} /> Rename
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Real-time Thought Stream */}
          <div
            className="hud-thought"
            style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              padding: 12,
              fontSize: '0.88rem',
              color: '#e2e8f0',
              fontStyle: 'italic',
              marginBottom: 14,
              borderLeft: `3px solid ${selectedAgent.colorHex}`
            }}
          >
            "{selectedAgent.recentThought}"
          </div>

          {/* Coordinates & Action State */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#94a3b8',
              marginBottom: 14,
              backgroundColor: 'rgba(255,255,255,0.02)',
              padding: '6px 10px',
              borderRadius: 6
            }}
          >
            <span>State: <strong style={{ color: '#fff' }}>{selectedAgent.actionState}</strong></span>
            <span>Position: <strong className="mono-text" style={{ color: '#fff' }}>({selectedAgent.position.x}, {selectedAgent.position.z})</strong></span>
          </div>

          {/* Resources & Wealth Grid */}
          <div className="hud-resource-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            <div
              onClick={() => setSelectedResourceForGraph('WOOD')}
              className="hud-resource-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedResourceForGraph('WOOD'); }}
              style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view WOOD economic trends"
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{RESOURCE_ICONS.WOOD}</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>WOOD</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>{selectedAgent.inventory.WOOD}</div>
            </div>
            <div
              onClick={() => setSelectedResourceForGraph('WHEAT')}
              className="hud-resource-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedResourceForGraph('WHEAT'); }}
              style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view WHEAT economic trends"
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{RESOURCE_ICONS.WHEAT}</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>WHEAT</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>{selectedAgent.inventory.WHEAT}</div>
            </div>
            <div
              onClick={() => setSelectedResourceForGraph('IRON')}
              className="hud-resource-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedResourceForGraph('IRON'); }}
              style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view IRON economic trends"
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{RESOURCE_ICONS.IRON}</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>IRON</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>{selectedAgent.inventory.IRON}</div>
            </div>
            <div
              onClick={() => setSelectedResourceForGraph('GOLD')}
              className="hud-resource-card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedResourceForGraph('GOLD'); }}
              style={{ background: 'rgba(251,191,36,0.12)', padding: 10, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(251,191,36,0.25)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view GOLD economic trends"
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{RESOURCE_ICONS.GOLD}</div>
              <div style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 800 }}>GOLD</div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fbbf24' }}>{selectedAgent.gold}</div>
            </div>
          </div>

          {/* Audience Slot QR Claim / Backing Section */}
          {selectedAgent.category === 'AUDIENCE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedAgent.backerAddress ? (
                <div style={{ fontSize: '0.78rem', color: '#10b981', textAlign: 'center', padding: 8, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 6 }}>
                  Backed on Monad: <strong>{selectedAgent.backerAddress}</strong> ({selectedAgent.stakedMonAmount || 0} MON)
                </div>
              ) : (
                <button
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--monad-purple)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: '0.92rem'
                  }}
                  onClick={() => setShowClaimModal(true)}
                >
                  <QrCode size={18} /> Claim & Back via Monad QR
                </button>
              )}
            </div>
          )}
        </aside>
      )}

      {/* Real-time Performance HUD Profiler */}
      <PerformanceOverlay
        visible={showProfiler}
        metrics={metrics}
        wsLatencyMs={wsLatencyMs}
      />

      {/* Participant QR Claim & Wallet Backing Modal */}
      <QRClaimModal
        agent={selectedAgent}
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onFundSuccess={handleFundSuccess}
      />

      {/* Civilization Live Events Toast Feed */}
      <EventsFeed
        events={feedEvents}
        onDismiss={handleDismissFeedEvent}
      />

      {/* Market Desk Modal */}
      <MarketDeskModal
        isOpen={showMarketDesk}
        onClose={() => setShowMarketDesk(false)}
        marketDesk={marketDesk}
        marketBook={marketBook}
        recentShocks={recentShocks}
      />

      {/* Resource Economic Trend Graph Modal */}
      <ResourceGraphModal
        isOpen={selectedResourceForGraph !== null}
        onClose={() => setSelectedResourceForGraph(null)}
        resource={selectedResourceForGraph || 'WOOD'}
        onSelectResource={(res) => setSelectedResourceForGraph(res)}
        marketBook={marketBook}
        onOpenMarketDesk={() => setShowMarketDesk(true)}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onTogglePostProcessing={togglePostProcessing}
        onToggleAtmospheric={toggleAtmospheric}
        onToggleLOD={toggleLOD}
        onToggleShadows={toggleShadows}
        postProcessingEnabled={postProcessingEnabled}
        atmosphericEnabled={atmosphericEnabled}
        lodEnabled={lodEnabled}
        shadowsEnabled={shadowsEnabled}
      />


    </div>
  );
}
