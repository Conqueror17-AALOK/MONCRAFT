import {
  AIDecisionOutput,
  AIDecisionOutputSchema,
  AgentRuntimeState,
  MarketPriceBook,
  ResourceNode
} from '@civilization/shared';
import { buildAgentDecisionPrompt } from './promptBuilder.js';
import { AgentMemoryManager } from './memoryManager.js';

interface QueuedNIMRequest {
  id: string;
  agent: AgentRuntimeState;
  market: MarketPriceBook;
  resourceNodes: ResourceNode[];
  memoryManager: AgentMemoryManager;
  priority: number; // Higher number = higher priority
  resolve: (decision: AIDecisionOutput) => void;
  reject: (err: any) => void;
  queuedAt: number;
}

export class NvidiaNimClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  private queue: QueuedNIMRequest[] = [];
  private activeRequests = 0;
  private maxConcurrency = 2;

  // Circuit Breaker State
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private resetTimeoutMs = 30000; // 30s cooldown after trip

  constructor(
    apiKey = process.env.NVIDIA_NIM_API_KEY || '',
    baseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    model = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.2-11b-vision-instruct',
    timeoutMs = 12000
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  public async requestDecision(
    agent: AgentRuntimeState,
    market: MarketPriceBook,
    resourceNodes: ResourceNode[],
    memoryManager: AgentMemoryManager,
    priority = 1
  ): Promise<AIDecisionOutput> {
    // If no valid API key or circuit is open, return deterministic fallback decision immediately
    if (!this.apiKey || this.apiKey.startsWith('nvapi-your-key') || this.isCircuitOpen()) {
      return this.generateDeterministicFallback(agent, market);
    }

    return new Promise<AIDecisionOutput>((resolve, reject) => {
      this.queue.push({
        id: `${agent.id}_${Date.now()}`,
        agent,
        market,
        resourceNodes,
        memoryManager,
        priority,
        resolve,
        reject,
        queuedAt: Date.now()
      });

      // Sort queue by priority descending
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  private isCircuitOpen(): boolean {
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.circuitState = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  private recordSuccess() {
    this.failureCount = 0;
    this.circuitState = 'CLOSED';
  }

  private recordFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= 3) {
      this.circuitState = 'OPEN';
    }
  }

  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift()!;
    this.activeRequests++;

    try {
      const decision = await this.callNimApi(
        item.agent,
        item.market,
        item.resourceNodes,
        item.memoryManager
      );
      this.recordSuccess();
      console.log(`[NVIDIA NIM] ${item.agent.name} (${item.agent.archetype}) reasoned: ${decision.action} ${decision.resource || ''} | "${decision.reasoningSummary}" (conf: ${decision.confidence})`);
      item.resolve(decision);
    } catch (err: any) {
      console.warn(`[NVIDIA NIM] Fallback for ${item.agent.name}: ${err?.message}`);
      this.recordFailure();
      // On failure, fall back to safe deterministic decision
      const fallback = this.generateDeterministicFallback(item.agent, item.market);
      item.resolve(fallback);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async callNimApi(
    agent: AgentRuntimeState,
    market: MarketPriceBook,
    resourceNodes: ResourceNode[],
    memoryManager: AgentMemoryManager
  ): Promise<AIDecisionOutput> {
    const { systemPrompt, userPrompt } = buildAgentDecisionPrompt(
      agent,
      market,
      resourceNodes,
      memoryManager
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpoint = `${this.baseUrl}/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 512,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`NIM API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const rawContent = data.choices?.[0]?.message?.content || '{}';

      // Parse JSON and clean markdown fences if model returned them
      const cleaned = rawContent
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsedJson = JSON.parse(cleaned);
      const validated = AIDecisionOutputSchema.safeParse(parsedJson);

      if (!validated.success) {
        throw new Error(`Invalid NIM decision schema: ${validated.error.message}`);
      }

      return validated.data;
    } finally {
      clearTimeout(timeout);
    }
  }

  private generateDeterministicFallback(
    agent: AgentRuntimeState,
    market: MarketPriceBook
  ): AIDecisionOutput {
    // Deterministic archetype-based decision
    if (agent.archetype === 'MERCHANT') {
      return {
        decisionId: `${agent.id}_fall_${Date.now()}`,
        agentId: agent.id,
        action: 'TRADE',
        resource: 'WHEAT',
        amount: 10,
        expectedBenefit: 35,
        risk: 'LOW',
        reasoningSummary: 'Exploiting local market arbitrage on wheat reserves.',
        confidence: 0.85
      };
    } else if (agent.archetype === 'TREASURE_HUNTER' || agent.archetype === 'MYSTIC') {
      return {
        decisionId: `${agent.id}_fall_${Date.now()}`,
        agentId: agent.id,
        action: 'GATHER',
        resource: 'GOLD',
        amount: 4,
        expectedBenefit: 120,
        risk: 'HIGH',
        reasoningSummary: 'Expedition to hazardous wilderness to mine gold veins.',
        confidence: 0.8
      };
    } else if (agent.archetype === 'INDUSTRIALIST') {
      return {
        decisionId: `${agent.id}_fall_${Date.now()}`,
        agentId: agent.id,
        action: 'GATHER',
        resource: 'IRON',
        amount: 12,
        expectedBenefit: 60,
        risk: 'MEDIUM',
        reasoningSummary: 'Securing iron supply for city tool manufacturing.',
        confidence: 0.88
      };
    }

    return {
      decisionId: `${agent.id}_fall_${Date.now()}`,
      agentId: agent.id,
      action: 'GATHER',
      resource: 'WOOD',
      amount: 15,
      expectedBenefit: 40,
      risk: 'LOW',
      reasoningSummary: 'Harvesting sustainable timber reserves for construction.',
      confidence: 0.9
    };
  }
}
