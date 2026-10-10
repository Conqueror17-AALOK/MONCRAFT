import { useState } from 'react';
import { X, ArrowDownUp, Handshake, AlertTriangle } from 'lucide-react';
import { MarketDeskSnapshot, MarketPriceBook, ResourceType } from '@civilization/shared';
import { RESOURCE_ICONS } from '../agents/AgentAvatar';

export function MarketDeskModal({
  isOpen,
  onClose,
  marketDesk,
  marketBook,
  recentShocks = []
}: {
  isOpen: boolean;
  onClose: () => void;
  marketDesk: MarketDeskSnapshot | null;
  marketBook: MarketPriceBook | null;
  recentShocks?: Array<{ shockName: string; resource: ResourceType; description: string; timestamp: number }>;
}) {
  const [activeTab, setActiveTab] = useState<'ORDER_BOOK' | 'TREATIES' | 'RECENT_FILLS' | 'SHOCKS'>('ORDER_BOOK');

  if (!isOpen) return null;

  const openOrders = marketDesk?.openOrders || [];
  const buyOrders = openOrders.filter((o) => o.side === 'BUY');
  const sellOrders = openOrders.filter((o) => o.side === 'SELL');
  const fills = marketDesk?.recentFills || [];
  const treaties = marketDesk?.treaties || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel modal-animate"
        style={{
          width: 780,
          maxWidth: '94vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          position: 'relative',
          border: '1px solid rgba(131, 110, 249, 0.4)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowDownUp size={22} color="var(--monad-purple)" />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Civilization Market Desk</h2>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Autonomous Limit Order Book • Bilateral Treaties • Monad Settlement
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Baseline Pool Prices */}
        {marketBook && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['WOOD', 'WHEAT', 'IRON', 'GOLD'] as const).map((r) => (
                <div
                  key={r}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.9rem' }}>{RESOURCE_ICONS[r]}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{r}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                    {marketBook.prices[r]}G <small style={{ color: '#64748b' }}>({marketBook.stockpiles[r]}u)</small>
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: '0.72rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏛️</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>Agora Civic Treasury:</span>
                <strong style={{ color: '#f8fafc' }}>{marketBook.agoraTreasury || 0} Gold</strong>
              </div>
              <span style={{ color: '#94a3b8' }}>
                Municipal Tariff: <strong style={{ color: '#f59e0b' }}>6%</strong> on sales • Subsistence Rations: <strong style={{ color: '#10b981' }}>1 Wheat / 25s</strong>
              </span>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('ORDER_BOOK')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'ORDER_BOOK' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'ORDER_BOOK' ? '#fff' : '#94a3b8'
            }}
          >
            Order Book ({openOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('TREATIES')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'TREATIES' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'TREATIES' ? '#fff' : '#94a3b8'
            }}
          >
            Bilateral Treaties ({treaties.filter((t) => t.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setActiveTab('RECENT_FILLS')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'RECENT_FILLS' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'RECENT_FILLS' ? '#fff' : '#94a3b8'
            }}
          >
            Recent Fills ({fills.length})
          </button>
          <button
            onClick={() => setActiveTab('SHOCKS')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'SHOCKS' ? 'var(--monad-purple)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'SHOCKS' ? '#fff' : '#94a3b8'
            }}
          >
            Macro Shocks
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 320 }}>
          {activeTab === 'ORDER_BOOK' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Buy Bids */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#34d399', marginBottom: 8 }}>
                  BIDS (BUY ORDERS)
                </div>
                {buyOrders.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: 12 }}>
                    No resting buy orders on the book.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {buyOrders.map((ord) => (
                      <div
                        key={ord.orderId}
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                            {ord.agentName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            Qty: <strong>{ord.amount - ord.filledAmount}</strong>
                            <span>{RESOURCE_ICONS[ord.resource] || ''}</span>
                            <span>{ord.resource}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>
                            {ord.pricePerUnit}G
                          </span>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            Exp: Epoch {ord.expiresAtEpoch}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sell Asks */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f87171', marginBottom: 8 }}>
                  ASKS (SELL ORDERS)
                </div>
                {sellOrders.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: 12 }}>
                    No resting sell orders on the book.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sellOrders.map((ord) => (
                      <div
                        key={ord.orderId}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                            {ord.agentName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            Qty: <strong>{ord.amount - ord.filledAmount}</strong>
                            <span>{RESOURCE_ICONS[ord.resource] || ''}</span>
                            <span>{ord.resource}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f87171' }}>
                            {ord.pricePerUnit}G
                          </span>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            Exp: Epoch {ord.expiresAtEpoch}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'TREATIES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {treaties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.85rem' }}>
                  No bilateral treaties currently registered. Agents form treaties during diplomatic alliances.
                </div>
              ) : (
                treaties.map((treaty) => {
                  const isActive = treaty.status === 'ACTIVE';
                  return (
                    <div
                      key={treaty.treatyId}
                      style={{
                        backgroundColor: isActive ? 'rgba(131, 110, 249, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: isActive ? '1px solid rgba(131, 110, 249, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Handshake size={16} color={isActive ? '#a855f7' : '#64748b'} />
                          <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                            {treaty.supplierName} ➔ {treaty.buyerName}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor:
                                treaty.status === 'ACTIVE'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : treaty.status === 'BROKEN'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(148, 163, 184, 0.2)',
                              color:
                                treaty.status === 'ACTIVE'
                                  ? '#34d399'
                                  : treaty.status === 'BROKEN'
                                  ? '#f87171'
                                  : '#94a3b8'
                            }}
                          >
                            {treaty.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Delivers <strong>{treaty.amountPerCycle}</strong> <span>{RESOURCE_ICONS[treaty.resource] || ''}</span> <strong>{treaty.resource}</strong> every cycle @ <strong>{treaty.pricePerUnit}G</strong> each
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>
                          {treaty.cyclesRemaining} cycles left
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Fulfilled: {treaty.cyclesExecuted}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'RECENT_FILLS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.85rem' }}>
                  No trades matched yet on this desk session.
                </div>
              ) : (
                fills.map((fill) => (
                  <div
                    key={fill.fillId}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                        {fill.sellerId} sold {fill.amount} {RESOURCE_ICONS[fill.resource] || ''} {fill.resource} to {fill.buyerId}
                      </span>
                      {fill.viaTreatyId && (
                        <span style={{ marginLeft: 8, fontSize: '0.65rem', color: '#c084fc' }}>
                          [Treaty Settlement]
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>
                        {fill.totalCost}G
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 6 }}>
                        (@{fill.pricePerUnit}G/u)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'SHOCKS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentShocks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: '0.85rem' }}>
                  No economic shocks triggered yet in this session. Shocks trigger every ~60s.
                </div>
              ) : (
                recentShocks.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 8,
                      padding: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <AlertTriangle size={16} color="#f59e0b" />
                      <strong style={{ fontSize: '0.88rem', color: '#fbbf24' }}>{s.shockName}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        • Affected: {s.resource}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#e2e8f0', margin: 0 }}>{s.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
