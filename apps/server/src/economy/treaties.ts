import {
  AgentRuntimeState,
  ResourceType,
  TradingTreaty,
  TradeFill
} from '@civilization/shared';
import { AgentResolver } from './orderBook.js';

export interface TreatyExecution {
  treaty: TradingTreaty;
  fill: TradeFill;
}

export interface TreatyCycleResult {
  executed: TreatyExecution[];
  completed: TradingTreaty[];
  broken: TradingTreaty[];
}

const MAX_MISSED_CYCLES = 2;
const MAX_ENDED_RETAINED = 8;

/**
 * Manages standing bilateral trading treaties. Each active treaty transfers a
 * fixed quantity of a resource from supplier to buyer at a locked price, once
 * per economic cycle, until its cycle count is exhausted. Repeated failure to
 * honor the terms (missing goods or gold) breaks the treaty.
 */
export class TreatyEngine {
  private treaties: TradingTreaty[] = [];
  private seq = 0;

  public getTreaties(): TradingTreaty[] {
    return this.treaties.map((t) => ({ ...t }));
  }

  public getActiveTreaties(): TradingTreaty[] {
    return this.treaties.filter((t) => t.status === 'ACTIVE').map((t) => ({ ...t }));
  }

  public hasActiveTreaty(supplierId: string, buyerId: string, resource: ResourceType): boolean {
    return this.treaties.some(
      (t) =>
        t.status === 'ACTIVE' &&
        t.resource === resource &&
        t.supplierId === supplierId &&
        t.buyerId === buyerId
    );
  }

  public formTreaty(
    supplier: AgentRuntimeState,
    buyer: AgentRuntimeState,
    resource: ResourceType,
    amountPerCycle: number,
    pricePerUnit: number,
    cycles: number,
    epoch: number
  ): { success: boolean; treaty?: TradingTreaty; reason?: string } {
    if (supplier.id === buyer.id) {
      return { success: false, reason: 'Supplier and buyer must differ' };
    }
    const amount = Math.floor(amountPerCycle);
    const price = Math.max(1, Math.round(pricePerUnit));
    const totalCycles = Math.max(1, Math.min(10, Math.floor(cycles)));
    if (amount <= 0) {
      return { success: false, reason: 'Invalid treaty amount' };
    }
    if (this.hasActiveTreaty(supplier.id, buyer.id, resource)) {
      return { success: false, reason: 'Active treaty already exists for this pair and resource' };
    }

    const treaty: TradingTreaty = {
      treatyId: `treaty_${Date.now().toString(36)}_${(this.seq++).toString(36)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      buyerId: buyer.id,
      buyerName: buyer.name,
      resource,
      amountPerCycle: amount,
      pricePerUnit: price,
      cyclesRemaining: totalCycles,
      cyclesExecuted: 0,
      missedCycles: 0,
      status: 'ACTIVE',
      createdEpoch: epoch
    };

    this.treaties.push(treaty);
    this.pruneEnded();
    return { success: true, treaty: { ...treaty } };
  }

  /**
   * Honor every active treaty for one economic cycle.
   */
  public executeCycle(epoch: number, resolveAgent: AgentResolver): TreatyCycleResult {
    const executed: TreatyExecution[] = [];
    const completed: TradingTreaty[] = [];
    const broken: TradingTreaty[] = [];

    for (const treaty of this.treaties) {
      if (treaty.status !== 'ACTIVE') continue;

      const supplier = resolveAgent(treaty.supplierId);
      const buyer = resolveAgent(treaty.buyerId);
      if (!supplier || !buyer) {
        treaty.status = 'BROKEN';
        broken.push({ ...treaty });
        continue;
      }

      const cost = treaty.amountPerCycle * treaty.pricePerUnit;
      const supplierHasGoods = (supplier.inventory[treaty.resource] || 0) >= treaty.amountPerCycle;
      const buyerHasGold = buyer.gold >= cost;

      if (!supplierHasGoods || !buyerHasGold) {
        treaty.missedCycles += 1;
        if (treaty.missedCycles >= MAX_MISSED_CYCLES) {
          treaty.status = 'BROKEN';
          broken.push({ ...treaty });
        }
        continue;
      }

      // Settle the cycle
      supplier.inventory[treaty.resource] -= treaty.amountPerCycle;
      buyer.inventory[treaty.resource] = (buyer.inventory[treaty.resource] || 0) + treaty.amountPerCycle;
      buyer.gold -= cost;
      supplier.gold += cost;

      treaty.cyclesExecuted += 1;
      treaty.cyclesRemaining -= 1;
      treaty.missedCycles = 0;
      treaty.lastExecutedEpoch = epoch;

      const fill: TradeFill = {
        fillId: `tfill_${Date.now().toString(36)}_${(this.seq++).toString(36)}`,
        resource: treaty.resource,
        buyerId: buyer.id,
        sellerId: supplier.id,
        amount: treaty.amountPerCycle,
        pricePerUnit: treaty.pricePerUnit,
        totalCost: cost,
        epoch,
        timestamp: Date.now(),
        viaTreatyId: treaty.treatyId
      };

      if (treaty.cyclesRemaining <= 0) {
        treaty.status = 'COMPLETED';
        completed.push({ ...treaty });
      }

      executed.push({ treaty: { ...treaty }, fill });
    }

    this.pruneEnded();
    return { executed, completed, broken };
  }

  /**
   * Break any active treaties involving an agent (e.g. after a betrayal).
   */
  public breakTreatiesInvolving(agentId: string): TradingTreaty[] {
    const broken: TradingTreaty[] = [];
    for (const treaty of this.treaties) {
      if (treaty.status === 'ACTIVE' && (treaty.supplierId === agentId || treaty.buyerId === agentId)) {
        treaty.status = 'BROKEN';
        broken.push({ ...treaty });
      }
    }
    this.pruneEnded();
    return broken;
  }

  /**
   * Break active treaties specifically between two agents (either direction).
   */
  public breakTreatiesBetween(agentA: string, agentB: string): TradingTreaty[] {
    const broken: TradingTreaty[] = [];
    for (const treaty of this.treaties) {
      const pairMatch =
        (treaty.supplierId === agentA && treaty.buyerId === agentB) ||
        (treaty.supplierId === agentB && treaty.buyerId === agentA);
      if (treaty.status === 'ACTIVE' && pairMatch) {
        treaty.status = 'BROKEN';
        broken.push({ ...treaty });
      }
    }
    this.pruneEnded();
    return broken;
  }

  private pruneEnded() {
    const active = this.treaties.filter((t) => t.status === 'ACTIVE');
    const ended = this.treaties.filter((t) => t.status !== 'ACTIVE').slice(-MAX_ENDED_RETAINED);
    this.treaties = [...active, ...ended];
  }
}
