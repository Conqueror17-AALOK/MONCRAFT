import { useState, useEffect, useRef } from 'react';
import { Handshake, AlertOctagon, AlertTriangle, ArrowRightLeft, ExternalLink, Sparkles, X, Hash, type LucideIcon } from 'lucide-react';

export interface FeedEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  color: string;
  txHash?: string;
  timestamp: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  ALLIANCE_EVENT: Handshake,
  BETRAYAL_EVENT: AlertOctagon,
  ECONOMIC_SHOCK: AlertTriangle,
  TRADE_EVENT: ArrowRightLeft,
  BLOCKCHAIN_TX: ExternalLink,
  PARTICIPANT_FUNDED: Sparkles,
};

const TYPE_LABELS: Record<string, string> = {
  ALLIANCE_EVENT: 'DIPLOMACY',
  BETRAYAL_EVENT: 'BETRAYAL',
  ECONOMIC_SHOCK: 'SHOCK',
  TRADE_EVENT: 'TRADE',
  BLOCKCHAIN_TX: 'ON-CHAIN',
  PARTICIPANT_FUNDED: 'BACKING',
  TREATY_EVENT: 'TREATY',
  ORDER_EVENT: 'MARKET',
};

export function EventsFeed({
  events,
  onDismiss
}: {
  events: FeedEvent[];
  onDismiss: (id: string) => void;
}) {
  const [displayEvents, setDisplayEvents] = useState<FeedEvent[]>([]);
  const [animating, setAnimating] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!events || events.length === 0) {
      return;
    }

    const latest = events[0];
    if (!latest || seenIdsRef.current.has(latest.id)) {
      return;
    }

    seenIdsRef.current.add(latest.id);
    setAnimating(latest.id);
    setDisplayEvents((prev) => [latest, ...prev.filter((e) => e.id !== latest.id).slice(0, 2)]);

    const animTimer = setTimeout(() => {
      setAnimating(null);
    }, 350);

    const dismissTimer = setTimeout(() => {
      onDismissRef.current(latest.id);
      setDisplayEvents((prev) => prev.filter((e) => e.id !== latest.id));
    }, 5000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(dismissTimer);
    };
  }, [events]);

  if (displayEvents.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 580,
        width: 'calc(100vw - 32px)',
        zIndex: 25,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'center'
      }}
    >
      {displayEvents.slice(0, 3).map((evt) => {
        const Icon = ICON_MAP[evt.type] || Hash;
        const label = TYPE_LABELS[evt.type] || 'EVENT';
        const isAnimating = animating === evt.id;

        return (
          <div
            key={evt.id}
            style={{
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: 540,
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating ? 'translateY(20px) scale(0.95)' : 'translateY(0) scale(1)',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              animation: isAnimating ? 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none'
            }}
          >
            <style>{`
              @keyframes slideIn {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
            <div
              className="glass-panel"
              style={{
                padding: '8px 16px',
                borderRadius: 14,
                border: `1px solid ${evt.color}80`,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.02) inset',
                backgroundColor: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: `${evt.color}20`,
                  flexShrink: 0
                }}
              >
                <Icon size={14} color={evt.color} />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.78rem',
                  minWidth: 0,
                  flex: 1
                }}
              >
                <span
                  style={{
                    color: evt.color,
                    fontWeight: 700,
                    fontSize: '0.62rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    backgroundColor: `${evt.color}20`,
                    padding: '2px 8px',
                    borderRadius: 6,
                    flexShrink: 0
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    color: '#e2e8f0',
                    maxWidth: 380,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500
                  }}
                >
                  {evt.description}
                </span>
              </div>

              {evt.txHash && evt.txHash !== 'pending' && (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${evt.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono-text"
                  style={{
                    fontSize: '0.64rem',
                    color: '#836ef9',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    textDecoration: 'none',
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(131, 110, 249, 0.15)',
                    border: '1px solid rgba(131, 110, 249, 0.3)',
                    flexShrink: 0
                  }}
                >
                  <ExternalLink size={10} />
                  <span>Explorer</span>
                </a>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(evt.id);
                  setDisplayEvents((prev) => prev.filter((e) => e.id !== evt.id));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default EventsFeed;