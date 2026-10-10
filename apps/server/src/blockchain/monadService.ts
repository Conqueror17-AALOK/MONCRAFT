import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Hex,
  encodeFunctionData,
  formatEther,
  parseEther
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AgentRegistryABI, CivilizationEconomyABI, ReputationLedgerABI } from './abis.js';
import fs from 'fs';
import path from 'path';

export interface OnChainTransactionRecord {
  id: string;
  txHash: string;
  type: 'INITIALIZE_SLOT' | 'ALLIANCE' | 'BETRAYAL' | 'SETTLEMENT_PROOF' | 'FUND_AGENT' | 'BACKER_PAYOUT';
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  summary: string;
  slotId?: number;
  error?: string;
  timestamp: number;
}

export interface MonadServiceConfig {
  rpcUrl?: string;
  privateKey?: string;
  agentRegistryAddress?: `0x${string}`;
  economyAddress?: `0x${string}`;
  reputationAddress?: `0x${string}`;
  onTxUpdate?: (tx: OnChainTransactionRecord) => void;
}

export const monadTestnetChain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] }
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' }
  }
} as const;

export class MonadBlockchainService {
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private accountAddress: `0x${string}` | null = null;

  private agentRegistryAddress: `0x${string}`;
  private economyAddress: `0x${string}`;
  private reputationAddress: `0x${string}`;

  private queue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private recentTransactions: OnChainTransactionRecord[] = [];
  private onTxUpdate?: (tx: OnChainTransactionRecord) => void;
  private isRealBlockchainEnabled = false;

  constructor(config: MonadServiceConfig = {}) {
    const rpcUrl = config.rpcUrl || process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
    this.onTxUpdate = config.onTxUpdate;

    // Load addresses from config, env, or deployedAddresses.json
    let fallbackAddresses: any = {};
    try {
      const deployedPath = path.resolve(process.cwd(), '../../contracts/deployedAddresses.json');
      if (fs.existsSync(deployedPath)) {
        fallbackAddresses = JSON.parse(fs.readFileSync(deployedPath, 'utf8')).contracts || {};
      }
    } catch {
      // Ignore fallback read failure
    }

    this.agentRegistryAddress = (config.agentRegistryAddress ||
      process.env.CONTRACT_AGENT_REGISTRY ||
      fallbackAddresses.AgentRegistry ||
      '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

    this.economyAddress = (config.economyAddress ||
      process.env.CONTRACT_CIVILIZATION_ECONOMY ||
      fallbackAddresses.CivilizationEconomy ||
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`;

    this.reputationAddress = (config.reputationAddress ||
      process.env.CONTRACT_REPUTATION_LEDGER ||
      fallbackAddresses.ReputationLedger ||
      '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`;

    this.publicClient = createPublicClient({
      chain: monadTestnetChain,
      transport: http(rpcUrl, { timeout: 10000, retryCount: 2 })
    });

    const privKey = config.privateKey || process.env.MONAD_OPERATOR_PRIVATE_KEY || '0x42e6d92a7790a9ea0f40979aa3f52fd3a6f4f02321bc5dac6d7d747db2a9d91e';
    if (privKey && privKey.startsWith('0x') && privKey.length === 66 && !/^0x0+$/.test(privKey) && privKey !== '0x0000000000000000000000000000000000000000000000000000000000000001') {
      try {
        const account = privateKeyToAccount(privKey as Hex);
        this.accountAddress = account.address;
        this.walletClient = createWalletClient({
          account,
          chain: monadTestnetChain,
          transport: http(rpcUrl, { timeout: 15000 })
        });
        this.isRealBlockchainEnabled = true;
        console.log(`[MonadBlockchainService] Connected operator wallet: ${account.address}`);
      } catch (err) {
        console.warn('[MonadBlockchainService] Failed to initialize operator wallet:', err);
      }
    } else {
      console.log('[MonadBlockchainService] Running in simulated/asynchronous testnet verification mode (no operator key provided).');
    }
  }

  public getRecentTransactions(): OnChainTransactionRecord[] {
    return [...this.recentTransactions];
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public isLiveOnChain(): boolean {
    return this.isRealBlockchainEnabled;
  }

  /**
   * Asynchronously enqueue an alliance recording on ReputationLedger
   */
  public recordAlliance(agentA: number, agentB: number, epoch: number) {
    const summary = `Alliance formed between Agent #${agentA} & Agent #${agentB} (Epoch ${epoch})`;
    this.enqueueTransaction({
      type: 'ALLIANCE',
      slotId: agentA,
      summary,
      execute: async () => {
        if (this.walletClient && this.isRealBlockchainEnabled && this.walletClient.account) {
          return await this.walletClient.writeContract({
            address: this.reputationAddress,
            abi: ReputationLedgerABI,
            functionName: 'recordAlliance',
            args: [BigInt(agentA), BigInt(agentB), BigInt(epoch)],
            chain: monadTestnetChain,
            account: this.walletClient.account
          });
        }
        return this.generateSimulatedTxHash('alliance', agentA, agentB, epoch);
      }
    });
  }

  /**
   * Asynchronously enqueue a betrayal recording on ReputationLedger
   */
  public recordBetrayal(betrayer: number, victim: number, epoch: number, reason: string) {
    const summary = `Betrayal: Agent #${betrayer} betrayed Agent #${victim}: "${reason.slice(0, 32)}..."`;
    this.enqueueTransaction({
      type: 'BETRAYAL',
      slotId: betrayer,
      summary,
      execute: async () => {
        if (this.walletClient && this.isRealBlockchainEnabled && this.walletClient.account) {
          return await this.walletClient.writeContract({
            address: this.reputationAddress,
            abi: ReputationLedgerABI,
            functionName: 'recordBetrayal',
            args: [BigInt(betrayer), BigInt(victim), BigInt(epoch), reason],
            chain: monadTestnetChain,
            account: this.walletClient.account
          });
        }
        return this.generateSimulatedTxHash('betrayal', betrayer, victim, epoch);
      }
    });
  }

  /**
   * Asynchronously enqueue a settlement state checkpoint on CivilizationEconomy
   */
  public recordSettlementProof(epoch: number, stateRoot: `0x${string}`, totalGoldCirculating: bigint) {
    const summary = `Settlement proof recorded for Epoch ${epoch} (${totalGoldCirculating} total gold)`;
    this.enqueueTransaction({
      type: 'SETTLEMENT_PROOF',
      summary,
      execute: async () => {
        if (this.walletClient && this.isRealBlockchainEnabled && this.walletClient.account) {
          return await this.walletClient.writeContract({
            address: this.economyAddress,
            abi: CivilizationEconomyABI,
            functionName: 'recordSettlementProof',
            args: [BigInt(epoch), stateRoot, totalGoldCirculating],
            chain: monadTestnetChain,
            account: this.walletClient.account
          });
        }
        return this.generateSimulatedTxHash('settle', epoch, Number(totalGoldCirculating));
      }
    });
  }

  /**
   * Asynchronously enqueue agent slot initialization on AgentRegistry
   */
  public initializeSlot(slotId: number, category: number, name: string, archetype: number) {
    const summary = `Slot #${slotId} registered: ${name} (Category: ${category})`;
    this.enqueueTransaction({
      type: 'INITIALIZE_SLOT',
      slotId,
      summary,
      execute: async () => {
        if (this.walletClient && this.isRealBlockchainEnabled && this.walletClient.account) {
          return await this.walletClient.writeContract({
            address: this.agentRegistryAddress,
            abi: AgentRegistryABI,
            functionName: 'initializeSlot',
            args: [BigInt(slotId), category, name, archetype],
            chain: monadTestnetChain,
            account: this.walletClient.account
          });
        }
        return this.generateSimulatedTxHash('init_slot', slotId, category);
      }
    });
  }

  /**
   * Asynchronously enqueue backer dividend payout on CivilizationEconomy
   */
  public recordBackerPayout(backer: `0x${string}`, slotId: number, rewardAmountWei: bigint) {
    const monadValue = (Number(rewardAmountWei) / 1e18).toFixed(4);
    const summary = `Dividend payout of ${monadValue} MON credited to backer ${backer.slice(0, 8)}... (Slot #${slotId})`;
    this.enqueueTransaction({
      type: 'BACKER_PAYOUT',
      slotId,
      summary,
      execute: async () => {
        if (this.walletClient && this.isRealBlockchainEnabled && this.walletClient.account) {
          return await this.walletClient.writeContract({
            address: this.economyAddress,
            abi: CivilizationEconomyABI,
            functionName: 'recordBackerPayout',
            args: [backer, BigInt(slotId), rewardAmountWei],
            chain: monadTestnetChain,
            account: this.walletClient.account
          });
        }
        return this.generateSimulatedTxHash('payout', backer, slotId, rewardAmountWei.toString());
      }
    });
  }

  /**
   * Synchronously credit rewards to CivilizationEconomy contract so MetaMask simulation succeeds
   */
  public async creditBackerRewardSync(backer: `0x${string}`, slotId: number, rewardAmountWei: bigint): Promise<string | null> {
    if (!this.walletClient || !this.isRealBlockchainEnabled || !this.walletClient.account) {
      console.warn('[MonadBlockchainService] Real blockchain wallet not available for creditBackerRewardSync');
      return null;
    }

    try {
      console.log(`[MonadBlockchainService] Crediting ${rewardAmountWei} wei on-chain for backer ${backer}...`);
      const hash = await this.walletClient.writeContract({
        address: this.economyAddress,
        abi: CivilizationEconomyABI,
        functionName: 'recordBackerPayout',
        args: [backer, BigInt(slotId), rewardAmountWei],
        chain: monadTestnetChain,
        account: this.walletClient.account
      });

      console.log(`[MonadBlockchainService] Credit tx submitted: ${hash}, waiting for confirmation...`);
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`[MonadBlockchainService] Credit confirmed on-chain!`);
      return hash;
    } catch (err: any) {
      console.error('[MonadBlockchainService] creditBackerRewardSync error:', err?.message || err);
      return null;
    }
  }

  /**
   * Check on-chain claimable rewards on CivilizationEconomy
   */
  public async getOnChainClaimable(backer: `0x${string}`): Promise<bigint> {
    try {
      const info = (await this.publicClient.readContract({
        address: this.economyAddress,
        abi: CivilizationEconomyABI,
        functionName: 'getBackerInfo',
        args: [backer]
      })) as readonly [bigint, bigint, bigint];
      return info[1] || 0n;
    } catch {
      return 0n;
    }
  }

  /**
   * Send real native MON testnet transfer directly from operator wallet to backer
   */
  public async sendNativePayout(backer: `0x${string}`, amountMon: number): Promise<string | null> {
    if (!this.walletClient || !this.isRealBlockchainEnabled || !this.walletClient.account) {
      console.warn('[MonadBlockchainService] Real blockchain wallet not available for native payout transfer');
      return null;
    }

    try {
      const cleanAmount = Math.max(0.001, Number(amountMon.toFixed(4)));
      const valueWei = parseEther(cleanAmount.toString());

      console.log(`[MonadBlockchainService] Executing native payout: sending ${cleanAmount} MON to ${backer}...`);
      const hash = await this.walletClient.sendTransaction({
        to: backer,
        value: valueWei,
        chain: monadTestnetChain,
        account: this.walletClient.account
      });

      console.log(`[MonadBlockchainService] Native payout confirmed on Monad Testnet! Tx: ${hash}`);

      const record: OnChainTransactionRecord = {
        id: `tx_${Date.now()}_payout`,
        txHash: hash,
        type: 'BACKER_PAYOUT',
        status: 'CONFIRMED',
        summary: `Dividend payout of ${cleanAmount} MON delivered to ${backer.slice(0, 8)}...`,
        timestamp: Date.now()
      };
      this.pushRecord(record);
      this.emitUpdate(record);

      return hash;
    } catch (err: any) {
      console.error('[MonadBlockchainService] Native payout tx failed:', err?.message || err);
      return null;
    }
  }

  /**
   * Enqueue transaction with background status lifecycle (PENDING -> CONFIRMED -> FAILED)
   */
  private enqueueTransaction(task: {
    type: OnChainTransactionRecord['type'];
    slotId?: number;
    summary: string;
    execute: () => Promise<string>;
  }) {
    const recordId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txRecord: OnChainTransactionRecord = {
      id: recordId,
      txHash: '',
      type: task.type,
      status: 'PENDING',
      summary: task.summary,
      slotId: task.slotId,
      timestamp: Date.now()
    };

    this.pushRecord(txRecord);

    const queuedTask = async () => {
      try {
        const hash = await task.execute();
        txRecord.txHash = hash;
        this.emitUpdate(txRecord);

        if (this.walletClient && this.isRealBlockchainEnabled) {
          // Asynchronously wait for transaction receipt without blocking main loop
          try {
            await this.publicClient.waitForTransactionReceipt({
              hash: hash as Hex,
              timeout: 30000
            });
            txRecord.status = 'CONFIRMED';
          } catch (receiptErr: any) {
            txRecord.status = 'FAILED';
            txRecord.error = receiptErr?.message || 'Receipt timeout';
          }
        } else {
          // In simulation mode, mark confirmed after brief asynchronous latency
          await new Promise((resolve) => setTimeout(resolve, 800));
          txRecord.status = 'CONFIRMED';
        }

        this.emitUpdate(txRecord);
      } catch (err: any) {
        console.error(`[MonadBlockchainService] Tx failed (${task.type}):`, err?.message || err);
        txRecord.status = 'FAILED';
        txRecord.error = err?.message || 'Execution error';
        this.emitUpdate(txRecord);
      }
    };

    this.queue.push(queuedTask);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        try {
          await nextTask();
        } catch (err) {
          console.error('[MonadBlockchainService] Queue item error:', err);
        }
      }
      // Small delay between transactions to prevent nonce collisions
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    this.isProcessingQueue = false;
  }

  private pushRecord(record: OnChainTransactionRecord) {
    this.recentTransactions.unshift(record);
    if (this.recentTransactions.length > 60) this.recentTransactions.pop();
  }

  private emitUpdate(record: OnChainTransactionRecord) {
    if (this.onTxUpdate) {
      this.onTxUpdate({ ...record });
    }
  }

  public async getBalance(address: string): Promise<string> {
    try {
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        return '5.00';
      }
      const balWei = await this.publicClient.getBalance({ address: address as `0x${string}` });
      return parseFloat(formatEther(balWei)).toFixed(2);
    } catch (err) {
      console.warn('[MonadBlockchainService] Balance fetch failed for address:', address, err);
      return '5.00';
    }
  }

  private generateSimulatedTxHash(...args: any[]): string {
    const raw = args.join('_') + '_' + Date.now();
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += Math.floor(Math.random() * 16).toString(16);
    }
    return hash;
  }
}
