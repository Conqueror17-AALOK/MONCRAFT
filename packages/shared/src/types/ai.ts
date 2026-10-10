import { z } from 'zod';
import { ResourceTypeSchema } from './economy.js';

export const AIActionTypeSchema = z.enum([
  'GATHER',
  'TRADE',
  'PROPOSE_ALLIANCE',
  'BETRAY',
  'BUILD',
  'REST'
]);
export type AIActionType = z.infer<typeof AIActionTypeSchema>;

export const RiskToleranceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskTolerance = z.infer<typeof RiskToleranceSchema>;

/**
 * Strict schema contract for NVIDIA NIM strategic decisions.
 * Every decision from the LLM MUST pass validation against this schema.
 */
export const AIDecisionOutputSchema = z.object({
  decisionId: z.string().uuid().or(z.string().min(5)),
  agentId: z.string().min(1),
  action: AIActionTypeSchema,
  targetAgentId: z.string().nullable().optional(),
  resource: ResourceTypeSchema.nullable().optional(),
  amount: z.number().nonnegative().nullable().optional(),
  pricePerUnit: z.number().positive().nullable().optional(),
  expectedBenefit: z.number().default(0),
  risk: RiskToleranceSchema.default('MEDIUM'),
  reasoningSummary: z.string().max(256),
  confidence: z.number().min(0).max(1).default(0.8),
});
export type AIDecisionOutput = z.infer<typeof AIDecisionOutputSchema>;

export interface AgentMemoryEntry {
  id: string;
  epoch: number;
  timestamp: number;
  type: 'TRADE' | 'ALLIANCE' | 'BETRAYAL' | 'MARKET_SHOCK' | 'BACKER_DIRECTIVE';
  summary: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  relatedAgentId?: string;
}

export interface AgentRelationship {
  targetAgentId: string;
  trustScore: number; // -100 to +100
  status: 'ALLIED' | 'NEUTRAL' | 'HOSTILE';
  tradeCount: number;
  lastBetrayalEpoch?: number;
}
