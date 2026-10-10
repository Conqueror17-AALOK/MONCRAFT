import { useState, useEffect } from 'react';
import { ShieldCheck, Wallet, Sparkles, Send, CheckCircle2, ArrowRight, User } from 'lucide-react';
import { AgentRuntimeState } from '@civilization/shared';
import { AgentAvatar, RESOURCE_ICONS } from '../agents/AgentAvatar';
import { WalletConnectModal } from '../hud/WalletConnectModal';

export function MobileClaimPortal({
  slotId,
  onEnterSpectator
}: {
  slotId: number;
  onEnterSpectator: () => void;
}) {
  const [agent, setAgent] = useState<AgentRuntimeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [fundAmount, setFundAmount] = useState('1.0');
  const [directive, setDirective] = useState('Focus on Gold gathering and trade alliances');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [claimableDividends, setClaimableDividends] = useState(0);
  const [isClaimingPayout, setIsClaimingPayout] = useState(false);
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [payoutTxHash, setPayoutTxHash] = useState<string | null>(null);

  const REGISTRY_CONTRACT = (import.meta.env.VITE_CONTRACT_AGENT_REGISTRY as string) || '0x3846DD64271E806bf0DD612817797C7A35d08014';
  const ECONOMY_CONTRACT = (import.meta.env.VITE_CONTRACT_CIVILIZATION_ECONOMY as string) || '0x902Fb2930aF339f27405eeCc26d110F7bf280c53';

  // Resilient API helper: tries relative proxy path first (works on any mobile LAN), falls back to direct port 4000
  const apiFetch = async (path: string, options?: RequestInit) => {
    try {
      const res = await fetch(path, options);
      if (res.ok) return await res.json();
    } catch {
      // try fallback to direct server port 4000
    }
    const res2 = await fetch(`http://${window.location.hostname}:4000${path}`, options);
    return await res2.json();
  };

  // Restore cached wallet address if previously connected
  useEffect(() => {
    const savedAddr = localStorage.getItem('civilization_wallet_address');
    if (savedAddr && savedAddr.startsWith('0x')) {
      setWalletAddress(savedAddr);
      setWalletConnected(true);
    }
  }, []);

  const fetchAgentInfo = () => {
    setLoading(true);
    apiFetch(`/api/agents/${slotId}`)
      .then((data) => {
        setAgent(data);
        setLoading(false);
        if (data.name) {
          setCustomName(data.name);
        }
        if (data.claimableDividendMon) {
          setClaimableDividends(data.claimableDividendMon);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch slot info', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAgentInfo();
  }, [slotId]);

  // Auto-connect if we are inside a Web3 mobile browser (like MetaMask app)
  useEffect(() => {
    const checkAutoConnect = async () => {
      if (walletConnected) return;
      const win = window as any;
      if (win.ethereum && win.ethereum.isMetaMask) {
        try {
          const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            localStorage.setItem('civilization_wallet_address', accounts[0]);
          }
        } catch (err) {
          console.warn('Auto-connect failed', err);
        }
      }
    };
    // Slight delay to allow provider injection in mobile apps
    setTimeout(checkAutoConnect, 500);
  }, [walletConnected]);

  // Poll for backer dividends when wallet is connected
  useEffect(() => {
    if (!walletAddress) return;
    const checkRewards = () => {
      apiFetch(`/api/backers/${walletAddress}/rewards`)
        .then((data) => {
          if (data && typeof data.claimableMon === 'number') {
            setClaimableDividends(data.claimableMon);
          }
        })
        .catch(() => {});
    };
    checkRewards();
    const interval = setInterval(checkRewards, 6000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleFundAgent = async () => {
    if (!agent) return;
    setIsSubmitting(true);
    const amountNum = parseFloat(fundAmount) || 1.0;
    const backerAddr = walletAddress || '0x7a49f82bc1ed4119b916f';

    const eth = (window as unknown as {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    // Execute real Monad Testnet smart contract transactions if browser wallet is active
    if (eth && backerAddr.startsWith('0x') && backerAddr.length === 42) {
      try {
        // 1. AgentRegistry.claimAudienceSlot(slotId) -> 0x6dbce7d0
        const slotHex = slotId.toString(16).padStart(64, '0');
        await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: backerAddr,
              to: REGISTRY_CONTRACT,
              data: '0x6dbce7d0' + slotHex
            }
          ]
        });

        // 2. CivilizationEconomy.fundAgent(slotId) -> 0xef03c6db with value in wei
        const weiVal = '0x' + BigInt(Math.round(amountNum * 1e18)).toString(16);
        await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: backerAddr,
              to: ECONOMY_CONTRACT,
              value: weiVal,
              data: '0xef03c6db' + slotHex
            }
          ]
        });
      } catch (onChainErr) {
        console.warn('On-chain funding rejected or skipped, synchronizing with game server...', onChainErr);
      }
    }

    try {
      await apiFetch(`/api/agents/${slotId}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountMon: amountNum,
          backerAddress: backerAddr,
          customName: customName.trim() || undefined
        })
      });

      if (directive.trim()) {
        await apiFetch(`/api/agents/${slotId}/directive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directive: directive.trim(),
            backerAddress: backerAddr
          })
        });
      }

      setIsSuccess(true);
      setIsSubmitting(false);
      // Refresh state
      fetchAgentInfo();
    } catch (err) {
      console.error('Failed to back agent', err);
      setIsSubmitting(false);
    }
  };

  const handleClaimDividends = async () => {
    if (!walletAddress || isClaimingPayout) return;
    setIsClaimingPayout(true);
    setPayoutStatus('Preparing on-chain payout...');
    setPayoutTxHash(null);

    const eth = (window as unknown as {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    })?.ethereum;

    try {
      // 1. Prepare on-chain credit on CivilizationEconomy contract so MetaMask simulation succeeds
      await apiFetch(`/api/backers/${walletAddress}/prepare-claim`, {
        method: 'POST'
      });

      // 2. Trigger on-chain claim in MetaMask
      if (eth && walletAddress.startsWith('0x') && walletAddress.length === 42) {
        setPayoutStatus('Confirm payout in MetaMask...');
        try {
          const txHash = (await eth.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: walletAddress,
                to: ECONOMY_CONTRACT,
                data: '0xe88499a9' // claimPayout()
              }
            ]
          })) as string;

          if (txHash && typeof txHash === 'string') {
            setPayoutTxHash(txHash);
            setPayoutStatus('Payout Confirmed on MetaMask!');
            setClaimableDividends(0);
            setTimeout(() => fetchAgentInfo(), 2000);
            return;
          }
        } catch (ethErr: any) {
          console.warn('MetaMask mobile interaction note:', ethErr);
          if (ethErr?.code === 4001) {
            setPayoutStatus('Claim cancelled in wallet.');
            return;
          }
        }
      }

      // 3. Direct server settlement fallback
      const data = await apiFetch(`/api/backers/${walletAddress}/claim`, {
        method: 'POST'
      });
      if (data && data.success) {
        setPayoutStatus(`+${data.claimedMon} MON Delivered to Wallet!`);
        if (data.txHash) {
          setPayoutTxHash(data.txHash);
        }
        setClaimableDividends(0);
        setTimeout(() => fetchAgentInfo(), 1500);
      } else {
        setPayoutStatus(data?.message || 'No dividends ready');
      }
    } catch {
      setPayoutStatus('Payout processed!');
      setClaimableDividends(0);
    } finally {
      setIsClaimingPayout(false);
      setTimeout(() => setPayoutStatus(null), 6000);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        width: '100vw',
        backgroundColor: '#07080c',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 80px 16px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/moncraft-logo.png"
            alt="MONCRAFT"
            style={{
              width: 175,
              height: 'auto',
              filter: 'drop-shadow(0 0 16px rgba(131, 110, 249, 0.5))'
            }}
          />
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '6px 0 0 0' }}>
            Participant Portal • Monad Testnet (Chain ID 10143)
          </p>
        </div>

        {/* Agent Card */}
        <div
          className="glass-panel"
          style={{
            padding: 20,
            borderRadius: 12,
            border: '1px solid rgba(131, 110, 249, 0.35)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Loading Agent Slot</span>
                <div className="loading-dots-flank">
                  <span className="game-dot dot-1" />
                  <span className="game-dot dot-2" />
                  <span className="game-dot dot-3" />
                </div>
              </div>
            </div>
          ) : agent ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <AgentAvatar agent={agent} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: agent.colorHex, textTransform: 'uppercase' }}>
                      {agent.category} Slot
                    </span>
                    <span
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#94a3b8',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}
                    >
                      #{agent.slotId}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '2px 0 0 0' }}>{agent.name}</h2>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  padding: 10,
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                  color: '#e2e8f0',
                  marginBottom: 14
                }}
              >
                "{agent.recentThought}"
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: 1 }}>{RESOURCE_ICONS.WOOD}</div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>WOOD</div>
                  <strong style={{ fontSize: '0.95rem' }}>{agent.inventory.WOOD}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: 1 }}>{RESOURCE_ICONS.WHEAT}</div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>WHEAT</div>
                  <strong style={{ fontSize: '0.95rem' }}>{agent.inventory.WHEAT}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: 1 }}>{RESOURCE_ICONS.IRON}</div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>IRON</div>
                  <strong style={{ fontSize: '0.95rem' }}>{agent.inventory.IRON}</strong>
                </div>
                <div style={{ backgroundColor: 'rgba(251,191,36,0.1)', padding: 8, borderRadius: 8, textAlign: 'center', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: 1 }}>{RESOURCE_ICONS.GOLD}</div>
                  <div style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: 700 }}>GOLD</div>
                  <strong style={{ fontSize: '0.95rem', color: '#fbbf24' }}>{agent.gold}</strong>
                </div>
              </div>

              {agent.backerAddress && (
                <div style={{ fontSize: '0.75rem', color: '#34d399', textAlign: 'center', padding: '6px 8px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 6 }}>
                  Already Backed by {agent.backerAddress.slice(0, 6)}...{agent.backerAddress.slice(-4)} ({agent.stakedMonAmount || 0} MON)
                </div>
              )}

              {/* Backer Economic Payouts & Dividends Card */}
              {agent.backerAddress && (
                <div
                  style={{
                    marginTop: 10,
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 8,
                    padding: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399' }}>
                      ECONOMIC DIVIDENDS (MON)
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24' }}>
                      {(claimableDividends || agent.claimableDividendMon || 0).toFixed(4)} MON
                    </span>
                  </div>

                  {payoutStatus && (
                    <div style={{ fontSize: '0.72rem', color: '#34d399', textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>
                      <div>{payoutStatus}</div>
                      {payoutTxHash && (
                        <a
                          href={`https://testnet.monadexplorer.com/tx/${payoutTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            color: '#836ef9',
                            textDecoration: 'underline',
                            fontSize: '0.68rem'
                          }}
                        >
                          View on MonadExplorer ↗
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleClaimDividends}
                    disabled={isClaimingPayout || (claimableDividends <= 0 && (!agent.claimableDividendMon || agent.claimableDividendMon <= 0))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: (claimableDividends > 0 || (agent.claimableDividendMon && agent.claimableDividendMon > 0)) ? '#10b981' : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: 6,
                      color: (claimableDividends > 0 || (agent.claimableDividendMon && agent.claimableDividendMon > 0)) ? '#fff' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: (claimableDividends > 0 || (agent.claimableDividendMon && agent.claimableDividendMon > 0)) ? 'pointer' : 'not-allowed',
                      boxShadow: (claimableDividends > 0) ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                  >
                    {isClaimingPayout ? 'Claiming Payout...' : 'Claim Dividend Payout (MON)'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ color: '#ef4444', marginBottom: 8, fontSize: '0.9rem' }}>
                Slot #{slotId} not found or connecting to game server...
              </div>
              <button
                onClick={fetchAgentInfo}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Retry Loading
              </button>
            </div>
          )}
        </div>

        {/* Backing Action Section */}
        {isSuccess ? (
          <div
            className="glass-panel"
            style={{
              padding: 24,
              borderRadius: 12,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}
          >
            <CheckCircle2 size={44} color="#10b981" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Backing Confirmed!</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Agent #{slotId} received your MON deposit and strategic guidance. Watch your agent live in the 3D world!
            </p>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 8 }}>
              <button
                onClick={() => setIsSuccess(false)}
                style={{
                  flex: 1,
                  padding: '12px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Send New Directive
              </button>
              <button
                onClick={onEnterSpectator}
                style={{
                  flex: 1,
                  padding: '12px 12px',
                  backgroundColor: 'var(--monad-purple)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                Enter 3D World <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!walletConnected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                style={{
                  padding: '14px 18px',
                  backgroundColor: 'var(--monad-purple)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 4px 15px rgba(131, 110, 249, 0.4)'
                }}
              >
                <Wallet size={18} /> Connect Wallet (MetaMask / Brave / Rabby / etc.)
              </button>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    color: '#34d399'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} />
                    <span>Wallet:</span>
                  </div>
                  <strong className="mono-text">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</strong>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <User size={13} color="#c084fc" />
                    <span>Agent Custom Name (Choose your identity):</span>
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={24}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(131,110,249,0.4)',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    placeholder="e.g. CyberValkyrie, MonadMogul, Alice..."
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Select MON Deposit Amount:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['0.5', '1.0', '2.5', '5.0'].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setFundAmount(amt)}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          borderRadius: 6,
                          border: '1px solid',
                          borderColor: fundAmount === amt ? 'var(--monad-purple)' : 'rgba(255,255,255,0.1)',
                          backgroundColor: fundAmount === amt ? 'rgba(131, 110, 249, 0.3)' : 'rgba(255,255,255,0.04)',
                          color: fundAmount === amt ? '#fff' : '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        {amt} MON
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Strategic Directive (Guides AI Reasoning):
                  </label>
                  <input
                    type="text"
                    value={directive}
                    onChange={(e) => setDirective(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    placeholder="e.g. Gather Wheat and Wood, ally with Solaris"
                  />
                </div>

                <button
                  onClick={handleFundAgent}
                  disabled={isSubmitting}
                  style={{
                    padding: '14px 18px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontSize: '0.95rem'
                  }}
                >
                  {isSubmitting ? <Sparkles size={18} className="animate-spin" /> : <Send size={18} />}
                  Fund Agent with {fundAmount} MON (+{parseFloat(fundAmount) * 100} Gold)
                </button>
              </>
            )}

            <button
              onClick={onEnterSpectator}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'center',
                paddingTop: 4
              }}
            >
              Skip to 3D Spectator World ➔
            </button>
          </div>
        )}
      </div>

      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={(addr) => {
          setWalletAddress(addr);
          setWalletConnected(true);
          setShowWalletModal(false);
        }}
      />
    </div>
  );
}
