import {
  AgentRuntimeState,
  ResourceType,
  ResourceNode
} from '@civilization/shared';
import { SPATIAL_ZONES, distanceBetween, getRandomPositionInZone } from '../world/zones.js';
import { EconomyEngine } from '../economy/market.js';

interface AudienceExtendedState {
  targetNodeId?: string;
  focusResource: ResourceType;
  timerSec: number;
}

export class AudienceAgentController {
  private audienceStates = new Map<string, AudienceExtendedState>();
  private economy: EconomyEngine;

  constructor(economy: EconomyEngine) {
    this.economy = economy;
  }

  public registerAudienceAgent(agent: AgentRuntimeState) {
    this.audienceStates.set(agent.id, {
      focusResource: 'IRON',
      timerSec: 0
    });
  }

  public tickAudienceAgent(
    agent: AgentRuntimeState,
    deltaSec: number,
    resourceNodes: ResourceNode[]
  ): { thoughtChanged: boolean; stateChanged: boolean } {
    let ext = this.audienceStates.get(agent.id);
    if (!ext) {
      this.registerAudienceAgent(agent);
      ext = this.audienceStates.get(agent.id)!;
    }

    let thoughtChanged = false;
    let stateChanged = false;

    // Directives from participant backer take precedence
    if (agent.customDirective) {
      const dirLower = agent.customDirective.toLowerCase();
      if (dirLower.includes('gold')) ext.focusResource = 'GOLD';
      else if (dirLower.includes('iron')) ext.focusResource = 'IRON';
      else if (dirLower.includes('wheat') || dirLower.includes('food')) ext.focusResource = 'WHEAT';
      else if (dirLower.includes('wood') || dirLower.includes('timber')) ext.focusResource = 'WOOD';
    } else {
      // Dynamic autonomous selection: look for most profitable market price
      const book = this.economy.getMarketBook();
      if (book.prices.GOLD > 60 && Math.random() < 0.3) {
        ext.focusResource = 'GOLD';
      } else if (book.prices.IRON >= book.prices.WHEAT && book.prices.IRON >= book.prices.WOOD) {
        ext.focusResource = 'IRON';
      } else if (book.prices.WHEAT > book.prices.WOOD) {
        ext.focusResource = 'WHEAT';
      } else {
        ext.focusResource = 'WOOD';
      }
    }

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
        // Decide whether to harvest or trade
        const held = agent.inventory[ext.focusResource] || 0;
        const totalHeld = Object.values(agent.inventory).reduce((s, v) => s + (v || 0), 0);
        if (held >= 6 || totalHeld >= 20) {
          // Carry to Marketplace to sell
          agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 3);
          agent.actionState = 'WALKING';
          agent.recentThought = `Heading to Marketplace to sell ${held} ${ext.focusResource}.`;
          thoughtChanged = true;
          stateChanged = true;
        } else {
          // Go harvest focus resource
          const nodes = resourceNodes.filter(
            (n) => n.type === ext!.focusResource && n.currentCapacity >= 1
          );

          if (nodes.length === 0) {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = `${ext.focusResource} nodes depleted. Resting until extraction reopens.`;
            thoughtChanged = true;
            stateChanged = true;
            break;
          }

          const node = nodes[Math.floor(Math.random() * nodes.length)];
          ext.targetNodeId = node.id;
          agent.targetPosition = { ...node.position };
          agent.actionState = 'WALKING';
          const backerTag = agent.backerAddress ? ` [Backed by ${agent.backerAddress.slice(0, 6)}...]` : '';
          agent.recentThought = `Seeking ${ext.focusResource} at ${node.name}.${backerTag}`;
          thoughtChanged = true;
          stateChanged = true;
        }
        break;
      }

      case 'WALKING': {
        const dist = distanceBetween(agent.position, agent.targetPosition);
        if (dist <= 1.5) {
          if (ext.targetNodeId) {
            agent.actionState = 'GATHERING';
            ext.timerSec = GATHER_TIMES[ext.focusResource] || 5.0;
            agent.recentThought = `Laboriously extracting ${ext.focusResource}...`;
            thoughtChanged = true;
            stateChanged = true;
          } else if (distanceBetween(agent.position, SPATIAL_ZONES.MARKETPLACE.center) <= SPATIAL_ZONES.MARKETPLACE.radius) {
            agent.actionState = 'TRADING';
            agent.recentThought = `Negotiating prices for ${ext.focusResource} at Market Agora.`;
            thoughtChanged = true;
            stateChanged = true;
          } else if (distanceBetween(agent.position, SPATIAL_ZONES.VILLAGE.center) <= SPATIAL_ZONES.VILLAGE.radius) {
            agent.actionState = 'RESTING';
            ext.timerSec = 5.0 + Math.random() * 2.5;
            agent.recentThought = 'Resting in village before next strategic excursion.';
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
          const gatherAmount = yieldFn();
          const actualHarvest = node ? Math.min(gatherAmount, Math.floor(node.currentCapacity)) : 0;

          if (node && actualHarvest > 0) {
            node.currentCapacity = Math.max(0, node.currentCapacity - actualHarvest);
          }

          ext.targetNodeId = undefined;

          if (actualHarvest <= 0) {
            agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.actionState = 'WALKING';
            agent.recentThought = `${node ? node.name : 'Node'} was depleted. Regrouping at village.`;
            thoughtChanged = true;
            stateChanged = true;
            break;
          }

          agent.inventory[ext.focusResource] = (agent.inventory[ext.focusResource] || 0) + actualHarvest;

          // Head to Market
          agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 3);
          agent.actionState = 'WALKING';
          agent.recentThought = `Harvested +${actualHarvest} ${ext.focusResource}. Transporting to market.`;
          thoughtChanged = true;
          stateChanged = true;
        }
        break;
      }

      case 'TRADING': {
        const held = agent.inventory[ext.focusResource] || 0;
        if (held > 0) {
          const res = this.economy.sellToMarket(agent, ext.focusResource, held);
          if (res.success) {
            agent.recentThought = `Liquidated ${held} ${ext.focusResource} for +${res.goldEarned} Gold!`;
          }
        }

        // Return to Village or Wilderness
        agent.targetPosition = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 5);
        agent.actionState = 'WALKING';
        thoughtChanged = true;
        stateChanged = true;
        break;
      }

      case 'RESTING': {
        ext.timerSec -= deltaSec;
        if (ext.timerSec <= 0) {
          agent.actionState = 'IDLE';
          agent.recentThought = 'Strategizing next wealth expansion moves.';
          thoughtChanged = true;
          stateChanged = true;
        }
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
