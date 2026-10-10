import {
  AgentRuntimeState,
  MarketPriceBook,
  ResourceNode,
  AIDecisionOutput
} from '@civilization/shared';
import { NvidiaNimClient } from './nimClient.js';
import { AgentMemoryManager } from './memoryManager.js';
import { DecisionValidator, ValidatedGameAction } from './decisionValidator.js';
import { EconomyEngine } from '../economy/market.js';
import { OrderBookEngine } from '../economy/orderBook.js';
import { TreatyEngine } from '../economy/treaties.js';

export interface AIOrchestratorCallbacks {
  onAgentDecision: (decision: AIDecisionOutput) => void;
  onWorldEvent: (event: any) => void;
}

export class AIOrchestrator {
  private nimClient: NvidiaNimClient;
  private memoryManager: AgentMemoryManager;
  private economy: EconomyEngine;
  private orderBook: OrderBookEngine;
  private treaties: TreatyEngine;
  private callbacks: AIOrchestratorCallbacks;

  // Track next allowed reasoning timestamp per agent
  private nextAllowedDecisionTime = new Map<string, number>();

  constructor(
    economy: EconomyEngine,
    orderBook: OrderBookEngine,
    treaties: TreatyEngine,
    callbacks: AIOrchestratorCallbacks,
    nimClient?: NvidiaNimClient,
    memoryManager?: AgentMemoryManager
  ) {
    this.economy = economy;
    this.orderBook = orderBook;
    this.treaties = treaties;
    this.callbacks = callbacks;
    this.nimClient = nimClient || new NvidiaNimClient();
    this.memoryManager = memoryManager || new AgentMemoryManager();
  }

  public getMemoryManager(): AgentMemoryManager {
    return this.memoryManager;
  }

  public async tickCoreAI(
    coreAgents: AgentRuntimeState[],
    allAgents: AgentRuntimeState[],
    market: MarketPriceBook,
    resourceNodes: ResourceNode[],
    epoch: number
  ) {
    const now = Date.now();

    for (const agent of coreAgents) {
      const nextTime = this.nextAllowedDecisionTime.get(agent.id) || 0;
      if (now < nextTime) continue;

      // Set cooldown: 20 seconds + up to 5 seconds jitter to spread load
      const cooldownMs = 20000 + Math.random() * 5000;
      this.nextAllowedDecisionTime.set(agent.id, now + cooldownMs);

      // Request decision asynchronously from NVIDIA NIM
      this.evaluateAgent(agent, allAgents, market, resourceNodes, epoch);
    }
  }

  public async triggerEventReevaluation(
    agentId: string,
    allAgents: AgentRuntimeState[],
    market: MarketPriceBook,
    resourceNodes: ResourceNode[],
    epoch: number
  ) {
    const agent = allAgents.find((a) => a.id === agentId);
    if (!agent || agent.category !== 'CORE_AI') return;

    // High priority trigger
    await this.evaluateAgent(agent, allAgents, market, resourceNodes, epoch, 5);
  }

  private async evaluateAgent(
    agent: AgentRuntimeState,
    allAgents: AgentRuntimeState[],
    market: MarketPriceBook,
    resourceNodes: ResourceNode[],
    epoch: number,
    priority = 1
  ) {
    try {
      const decision = await this.nimClient.requestDecision(
        agent,
        market,
        resourceNodes,
        this.memoryManager,
        priority
      );

      // Validate decision server-side (Brain vs Body separation)
      const validated: ValidatedGameAction = DecisionValidator.validateAndApply(
        decision,
        agent,
        allAgents,
        resourceNodes,
        this.economy,
        this.orderBook,
        this.treaties,
        this.memoryManager,
        epoch
      );

      if (validated.isValid) {
        this.callbacks.onAgentDecision(decision);

        if (validated.eventToEmit) {
          this.callbacks.onWorldEvent(validated.eventToEmit);
        }
        if (validated.eventsToEmit) {
          for (const evt of validated.eventsToEmit) {
            this.callbacks.onWorldEvent(evt);
          }
        }
      }
    } catch (err) {
      console.error(`AI Orchestrator error for agent ${agent.id}:`, err);
    }
  }
}
