import {
  AgentRuntimeState,
  MarketPriceBook,
  ResourceNode,
  CORE_AGENT_ARCHETYPES
} from '@civilization/shared';
import { AgentMemoryManager } from './memoryManager.js';

export function buildAgentDecisionPrompt(
  agent: AgentRuntimeState,
  market: MarketPriceBook,
  resourceNodes: ResourceNode[],
  memoryManager: AgentMemoryManager
): { systemPrompt: string; userPrompt: string } {
  const archetypeMeta = CORE_AGENT_ARCHETYPES.find((a) => a.archetype === agent.archetype);
  const personality = archetypeMeta ? archetypeMeta.personality : 'Autonomous civilization strategist.';

  const systemPrompt = `
You are the strategic brain of an autonomous AI civilization agent named ${agent.name} (Archetype: ${agent.archetype}).
You exist in a real-time, Roblox-style 3D on-chain civilization on Monad testnet.
You compete and cooperate with 39 other autonomous agents for wealth, reputation, and regional dominance.

Personality: ${personality}

YOUR RULES:
1. You are the BRAIN. You decide WHAT to do, not physical rendering or coordinates.
2. Choose one strategic action from: "GATHER", "TRADE", "PROPOSE_ALLIANCE", "BETRAY", "BUILD", "REST".
3. The civilization has real scarcity: harvest yields are 1-3 units and food (Wheat) is consumed for survival.
4. Your decision must be financially or politically advantageous given your archetype.
5. You MUST respond with ONLY a single raw JSON object matching the requested schema. Do NOT include markdown code fences (\`\`\`json), greetings, or explanations outside the JSON.
`.trim();

  const memoryContext = memoryManager.formatMemoryContext(agent.id);

  const availableNodes = resourceNodes.map(
    (n) => `- ${n.name} (Type: ${n.type}, Capacity: ${Math.round(n.currentCapacity)}/${n.maxCapacity})`
  );

  const userPrompt = `
=== CURRENT AGENT STATE ===
Agent: ${agent.name} (${agent.id})
Category: ${agent.category} | Archetype: ${agent.archetype}
Current Position: (${agent.position.x}, ${agent.position.z})
Current Action State: ${agent.actionState}
Gold Balance: ${agent.gold} Gold
Inventory: Wood: ${agent.inventory.WOOD}, Wheat: ${agent.inventory.WHEAT}, Iron: ${agent.inventory.IRON}, Gold: ${agent.inventory.GOLD}

=== MARKET CONDITIONS ===
Prices: Wood: ${market.prices.WOOD}G (${market.priceTrends.WOOD}), Wheat: ${market.prices.WHEAT}G (${market.priceTrends.WHEAT}), Iron: ${market.prices.IRON}G (${market.priceTrends.IRON}), Gold: ${market.prices.GOLD}G (${market.priceTrends.GOLD})
Stockpiles: Wood: ${Math.round(market.stockpiles.WOOD)}, Wheat: ${Math.round(market.stockpiles.WHEAT)}, Iron: ${Math.round(market.stockpiles.IRON)}, Gold: ${Math.round(market.stockpiles.GOLD)}
Agora Civic Treasury: ${market.agoraTreasury || 0} Gold

=== ACCESSIBLE RESOURCE NODES ===
${availableNodes.join('\n')}

${memoryContext}

=== OUTPUT SCHEMA CONTRACT ===
Respond ONLY with a valid JSON object matching:
{
  "decisionId": "${agent.id}_dec_${Date.now()}",
  "agentId": "${agent.id}",
  "action": "GATHER" | "TRADE" | "PROPOSE_ALLIANCE" | "BETRAY" | "BUILD" | "REST",
  "targetAgentId": "optional agent_XX",
  "resource": "WOOD" | "WHEAT" | "IRON" | "GOLD" (if GATHER or TRADE),
  "amount": number (e.g. 1 to 3),
  "pricePerUnit": number (if trading),
  "expectedBenefit": number,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "reasoningSummary": "Short 1-sentence thought explaining why",
  "confidence": 0.85
}
`.trim();

  return { systemPrompt, userPrompt };
}
