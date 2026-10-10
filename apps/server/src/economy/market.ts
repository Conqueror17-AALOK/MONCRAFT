import { MarketPriceBook, ResourceType, AgentRuntimeState, PriceHistoryPoint } from '@civilization/shared';

export interface MarketTransactionRecord {
  id: string;
  sellerId: string;
  buyerId: string;
  resource: ResourceType;
  amount: number;
  pricePerUnit: number;
  totalCost: number;
  timestamp: number;
}

export class EconomyEngine {
  private stockpiles: Record<ResourceType, number> = {
    WOOD: 75,
    WHEAT: 100,
    IRON: 40,
    GOLD: 15
  };

  private baseStockpiles: Record<ResourceType, number> = {
    WOOD: 75,
    WHEAT: 100,
    IRON: 40,
    GOLD: 15
  };

  private basePrices: Record<ResourceType, number> = {
    WOOD: 6,
    WHEAT: 3,
    IRON: 16,
    GOLD: 45
  };

  private currentPrices: Record<ResourceType, number> = {
    WOOD: 6,
    WHEAT: 3,
    IRON: 16,
    GOLD: 45
  };

  /** Municipal treasury reserve accumulated from Agora transaction tariffs */
  private agoraTreasury: number = 250;

  private priceTrends: Record<ResourceType, 'UP' | 'DOWN' | 'STABLE'> = {
    WOOD: 'STABLE',
    WHEAT: 'STABLE',
    IRON: 'STABLE',
    GOLD: 'STABLE'
  };

  /** Rolling price history buffer for economic visualizations */
  private priceHistory: Record<ResourceType, PriceHistoryPoint[]> = {
    WOOD: [],
    WHEAT: [],
    IRON: [],
    GOLD: []
  };

  private recentTransactions: MarketTransactionRecord[] = [];

  // Rolling net demand accumulator per resource (buys add, sells subtract).
  // Decays exponentially over wall-clock time so recent activity dominates.
  private demandIndex: Record<ResourceType, number> = {
    WOOD: 0,
    WHEAT: 0,
    IRON: 0,
    GOLD: 0
  };

  private lastDemandDecay = Date.now();

  constructor() {
    this.seedInitialPriceHistory();
    this.recalculatePrices();
  }

  /** Seed realistic historical points so graphs render immediately with rich trends */
  private seedInitialPriceHistory() {
    const resources: ResourceType[] = ['WOOD', 'WHEAT', 'IRON', 'GOLD'];
    const now = Date.now();
    for (const res of resources) {
      const base = this.basePrices[res];
      const stock = this.baseStockpiles[res];
      const points: PriceHistoryPoint[] = [];
      for (let i = 24; i >= 0; i--) {
        const time = now - i * 15000; // 15 seconds apart over ~6 minutes
        const variance = Math.sin(i * 0.45 + (res.charCodeAt(0) % 5)) * 0.18 + (Math.cos(i * 0.2) * 0.08);
        const price = Math.max(Math.round(base * 0.5), Math.round(base * (1 + variance)));
        const simStock = Math.max(10, Math.round(stock * (1 - variance * 0.8)));
        points.push({
          timestamp: time,
          price,
          stockpile: simStock,
          demandPressure: Number((variance * 2).toFixed(2))
        });
      }
      this.priceHistory[res] = points;
    }
  }

  /**
   * Normalized supply/demand pressure in [-1, +1] per resource.
   * Positive means buy-heavy (upward price force), negative sell-heavy.
   */
  public getDemandPressure(): Record<ResourceType, number> {
    const resources: ResourceType[] = ['WOOD', 'WHEAT', 'IRON', 'GOLD'];
    const pressure = {} as Record<ResourceType, number>;
    for (const res of resources) {
      const scale = Math.max(50, this.baseStockpiles[res] * 0.4);
      pressure[res] = Number(Math.max(-1, Math.min(1, this.demandIndex[res] / scale)).toFixed(3));
    }
    return pressure;
  }

  /**
   * Record net demand pressure for a resource. Market buys push prices up,
   * sells push them down; agent-to-agent desk fills nudge with lighter weight.
   */
  public recordDemand(resource: ResourceType, netUnits: number) {
    this.demandIndex[resource] += netUnits;
  }

  public depositToTreasury(amount: number) {
    if (amount > 0) {
      this.agoraTreasury += Math.round(amount);
    }
  }

  public getTreasury(): number {
    return this.agoraTreasury;
  }

  public getPriceHistory(resource?: ResourceType) {
    if (resource && this.priceHistory[resource]) {
      return { resource, history: this.priceHistory[resource] };
    }
    return this.priceHistory;
  }

  public getMarketBook(): MarketPriceBook {
    return {
      timestamp: Date.now(),
      prices: { ...this.currentPrices },
      stockpiles: { ...this.stockpiles },
      priceTrends: { ...this.priceTrends },
      demandPressure: this.getDemandPressure(),
      agoraTreasury: this.agoraTreasury,
      priceHistory: {
        WOOD: [...this.priceHistory.WOOD],
        WHEAT: [...this.priceHistory.WHEAT],
        IRON: [...this.priceHistory.IRON],
        GOLD: [...this.priceHistory.GOLD]
      }
    };
  }

  public recalculatePrices() {
    const resources: ResourceType[] = ['WOOD', 'WHEAT', 'IRON', 'GOLD'];

    // Time-based exponential decay of demand pressure (~25s characteristic time)
    const now = Date.now();
    const elapsedSec = Math.min(10, (now - this.lastDemandDecay) / 1000);
    this.lastDemandDecay = now;
    const decay = Math.exp(-elapsedSec / 25);

    for (const res of resources) {
      this.demandIndex[res] *= decay;

      const baseStock = this.baseStockpiles[res];
      const currentStock = Math.max(8, this.stockpiles[res]);
      const basePrice = this.basePrices[res];

      // Scarcity multiplier: lower stock = higher price; higher stock = lower price
      const ratio = baseStock / currentStock;
      const scarcityTerm = Math.pow(ratio, 0.75);

      // Demand multiplier: buy-heavy pressure firms prices up to +35%, sell-heavy softens them
      const pressure = Math.max(-1, Math.min(1, this.demandIndex[res] / Math.max(25, baseStock * 0.4)));
      const demandTerm = 1 + pressure * 0.35;

      const rawPrice = basePrice * scarcityTerm * demandTerm;

      // Clamp price within 0.25x to 4x base price
      const clampedPrice = Math.max(Math.round(basePrice * 0.25), Math.min(Math.round(basePrice * 4.0), Math.round(rawPrice)));

      if (clampedPrice > this.currentPrices[res]) {
        this.priceTrends[res] = 'UP';
      } else if (clampedPrice < this.currentPrices[res]) {
        this.priceTrends[res] = 'DOWN';
      } else {
        this.priceTrends[res] = 'STABLE';
      }

      this.currentPrices[res] = clampedPrice;

      // Append to rolling price history buffer (capped at 50 points)
      const historyList = this.priceHistory[res];
      const lastPoint = historyList[historyList.length - 1];
      if (!lastPoint || now - lastPoint.timestamp >= 5000 || lastPoint.price !== clampedPrice) {
        historyList.push({
          timestamp: now,
          price: clampedPrice,
          stockpile: this.stockpiles[res],
          demandPressure: Number(pressure.toFixed(2))
        });
        if (historyList.length > 50) {
          historyList.shift();
        }
      }
    }
  }

  public sellToMarket(
    agent: AgentRuntimeState,
    resource: ResourceType,
    amount: number
  ): { success: boolean; goldEarned: number; unitPrice: number; fee: number; reason?: string } {
    if (amount <= 0) return { success: false, goldEarned: 0, unitPrice: 0, fee: 0, reason: 'Invalid amount' };

    const available = agent.inventory[resource] || 0;
    const actualAmount = Math.min(available, amount);

    if (actualAmount <= 0) {
      return { success: false, goldEarned: 0, unitPrice: 0, fee: 0, reason: 'Insufficient inventory' };
    }

    const unitPrice = this.currentPrices[resource];
    const grossValue = actualAmount * unitPrice;
    // 6% Agora municipal market tariff / broker fee (removes gold from active circulation)
    const fee = Math.max(1, Math.round(grossValue * 0.06));
    const goldEarned = Math.max(1, grossValue - fee);
    this.agoraTreasury += fee;

    agent.inventory[resource] -= actualAmount;
    agent.gold += goldEarned;
    this.stockpiles[resource] += actualAmount;
    this.demandIndex[resource] -= actualAmount; // selling adds supply -> downward pressure

    this.recalculatePrices();

    const record: MarketTransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sellerId: agent.id,
      buyerId: 'MARKETPLACE',
      resource,
      amount: actualAmount,
      pricePerUnit: unitPrice,
      totalCost: goldEarned,
      timestamp: Date.now()
    };
    this.recentTransactions.unshift(record);
    if (this.recentTransactions.length > 50) this.recentTransactions.pop();

    return { success: true, goldEarned, unitPrice, fee };
  }

  public buyFromMarket(
    agent: AgentRuntimeState,
    resource: ResourceType,
    amount: number
  ): { success: boolean; goldSpent: number; unitPrice: number; reason?: string } {
    if (amount <= 0) return { success: false, goldSpent: 0, unitPrice: 0, reason: 'Invalid amount' };

    const unitPrice = this.currentPrices[resource];
    const maxAffordable = Math.floor(agent.gold / unitPrice);
    const availableInMarket = this.stockpiles[resource];
    const actualAmount = Math.min(amount, maxAffordable, availableInMarket);

    if (actualAmount <= 0) {
      return { success: false, goldSpent: 0, unitPrice: 0, reason: 'Insufficient gold or market stockpile' };
    }

    const goldSpent = actualAmount * unitPrice;
    agent.gold -= goldSpent;
    agent.inventory[resource] = (agent.inventory[resource] || 0) + actualAmount;
    this.stockpiles[resource] -= actualAmount;
    this.demandIndex[resource] += actualAmount; // buying adds demand -> upward pressure

    this.recalculatePrices();

    const record: MarketTransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sellerId: 'MARKETPLACE',
      buyerId: agent.id,
      resource,
      amount: actualAmount,
      pricePerUnit: unitPrice,
      totalCost: goldSpent,
      timestamp: Date.now()
    };
    this.recentTransactions.unshift(record);
    if (this.recentTransactions.length > 50) this.recentTransactions.pop();

    return { success: true, goldSpent, unitPrice };
  }

  public executeDirectTrade(
    seller: AgentRuntimeState,
    buyer: AgentRuntimeState,
    resource: ResourceType,
    amount: number,
    pricePerUnit: number
  ): { success: boolean; totalCost: number; reason?: string } {
    const totalCost = amount * pricePerUnit;

    if ((seller.inventory[resource] || 0) < amount) {
      return { success: false, totalCost: 0, reason: 'Seller lacks sufficient resources' };
    }
    if (buyer.gold < totalCost) {
      return { success: false, totalCost: 0, reason: 'Buyer lacks sufficient gold' };
    }

    seller.inventory[resource] -= amount;
    buyer.inventory[resource] = (buyer.inventory[resource] || 0) + amount;

    buyer.gold -= totalCost;
    seller.gold += totalCost;

    const record: MarketTransactionRecord = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sellerId: seller.id,
      buyerId: buyer.id,
      resource,
      amount,
      pricePerUnit,
      totalCost,
      timestamp: Date.now()
    };
    this.recentTransactions.unshift(record);
    if (this.recentTransactions.length > 50) this.recentTransactions.pop();

    return { success: true, totalCost };
  }

  public triggerRandomShock(): { shockName: string; affectedResource: ResourceType; description: string } {
    const shocks = [
      {
        shockName: 'Drought & Crop Blight',
        affectedResource: 'WHEAT' as ResourceType,
        description: 'Severe weather depleted grain reserves. Wheat prices spiked!',
        stockDelta: -35
      },
      {
        shockName: 'Mountain Iron Vein Strike',
        affectedResource: 'IRON' as ResourceType,
        description: 'New iron veins opened up, flooding supply.',
        stockDelta: 20
      },
      {
        shockName: 'Deep Forest Blaze',
        affectedResource: 'WOOD' as ResourceType,
        description: 'Timber mills temporarily offline. Lumber scarcity surging.',
        stockDelta: -25
      },
      {
        shockName: 'Sunken Ruins Gold Cache Discovered',
        affectedResource: 'GOLD' as ResourceType,
        description: 'Adventurers uncovered ancient gold caches in the wilderness.',
        stockDelta: 8
      }
    ];

    const shock = shocks[Math.floor(Math.random() * shocks.length)];
    this.stockpiles[shock.affectedResource] = Math.max(8, this.stockpiles[shock.affectedResource] + shock.stockDelta);
    this.recalculatePrices();

    return {
      shockName: shock.shockName,
      affectedResource: shock.affectedResource,
      description: shock.description
    };
  }

  public getRecentTransactions(): MarketTransactionRecord[] {
    return this.recentTransactions;
  }
}
