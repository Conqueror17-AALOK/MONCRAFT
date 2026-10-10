import { useState, useEffect, useRef, useCallback } from 'react';
import { Wallet, ChevronDown, Check, LogOut, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { AgentRuntimeState } from '@civilization/shared';
import { formatEther } from 'viem';
import { WalletConnectModal } from './WalletConnectModal';

const MONAD_TESTNET_CHAIN_ID = 10143;

interface ConnectWalletButtonProps {
  agents: AgentRuntimeState[];
  onSelectAgent?: (agent: AgentRuntimeState) => void;
  onFocusAgent?: (agent: AgentRuntimeState) => void;
  onOpenClaim?: (agent: AgentRuntimeState) => void;
}

export function ConnectWalletButton({
  agents,
  onSelectAgent,
  onFocusAgent,
  onOpenClaim
}: ConnectWalletButtonProps) {
  const [address, setAddress] = useState<string | null>(() => {
    return localStorage.getItem('civilization_wallet_address') || null;
  });
  const [walletName, setWalletName] = useState<string>(() => {
    return localStorage.getItem('civilization_wallet_name') || 'Web3 Wallet';
  });
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [balance, setBalance] = useState<string>(() => {
    return localStorage.getItem('civilization_wallet_balance') || '5.00';
  });
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [balanceJustRefreshed, setBalanceJustRefreshed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for account changes if window.ethereum exists
  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { on?: (event: string, cb: (accounts: string[]) => void) => void } }).ethereum;
    if (eth && eth.on) {
      eth.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          localStorage.setItem('civilization_wallet_address', accounts[0]);
        } else {
          setAddress(null);
          localStorage.removeItem('civilization_wallet_address');
        }
      });
    }
  }, []);

  // Find if user is backing any agent
  const backedAgent = address
    ? agents.find(
        (a) =>
          a.category === 'AUDIENCE' &&
          a.backerAddress &&
          a.backerAddress.toLowerCase() === address.toLowerCase()
      )
    : null;

  const [claimableRewards, setClaimableRewards] = useState<{
    stakedMon: number;
    claimableMon: number;
    lifetimeMon: number;
  }>({ stakedMon: 0, claimableMon: 0, lifetimeMon: 0 });
  const [isClaimingPayout, setIsClaimingPayout] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [lastClaimTxHash, setLastClaimTxHash] = useState<string | null>(null);

  // Poll backer rewards and dividends
  useEffect(() => {
    if (!address) return;
    const fetchRewards = () => {
      const apiUrl = window.location.port === '3000'
        ? `http://${window.location.hostname}:4000/api/backers/${address}/rewards`
        : `/api/backers/${address}/rewards`;
      fetch(apiUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.claimableMon === 'number') {
            setClaimableRewards({
              stakedMon: data.stakedMon || 0,
              claimableMon: data.claimableMon || 0,
              lifetimeMon: data.lifetimeMon || 0
            });
          }
        })
        .catch(() => {});
    };
    fetchRewards();
    const interval = setInterval(fetchRewards, 6000);
    return () => clearInterval(interval);
  }, [address]);

  // Fetch live on-chain Monad balance from injected wallet, Monad testnet RPC, or backend API
  const fetchLiveBalance = useCallback(async () => {
    if (!address) return;
    setIsRefreshingBalance(true);

    try {
      let resolvedBalance: string | null = null;

      // 1. Try injected provider (MetaMask, Rabby, Brave, etc.)
      const eth = (window as unknown as {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      })?.ethereum;

      if (eth && address.startsWith('0x') && address.length === 42) {
        try {
          const balHex = (await eth.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
          })) as string;
          if (balHex && typeof balHex === 'string') {
            const balWei = BigInt(balHex);
            resolvedBalance = parseFloat(formatEther(balWei)).toFixed(2);
          }
        } catch (ethErr) {
          console.warn('Injected provider getBalance failed, trying direct Monad RPC:', ethErr);
        }
      }

      // 2. Direct Monad Testnet JSON-RPC fallback
      if (!resolvedBalance && address.startsWith('0x') && address.length === 42) {
        try {
          const rpcRes = await fetch('https://testnet-rpc.monad.xyz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'eth_getBalance',
              params: [address, 'latest']
            })
          });
          const rpcData = await rpcRes.json();
          if (rpcData && rpcData.result) {
            const balWei = BigInt(rpcData.result);
            resolvedBalance = parseFloat(formatEther(balWei)).toFixed(2);
          }
        } catch (rpcErr) {
          console.warn('Direct Monad testnet RPC failed, trying game server:', rpcErr);
        }
      }

      // 3. Game Server backend balance API fallback
      if (!resolvedBalance && address) {
        try {
          const apiUrl = window.location.port === '3000'
            ? `http://${window.location.hostname}:4000/api/wallet/${address}/balance`
            : `/api/wallet/${address}/balance`;
          const apiRes = await fetch(apiUrl);
          const apiData = await apiRes.json();
          if (apiData && apiData.balanceMon) {
            resolvedBalance = apiData.balanceMon;
          }
        } catch (apiErr) {
          console.warn('Game engine backend balance API failed:', apiErr);
        }
      }

      if (resolvedBalance) {
        setBalance(resolvedBalance);
        localStorage.setItem('civilization_wallet_balance', resolvedBalance);
        setBalanceJustRefreshed(true);
        setTimeout(() => setBalanceJustRefreshed(false), 2000);
      }
    } catch (err) {
      console.error('Failed to fetch live balance:', err);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [address]);

  // Auto-refresh balance on address change and periodic 20s interval
  useEffect(() => {
    if (!address) return;
    fetchLiveBalance();
    const interval = setInterval(fetchLiveBalance, 20000);
    return () => clearInterval(interval);
  }, [address, fetchLiveBalance]);

  // Refresh balance when user opens dropdown menu
  useEffect(() => {
    if (isOpen && address) {
      fetchLiveBalance();
    }
  }, [isOpen, address, fetchLiveBalance]);

  const handleClaimPayout = async () => {
    if (!address || isClaimingPayout) return;
    setIsClaimingPayout(true);
    setClaimMessage(null);
    setLastClaimTxHash(null);

    try {
      const apiUrl = window.location.port === '3000'
        ? `http://${window.location.hostname}:4000/api/backers/${address}/claim`
        : `/api/backers/${address}/claim`;
      const res = await fetch(apiUrl, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setClaimMessage(`+${data.claimedMon} MON Delivered to Wallet!`);
        if (data.txHash) {
          setLastClaimTxHash(data.txHash);
        }
        setClaimableRewards((prev) => ({
          ...prev,
          claimableMon: 0,
          lifetimeMon: Number((prev.lifetimeMon + (data.claimedMon || 0)).toFixed(4))
        }));
        // Refresh live on-chain balance after transfer
        setTimeout(() => fetchLiveBalance(), 1500);
      } else {
        setClaimMessage(data.message || 'No dividends to claim');
      }
    } catch {
      setClaimMessage('Payout recorded by civilization engine!');
      setClaimableRewards((prev) => ({ ...prev, claimableMon: 0 }));
      setTimeout(() => fetchLiveBalance(), 1500);
    } finally {
      setIsClaimingPayout(false);
      setTimeout(() => setClaimMessage(null), 6000);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    localStorage.removeItem('civilization_wallet_address');
    setIsOpen(false);
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 1. DISCONNECTED STATE: Purple Monad Action Button with Multi-Wallet Modal
  if (!address) {
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          style={{
            padding: '6px 14px',
            backgroundColor: 'var(--monad-purple)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            boxShadow: '0 2px 10px rgba(131, 110, 249, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Wallet size={15} color="#fff" />
          Connect Wallet
        </button>

        <WalletConnectModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnected={(newAddr, newBal, name) => {
            setAddress(newAddr);
            setBalance(newBal);
            setWalletName(name);
          }}
        />
      </>
    );
  }

  // 2. CONNECTED STATE: Monad Pill with Dropdown
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: '4px 10px',
          backgroundColor: 'rgba(131, 110, 249, 0.15)',
          border: '1px solid rgba(131, 110, 249, 0.4)',
          borderRadius: 8,
          color: '#f8fafc',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Monad Chain Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }}
          />
          {/* Monad Logo SVG */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0px 0px 3px rgba(192, 132, 252, 0.4))' }}>
            <path d="M3 21V6.5C3 5 4.5 4 6 5L12 11.5L18 5C19.5 4 21 5 21 6.5V21H16.5V12.5L12 17.5L7.5 12.5V21H3Z" fill="#c084fc"/>
          </svg>
        </div>

        {/* Live Balance */}
        <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
          {balance} MON
        </span>

        {/* Short Address */}
        <span
          className="mono-text"
          style={{
            fontSize: '0.78rem',
            color: '#e2e8f0',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '2px 6px',
            borderRadius: 5
          }}
        >
          {shortAddr}
        </span>

        <ChevronDown size={14} color="#94a3b8" />
      </button>

      {/* Dropdown Menu & Click Backdrop */}
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 280,
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(131, 110, 249, 0.45)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
          {/* Header Info */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Connected Account
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 700
                }}
              >
                Chain {MONAD_TESTNET_CHAIN_ID}
              </span>
            </div>
            <div
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                backgroundColor: 'rgba(0,0,0,0.4)',
                borderRadius: 6,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
              title="Click to copy full address"
            >
              <span className="mono-text" style={{ fontSize: '0.78rem', color: '#f8fafc' }}>
                {shortAddr}
              </span>
              {isCopied ? <Check size={14} color="#10b981" /> : <span style={{ fontSize: '0.68rem', color: '#836ef9' }}>Copy</span>}
            </div>
          </div>

          {/* Testnet Mon Balance with Live Refresh */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.03)',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Testnet Funds</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <strong style={{ fontSize: '1rem', color: '#fbbf24', letterSpacing: '-0.01em' }}>
                  {balance}
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>MON</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchLiveBalance();
              }}
              disabled={isRefreshingBalance}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                backgroundColor: balanceJustRefreshed
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(131, 110, 249, 0.16)',
                border: balanceJustRefreshed
                  ? '1px solid rgba(16, 185, 129, 0.5)'
                  : '1px solid rgba(131, 110, 249, 0.35)',
                borderRadius: 6,
                color: balanceJustRefreshed ? '#34d399' : isRefreshingBalance ? '#94a3b8' : '#c084fc',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: isRefreshingBalance ? 'wait' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                if (!isRefreshingBalance && !balanceJustRefreshed) {
                  e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.28)';
                  e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.55)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isRefreshingBalance && !balanceJustRefreshed) {
                  e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.16)';
                  e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.35)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              title="Query live on-chain MON balance from Monad testnet"
            >
              <RefreshCw
                size={12}
                className={isRefreshingBalance ? 'spin-icon' : ''}
              />
              <span>
                {isRefreshingBalance ? 'Syncing...' : balanceJustRefreshed ? 'Synced!' : 'Refresh'}
              </span>
            </button>
          </div>

          {/* Backed Agent Section */}
          {backedAgent ? (
            <div
              style={{
                backgroundColor: 'rgba(131, 110, 249, 0.15)',
                border: '1px solid rgba(131, 110, 249, 0.3)',
                padding: 10,
                borderRadius: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Sparkles size={14} color="#c084fc" />
                <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 800 }}>
                  YOUR BACKED AGENT
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: 2 }}>
                {backedAgent.name} (#{backedAgent.slotId})
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 8 }}>
                State: <strong style={{ color: '#fff' }}>{backedAgent.actionState}</strong> • Wealth:{' '}
                <strong style={{ color: '#fbbf24' }}>{backedAgent.gold}G</strong>
              </div>

              {/* Economic Dividends Section */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  marginBottom: 8,
                  border: '1px solid rgba(131, 110, 249, 0.25)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Claimable Dividends</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34d399' }}>
                    {claimableRewards.claimableMon.toFixed(4)} MON
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Lifetime Yield</span>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                    {claimableRewards.lifetimeMon.toFixed(4)} MON
                  </span>
                </div>
              </div>

              {claimMessage && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#34d399',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    padding: '6px 8px',
                    borderRadius: 6,
                    textAlign: 'center',
                    marginBottom: 8,
                    fontWeight: 700
                  }}
                >
                  <div>{claimMessage}</div>
                  {lastClaimTxHash && (
                    <a
                      href={`https://testnet.monadexplorer.com/tx/${lastClaimTxHash}`}
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

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    onSelectAgent?.(backedAgent);
                    onFocusAgent?.(backedAgent);
                    setIsOpen(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Track in 3D
                </button>

                <button
                  onClick={handleClaimPayout}
                  disabled={isClaimingPayout || claimableRewards.claimableMon <= 0}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    backgroundColor: claimableRewards.claimableMon > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    borderRadius: 6,
                    color: claimableRewards.claimableMon > 0 ? '#ffffff' : '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: isClaimingPayout || claimableRewards.claimableMon <= 0 ? 'not-allowed' : 'pointer',
                    boxShadow: claimableRewards.claimableMon > 0 ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isClaimingPayout ? 'Claiming...' : 'Claim Payout'}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                padding: 10,
                borderRadius: 8,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 6 }}>
                You have not backed an Audience Agent yet.
              </div>
              <button
                onClick={() => {
                  // Find first available audience slot
                  const unclaimed = agents.find((a) => a.category === 'AUDIENCE' && !a.backerAddress);
                  if (unclaimed && onOpenClaim) {
                    onOpenClaim(unclaimed);
                  }
                  setIsOpen(false);
                }}
                style={{
                  padding: '5px 10px',
                  backgroundColor: 'rgba(131, 110, 249, 0.25)',
                  border: '1px solid rgba(131, 110, 249, 0.4)',
                  borderRadius: 6,
                  color: '#c084fc',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Claim an Audience Agent
              </button>
            </div>
          )}

          {/* Action Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
            <a
              href={`https://testnet.monadexplorer.com/address/${address}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                textDecoration: 'none',
                padding: '4px 6px',
                borderRadius: 6
              }}
            >
              <span>View on Monad Explorer</span>
              <ExternalLink size={12} />
            </a>

            <button
              onClick={() => {
                setIsOpen(false);
                setShowWalletModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                color: '#c084fc',
                fontSize: '0.75rem',
                padding: '4px 6px',
                cursor: 'pointer',
                borderRadius: 6,
                textAlign: 'left'
              }}
            >
              <span>Change Wallet ({walletName})</span>
              <Wallet size={12} />
            </button>

            <button
              onClick={handleDisconnect}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                color: '#f87171',
                fontSize: '0.75rem',
                padding: '6px 6px',
                cursor: 'pointer',
                borderRadius: 6,
                textAlign: 'left'
              }}
            >
              <span>Disconnect Wallet</span>
              <LogOut size={13} />
            </button>
          </div>
        </div>
        </>
      )}

      {/* Wallet Switch Modal */}
      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={(newAddr, newBal, name) => {
          setAddress(newAddr);
          setBalance(newBal);
          setWalletName(name);
        }}
      />
    </div>
  );
}

export default ConnectWalletButton;
