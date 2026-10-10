import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { formatEther } from 'viem';

const MONAD_TESTNET_HEX = '0x279f';

export interface WalletOption {
  id: string;
  name: string;
  category: 'EXTENSION' | 'BROWSER' | 'DEMO';
  description: string;
  icon: string | JSX.Element;
  installed: boolean;
  installUrl?: string;
}

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string, balanceMon: string, walletName: string) => void;
}

export function WalletConnectModal({
  isOpen,
  onClose,
  onConnected
}: WalletConnectModalProps) {
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // EIP-6963 discovered providers
  const [announcedProviders, setAnnouncedProviders] = useState<Array<{
    info: { name: string; icon: string; rdns: string; uuid: string };
    provider: any;
  }>>([]);

  useEffect(() => {
    function handleAnnouncement(event: any) {
      if (!event.detail) return;
      setAnnouncedProviders((prev) => {
        if (prev.some((p) => p.info.uuid === event.detail.info.uuid)) return prev;
        return [...prev, event.detail];
      });
    }

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement);
    };
  }, []);

  if (!isOpen) return null;

  // Window ethereum inspection
  const win = window as any;
  const eth = win.ethereum;
  const isBraveBrowser = !!(navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function';

  // Detect specific wallet providers
  const hasMetaMask = !!(eth && (eth.isMetaMask || eth.providers?.some((p: any) => p.isMetaMask)));
  const hasBraveWallet = !!(
    (eth && eth.isBraveWallet) ||
    win.braveEthereum ||
    (isBraveBrowser && eth)
  );
  const hasCoinbase = !!(
    win.coinbaseWalletExtension ||
    (eth && (eth.isCoinbaseWallet || eth.providers?.some((p: any) => p.isCoinbaseWallet)))
  );
  const hasRabby = !!(win.rabby || (eth && eth.isRabby));

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      category: 'EXTENSION',
      description: 'Popular Ethereum & EVM Web3 wallet',
      installed: hasMetaMask,
      installUrl: 'https://metamask.io/download/',
      icon: <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style={{ width: 26, height: 26 }} />
    },
    {
      id: 'brave',
      name: 'Brave Wallet',
      category: 'BROWSER',
      description: 'Built-in native browser Web3 wallet',
      installed: hasBraveWallet,
      installUrl: 'https://brave.com/wallet/',
      icon: <img src="https://brave.com/static-assets/images/brave-logo-sans-text.svg" alt="Brave" style={{ width: 26, height: 26 }} />
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      category: 'EXTENSION',
      description: 'Self-custody crypto wallet by Coinbase',
      installed: hasCoinbase,
      installUrl: 'https://www.coinbase.com/wallet',
      icon: <img src="https://avatars.githubusercontent.com/u/18060234?s=200&v=4" alt="Coinbase" style={{ width: 26, height: 26, borderRadius: '50%' }} />
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      category: 'EXTENSION',
      description: 'Game & DeFi multi-chain EVM wallet',
      installed: hasRabby,
      installUrl: 'https://rabby.io/',
      icon: <img src="https://avatars.githubusercontent.com/u/89664539?s=200&v=4" alt="Rabby" style={{ width: 26, height: 26, borderRadius: '50%' }} />
    },
    {
      id: 'injected',
      name: 'Browser Injected',
      category: 'EXTENSION',
      description: 'Generic detected Web3 provider',
      installed: !!eth,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1.5" />
          <path d="M13 3L6 13H12L11 21L18 11H12L13 3Z" fill="#38BDF8" />
        </svg>
      )
    },
    {
      id: 'monad_quick_demo',
      name: 'Monad Quick Simulator',
      category: 'DEMO',
      description: 'Instant 1-click testnet wallet (+5.0 MON pre-loaded)',
      installed: true,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#836EF9" />
          <path d="M7 12L12 7L17 12L12 17L7 12Z" fill="#FFFFFF" />
        </svg>
      )
    }
  ];

  const connectProvider = async (provider: any, walletName: string) => {
    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts'
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in wallet.');
      }

      const userAddr = accounts[0];

      // Auto-switch to Monad Testnet (Chain ID 10143)
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MONAD_TESTNET_HEX }]
        });
      } catch (switchErr: any) {
        if (switchErr?.code === 4902 || switchErr?.message?.includes('Unrecognized chain')) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: MONAD_TESTNET_HEX,
                  chainName: 'Monad Testnet',
                  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                  rpcUrls: ['https://testnet-rpc.monad.xyz'],
                  blockExplorerUrls: ['https://testnet.monadexplorer.com']
                }
              ]
            });
          } catch (addErr) {
            console.warn('Failed to add Monad Testnet to wallet:', addErr);
          }
        }
      }

      // Query balance
      let balanceMon = '5.00';
      try {
        const balHex = (await provider.request({
          method: 'eth_getBalance',
          params: [userAddr, 'latest']
        })) as string;
        balanceMon = parseFloat(formatEther(BigInt(balHex))).toFixed(2);
      } catch {
        balanceMon = '5.00';
      }

      localStorage.setItem('civilization_wallet_address', userAddr);
      localStorage.setItem('civilization_wallet_name', walletName);
      onConnected(userAddr, balanceMon, walletName);
      onClose();
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setErrorMsg(err.message || 'Connection request rejected');
    } finally {
      setConnectingWalletId(null);
    }
  };

  const handleSelectWallet = async (wallet: WalletOption) => {
    setErrorMsg(null);
    setConnectingWalletId(wallet.id);

    // 1. Monad Demo / Quick Simulator
    if (wallet.id === 'monad_quick_demo') {
      const mockAddr = '0x7a49' + Math.random().toString(16).substring(2, 6) + '19B916F48c1eD411';
      localStorage.setItem('civilization_wallet_address', mockAddr);
      localStorage.setItem('civilization_wallet_name', 'Monad Quick Simulator');
      setTimeout(() => {
        onConnected(mockAddr, '5.00', 'Monad Quick Simulator');
        setConnectingWalletId(null);
        onClose();
      }, 400);
      return;
    }

    // 2. Mobile Deep Linking for MetaMask or Not installed -> redirect to install page
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!wallet.installed) {
      if (wallet.id === 'metamask' && isMobile) {
        // Deep link into MetaMask app browser for mobile
        const dappUrl = window.location.href.replace(/^https?:\/\//, '');
        window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
      } else if (wallet.installUrl) {
        window.open(wallet.installUrl, '_blank');
      }
      setConnectingWalletId(null);
      return;
    }

    // 3. Resolve specific provider
    let targetProvider = eth;

    if (wallet.id === 'brave' && win.braveEthereum) {
      targetProvider = win.braveEthereum;
    } else if (wallet.id === 'coinbase' && win.coinbaseWalletExtension) {
      targetProvider = win.coinbaseWalletExtension;
    } else if (wallet.id === 'rabby' && win.rabby) {
      targetProvider = win.rabby;
    } else if (eth && eth.providers && Array.isArray(eth.providers)) {
      if (wallet.id === 'metamask') {
        targetProvider = eth.providers.find((p: any) => p.isMetaMask) || eth;
      } else if (wallet.id === 'coinbase') {
        targetProvider = eth.providers.find((p: any) => p.isCoinbaseWallet) || eth;
      } else if (wallet.id === 'brave') {
        targetProvider = eth.providers.find((p: any) => p.isBraveWallet) || eth;
      }
    }

    if (!targetProvider) {
      setErrorMsg(`No Web3 provider found for ${wallet.name}. Please install the extension.`);
      setConnectingWalletId(null);
      return;
    }

    await connectProvider(targetProvider, wallet.name);
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 999999, // Ensure it sits on top of everything
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
          maxWidth: 460,
          borderRadius: 24,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(131, 110, 249, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(131, 110, 249, 0.12) 0%, transparent 100%)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: '1.1rem' }}>🟣</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Connect Wallet
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Connect your Monad Testnet wallet to back agents and claim dividends
            </p>
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
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertCircle size={15} color="#ef4444" />
            <span style={{ flex: 1 }}>{errorMsg}</span>
          </div>
        )}

        {/* Wallet Options List */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
          {/* EIP-6963 Discovered Wallets (if any) */}
          {announcedProviders.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6, textTransform: 'uppercase' }}>
                Detected Browser Wallets (EIP-6963)
              </div>
              {announcedProviders.map(({ info, provider }) => (
                <div
                  key={info.uuid}
                  onClick={() => connectProvider(provider, info.name)}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: 6
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(131, 110, 249, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.5)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={info.icon} alt={info.name} style={{ width: 28, height: 28, borderRadius: 6 }} />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>{info.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Detected extension</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 2, textTransform: 'uppercase' }}>
            Available Wallets
          </div>

          {walletOptions.map((wallet) => {
            const isConnecting = connectingWalletId === wallet.id;
            return (
              <div
                key={wallet.id}
                onClick={() => !isConnecting && handleSelectWallet(wallet)}
                style={{
                  padding: '12px 14px',
                  backgroundColor: wallet.id === 'monad_quick_demo' ? 'rgba(131, 110, 249, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  border: wallet.id === 'monad_quick_demo' ? '1px solid rgba(131, 110, 249, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: isConnecting ? 'wait' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(4px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(131, 110, 249, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = wallet.id === 'monad_quick_demo' ? 'rgba(131, 110, 249, 0.1)' : 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = wallet.id === 'monad_quick_demo' ? 'rgba(131, 110, 249, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {wallet.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                        {wallet.name}
                      </span>
                      {wallet.installed && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 6px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            fontWeight: 700
                          }}
                        >
                          Detected
                        </span>
                      )}
                      {wallet.id === 'monad_quick_demo' && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 6px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            fontWeight: 800
                          }}
                        >
                          Zero Install
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {wallet.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isConnecting ? (
                    <RefreshCw size={16} className="spin-animation" color="#836ef9" />
                  ) : wallet.installed ? (
                    <ChevronRight size={18} color="#64748b" />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontWeight: 600
                      }}
                    >
                      Install <ExternalLink size={12} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>Monad Testnet (Chain ID 10143)</span>
          </div>
          <span>Gas sponsored on testnet</span>
        </div>
      </div>
    </div>
  );

  // Render the modal directly into document.body to escape any z-index or stacking context issues
  return createPortal(modalContent, document.body);
}
