import { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, ArrowUpRight, BarChart3, DollarSign, Layers, Activity } from 'lucide-react';
import { ResourceType, MarketPriceBook, PriceHistoryPoint } from '@civilization/shared';
import { RESOURCE_ICONS } from '../agents/AgentAvatar';

interface ResourceGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceType;
  onSelectResource: (res: ResourceType) => void;
  marketBook: MarketPriceBook | null;
  onOpenMarketDesk?: () => void;
}

const RESOURCE_DETAILS: Record<ResourceType, {
  name: string;
  subtitle: string;
  color: string;
  accentBg: string;
  sourceNode: string;
  nodeCoords: string;
  baseYield: string;
  role: string;
}> = {
  WOOD: {
    name: 'Timber Wood',
    subtitle: 'Primary construction & fuel resource',
    color: '#a16207',
    accentBg: 'rgba(161, 98, 7, 0.15)',
    sourceNode: 'Deep Timber Grove',
    nodeCoords: '(-22, 22)',
    baseYield: '3 units / 4.5s',
    role: 'Essential for building expansion, fortification repairs, and market barter'
  },
  WHEAT: {
    name: 'Golden Wheat',
    subtitle: 'Civilization sustenance & food ration',
    color: '#eab308',
    accentBg: 'rgba(234, 179, 8, 0.15)',
    sourceNode: 'North Windmill Fields',
    nodeCoords: '(-16, -18)',
    baseYield: '3 units / 4.0s',
    role: 'Consumed every 25s civilization subsistence cycle. Starving agents suffer speed penalties'
  },
  IRON: {
    name: 'Refined Iron',
    subtitle: 'Industrial forging & military hardware',
    color: '#94a3b8',
    accentBg: 'rgba(148, 163, 184, 0.15)',
    sourceNode: 'Iron Mountain Quarry',
    nodeCoords: '(26, 24)',
    baseYield: '2 units / 6.5s',
    role: 'Forged into arms, armor, and industrial tools by Warlord and Industrialist factions'
  },
  GOLD: {
    name: 'Ancient Gold',
    subtitle: 'High-value monetary bullion & backing reserve',
    color: '#fbbf24',
    accentBg: 'rgba(251, 191, 36, 0.18)',
    sourceNode: 'Sunken Relic Obelisk',
    nodeCoords: '(30, -26)',
    baseYield: '1 unit / 9.0s',
    role: 'Scarcest commodity. Direct exchange currency, alliance treaty tribute, and Monad backing reward'
  }
};

export function ResourceGraphModal({
  isOpen,
  onClose,
  resource,
  onSelectResource,
  marketBook,
  onOpenMarketDesk
}: ResourceGraphModalProps) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const meta = RESOURCE_DETAILS[resource];
  const currentPrice = marketBook?.prices[resource] ?? 10;
  const currentStockpile = marketBook?.stockpiles[resource] ?? 50;
  const demandPressure = marketBook?.demandPressure?.[resource] ?? 0;
  const trend = marketBook?.priceTrends[resource] ?? 'STABLE';

  // Extract or synthesize rolling price history points
  const rawHistory: PriceHistoryPoint[] = useMemo(() => {
    if (marketBook?.priceHistory?.[resource] && marketBook.priceHistory[resource].length > 1) {
      return marketBook.priceHistory[resource];
    }
    // Fallback smooth synthetic history if server recently started
    const now = Date.now();
    const baseP = currentPrice;
    return Array.from({ length: 20 }, (_, idx) => {
      const step = 19 - idx;
      const noise = Math.sin(step * 0.6) * 0.12;
      return {
        timestamp: now - step * 10000,
        price: Math.max(2, Math.round(baseP * (1 - noise))),
        stockpile: currentStockpile,
        demandPressure
      };
    });
  }, [marketBook, resource, currentPrice, currentStockpile, demandPressure]);

  // Chart dimensions & scaling
  const chartWidth = 560;
  const chartHeight = 200;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const prices = rawHistory.map((h) => h.price);
  const minP = Math.max(1, Math.min(...prices) * 0.85);
  const maxP = Math.max(minP + 2, Math.max(...prices) * 1.15);
  const avgP = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1));

  // Compute SVG coordinates
  const coords = rawHistory.map((item, idx) => {
    const x = padLeft + (idx / Math.max(1, rawHistory.length - 1)) * plotW;
    const y = padTop + plotH - ((item.price - minP) / (maxP - minP)) * plotH;
    return { x, y, item };
  });

  // Build SVG path
  const linePath = coords.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = coords[idx - 1];
    const cpX1 = (prev.x + pt.x) / 2;
    const cpX2 = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX1.toFixed(1)} ${prev.y.toFixed(1)}, ${cpX2.toFixed(1)} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
    : '';

  // Trend calculation
  const firstPrice = rawHistory[0]?.price || currentPrice;
  const priceChange = currentPrice - firstPrice;
  const pricePctChange = Number(((priceChange / Math.max(1, firstPrice)) * 100).toFixed(1));

  const activeHover = hoveredPointIndex !== null && coords[hoveredPointIndex] ? coords[hoveredPointIndex] : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel modal-animate"
        style={{
          width: '100%',
          maxWidth: 640,
          borderRadius: 16,
          backgroundColor: '#090d16',
          border: `1px solid ${meta.color}66`,
          boxShadow: `0 24px 48px rgba(0,0,0,0.7), 0 0 30px ${meta.color}33`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(180deg, ${meta.accentBg} 0%, transparent 100%)`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: `1px solid ${meta.color}88`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem'
              }}
            >
              {RESOURCE_ICONS[resource]}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {meta.name}
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    backgroundColor: pricePctChange >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: pricePctChange >= 0 ? '#10b981' : '#ef4444',
                    border: `1px solid ${pricePctChange >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  {pricePctChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {pricePctChange >= 0 ? `+${pricePctChange}%` : `${pricePctChange}%`}
                  {trend !== 'STABLE' && ` • ${trend}`}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Market Spot Price
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: meta.color, lineHeight: 1.1 }}>
                {currentPrice} <span style={{ fontSize: '0.82rem', color: '#fbbf24' }}>GOLD</span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Resource Selector Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 20px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          {(['WOOD', 'WHEAT', 'IRON', 'GOLD'] as const).map((res) => {
            const isSel = res === resource;
            const rPrice = marketBook?.prices[res] ?? 0;
            return (
              <button
                key={res}
                onClick={() => onSelectResource(res)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: isSel ? `1px solid ${RESOURCE_DETAILS[res].color}` : '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: isSel ? RESOURCE_DETAILS[res].accentBg : 'rgba(255,255,255,0.03)',
                  color: isSel ? '#f8fafc' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{RESOURCE_ICONS[res]}</span>
                <span>{res}</span>
                <strong style={{ color: isSel ? RESOURCE_DETAILS[res].color : '#64748b' }}>{rPrice}G</strong>
              </button>
            );
          })}
        </div>

        {/* Interactive Price Trend Chart */}
        <div style={{ padding: '16px 20px 8px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#94a3b8' }}>
              <Activity size={14} color={meta.color} />
              <span>Real-time Price Action (Last 60 ticks)</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#64748b' }}>
              <span>Min: <strong style={{ color: '#e2e8f0' }}>{Math.min(...prices)}G</strong></span>
              <span>Avg: <strong style={{ color: '#e2e8f0' }}>{avgP}G</strong></span>
              <span>Max: <strong style={{ color: '#e2e8f0' }}>{Math.max(...prices)}G</strong></span>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden'
            }}
          >
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              onMouseLeave={() => setHoveredPointIndex(null)}
            >
              <defs>
                <linearGradient id={`gradient-${resource}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity="0.45" />
                  <stop offset="90%" stopColor={meta.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Labels */}
              {[minP, avgP, maxP].map((val, idx) => {
                const y = padTop + plotH - ((val - minP) / (maxP - minP)) * plotH;
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={chartWidth - padRight}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padLeft - 6}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="600"
                    >
                      {Math.round(val)}G
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              {areaPath && <path d={areaPath} fill={`url(#gradient-${resource})`} />}

              {/* Line stroke */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Hover Indicators */}
              {coords.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="7"
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPointIndex(idx)}
                />
              ))}

              {/* Active hover crosshair */}
              {activeHover && (
                <g>
                  <line
                    x1={activeHover.x}
                    y1={padTop}
                    x2={activeHover.x}
                    y2={padTop + plotH}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={activeHover.x}
                    cy={activeHover.y}
                    r="5"
                    fill={meta.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activeHover && (
              <div
                style={{
                  position: 'absolute',
                  top: Math.max(10, activeHover.y - 45),
                  left: Math.min(plotW - 60, Math.max(50, activeHover.x - 40)),
                  backgroundColor: '#0f172a',
                  border: `1px solid ${meta.color}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  zIndex: 10
                }}
              >
                <div style={{ fontWeight: 800, color: meta.color }}>
                  {activeHover.item.price} GOLD
                </div>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                  {new Date(activeHover.item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Economic Fundamentals Grid */}
        <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {/* Stockpile & Scarcity */}
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 10
            }}
          >
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Layers size={12} color="#38bdf8" /> Market Stockpile
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
              {currentStockpile} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>units</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: currentStockpile < 25 ? '#ef4444' : '#10b981', fontWeight: 700, marginTop: 2 }}>
              {currentStockpile < 20 ? 'HIGH SCARCITY' : currentStockpile < 45 ? 'MODERATE SUPPLY' : 'ABUNDANT'}
            </div>
          </div>

          {/* Demand Pressure */}
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 10
            }}
          >
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <BarChart3 size={12} color="#fbbf24" /> Demand Pressure
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: demandPressure >= 0 ? '#10b981' : '#f87171', marginTop: 2 }}>
              {demandPressure >= 0 ? `+${(demandPressure * 100).toFixed(0)}%` : `${(demandPressure * 100).toFixed(0)}%`}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
              {demandPressure > 0.2 ? 'Buy Pressure (Bullish)' : demandPressure < -0.2 ? 'Sell Pressure (Bearish)' : 'Balanced Market'}
            </div>
          </div>

          {/* Agora Tariff & Extraction */}
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: 10
            }}
          >
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarSign size={12} color="#c084fc" /> Municipal Tariff
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
              6.0% <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Agora</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#c084fc', marginTop: 2 }}>
              Treasury: {marketBook?.agoraTreasury || 250}G
            </div>
          </div>
        </div>

        {/* Source Node & Civilization Mechanics Note */}
        <div
          style={{
            margin: '0 20px 16px 20px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Extraction Origin: <strong style={{ color: '#fff' }}>{meta.sourceNode}</strong> {meta.nodeCoords}</span>
            <span>Harvest Yield: <strong style={{ color: meta.color }}>{meta.baseYield}</strong></span>
          </div>
          <div>{meta.role}</div>
        </div>

        {/* Footer with Market Desk CTA */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Prices dynamically respond to NPC labor, AI treaties, and scarcity
          </div>

          {onOpenMarketDesk && (
            <button
              onClick={() => {
                onClose();
                onOpenMarketDesk();
              }}
              style={{
                padding: '7px 14px',
                backgroundColor: 'var(--monad-purple)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>View Live Order Book</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResourceGraphModal;
