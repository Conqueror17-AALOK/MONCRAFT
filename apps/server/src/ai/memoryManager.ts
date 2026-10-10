import {
  AgentMemoryEntry,
  AgentRelationship,
  ResourceType,
  MarketPriceBook
} from '@civilization/shared';

export class AgentMemoryManager {
  // AgentId -> Array of short-term memories (capped at 10)
  private shortTermMemories = new Map<string, AgentMemoryEntry[]>();

  // AgentId -> (TargetAgentId -> Relationship)
  private relationshipGraphs = new Map<string, Map<string, AgentRelationship>>();

  // AgentId -> Long-term persistent summary
  private longTermSummaries = new Map<string, string>();

  public getShortTermMemories(agentId: string): AgentMemoryEntry[] {
    return this.shortTermMemories.get(agentId) || [];
  }

  public getRelationships(agentId: string): Record<string, AgentRelationship> {
    const graph = this.relationshipGraphs.get(agentId);
    if (!graph) return {};
    const res: Record<string, AgentRelationship> = {};
    for (const [targetId, rel] of graph.entries()) {
      res[targetId] = { ...rel };
    }
    return res;
  }

  public getRelationshipWith(agentId: string, targetId: string): AgentRelationship {
    let graph = this.relationshipGraphs.get(agentId);
    if (!graph) {
      graph = new Map<string, AgentRelationship>();
      this.relationshipGraphs.set(agentId, graph);
    }

    let rel = graph.get(targetId);
    if (!rel) {
      rel = {
        targetAgentId: targetId,
        trustScore: 0,
        status: 'NEUTRAL',
        tradeCount: 0
      };
      graph.set(targetId, rel);
    }
    return rel;
  }

  public addMemory(agentId: string, entry: Omit<AgentMemoryEntry, 'id' | 'timestamp'>) {
    let list = this.shortTermMemories.get(agentId);
    if (!list) {
      list = [];
      this.shortTermMemories.set(agentId, list);
    }

    const fullEntry: AgentMemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now()
    };

    list.unshift(fullEntry);
    if (list.length > 10) {
      // Compact oldest memory into long-term summary if significant
      const evicted = list.pop()!;
      if (evicted.type === 'BETRAYAL' || evicted.type === 'ALLIANCE') {
        const currentSum = this.longTermSummaries.get(agentId) || '';
        this.longTermSummaries.set(
          agentId,
          `${currentSum} [Epoch ${evicted.epoch}: ${evicted.summary}]`.trim()
        );
      }
    }
  }

  public recordTrade(
    agentA: string,
    agentB: string,
    resource: ResourceType,
    amount: number,
    price: number,
    epoch: number
  ) {
    // Both agents update positive relationship
    const relA = this.getRelationshipWith(agentA, agentB);
    relA.trustScore = Math.min(100, relA.trustScore + 6);
    relA.tradeCount += 1;
    if (relA.trustScore > 40 && relA.status !== 'HOSTILE') relA.status = 'ALLIED';

    const relB = this.getRelationshipWith(agentB, agentA);
    relB.trustScore = Math.min(100, relB.trustScore + 6);
    relB.tradeCount += 1;
    if (relB.trustScore > 40 && relB.status !== 'HOSTILE') relB.status = 'ALLIED';

    this.addMemory(agentA, {
      epoch,
      type: 'TRADE',
      summary: `Traded ${amount} ${resource} with ${agentB} for ${price}G.`,
      sentiment: 'POSITIVE',
      relatedAgentId: agentB
    });

    this.addMemory(agentB, {
      epoch,
      type: 'TRADE',
      summary: `Received ${amount} ${resource} from ${agentA} at ${price}G.`,
      sentiment: 'POSITIVE',
      relatedAgentId: agentA
    });
  }

  public recordAlliance(agentA: string, agentB: string, epoch: number) {
    const relA = this.getRelationshipWith(agentA, agentB);
    relA.status = 'ALLIED';
    relA.trustScore = Math.min(100, relA.trustScore + 25);

    const relB = this.getRelationshipWith(agentB, agentA);
    relB.status = 'ALLIED';
    relB.trustScore = Math.min(100, relB.trustScore + 25);

    this.addMemory(agentA, {
      epoch,
      type: 'ALLIANCE',
      summary: `Formed mutual economic alliance with ${agentB}.`,
      sentiment: 'POSITIVE',
      relatedAgentId: agentB
    });

    this.addMemory(agentB, {
      epoch,
      type: 'ALLIANCE',
      summary: `Formed mutual economic alliance with ${agentA}.`,
      sentiment: 'POSITIVE',
      relatedAgentId: agentA
    });
  }

  public recordBetrayal(
    betrayer: string,
    victim: string,
    epoch: number,
    reason: string
  ) {
    const relVictim = this.getRelationshipWith(victim, betrayer);
    relVictim.status = 'HOSTILE';
    relVictim.trustScore = -85;
    relVictim.lastBetrayalEpoch = epoch;

    const relBetrayer = this.getRelationshipWith(betrayer, victim);
    relBetrayer.status = 'HOSTILE';
    relBetrayer.trustScore = Math.max(-50, relBetrayer.trustScore - 40);

    this.addMemory(victim, {
      epoch,
      type: 'BETRAYAL',
      summary: `Betrayed by ${betrayer}: ${reason}`,
      sentiment: 'NEGATIVE',
      relatedAgentId: betrayer
    });

    this.addMemory(betrayer, {
      epoch,
      type: 'BETRAYAL',
      summary: `Strategically broke pact with ${victim}: ${reason}`,
      sentiment: 'NEUTRAL',
      relatedAgentId: victim
    });
  }

  public recordEconomicShock(agentId: string, shockName: string, epoch: number) {
    this.addMemory(agentId, {
      epoch,
      type: 'MARKET_SHOCK',
      summary: `Market Shock Event: ${shockName}`,
      sentiment: 'NEUTRAL'
    });
  }

  public formatMemoryContext(agentId: string): string {
    const memories = this.getShortTermMemories(agentId);
    const graph = this.relationshipGraphs.get(agentId);
    const longTerm = this.longTermSummaries.get(agentId) || 'No major historical grudges.';

    const recentLines = memories.slice(0, 5).map((m) => `- [Epoch ${m.epoch}] ${m.summary}`);
    const relLines: string[] = [];

    if (graph) {
      for (const [target, r] of graph.entries()) {
        if (r.trustScore !== 0 || r.status !== 'NEUTRAL') {
          relLines.push(`- ${target}: Trust ${r.trustScore} (${r.status}, ${r.tradeCount} trades)`);
        }
      }
    }

    return `
=== AGENT MEMORY & RELATIONSHIPS ===
Long-term History: ${longTerm}
Key Relationships:
${relLines.length > 0 ? relLines.join('\n') : '- No strong alliances or enemies yet.'}
Recent Events:
${recentLines.length > 0 ? recentLines.join('\n') : '- No notable recent events.'}
`.trim();
  }
}
