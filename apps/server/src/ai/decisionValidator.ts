import {
  AIDecisionOutput,
  AgentRuntimeState,
  ResourceNode,
  ResourceType,
  OrderSide
} from '@civilization/shared';
import { SPATIAL_ZONES, getRandomPositionInZone } from '../world/zones.js';
import { AgentMemoryManager } from './memoryManager.js';
import { EconomyEngine } from '../economy/market.js';
import { OrderBookEngine } from '../economy/orderBook.js';
import { TreatyEngine } from '../economy/treaties.js';

export interface WorldEvent {
  type: string;
  payload: any;
}

export interface ValidatedGameAction {
  isValid: boolean;
  actionType: string;
  targetPosition?: { x: number; y: number; z: number };
  reason: string;
  eventToEmit?: WorldEvent;
  eventsToEmit?: WorldEvent[];
}

const TRADABLE: ResourceType[] = ['WOOD', 'WHEAT', 'IRON', 'GOLD'];

export class DecisionValidator {
  public static validateAndApply(
    decision: AIDecisionOutput,
    agent: AgentRuntimeState,
    allAgents: AgentRuntimeState[],
    resourceNodes: ResourceNode[],
    economy: EconomyEngine,
    orderBook: OrderBookEngine,
    treaties: TreatyEngine,
    memoryManager: AgentMemoryManager,
    epoch: number
  ): ValidatedGameAction {
    const resolve = (id?: string) => (id ? allAgents.find((a) => a.id === id) : undefined);

    switch (decision.action) {
      case 'GATHER': {
        const resource = decision.resource || 'WOOD';
        const nodes = resourceNodes.filter((n) => n.type === resource && n.currentCapacity > 2);
        const targetNode = nodes.length > 0 ? nodes[0] : resourceNodes[0];

        agent.targetPosition = { ...targetNode.position };
        agent.actionState = 'WALKING';
        agent.recentThought = decision.reasoningSummary;

        return {
          isValid: true,
          actionType: 'GATHER',
          targetPosition: agent.targetPosition,
          reason: `Moving to ${targetNode.name} to gather ${resource}`
        };
      }

      case 'TRADE': {
        const resource = decision.resource || this.richestResource(agent);
        const marketPrice = economy.getMarketBook().prices[resource] || 10;
        const held = agent.inventory[resource] || 0;
        const requested = Math.max(1, Math.min(4, Math.floor(decision.amount || 2)));

        agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 3);
        agent.actionState = 'TRADING';
        agent.recentThought = decision.reasoningSummary;

        // Infer side: sell when holding surplus, otherwise buy if gold allows.
        let side: OrderSide;
        let amount: number;
        let price: number;

        if (held >= 1 && held >= requested * 0.5) {
          side = 'SELL';
          amount = Math.min(requested, held);
          price = Math.max(1, Math.round(decision.pricePerUnit ?? marketPrice * 0.98));
        } else if (agent.gold >= marketPrice) {
          side = 'BUY';
          price = Math.max(1, Math.round(decision.pricePerUnit ?? marketPrice * 1.02));
          amount = Math.max(1, Math.min(requested, Math.floor(agent.gold / price)));
        } else {
          return {
            isValid: true,
            actionType: 'TRADE',
            targetPosition: agent.targetPosition,
            reason: 'Scouting the market desk; lacks goods and gold to post an order'
          };
        }

        const result = orderBook.postOrder(agent, side, resource, amount, price, epoch, resolve);
        if (!result.success || !result.order) {
          return {
            isValid: true,
            actionType: 'TRADE',
            targetPosition: agent.targetPosition,
            reason: result.reason || 'Unable to post order'
          };
        }

        const events: WorldEvent[] = [
          { type: 'ORDER_EVENT', payload: { kind: 'POSTED', order: result.order } }
        ];
        for (const fill of result.fills) {
          memoryManager.recordTrade(fill.buyerId, fill.sellerId, fill.resource, fill.amount, fill.pricePerUnit, epoch);
          events.push({
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

        return {
          isValid: true,
          actionType: 'TRADE',
          targetPosition: agent.targetPosition,
          reason: `${side} ${amount} ${resource} @ ${price}G${result.fills.length ? ` — ${result.fills.length} fill(s)` : ' (resting)'}`,
          eventsToEmit: events
        };
      }

      case 'PROPOSE_ALLIANCE': {
        const target = resolve(decision.targetAgentId ?? undefined);
        if (target && target.id !== agent.id) {
          memoryManager.recordAlliance(agent.id, target.id, epoch);
          agent.targetPosition = { ...target.position };
          agent.actionState = 'ALLIANCE_PACT';
          agent.recentThought = decision.reasoningSummary;

          const events: WorldEvent[] = [
            {
              type: 'ALLIANCE_EVENT',
              payload: { agentA: agent.id, agentB: target.id, terms: decision.reasoningSummary }
            }
          ];

          // Codify a bilateral trading treaty alongside the alliance.
          const resource = decision.resource || this.richestResource(agent);
          const amountPerCycle = Math.max(1, Math.min(3, Math.floor(decision.amount || 2)));
          const price = Math.max(
            1,
            Math.round(decision.pricePerUnit ?? (economy.getMarketBook().prices[resource] || 10))
          );
          const agentHasSurplus = (agent.inventory[resource] || 0) >= amountPerCycle;
          const supplier = agentHasSurplus ? agent : target;
          const buyer = agentHasSurplus ? target : agent;
          const treatyRes = treaties.formTreaty(supplier, buyer, resource, amountPerCycle, price, 3, epoch);
          if (treatyRes.success && treatyRes.treaty) {
            events.push({
              type: 'TREATY_EVENT',
              payload: {
                kind: 'FORMED',
                treaty: treatyRes.treaty,
                detail: `${supplier.name} supplies ${amountPerCycle} ${resource}/cycle to ${buyer.name} at ${price}G`
              }
            });
          }

          return {
            isValid: true,
            actionType: 'ALLIANCE',
            reason: `Alliance forged between ${agent.name} and ${target.name}`,
            eventsToEmit: events
          };
        }
        break;
      }

      case 'BETRAY': {
        const victim = resolve(decision.targetAgentId ?? undefined);
        if (victim && victim.id !== agent.id) {
          const goldStolen = Math.min(25, Math.floor(victim.gold * 0.3));
          victim.gold -= goldStolen;
          agent.gold += goldStolen;

          memoryManager.recordBetrayal(agent.id, victim.id, epoch, decision.reasoningSummary);
          const brokenTreaties = treaties.breakTreatiesBetween(agent.id, victim.id);
          agent.actionState = 'BETRAYAL';
          agent.recentThought = decision.reasoningSummary;

          const events: WorldEvent[] = [
            {
              type: 'BETRAYAL_EVENT',
              payload: {
                betrayerId: agent.id,
                victimId: victim.id,
                details: decision.reasoningSummary,
                goldStolen
              }
            }
          ];
          for (const t of brokenTreaties) {
            events.push({
              type: 'TREATY_EVENT',
              payload: {
                kind: 'BROKEN',
                treaty: t,
                detail: `${agent.name} shattered the treaty with ${victim.name}`
              }
            });
          }

          return {
            isValid: true,
            actionType: 'BETRAYAL',
            reason: `${agent.name} betrayed ${victim.name}! Stole +${goldStolen} Gold`,
            eventsToEmit: events
          };
        }
        break;
      }

      case 'REST':
      default: {
        agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
        agent.actionState = 'WALKING';
        agent.recentThought = decision.reasoningSummary;
        return {
          isValid: true,
          actionType: 'REST',
          reason: 'Retreating to village tavern to rest and reassess'
        };
      }
    }

    return {
      isValid: false,
      actionType: 'NONE',
      reason: 'Decision action parameters were invalid'
    };
  }

  /** Resource the agent holds the most of (fallback trade target). */
  private static richestResource(agent: AgentRuntimeState): ResourceType {
    let best: ResourceType = 'WHEAT';
    let bestAmount = -1;
    for (const res of TRADABLE) {
      const held = agent.inventory[res] || 0;
      if (held > bestAmount) {
        bestAmount = held;
        best = res;
      }
    }
    return best;
  }
}
