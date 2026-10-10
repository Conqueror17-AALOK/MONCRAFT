import {
  AgentRuntimeState,
  ResourceType,
  OrderSide,
  TradeOrder,
  TradeFill
} from '@civilization/shared';

export type AgentResolver = (agentId: string) => AgentRuntimeState | undefined;

export interface PostOrderResult {
  success: boolean;
  order?: TradeOrder;
  fills: TradeFill[];
  reason?: string;
}

const RESOURCES: ResourceType[] = ['WOOD', 'WHEAT', 'IRON', 'GOLD'];
const MAX_RECENT_FILLS = 40;
const DEFAULT_TTL_EPOCHS = 4;

/**
 * Authoritative agent-to-agent limit order book ("market desk").
 *
 * Sell orders escrow resource units at post time; buy orders escrow gold.
 * Crossing orders are matched with price-time priority and executed at the
 * resting maker's price, giving price improvement to the aggressor. All gold
 * and inventory mutations happen here so the matching engine is the single
 * authority over desk settlement.
 */
export class OrderBookEngine {
  private orders: TradeOrder[] = [];
  private recentFills: TradeFill[] = [];
  private seq = 0;

  public getOpenOrders(): TradeOrder[] {
    return this.orders
      .filter((o) => o.status === 'OPEN' || o.status === 'PARTIAL')
      .map((o) => ({ ...o }));
  }

  public getRecentFills(): TradeFill[] {
    return this.recentFills.map((f) => ({ ...f }));
  }

  public hasOpenOrder(agentId: string, resource: ResourceType, side: OrderSide): boolean {
    return this.orders.some(
      (o) =>
        o.agentId === agentId &&
        o.resource === resource &&
        o.side === side &&
        (o.status === 'OPEN' || o.status === 'PARTIAL')
    );
  }

  /**
   * Post a limit order. Reserves the required resource (SELL) or gold (BUY)
   * from the agent immediately, then attempts to cross against the book.
   */
  public postOrder(
    agent: AgentRuntimeState,
    side: OrderSide,
    resource: ResourceType,
    amount: number,
    pricePerUnit: number,
    epoch: number,
    resolveAgent: AgentResolver,
    ttlEpochs = DEFAULT_TTL_EPOCHS
  ): PostOrderResult {
    const price = Math.max(1, Math.round(pricePerUnit));
    let qty = Math.floor(amount);

    if (qty <= 0) {
      return { success: false, fills: [], reason: 'Invalid order amount' };
    }

    if (side === 'SELL') {
      const available = agent.inventory[resource] || 0;
      qty = Math.min(qty, available);
      if (qty <= 0) {
        return { success: false, fills: [], reason: 'Insufficient inventory to post sell order' };
      }
      agent.inventory[resource] -= qty; // escrow resource units
    } else {
      const maxAffordable = Math.floor(agent.gold / price);
      qty = Math.min(qty, maxAffordable);
      if (qty <= 0) {
        return { success: false, fills: [], reason: 'Insufficient gold to post buy order' };
      }
      agent.gold -= qty * price; // escrow gold at limit price
    }

    const order: TradeOrder = {
      orderId: `ord_${Date.now().toString(36)}_${(this.seq++).toString(36)}`,
      side,
      agentId: agent.id,
      agentName: agent.name,
      resource,
      amount: qty,
      filledAmount: 0,
      pricePerUnit: price,
      status: 'OPEN',
      createdEpoch: epoch,
      createdAt: Date.now(),
      expiresAtEpoch: epoch + ttlEpochs
    };

    this.orders.push(order);
    const fills = this.matchResource(resource, epoch, resolveAgent);

    return { success: true, order: { ...order }, fills };
  }

  /**
   * Per-cycle maintenance: expire stale orders (refunding escrow) and cross all
   * resource books. Returns the fills and expirations produced this tick.
   */
  public tick(epoch: number, resolveAgent: AgentResolver): { fills: TradeFill[]; expired: TradeOrder[] } {
    const expired: TradeOrder[] = [];

    for (const order of this.orders) {
      if ((order.status === 'OPEN' || order.status === 'PARTIAL') && epoch > order.expiresAtEpoch) {
        this.refundRemaining(order, resolveAgent);
        order.status = 'EXPIRED';
        expired.push({ ...order });
      }
    }

    let fills: TradeFill[] = [];
    for (const resource of RESOURCES) {
      fills = fills.concat(this.matchResource(resource, epoch, resolveAgent));
    }

    this.pruneClosed();
    return { fills, expired };
  }

  public cancelAgentOrders(agentId: string, resolveAgent: AgentResolver): TradeOrder[] {
    const cancelled: TradeOrder[] = [];
    for (const order of this.orders) {
      if (order.agentId === agentId && (order.status === 'OPEN' || order.status === 'PARTIAL')) {
        this.refundRemaining(order, resolveAgent);
        order.status = 'CANCELLED';
        cancelled.push({ ...order });
      }
    }
    this.pruneClosed();
    return cancelled;
  }

  private matchResource(resource: ResourceType, epoch: number, resolveAgent: AgentResolver): TradeFill[] {
    const fills: TradeFill[] = [];

    // Highest-priced buyers first, then oldest; lowest-priced sellers first, then oldest.
    const buys = this.orders
      .filter((o) => o.resource === resource && o.side === 'BUY' && this.isActive(o))
      .sort((a, b) => b.pricePerUnit - a.pricePerUnit || a.createdAt - b.createdAt);
    const sells = this.orders
      .filter((o) => o.resource === resource && o.side === 'SELL' && this.isActive(o))
      .sort((a, b) => a.pricePerUnit - b.pricePerUnit || a.createdAt - b.createdAt);

    for (const buy of buys) {
      if (!this.isActive(buy)) continue;

      for (const sell of sells) {
        if (!this.isActive(buy)) break;
        if (!this.isActive(sell)) continue;
        if (sell.agentId === buy.agentId) continue; // no self-dealing
        if (sell.pricePerUnit > buy.pricePerUnit) break; // sorted: no further crosses for this buy

        const buyer = resolveAgent(buy.agentId);
        const seller = resolveAgent(sell.agentId);
        if (!buyer) {
          this.refundRemaining(buy, resolveAgent);
          buy.status = 'CANCELLED';
          break;
        }
        if (!seller) {
          this.refundRemaining(sell, resolveAgent);
          sell.status = 'CANCELLED';
          continue;
        }

        const qty = Math.min(buy.amount - buy.filledAmount, sell.amount - sell.filledAmount);
        if (qty <= 0) continue;

        // Execute at the resting maker's price (the order that was on the book first).
        const execPrice = buy.createdAt <= sell.createdAt ? buy.pricePerUnit : sell.pricePerUnit;

        // Settle: seller's escrowed units go to buyer; seller is paid at exec price.
        buyer.inventory[resource] = (buyer.inventory[resource] || 0) + qty;
        seller.gold += qty * execPrice;
        // Buyer escrowed at their limit price; refund the price improvement.
        const refund = (buy.pricePerUnit - execPrice) * qty;
        if (refund > 0) buyer.gold += refund;

        buy.filledAmount += qty;
        sell.filledAmount += qty;
        buy.status = buy.filledAmount >= buy.amount ? 'FILLED' : 'PARTIAL';
        sell.status = sell.filledAmount >= sell.amount ? 'FILLED' : 'PARTIAL';

        const fill: TradeFill = {
          fillId: `fill_${Date.now().toString(36)}_${(this.seq++).toString(36)}`,
          resource,
          buyerId: buyer.id,
          sellerId: seller.id,
          amount: qty,
          pricePerUnit: execPrice,
          totalCost: qty * execPrice,
          epoch,
          timestamp: Date.now()
        };
        fills.push(fill);
        this.pushFill(fill);
      }
    }

    return fills;
  }

  private isActive(order: TradeOrder): boolean {
    return (order.status === 'OPEN' || order.status === 'PARTIAL') && order.filledAmount < order.amount;
  }

  private refundRemaining(order: TradeOrder, resolveAgent: AgentResolver) {
    const remaining = order.amount - order.filledAmount;
    if (remaining <= 0) return;
    const agent = resolveAgent(order.agentId);
    if (!agent) return;
    if (order.side === 'SELL') {
      agent.inventory[order.resource] = (agent.inventory[order.resource] || 0) + remaining;
    } else {
      agent.gold += remaining * order.pricePerUnit;
    }
  }

  private pushFill(fill: TradeFill) {
    this.recentFills.unshift(fill);
    if (this.recentFills.length > MAX_RECENT_FILLS) this.recentFills.pop();
  }

  private pruneClosed() {
    this.orders = this.orders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIAL');
  }
}
