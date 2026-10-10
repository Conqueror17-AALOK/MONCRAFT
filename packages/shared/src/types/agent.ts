import { z } from 'zod';
import { Inventory, InventorySchema } from './economy.js';
import { AgentMemoryEntry, AgentRelationship } from './ai.js';

export const AgentCategorySchema = z.enum(['CORE_AI', 'AUDIENCE', 'NPC']);
export type AgentCategory = z.infer<typeof AgentCategorySchema>;

export const CoreArchetypeSchema = z.enum([
  'MERCHANT',
  'WARLORD',
  'DIPLOMAT',
  'AGRARIAN',
  'INDUSTRIALIST',
  'TREASURE_HUNTER',
  'STRATEGIST',
  'OPPORTUNIST',
  'REBEL',
  'MYSTIC'
]);
export type CoreArchetype = z.infer<typeof CoreArchetypeSchema>;

export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});
export type Vector3 = z.infer<typeof Vector3Schema>;

export const AgentActionStateSchema = z.enum([
  'IDLE',
  'WALKING',
  'GATHERING',
  'TRADING',
  'ALLIANCE_PACT',
  'BETRAYAL',
  'RESTING'
]);
export type AgentActionState = z.infer<typeof AgentActionStateSchema>;

export interface AgentSlotDefinition {
  slotId: number; // 0 to 39
  category: AgentCategory;
  name: string;
  archetype: string;
  colorHex: string;
  personalityPrompt: string;
}

export interface AgentRuntimeState {
  id: string; // e.g. "agent_00" to "agent_39"
  slotId: number;
  category: AgentCategory;
  name: string;
  archetype: string;
  colorHex: string;
  position: Vector3;
  targetPosition: Vector3;
  actionState: AgentActionState;
  gold: number;
  inventory: Inventory;
  factionId: string;
  activeGoal: string;
  recentThought: string;
  // Audience agent backing
  backerAddress?: string;
  stakedMonAmount?: number;
  customDirective?: string;
  claimableDividendMon?: number;
  lifetimeDividendMon?: number;
  // Memory and relationships
  relationships: Record<string, AgentRelationship>;
  shortTermMemories: AgentMemoryEntry[];
  longTermSummary: string;
  // Blockchain sync state
  lastOnChainTxHash?: string;
  onChainTxStatus?: 'NONE' | 'PENDING' | 'CONFIRMED' | 'FAILED';
}

export const TOTAL_AGENTS = 40;
export const CORE_AI_COUNT = 10;
export const AUDIENCE_COUNT = 10;
export const NPC_COUNT = 20;

export const CORE_AGENT_ARCHETYPES: Array<{
  name: string;
  archetype: CoreArchetype;
  colorHex: string;
  personality: string;
}> = [
  {
    name: 'Griphook',
    archetype: 'MERCHANT',
    colorHex: '#F59E0B',
    personality: 'Gringotts goblin banker. Weighs Galleons, obsesses over ledger margins, exploits Diagon Alley price spreads, demands exact gold settlements.'
  },
  {
    name: 'Lord Voldemort',
    archetype: 'WARLORD',
    colorHex: '#EF4444',
    personality: 'The Dark Lord. Occupies the mountain fortress, uses dark arts intimidation, targets wealthy merchants, demands absolute tribute.'
  },
  {
    name: 'Albus Dumbledore',
    archetype: 'DIPLOMAT',
    colorHex: '#3B82F6',
    personality: 'Order of the Phoenix founder and master statesman. Seeks non-aggression treaties, shared economic prosperity, hands out lemon drops during tense summits.'
  },
  {
    name: 'Rubeus Hagrid',
    archetype: 'AGRARIAN',
    colorHex: '#10B981',
    personality: 'Hogwarts Gamekeeper ("You are a harvester, Harry!"). Stockpiles golden wheat and giant pumpkins, fiercely guards farm silos against famine.'
  },
  {
    name: 'Arthur Weasley',
    archetype: 'INDUSTRIALIST',
    colorHex: '#6B7280',
    personality: 'Ministry craftsman fascinated by metal tinkering. Hoards iron ore for blast furnaces and civic works, constructs ingenious machinery.'
  },
  {
    name: 'Harry Potter',
    archetype: 'TREASURE_HUNTER',
    colorHex: '#EC4899',
    personality: 'The Boy Who Lived. Daring wilderness adventurer hunting for Golden Snitches and rare crystal veins in dangerous uncharted forests.'
  },
  {
    name: 'Hermione Granger',
    archetype: 'STRATEGIST',
    colorHex: '#8B5CF6',
    personality: 'Brightest witch of her age. Armed with analytical precision, memorizes macroeconomic formulas, calculates risks rounds ahead, and hedges asset portfolios.'
  },
  {
    name: 'Draco Malfoy',
    archetype: 'OPPORTUNIST',
    colorHex: '#14B8A6',
    personality: 'Slytherin opportunist ("Wait until my father hears about this!"). Allies with the strongest faction until a more lucrative betrayal presents itself.'
  },
  {
    name: 'Dobby The Elf',
    archetype: 'REBEL',
    colorHex: '#F97316',
    personality: 'Free elf and cartel disruptor ("Dobby has no master!"). Sells under-market resources to poor commoner NPCs, fiercely resists greedy monopolists.'
  },
  {
    name: 'Prof Trelawney',
    archetype: 'MYSTIC',
    colorHex: '#A855F7',
    personality: 'Divination seer. Hoards gold crystals for her inner eye, reads tea leaves and crystal orbs, predicting market crashes and ominous omens.'
  }
];
