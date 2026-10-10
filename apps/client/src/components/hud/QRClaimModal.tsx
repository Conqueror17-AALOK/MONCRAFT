import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ShieldCheck, Wallet, Sparkles, Send, User, Copy, Check, ExternalLink, Globe } from 'lucide-react';
import { AgentRuntimeState } from '@civilization/shared';
import { AgentAvatar } from '../agents/AgentAvatar';
import { WalletConnectModal } from './WalletConnectModal';

export function QRClaimModal({
  agent,
  isOpen,
  onClose,
  onFundSuccess
}: {
  agent: AgentRuntimeState | null;
  isOpen: boolean;
  onClose: () => void;
  onFundSuccess: (slotId: number, amountMon: number, backerAddress: string, directive?: string, customName?: string) => void;
}) {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [customName, setCustomName] = useState(agent?.name || '');
  const [fundAmount, setFundAmount] = useState('1.0');
  const [directive, setDirective] = useState('Focus on Gold and high-margin trade arbitrage');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic LAN IP discovery for mobile audience
  const [detectedLanIp, setDetectedLanIp] = useState<string>('');
  const [customHost, setCustomHost] = useState<string>('');
  const [showHostInput, setShowHostInput] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/network')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.lanIp) {
          setDetectedLanIp(data.lanIp);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !agent) return null;

  // Calculate reliable network base URL for mobile devices
  let hostToUse = customHost.trim();
  if (!hostToUse) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && detectedLanIp) {
      const port = window.location.port ? `:${window.location.port}` : '';
      hostToUse = `${detectedLanIp}${port}`;
    } else {
      hostToUse = window.location.host;
    }
  }

  const claimUrl = hostToUse.startsWith('http://') || hostToUse.startsWith('https://')
    ? `${hostToUse}/claim/${agent.slotId}`
    : `${window.location.protocol}//${hostToUse}/claim/${agent.slotId}`;

  const REGISTRY_CONTRACT = (import.meta.env.VITE_CONTRACT_AGENT_REGISTRY as string) || '0x1141Dc51dC13C230FB4124c92503132942Ef5CFf';
  const ECONOMY_CONTRACT = (import.meta.env.VITE_CONTRACT_CIVILIZATION_ECONOMY as string) || '0x501be6eA6cbc2025617f0d8eCF4CE37CEebC2E83';

  const handleWalletConnected = (addr: string) => {
    setWalletAddress(addr);
    setWalletConnected(true);
    setShowWalletModal(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFundAndBack = async () => {
    setIsSubmitting(true);
    const amountNum = parseFloat(fundAmount) || 1.0;
    const backerAddr = walletAddress || '0x7a49f82bc1ed4119b916f';

    const eth = (window as unknown as {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }).ethereum;

    // Trigger on-chain smart contract transactions if real browser wallet is connected
    if (eth && backerAddr.startsWith('0x') && backerAddr.length === 42) {
      try {
        const slotHex = agent.slotId.toString(16).padStart(64, '0');
        // 1. Claim slot on AgentRegistry (0x6dbce7d0)
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

        // 2. Fund agent on CivilizationEconomy (0xef03c6db) with native MON value
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
        console.warn('On-chain transaction rejected or skipped, synchronizing with game server...', onChainErr);
      }
    }

    try {
      // 1. Submit funding & optional custom name to backend API
      const fundPayload = {
        amountMon: amountNum,
        backerAddress: backerAddr,
        customName: customName.trim() || undefined
      };

      let fundSuccess = false;
      try {
        const res = await fetch(`/api/agents/${agent.slotId}/fund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fundPayload)
        });
        fundSuccess = res.ok;
      } catch {
        fundSuccess = false;
      }

      if (!fundSuccess) {
        await fetch(`http://${window.location.hostname}:4000/api/agents/${agent.slotId}/fund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fundPayload)
        });
      }

      // 2. Submit strategic directive if provided
      if (directive.trim()) {
        const dirPayload = {
          directive: directive.trim(),
          backerAddress: backerAddr
        };

        let dirSuccess = false;
        try {
          const res = await fetch(`/api/agents/${agent.slotId}/directive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dirPayload)
          });
          dirSuccess = res.ok;
        } catch {
          dirSuccess = false;
        }

        if (!dirSuccess) {
          await fetch(`http://${window.location.hostname}:4000/api/agents/${agent.slotId}/directive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dirPayload)
          });
        }
      }

      onFundSuccess(agent.slotId, amountNum, backerAddr, directive.trim(), customName.trim() || agent.name);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Failed to fund agent', err);
      setIsSubmitting(false);
      onClose();
    }
  };

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
        zIndex: 100
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel modal-animate"
        style={{
          width: 520,
          maxWidth: '92vw',
          padding: 28,
          position: 'relative',
          border: '1px solid rgba(131, 110, 249, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <AgentAvatar agent={agent} size={48} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Claim & Back {agent.name}</h2>
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
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
              Audience Slot on Monad Testnet (Chain ID 10143)
            </div>
          </div>
        </div>

        {/* QR Code and Participant Mobile Link */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ background: '#ffffff', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRCodeSVG value={claimUrl} size={118} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
                Scan with Mobile Camera / MetaMask
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: 8, lineHeight: 1.4 }}>
                Scan to open the Mobile Participant Portal on your phone, back this agent with testnet MON, and give AI directives.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(131, 110, 249, 0.4)',
                    backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(131, 110, 249, 0.15)',
                    color: copied ? '#34d399' : '#c084fc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied URL!' : 'Copy Link'}
                </button>
                <a
                  href={claimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={13} />
                  Test Portal in Tab
                </a>
                <button
                  onClick={() => setShowHostInput((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                  title="Change IP or Tunnel URL"
                >
                  <Globe size={12} />
                  {showHostInput ? 'Hide IP' : 'Edit IP'}
                </button>
              </div>
            </div>
          </div>

          <div
            className="mono-text"
            style={{
              fontSize: '0.68rem',
              backgroundColor: 'rgba(255,255,255,0.04)',
              padding: '6px 10px',
              borderRadius: 6,
              color: '#38bdf8',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {claimUrl}
            </span>
          </div>

          {showHostInput && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
              <input
                type="text"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                placeholder="e.g. 10.68.165.86:3000 or your-ngrok.app"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(131, 110, 249, 0.4)',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '0.74rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => setCustomHost('')}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                Reset Auto IP
              </button>
            </div>
          )}
        </div>

        {/* Desktop Direct Connect & Backing Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!walletConnected ? (
            <button
              onClick={() => setShowWalletModal(true)}
              style={{
                padding: '12px 18px',
                backgroundColor: 'var(--monad-purple)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: '0.95rem',
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
                  fontSize: '0.82rem',
                  color: '#34d399'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} />
                  <span>Wallet Connected:</span>
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
                  placeholder="e.g. CyberValkyrie, MonadMogul, AliceTheTrader..."
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Fund Agent with Testnet MON (Increases Starting Gold):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['0.5', '1.0', '2.5', '5.0'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setFundAmount(amt)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: fundAmount === amt ? 'var(--monad-purple)' : 'rgba(255,255,255,0.1)',
                        backgroundColor: fundAmount === amt ? 'rgba(131, 110, 249, 0.25)' : 'rgba(255,255,255,0.04)',
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
                  High-Level Strategic Directive (Autonomous Guidance):
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
                  placeholder="e.g. Focus on gold expeditions, ally with Solaris faction"
                />
              </div>

              <button
                onClick={handleFundAndBack}
                disabled={isSubmitting}
                style={{
                  padding: '12px 18px',
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
                Confirm Backing on Monad Testnet (+{parseFloat(fundAmount) * 100} Gold)
              </button>
            </>
          )}
        </div>
      </div>

      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={(addr) => handleWalletConnected(addr)}
      />
    </div>
  );
}
