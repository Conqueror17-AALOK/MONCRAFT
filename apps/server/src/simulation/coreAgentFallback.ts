import {
  AgentRuntimeState,
  ResourceNode,
  ResourceType
} from '@civilization/shared';
import { SPATIAL_ZONES, distanceBetween, getRandomPositionInZone } from '../world/zones.js';
import { EconomyEngine } from '../economy/market.js';

interface CoreAgentExtendedState {
  targetNodeId?: string;
  focusResource: ResourceType;
  timerSec: number;
}

export class CoreAgentFallbackController {
  private coreStates = new Map<string, CoreAgentExtendedState>();
  private economy: EconomyEngine;

  constructor(economy: EconomyEngine) {
    this.economy = economy;
  }

  public registerCoreAgent(agent: AgentRuntimeState) {
    let focus: ResourceType = 'IRON';
    if (agent.archetype === 'MERCHANT' || agent.archetype === 'STRATEGIST') focus = 'GOLD';
    else if (agent.archetype === 'AGRARIAN') focus = 'WHEAT';
    else if (agent.archetype === 'INDUSTRIALIST') focus = 'IRON';
    else if (agent.archetype === 'TREASURE_HUNTER' || agent.archetype === 'MYSTIC') focus = 'GOLD';
    else if (agent.archetype === 'REBEL' || agent.archetype === 'OPPORTUNIST') focus = 'WOOD';

    this.coreStates.set(agent.id, {
      focusResource: focus,
      timerSec: 0
    });
  }

  public tickCoreAgent(
    agent: AgentRuntimeState,
    deltaSec: number,
    resourceNodes: ResourceNode[]
  ): { thoughtChanged: boolean; stateChanged: boolean } {
    let ext = this.coreStates.get(agent.id);
    if (!ext) {
      this.registerCoreAgent(agent);
      ext = this.coreStates.get(agent.id)!;
    }

    let thoughtChanged = false;
    let stateChanged = false;

    const GATHER_TIMES: Record<ResourceType, number> = {
      WHEAT: 4.5,
      WOOD: 5.5,
      IRON: 7.0,
      GOLD: 9.0
    };

    const GATHER_YIELDS: Record<ResourceType, () => number> = {
      WHEAT: () => (Math.random() < 0.5 ? 2 : 3),
      WOOD: () => 2,
      IRON: () => (Math.random() < 0.7 ? 1 : 2),
      GOLD: () => 1
    };

    switch (agent.actionState) {
      case 'IDLE': {
        // Carrying capacity limit (max 20 units)
        const totalHeld = Object.values(agent.inventory).reduce((s, v) => s + (v || 0), 0);
        if (totalHeld >= 20) {
          agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 3);
          agent.actionState = 'WALKING';
          agent.recentThought = 'Strategic reserves at maximum capacity. Heading to trade desk.';
          thoughtChanged = true;
          stateChanged = true;
          break;
        }

        // Archetype behavior
        if (agent.archetype === 'MERCHANT') {
          // Check if market has cheap resources to buy, or sell inventory
          const book = this.economy.getMarketBook();
          if (agent.gold > 60 && book.prices.WHEAT <= 3) {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 2);
            agent.actionState = 'WALKING';
            agent.recentThought = 'Wheat is underpriced. Moving to buy bulk inventory for arbitrage.';
            thoughtChanged = true;
            stateChanged = true;
          } else {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = 'Observing market spreads and quote liquidity.';
            thoughtChanged = true;
            stateChanged = true;
          }
        } else if (agent.archetype === 'TREASURE_HUNTER' || agent.archetype === 'MYSTIC') {
          // Head to hazardous wilderness for Gold
          const goldNodes = resourceNodes.filter((n) => n.type === 'GOLD' && n.currentCapacity >= 1);
          if (goldNodes.length > 0) {
            const targetNode = goldNodes[0];
            ext.targetNodeId = targetNode.id;
            agent.targetPosition = { ...targetNode.position };
            agent.actionState = 'WALKING';
            agent.recentThought = `Expedition to ${targetNode.name} to extract precious Gold veins.`;
            thoughtChanged = true;
            stateChanged = true;
          } else {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = 'Gold ruins depleted. Returning to camp to study map scrolls.';
            thoughtChanged = true;
            stateChanged = true;
          }
        } else if (agent.archetype === 'INDUSTRIALIST') {
          // Focus on Iron
          const ironNodes = resourceNodes.filter((n) => n.type === 'IRON' && n.currentCapacity >= 1);
          if (ironNodes.length > 0) {
            const targetNode = ironNodes[0];
            ext.targetNodeId = targetNode.id;
            agent.targetPosition = { ...targetNode.position };
            agent.actionState = 'WALKING';
            agent.recentThought = `Securing Iron quarry supplies for regional construction.`;
            thoughtChanged = true;
            stateChanged = true;
          } else {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = 'Iron veins exhausted. Awaiting geological replenishment.';
            thoughtChanged = true;
            stateChanged = true;
          }
        } else if (agent.archetype === 'WARLORD') {
          // Patrol between Castle Citadel, Marketplace, and Iron Mines
          const zones = [SPATIAL_ZONES.CASTLE, SPATIAL_ZONES.MARKETPLACE, SPATIAL_ZONES.IRON_MINES];
          const dest = zones[Math.floor(Math.random() * zones.length)];
          agent.targetPosition = getRandomPositionInZone(dest, 2);
          agent.actionState = 'WALKING';
          if (dest.id === 'CASTLE') {
            agent.recentThought = 'Returning to Fortress Citadel to inspect rampart defenses and command garrison.';
          } else {
            agent.recentThought = `Patrolling ${dest.name}. Enforcing territory boundaries.`;
          }
          thoughtChanged = true;
          stateChanged = true;
        } else {
          // Default strategic gathering / trading
          const nodes = resourceNodes.filter((n) => n.type === ext!.focusResource && n.currentCapacity >= 1);
          if (nodes.length > 0) {
            const targetNode = nodes[0];
            ext.targetNodeId = targetNode.id;
            agent.targetPosition = { ...targetNode.position };
            agent.actionState = 'WALKING';
            agent.recentThought = `Advancing strategic objective: secure ${ext.focusResource} reserves.`;
            thoughtChanged = true;
            stateChanged = true;
          } else {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = `${ext.focusResource} reserves depleted. Holding perimeter.`;
            thoughtChanged = true;
            stateChanged = true;
          }
        }
        break;
      }

      case 'WALKING': {
        const dist = distanceBetween(agent.position, agent.targetPosition);
        if (dist <= 1.5) {
          if (ext.targetNodeId) {
            agent.actionState = 'GATHERING';
            ext.timerSec = GATHER_TIMES[ext.focusResource] || 5.0;
            agent.recentThought = `Laboriously extracting strategic ${ext.focusResource}...`;
            thoughtChanged = true;
            stateChanged = true;
          } else if (distanceBetween(agent.position, SPATIAL_ZONES.MARKETPLACE.center) <= SPATIAL_ZONES.MARKETPLACE.radius) {
            agent.actionState = 'TRADING';
            agent.recentThought = 'Executing high-value transactions at Agora.';
            thoughtChanged = true;
            stateChanged = true;
          } else {
            agent.actionState = 'IDLE';
            stateChanged = true;
          }
        }
        break;
      }

      case 'GATHERING': {
        ext.timerSec -= deltaSec;
        if (ext.timerSec <= 0) {
          const node = resourceNodes.find((n) => n.id === ext!.targetNodeId);
          const yieldFn = GATHER_YIELDS[ext.focusResource] || (() => 2);
          const harvestAmount = yieldFn();
          const actualHarvest = node ? Math.min(harvestAmount, Math.floor(node.currentCapacity)) : 0;

          if (node && actualHarvest > 0) {
            node.currentCapacity = Math.max(0, node.currentCapacity - actualHarvest);
          }

          ext.targetNodeId = undefined;

          if (actualHarvest <= 0) {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = `${node ? node.name : 'Node'} was depleted before harvest. Regrouping.`;
            thoughtChanged = true;
            stateChanged = true;
            break;
          }

          agent.inventory[ext.focusResource] = (agent.inventory[ext.focusResource] || 0) + actualHarvest;

          // Head to Marketplace
          agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 3);
          agent.actionState = 'WALKING';
          agent.recentThought = `Secured +${actualHarvest} ${ext.focusResource}. Moving to trade desk.`;
          thoughtChanged = true;
          stateChanged = true;
        }
        break;
      }

      case 'TRADING': {
        // Trade at market
        const held = agent.inventory[ext.focusResource] || 0;
        if (held > 2) {
          const qtyToSell = Math.max(1, Math.min(3, Math.floor(held * 0.5)));
          const res = this.economy.sellToMarket(agent, ext.focusResource, qtyToSell);
          if (res.success) {
            agent.recentThought = `Arbitrage executed: sold ${qtyToSell} ${ext.focusResource} (+${res.goldEarned}G)!`;
          }
        }

        // Return to strategic post
        const returnPos = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
        agent.targetPosition = returnPos;
        agent.actionState = 'WALKING';
        thoughtChanged = true;
        stateChanged = true;
        break;
      }

      default:
        agent.actionState = 'IDLE';
        stateChanged = true;
        break;
    }

    return { thoughtChanged, stateChanged };
  }
}
