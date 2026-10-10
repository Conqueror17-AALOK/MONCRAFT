import { z } from 'zod';

export const ResourceTypeSchema = z.enum(['WOOD', 'WHEAT', 'IRON', 'GOLD']);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export const InventorySchema = z.object({
  WOOD: z.number().int().nonnegative().default(0),
  WHEAT: z.number().int().nonnegative().default(0),
  IRON: z.number().int().nonnegative().default(0),
  GOLD: z.number().int().nonnegative().default(0),
});
export type Inventory = z.infer<typeof InventorySchema>;

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  stockpile: number;
  demandPressure: number;
}

export interface MarketPriceBook {
  timestamp: number;
  prices: Record<ResourceType, number>;
  stockpiles: Record<ResourceType, number>;
  priceTrends: Record<ResourceType, 'UP' | 'DOWN' | 'STABLE'>;
  /**
   * Rolling supply/demand pressure per resource, normalized to [-1, +1].
   * Negative = sell-heavy (prices soften), positive = buy-heavy (prices firm up).
   */
  demandPressure?: Record<ResourceType, number>;
  /** Total civic commission reserves gathered by the Agora marketplace */
  agoraTreasury?: number;
  /** Historical price tracking data for economic trend charting */
  priceHistory?: Record<ResourceType, PriceHistoryPoint[]>;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'EXPIRED';

/**
 * A resting limit order on the agent-to-agent trading desk. Sell orders escrow
 * resource units at post time; buy orders escrow gold. The matching engine
 * crosses compatible orders with price-time priority.
 */
export interface TradeOrder {
  orderId: string;
  side: OrderSide;
  agentId: string;
  agentName: string;
  resource: ResourceType;
  amount: number; // total units requested
  filledAmount: number; // units filled so far
  pricePerUnit: number; // limit price in gold
  status: OrderStatus;
  createdEpoch: number;
  createdAt: number;
  expiresAtEpoch: number;
}

/**
 * An executed bilateral trade produced by the order book or a treaty cycle.
 */
export interface TradeFill {
  fillId: string;
  resource: ResourceType;
  buyerId: string;
  sellerId: string;
  amount: number;
  pricePerUnit: number;
  totalCost: number;
  epoch: number;
  timestamp: number;
  viaTreatyId?: string;
}

export type TreatyStatus = 'ACTIVE' | 'COMPLETED' | 'BROKEN';

/**
 * A standing bilateral trading treaty: the supplier commits a fixed quantity of
 * a resource per economic cycle, the buyer pays a locked price in gold. Treaties
 * are honored automatically each cycle and strengthen trust while active.
 */
export interface TradingTreaty {
  treatyId: string;
  supplierId: string;
  supplierName: string;
  buyerId: string;
  buyerName: string;
  resource: ResourceType;
  amountPerCycle: number;
  pricePerUnit: number;
  cyclesRemaining: number;
  cyclesExecuted: number;
  missedCycles: number;
  status: TreatyStatus;
  createdEpoch: number;
  lastExecutedEpoch?: number;
}

/**
 * Live snapshot of the marketplace trading desk broadcast to spectators.
 */
export interface MarketDeskSnapshot {
  openOrders: TradeOrder[];
  recentFills: TradeFill[];
  treaties: TradingTreaty[];
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  name: string;
  position: { x: number; y: number; z: number };
  maxCapacity: number;
  currentCapacity: number;
  regenRatePerSec: number;
}
