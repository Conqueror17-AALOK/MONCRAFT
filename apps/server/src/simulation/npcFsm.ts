import {
  AgentRuntimeState,
  ResourceType,
  ResourceNode
} from '@civilization/shared';
import { SPATIAL_ZONES, distanceBetween, getRandomPositionInZone } from '../world/zones.js';
import { EconomyEngine } from '../economy/market.js';

interface NPCExtendedState {
  targetNodeId?: string;
  assignedResource: ResourceType;
  restTimerSec: number;
  gatherTimerSec: number;
  maxCarryingCapacity: number;
}

export class NPCController {
  private npcStates = new Map<string, NPCExtendedState>();
  private economy: EconomyEngine;

  constructor(economy: EconomyEngine) {
    this.economy = economy;
  }

  public registerNPC(agent: AgentRuntimeState) {
    let assignedResource: ResourceType = 'WHEAT';
    if (agent.archetype.includes('FARMER')) assignedResource = 'WHEAT';
    else if (agent.archetype.includes('LUMBERJACK')) assignedResource = 'WOOD';
    else if (agent.archetype.includes('MINER')) assignedResource = 'IRON';
    else if (agent.archetype.includes('PORTER')) assignedResource = Math.random() > 0.5 ? 'WOOD' : 'WHEAT';

    this.npcStates.set(agent.id, {
      assignedResource,
      restTimerSec: 0,
      gatherTimerSec: 0,
      maxCarryingCapacity: 25
    });
  }

  public tickNPC(
    agent: AgentRuntimeState,
    deltaSec: number,
    resourceNodes: ResourceNode[]
  ): { thoughtChanged: boolean; stateChanged: boolean } {
    let ext = this.npcStates.get(agent.id);
    if (!ext) {
      this.registerNPC(agent);
      ext = this.npcStates.get(agent.id)!;
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
        // 1. Check carrying capacity limits (max 20 units total)
        const totalHeld = Object.values(agent.inventory).reduce((s, v) => s + (v || 0), 0);
        if (totalHeld >= 20) {
          const marketPos = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 3);
          agent.targetPosition = marketPos;
          agent.actionState = 'WALKING';
          agent.recentThought = 'Backpack is full. Heading to marketplace to sell.';
          thoughtChanged = true;
          stateChanged = true;
          break;
        }

        // 2. Find available node for assigned resource with at least 1 unit remaining
        const targetNodes = resourceNodes.filter(
          (n) => n.type === ext!.assignedResource && n.currentCapacity >= 1
        );

        if (targetNodes.length === 0) {
          // All nodes for this resource are temporarily depleted
          const villagePos = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
          agent.targetPosition = villagePos;
          agent.actionState = 'WALKING';
          agent.recentThought = `All ${ext.assignedResource} nodes depleted. Resting until crops/veins replenish.`;
          thoughtChanged = true;
          stateChanged = true;
          break;
        }

        const node = targetNodes[Math.floor(Math.random() * targetNodes.length)];
        ext.targetNodeId = node.id;

        // Add minor spatial offset to avoid stacking
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * 2;
        agent.targetPosition = {
          x: Number((node.position.x + Math.cos(offsetAngle) * offsetDist).toFixed(2)),
          y: 0,
          z: Number((node.position.z + Math.sin(offsetAngle) * offsetDist).toFixed(2))
        };
        agent.actionState = 'WALKING';
        agent.recentThought = `Heading to ${node.name} to harvest ${ext.assignedResource}.`;
        thoughtChanged = true;
        stateChanged = true;
        break;
      }

      case 'WALKING': {
        const dist = distanceBetween(agent.position, agent.targetPosition);
        if (dist <= 1.5) {
          // Arrived at destination
          if (ext.targetNodeId) {
            agent.actionState = 'GATHERING';
            ext.gatherTimerSec = GATHER_TIMES[ext.assignedResource] || 5.0;
            agent.recentThought = `Laboriously harvesting ${ext.assignedResource}...`;
            thoughtChanged = true;
            stateChanged = true;
          } else if (distanceBetween(agent.position, SPATIAL_ZONES.MARKETPLACE.center) <= SPATIAL_ZONES.MARKETPLACE.radius) {
            agent.actionState = 'TRADING';
            agent.recentThought = `Selling ${ext.assignedResource} harvest at the marketplace stalls.`;
            thoughtChanged = true;
            stateChanged = true;
          } else if (distanceBetween(agent.position, SPATIAL_ZONES.VILLAGE.center) <= SPATIAL_ZONES.VILLAGE.radius) {
            agent.actionState = 'RESTING';
            ext.restTimerSec = 5.0 + Math.random() * 3.0; // 5 to 8s rest
            agent.recentThought = 'Resting at village tavern before the next harvest shift.';
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
        ext.gatherTimerSec -= deltaSec;
        if (ext.gatherTimerSec <= 0) {
          // Complete gathering
          const node = resourceNodes.find((n) => n.id === ext!.targetNodeId);
          const yieldFn = GATHER_YIELDS[ext.assignedResource] || (() => 2);
          const gatherAmount = yieldFn();
          const actualHarvest = node ? Math.min(gatherAmount, Math.floor(node.currentCapacity)) : 0;

          if (node && actualHarvest > 0) {
            node.currentCapacity = Math.max(0, node.currentCapacity - actualHarvest);
          }

          ext.targetNodeId = undefined;

          if (actualHarvest <= 0) {
            // Node depleted before extraction finished
            const villagePos = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
            agent.targetPosition = villagePos;
            agent.actionState = 'WALKING';
            agent.recentThought = `${node ? node.name : 'Node'} was depleted. Returning to village.`;
            thoughtChanged = true;
            stateChanged = true;
            break;
          }

          agent.inventory[ext.assignedResource] = (agent.inventory[ext.assignedResource] || 0) + actualHarvest;

          // Head to Marketplace
          const marketPos = getRandomPositionInZone(SPATIAL_ZONES.MARKETPLACE, 4);
          agent.targetPosition = marketPos;
          agent.actionState = 'WALKING';
          agent.recentThought = `Carrying ${actualHarvest} ${ext.assignedResource} to Marketplace to sell.`;
          thoughtChanged = true;
          stateChanged = true;
        }
        break;
      }

      case 'TRADING': {
        // Sell gathered inventory
        const held = agent.inventory[ext.assignedResource] || 0;
        if (held > 0) {
          const res = this.economy.sellToMarket(agent, ext.assignedResource, held);
          if (res.success) {
            agent.recentThought = `Sold ${held} ${ext.assignedResource} for +${res.goldEarned} Gold!`;
          } else {
            agent.recentThought = `Market was full; kept ${held} ${ext.assignedResource}.`;
          }
        }

        // Head to Village to rest
        const villagePos = getRandomPositionInZone(SPATIAL_ZONES.VILLAGE, 4);
        agent.targetPosition = villagePos;
        agent.actionState = 'WALKING';
        thoughtChanged = true;
        stateChanged = true;
        break;
      }

      case 'RESTING': {
        ext.restTimerSec -= deltaSec;
        if (ext.restTimerSec <= 0) {
          agent.actionState = 'IDLE';
          agent.recentThought = 'Refreshed and ready for next harvest cycle.';
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
