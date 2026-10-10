import {
  AgentRuntimeState,
  ResourceNode,
  ResourceType,
  DeltaSnapshot,
  AgentDelta,
  WorldSnapshot,
  MarketDeskSnapshot,
  TradeFill,
  CORE_AI_COUNT,
  AUDIENCE_COUNT,
  NPC_COUNT,
  CORE_AGENT_ARCHETYPES
} from '@civilization/shared';
import { INITIAL_RESOURCE_NODES } from '../world/zones.js';
import { EconomyEngine } from '../economy/market.js';
import { OrderBookEngine } from '../economy/orderBook.js';
import { TreatyEngine } from '../economy/treaties.js';
import { PersistenceManager } from '../persistence/database.js';
import { NPCController } from './npcFsm.js';
import { AudienceAgentController } from './audienceAgent.js';
import { CoreAgentFallbackController } from './coreAgentFallback.js';
import { AIOrchestrator } from '../ai/orchestrator.js';
import { MonadBlockchainService } from '../blockchain/monadService.js';

export interface GameLoopCallbacks {
  onDeltaUpdate: (delta: DeltaSnapshot) => void;
  onWorldEvent?: (event: any) => void;
}

const RESOURCES: ResourceType[] = ['WOOD', 'WHEAT', 'IRON', 'GOLD'];

export class GameSimulationEngine {
  private agents: AgentRuntimeState[] = [];
  private resourceNodes: ResourceNode[] = [];
  private economy: EconomyEngine;
  private orderBook: OrderBookEngine;
  private treaties: TreatyEngine;
  private persistence: PersistenceManager;
  private monadService: MonadBlockchainService;

  private npcController: NPCController;
  private audienceController: AudienceAgentController;
  private coreController: CoreAgentFallbackController;
  private aiOrchestrator: AIOrchestrator;

  private epoch = 1;
  private tickInterval: NodeJS.Timeout | null = null;
  private callbacks: GameLoopCallbacks;

  private lastTickTime = Date.now();
  private lastPersistenceTime = Date.now();
  private lastShockTime = Date.now();
  private lastDeskTime = Date.now();
  private lastTreatyTime = Date.now();
  private lastUpkeepTime = Date.now();
  private lastDividendCycleTime = Date.now();
  private lastSeedOrderTime = 0;
  private lastSeedTradeTime = 0;

  // Signature of the last broadcast state per agent, so any change (including
  // asynchronous NIM-driven mutations) is reliably captured in the next delta.
  private lastBroadcastSig = new Map<string, string>();

  constructor(
    economy: EconomyEngine,
    persistence: PersistenceManager,
    callbacks: GameLoopCallbacks,
    monadService?: MonadBlockchainService
  ) {
    this.economy = economy;
    this.persistence = persistence;
    this.callbacks = callbacks;
    this.monadService =
      monadService ||
      new MonadBlockchainService({
        onTxUpdate: (tx) => {
          if (tx.slotId !== undefined) {
            const agent = this.getAgentBySlot(tx.slotId);
            if (agent) {
              agent.onChainTxStatus = tx.status;
              if (tx.txHash) agent.lastOnChainTxHash = tx.txHash;
            }
          }
          if (this.callbacks.onWorldEvent) {
            this.callbacks.onWorldEvent({
              type: 'BLOCKCHAIN_TX',
              payload: {
                txHash: tx.txHash || 'pending',
                type: tx.type,
                status: tx.status,
                summary: tx.summary
              }
            });
          }
        }
      });

    this.orderBook = new OrderBookEngine();
    this.treaties = new TreatyEngine();

    this.npcController = new NPCController(this.economy);
    this.audienceController = new AudienceAgentController(this.economy);
    this.coreController = new CoreAgentFallbackController(this.economy);
    this.aiOrchestrator = new AIOrchestrator(this.economy, this.orderBook, this.treaties, {
      onAgentDecision: (decision) => {
        if (this.callbacks.onWorldEvent) {
          this.callbacks.onWorldEvent({
            type: 'AGENT_DECISION',
            payload: decision
          });
        }
      },
      onWorldEvent: (evt) => {
        this.emitEvent(evt);
      }
    });

    this.initWorld();
  }

  private initWorld() {
    this.resourceNodes = JSON.parse(JSON.stringify(INITIAL_RESOURCE_NODES));
    this.agents = [];

    // 1. Initialize 10 Core AI agents
    for (let i = 0; i < CORE_AI_COUNT; i++) {
      const meta = CORE_AGENT_ARCHETYPES[i];
      const posX = Number(((i % 5 - 2) * 5).toFixed(2));
      const posZ = Number((Math.floor(i / 5) * 5).toFixed(2));
      this.agents.push({
        id: `agent_${String(i).padStart(2, '0')}`,
        slotId: i,
        category: 'CORE_AI',
        name: meta.name,
        archetype: meta.archetype,
        colorHex: meta.colorHex,
        position: { x: posX, y: 0, z: posZ },
        targetPosition: { x: posX, y: 0, z: posZ },
        actionState: 'IDLE',
        gold: 30,
        inventory: { WOOD: 4, WHEAT: 6, IRON: 2, GOLD: 1 },
        factionId: i % 2 === 0 ? 'FACTION_SOLARIS' : 'FACTION_LUNARIS',
        activeGoal: 'Strategic wealth & influence expansion',
        recentThought: `${meta.name} surveys the settlement market.`,
        relationships: {},
        shortTermMemories: [],
        longTermSummary: `${meta.name} entered the civilization.`,
        onChainTxStatus: 'NONE'
      });
    }

    // 2. Initialize 10 Audience agent slots
    for (let i = 0; i < AUDIENCE_COUNT; i++) {
      const slotId = CORE_AI_COUNT + i;
      const posX = Number(((i % 5 - 2) * 4 + 14).toFixed(2));
      const posZ = Number(((Math.floor(i / 5) - 1) * 4).toFixed(2));
      this.agents.push({
        id: `agent_${String(slotId).padStart(2, '0')}`,
        slotId,
        category: 'AUDIENCE',
        name: `Audience Slot #${slotId}`,
        archetype: 'AUDIENCE_NOMAD',
        colorHex: '#06B6D4',
        position: { x: posX, y: 0, z: posZ },
        targetPosition: { x: posX, y: 0, z: posZ },
        actionState: 'IDLE',
        gold: 18,
        inventory: { WOOD: 3, WHEAT: 4, IRON: 1, GOLD: 0 },
        factionId: 'FACTION_NOMAD',
        activeGoal: 'Open for hackathon participant backing',
        recentThought: 'Scanning for human sponsor via QR code.',
        relationships: {},
        shortTermMemories: [],
        longTermSummary: 'Audience slot initialized.',
        onChainTxStatus: 'NONE'
      });
    }

    // 3. Initialize 20 NPC agents
    const npcRoles = ['FARMER', 'LUMBERJACK', 'MINER', 'PORTER'];
    for (let i = 0; i < NPC_COUNT; i++) {
      const slotId = CORE_AI_COUNT + AUDIENCE_COUNT + i;
      const role = npcRoles[i % npcRoles.length];
      const posX = Number(((i % 5 - 2) * 6 - 18).toFixed(2));
      const posZ = Number(((Math.floor(i / 5) - 2) * 6).toFixed(2));
      this.agents.push({
        id: `agent_${String(slotId).padStart(2, '0')}`,
        slotId,
        category: 'NPC',
        name: `NPC ${role} #${i + 1}`,
        archetype: role,
        colorHex: '#94A3B8',
        position: { x: posX, y: 0, z: posZ },
        targetPosition: { x: posX, y: 0, z: posZ },
        actionState: 'IDLE',
        gold: 10,
        inventory: { WOOD: 2, WHEAT: 3, IRON: 1, GOLD: 0 },
        factionId: 'FACTION_COMMONERS',
        activeGoal: `Execute ${role.toLowerCase()} duties`,
        recentThought: 'Maintaining baseline civilization logistics.',
        relationships: {},
        shortTermMemories: [],
        longTermSummary: `Autonomous ${role}.`,
        onChainTxStatus: 'NONE'
      });
    }

    // Save initial state to persistent SQLite database
    this.persistence.saveAgentsBatch(this.agents);
  }

  public start(tickRateHz = 10) {
    if (this.tickInterval) return;
    const intervalMs = Math.round(1000 / tickRateHz);
    this.lastTickTime = Date.now();

    this.tickInterval = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public getWorldSnapshot(): WorldSnapshot {
    return {
      epoch: this.epoch,
      serverTime: Date.now(),
      market: this.economy.getMarketBook(),
      marketDesk: this.getMarketDesk(),
      resourceNodes: this.resourceNodes,
      agents: this.agents
    };
  }

  public getMarketDesk(): MarketDeskSnapshot {
    return {
      openOrders: this.orderBook.getOpenOrders(),
      recentFills: this.orderBook.getRecentFills(),
      treaties: this.treaties.getTreaties()
    };
  }

  public getTreaties() {
    return this.treaties.getTreaties();
  }

  public getAgents(): AgentRuntimeState[] {
    return this.agents;
  }

  public getAgentBySlot(slotId: number): AgentRuntimeState | undefined {
    return this.agents.find((a) => a.slotId === slotId);
  }

  public setAgentDirective(slotId: number, directive: string, backerAddress?: string) {
    const agent = this.getAgentBySlot(slotId);
    if (!agent) return;

    agent.customDirective = directive;
    if (backerAddress) {
      agent.backerAddress = backerAddress;
    }
    agent.recentThought = `New backer directive: "${directive}"`;
  }

  public fundAgent(slotId: number, amountMon: number, backerAddress: string, customName?: string) {
    const agent = this.getAgentBySlot(slotId);
    if (!agent) return;

    if (customName && customName.trim()) {
      agent.name = customName.trim().slice(0, 24);
    }
    agent.backerAddress = backerAddress;
    agent.stakedMonAmount = (agent.stakedMonAmount || 0) + amountMon;
    agent.gold += Math.round(amountMon * 100); // 1 testnet MON = 100 in-game gold
    agent.onChainTxStatus = 'CONFIRMED';
    agent.recentThought = `Funded by ${backerAddress.slice(0, 6)}... with ${amountMon} MON!`;

    this.emitEvent({
      type: 'PARTICIPANT_FUNDED',
      payload: { slotId, amountMon, backerAddress, newName: agent.name }
    });
  }

  public renameAgent(slotId: number, newName: string, backerAddress?: string): { success: boolean; name: string; message: string } {
    const agent = this.getAgentBySlot(slotId);
    if (!agent) {
      return { success: false, name: '', message: 'Audience slot not found' };
    }

    const clean = newName.trim().slice(0, 24);
    if (!clean) {
      return { success: false, name: agent.name, message: 'Invalid agent name' };
    }

    if (agent.backerAddress && backerAddress && agent.backerAddress.toLowerCase() !== backerAddress.toLowerCase()) {
      return { success: false, name: agent.name, message: 'Only the current backer can rename this agent' };
    }

    const oldName = agent.name;
    agent.name = clean;
    if (backerAddress && !agent.backerAddress) {
      agent.backerAddress = backerAddress;
    }
    agent.recentThought = `Renamed from "${oldName}" to "${clean}"!`;

    this.emitEvent({
      type: 'AGENT_RENAMED',
      payload: { slotId, oldName, newName: clean, backerAddress }
    });

    return { success: true, name: clean, message: `Successfully renamed agent to "${clean}"` };
  }

  public getBackerRewards(backerAddress: string): {
    stakedMon: number;
    claimableMon: number;
    lifetimeMon: number;
    agents: AgentRuntimeState[];
  } {
    const backed = this.agents.filter(
      (a) => a.category === 'AUDIENCE' && a.backerAddress && a.backerAddress.toLowerCase() === backerAddress.toLowerCase()
    );

    let stakedMon = 0;
    let claimableMon = 0;
    let lifetimeMon = 0;

    for (const a of backed) {
      stakedMon += a.stakedMonAmount || 0;
      claimableMon += a.claimableDividendMon || 0;
      lifetimeMon += a.lifetimeDividendMon || 0;
    }

    return {
      stakedMon: Number(stakedMon.toFixed(2)),
      claimableMon: Number(claimableMon.toFixed(4)),
      lifetimeMon: Number(lifetimeMon.toFixed(4)),
      agents: backed
    };
  }

  public claimBackerPayout(backerAddress: string): {
    success: boolean;
    claimedMon: number;
    message: string;
  } {
    const backed = this.agents.filter(
      (a) => a.category === 'AUDIENCE' && a.backerAddress && a.backerAddress.toLowerCase() === backerAddress.toLowerCase()
    );

    if (backed.length === 0) {
      return { success: false, claimedMon: 0, message: 'No backed audience agents found for this address.' };
    }

    let totalClaimable = 0;
    for (const agent of backed) {
      totalClaimable += agent.claimableDividendMon || 0;
      agent.claimableDividendMon = 0;
      agent.recentThought = `Backer claimed ${totalClaimable.toFixed(4)} MON accumulated dividends!`;
    }

    totalClaimable = Number(totalClaimable.toFixed(4));

    if (totalClaimable <= 0) {
      return { success: false, claimedMon: 0, message: 'No claimable dividends available at this time.' };
    }

    this.persistence.saveAgentsBatch(backed);

    this.emitEvent({
      type: 'PAYOUT_CLAIMED',
      payload: {
        backerAddress,
        claimedMon: totalClaimable,
        timestamp: Date.now()
      }
    });

    return {
      success: true,
      claimedMon: totalClaimable,
      message: `Successfully claimed ${totalClaimable} MON dividends!`
    };
  }

  public getMonadService(): MonadBlockchainService {
    return this.monadService;
  }

  private tick() {
    const now = Date.now();
    const deltaSec = Math.min(0.5, (now - this.lastTickTime) / 1000);
    this.lastTickTime = now;

    // 1. Regenerate Resource Nodes
    for (const node of this.resourceNodes) {
      if (node.currentCapacity < node.maxCapacity) {
        node.currentCapacity = Math.min(
          node.maxCapacity,
          Number((node.currentCapacity + node.regenRatePerSec * deltaSec).toFixed(2))
        );
      }
    }

    // 2. Tick All 40 Agents (spatial movement + per-category behavior)
    for (const agent of this.agents) {
      const dx = agent.targetPosition.x - agent.position.x;
      const dz = agent.targetPosition.z - agent.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Famished citizens move slower due to calorie deficit
      const isFamished = (agent.inventory.WHEAT || 0) === 0 && agent.gold < 3;
      const effectiveSpeed = isFamished ? 2.0 : 3.2;

      if (dist > 0.05) {
        const step = Math.min(dist, effectiveSpeed * deltaSec);
        agent.position.x = Number((agent.position.x + (dx / dist) * step).toFixed(2));
        agent.position.z = Number((agent.position.z + (dz / dist) * step).toFixed(2));
      }

      if (agent.category === 'NPC') {
        this.npcController.tickNPC(agent, deltaSec, this.resourceNodes);
      } else if (agent.category === 'AUDIENCE') {
        this.audienceController.tickAudienceAgent(agent, deltaSec, this.resourceNodes);
      } else if (agent.category === 'CORE_AI') {
        this.coreController.tickCoreAgent(agent, deltaSec, this.resourceNodes);
      }
    }

    // 3. Tick NVIDIA NIM Strategic Brain for Core AI Agents (async, non-blocking)
    const coreAgents = this.agents.filter((a) => a.category === 'CORE_AI');
    this.aiOrchestrator.tickCoreAI(
      coreAgents,
      this.agents,
      this.economy.getMarketBook(),
      this.resourceNodes,
      this.epoch
    );

    // 4. Marketplace Trading Desk: order matching + liquidity seeding (~every 2.5s)
    let deskChanged = false;
    if (now - this.lastDeskTime > 2500) {
      this.lastDeskTime = now;
      deskChanged = this.runMarketDesk();
    }

    // 5. Bilateral Trading Treaty cycle (~every 50s economic cycle)
    if (now - this.lastTreatyTime > 50000) {
      this.lastTreatyTime = now;
      this.runTreatyCycle();
      deskChanged = true;
    }

    // 5.5 Subsistence Upkeep & Living Economy Sinks (~every 25 seconds)
    if (now - this.lastUpkeepTime > 25000) {
      this.lastUpkeepTime = now;
      this.runSubsistenceUpkeep();
    }

    // 5.6 Participant Economic Dividends (~every 90 seconds to preserve testnet gas)
    if (now - this.lastDividendCycleTime > 90000) {
      this.lastDividendCycleTime = now;
      this.runBackerDividendCycle();
    }

    // 6. Periodic Economic Shocks (~every 60s) advance the epoch
    if (now - this.lastShockTime > 60000) {
      this.lastShockTime = now;
      const shock = this.economy.triggerRandomShock();
      this.epoch += 1;

      // Trigger priority NIM re-evaluation for core agents
      for (const core of coreAgents) {
        this.aiOrchestrator.triggerEventReevaluation(
          core.id,
          this.agents,
          this.economy.getMarketBook(),
          this.resourceNodes,
          this.epoch
        );
      }

      this.emitEvent({
        type: 'ECONOMIC_SHOCK',
        payload: {
          shockName: shock.shockName,
          resource: shock.affectedResource,
          description: shock.description
        }
      });
    }

    // 7. Periodic Persistence to SQLite (every 10 seconds)
    if (now - this.lastPersistenceTime > 10000) {
      this.lastPersistenceTime = now;
      this.persistence.saveAgentsBatch(this.agents);
      this.persistence.saveTreatiesBatch(this.treaties.getTreaties());
    }

    // 8. Build deltas by diffing against last broadcast signature. This captures
    //    movement, controller logic, asynchronous NIM actions, and desk settlement.
    const agentDeltas: AgentDelta[] = [];
    for (const agent of this.agents) {
      const sig = this.computeAgentSignature(agent);
      if (this.lastBroadcastSig.get(agent.id) !== sig) {
        this.lastBroadcastSig.set(agent.id, sig);
        agentDeltas.push({
          id: agent.id,
          position: { ...agent.position },
          targetPosition: { ...agent.targetPosition },
          actionState: agent.actionState,
          gold: agent.gold,
          inventory: { ...agent.inventory },
          recentThought: agent.recentThought,
          backerAddress: agent.backerAddress,
          stakedMonAmount: agent.stakedMonAmount,
          onChainTxStatus: agent.onChainTxStatus,
          lastOnChainTxHash: agent.lastOnChainTxHash
        });
      }
    }

    // 9. Broadcast Delta Update via WebSocket
    if (agentDeltas.length > 0 || deskChanged) {
      const deltaSnapshot: DeltaSnapshot = {
        epoch: this.epoch,
        serverTime: now,
        marketPrices: this.economy.getMarketBook(),
        resourceNodeCapacities: this.resourceNodes.map((n) => ({
          id: n.id,
          currentCapacity: Math.round(n.currentCapacity)
        })),
        agentDeltas
      };
      if (deskChanged) {
        deltaSnapshot.marketDesk = this.getMarketDesk();
      }
      this.callbacks.onDeltaUpdate(deltaSnapshot);
    }
  }

  /** Resolve an agent runtime state by id (used by the desk/treaty engines). */
  private resolveAgent = (id: string): AgentRuntimeState | undefined =>
    this.agents.find((a) => a.id === id);

  private emitEvent(evt: { type: string; payload: any }) {
    if (this.callbacks.onWorldEvent) this.callbacks.onWorldEvent(evt);

    // Asynchronously dispatch on-chain transactions to Monad
    if (evt.type === 'ALLIANCE_EVENT') {
      const a = this.agents.find((x) => x.id === evt.payload.agentA);
      const b = this.agents.find((x) => x.id === evt.payload.agentB);
      if (a && b) {
        this.monadService.recordAlliance(a.slotId, b.slotId, this.epoch);
      }
    } else if (evt.type === 'BETRAYAL_EVENT') {
      const b = this.agents.find((x) => x.id === evt.payload.betrayerId);
      const v = this.agents.find((x) => x.id === evt.payload.victimId);
      if (b && v) {
        this.monadService.recordBetrayal(b.slotId, v.slotId, this.epoch, evt.payload.details || 'Betrayal');
      }
    } else if (evt.type === 'ECONOMIC_SHOCK') {
      const totalGold = BigInt(Math.round(this.agents.reduce((sum, a) => sum + a.gold, 0)));
      const hexEpoch = this.epoch.toString(16).padStart(4, '0');
      const hexTime = Date.now().toString(16).padStart(12, '0');
      const stateRoot = `0x${(hexEpoch + hexTime).padEnd(64, 'a')}` as `0x${string}`;
      this.monadService.recordSettlementProof(this.epoch, stateRoot, totalGold);
    }
  }

  /** Match the order book, seed liquidity, and surface resulting fills. */
  private runMarketDesk(): boolean {
    this.economy.recalculatePrices();
    const { fills, expired } = this.orderBook.tick(this.epoch, this.resolveAgent);
    const fillCount = this.handleFills(fills);
    const seeded = this.seedDeskLiquidity();
    return fillCount > 0 || expired.length > 0 || seeded > 0;
  }

  /**
   * Keep the trading desk lively and realistic:
   * 1. Posts resting limit orders every ~8-12s with an authentic bid/ask spread
   *    (bids at discount, asks at premium) so the order book has organic depth.
   * 2. Executes crossed matches at a calm, realistic pace (at most once every 20-25s),
   *    ensuring trades do not feel like high-frequency machine gun spam.
   */
  private seedDeskLiquidity(): number {
    const now = Date.now();
    // Throttle order posting to at least 8s intervals
    if (now - this.lastSeedOrderTime < 8000) return 0;

    const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
    const poolPrice = this.economy.getMarketBook().prices[resource] || 10;
    const canExecuteTrade = now - this.lastSeedTradeTime >= 20000;

    const sellers = this.agents.filter(
      (a) => (a.inventory[resource] || 0) >= 3 && !this.orderBook.hasOpenOrder(a.id, resource, 'SELL')
    );
    const buyers = this.agents.filter(
      (a) =>
        a.gold >= Math.max(10, poolPrice * 1.5) &&
        (a.inventory[resource] || 0) < 6 &&
        !this.orderBook.hasOpenOrder(a.id, resource, 'BUY')
    );

    let seeded = 0;

    if (canExecuteTrade) {
      // Periodic realistic trade execution (spaced out by >= 20 seconds)
      if (sellers.length > 0 && buyers.length > 0) {
        const seller = sellers[Math.floor(Math.random() * sellers.length)];
        const buyerPool = buyers.filter((b) => b.id !== seller.id);
        if (buyerPool.length > 0) {
          const buyer = buyerPool[Math.floor(Math.random() * buyerPool.length)];

          // Match at fair pool price
          const tradePrice = poolPrice;
          const tradeQty = 1;

          const sres = this.orderBook.postOrder(
            seller,
            'SELL',
            resource,
            tradeQty,
            tradePrice,
            this.epoch,
            this.resolveAgent
          );
          if (sres.success && sres.order) {
            this.emitEvent({ type: 'ORDER_EVENT', payload: { kind: 'POSTED', order: sres.order } });
            this.handleFills(sres.fills);
            seeded++;
          }

          const bres = this.orderBook.postOrder(
            buyer,
            'BUY',
            resource,
            tradeQty,
            tradePrice,
            this.epoch,
            this.resolveAgent
          );
          if (bres.success && bres.order) {
            this.emitEvent({ type: 'ORDER_EVENT', payload: { kind: 'POSTED', order: bres.order } });
            const fillsCount = this.handleFills(bres.fills);
            if (fillsCount > 0) {
              this.lastSeedTradeTime = now;
            }
            seeded++;
          }

          this.lastSeedOrderTime = now;
          return seeded;
        }
      }
    }

    // Otherwise, post a resting limit order to build order book depth with bid/ask spread
    const postSell = Math.random() < 0.5;
    if (postSell && sellers.length > 0) {
      const seller = sellers[Math.floor(Math.random() * sellers.length)];
      // Ask at a premium (+8%) so it rests on the book
      const askPrice = Math.max(2, Math.round(poolPrice * 1.08));
      const sellQty = 1;
      const sres = this.orderBook.postOrder(
        seller,
        'SELL',
        resource,
        sellQty,
        askPrice,
        this.epoch,
        this.resolveAgent
      );
      if (sres.success && sres.order) {
        this.emitEvent({ type: 'ORDER_EVENT', payload: { kind: 'POSTED', order: sres.order } });
        const fillsCount = this.handleFills(sres.fills);
        if (fillsCount > 0) {
          this.lastSeedTradeTime = now;
        }
        seeded++;
        this.lastSeedOrderTime = now;
      }
    } else if (!postSell && buyers.length > 0) {
      const buyer = buyers[Math.floor(Math.random() * buyers.length)];
      // Bid at a discount (-8%) so it rests on the book
      const bidPrice = Math.max(1, Math.round(poolPrice * 0.92));
      const buyQty = 1;
      const bres = this.orderBook.postOrder(
        buyer,
        'BUY',
        resource,
        buyQty,
        bidPrice,
        this.epoch,
        this.resolveAgent
      );
      if (bres.success && bres.order) {
        this.emitEvent({ type: 'ORDER_EVENT', payload: { kind: 'POSTED', order: bres.order } });
        const fillsCount = this.handleFills(bres.fills);
        if (fillsCount > 0) {
          this.lastSeedTradeTime = now;
        }
        seeded++;
        this.lastSeedOrderTime = now;
      }
    }

    return seeded;
  }

  /** Honor every active treaty for one economic cycle and surface the outcomes. */
  private runTreatyCycle() {
    const { executed, completed, broken } = this.treaties.executeCycle(this.epoch, this.resolveAgent);
    const mem = this.aiOrchestrator.getMemoryManager();

    for (const { treaty, fill } of executed) {
      mem.recordTrade(fill.buyerId, fill.sellerId, fill.resource, fill.amount, fill.pricePerUnit, this.epoch);
      this.persistFill(fill);
      this.emitEvent({
        type: 'TRADE_EVENT',
        payload: {
          sellerId: fill.sellerId,
          buyerId: fill.buyerId,
          resource: fill.resource,
          amount: fill.amount,
          price: fill.totalCost
        }
      });
      this.emitEvent({
        type: 'TREATY_EVENT',
        payload: {
          kind: 'EXECUTED',
          treaty,
          detail: `${treaty.supplierName} delivered ${treaty.amountPerCycle} ${treaty.resource} to ${treaty.buyerName} (cycle ${treaty.cyclesExecuted})`
        }
      });
    }
    for (const treaty of completed) {
      this.emitEvent({
        type: 'TREATY_EVENT',
        payload: { kind: 'COMPLETED', treaty, detail: `Treaty between ${treaty.supplierName} and ${treaty.buyerName} fulfilled in full` }
      });
    }
    for (const treaty of broken) {
      this.emitEvent({
        type: 'TREATY_EVENT',
        payload: { kind: 'BROKEN', treaty, detail: `Treaty between ${treaty.supplierName} and ${treaty.buyerName} collapsed` }
      });
    }

    this.persistence.saveTreatiesBatch(this.treaties.getTreaties());
  }

  private handleFills(fills: TradeFill[]): number {
    if (fills.length === 0) return 0;
    const mem = this.aiOrchestrator.getMemoryManager();
    for (const fill of fills) {
      mem.recordTrade(fill.buyerId, fill.sellerId, fill.resource, fill.amount, fill.pricePerUnit, this.epoch);
      this.persistFill(fill);
      this.emitEvent({
        type: 'TRADE_EVENT',
        payload: {
          sellerId: fill.sellerId,
          buyerId: fill.buyerId,
          resource: fill.resource,
          amount: fill.amount,
          price: fill.totalCost
        }
      });
    }
    return fills.length;
  }

  private persistFill(fill: TradeFill) {
    this.persistence.recordTrade({
      id: fill.fillId,
      sellerId: fill.sellerId,
      buyerId: fill.buyerId,
      resource: fill.resource,
      amount: fill.amount,
      pricePerUnit: fill.pricePerUnit,
      totalCost: fill.totalCost,
      timestamp: fill.timestamp
    });
  }

  /**
   * Continuous Civilization Subsistence Cycle (Every ~25s):
   * 1. Food Consumption:
   *    Each agent requires 1 WHEAT ration for nourishment.
   *    - Consumes 1 WHEAT from inventory if held.
   *    - If no wheat, buys a market ration for 3 Gold (organic demand + gold sink).
   *    - If no wheat and < 3 Gold, becomes FAMISHED (reduced movement speed and hunger distress).
   * 2. Guild Maintenance & Municipal Taxes:
   *    - Agents with wealth >= 100G pay 3G civic dues to the Agora Treasury.
   *    - Agents with wealth >= 50G pay 1G civic dues.
   * This maintains long-term economic equilibrium, prevents runaway gold hoarding,
   * and ensures farming and grain trades are permanently essential to civilization survival.
   */
  private runSubsistenceUpkeep() {
    let famishedCount = 0;

    for (const agent of this.agents) {
      // 1. Food Subsistence
      if ((agent.inventory.WHEAT || 0) >= 1) {
        agent.inventory.WHEAT -= 1;
      } else if (agent.gold >= 3) {
        agent.gold -= 3;
        this.economy.recordDemand('WHEAT', 1);
        this.economy.depositToTreasury(1);
      } else {
        famishedCount++;
        agent.recentThought = 'Famished without bread or gold. Must find wheat to restore energy!';
      }

      // 2. Anti-Inflation Civic Dues on Wealth Hoards
      if (agent.gold >= 100) {
        agent.gold -= 3;
        this.economy.depositToTreasury(3);
      } else if (agent.gold >= 50) {
        agent.gold -= 1;
        this.economy.depositToTreasury(1);
      }
    }

    if (famishedCount >= 6) {
      this.emitEvent({
        type: 'ECONOMIC_SHOCK',
        payload: {
          shockName: 'Grain Shortage Crisis',
          resource: 'WHEAT',
          description: `${famishedCount} citizens are famished without wheat rations. Food demand surging!`
        }
      });
    }
  }

  /**
   * Continuous Participant Dividend Settlement (~every 90 seconds):
   * Calculates dividends earned by backed audience agents from active market trade,
   * resource extraction, and wealth accumulation, crediting claimable testnet MON
   * and enqueuing on-chain transaction records to CivilizationEconomy.
   */
  private runBackerDividendCycle() {
    const audienceAgents = this.agents.filter(
      (a) => a.category === 'AUDIENCE' && a.backerAddress && (a.stakedMonAmount || 0) > 0
    );

    for (const agent of audienceAgents) {
      const goldFactor = Math.max(1, agent.gold);
      const inventoryUnits = Object.values(agent.inventory).reduce((sum, v) => sum + (v || 0), 0);
      const activityScore = (goldFactor / 200) + (inventoryUnits * 0.05);
      const dividendMon = Number(Math.max(0.01, Math.min(0.25, activityScore * 0.05)).toFixed(4));

      agent.claimableDividendMon = Number(((agent.claimableDividendMon || 0) + dividendMon).toFixed(4));
      agent.lifetimeDividendMon = Number(((agent.lifetimeDividendMon || 0) + dividendMon).toFixed(4));
      agent.recentThought = `Earned +${dividendMon} MON dividends for backer! Total: ${agent.claimableDividendMon} MON.`;

      this.emitEvent({
        type: 'BACKER_DIVIDEND_DECLARED',
        payload: {
          slotId: agent.slotId,
          agentName: agent.name,
          backerAddress: agent.backerAddress,
          dividendMon,
          totalClaimableMon: agent.claimableDividendMon
        }
      });

      // Submit on-chain payout credit to CivilizationEconomy asynchronously
      if (agent.backerAddress && agent.backerAddress.startsWith('0x')) {
        const rewardWei = BigInt(Math.round(dividendMon * 1e18));
        this.monadService.recordBackerPayout(agent.backerAddress as `0x${string}`, agent.slotId, rewardWei);
      }
    }
  }

  private computeAgentSignature(a: AgentRuntimeState): string {
    return [
      a.position.x,
      a.position.z,
      a.targetPosition.x,
      a.targetPosition.z,
      a.actionState,
      a.gold,
      a.inventory.WOOD,
      a.inventory.WHEAT,
      a.inventory.IRON,
      a.inventory.GOLD,
      a.recentThought,
      a.backerAddress || '',
      a.stakedMonAmount || 0,
      a.onChainTxStatus || 'NONE',
      a.lastOnChainTxHash || ''
    ].join('|');
  }
}
