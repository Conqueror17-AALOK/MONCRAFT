import { z } from 'zod';
import { AgentRuntimeState } from './agent.js';
import {
  MarketPriceBook,
  ResourceType,
  ResourceNode,
  MarketDeskSnapshot,
  TradeOrder,
  TradeFill,
  TradingTreaty
} from './economy.js';
import { AIDecisionOutput } from './ai.js';

export interface WorldSnapshot {
  epoch: number;
  serverTime: number;
  market: MarketPriceBook;
  marketDesk?: MarketDeskSnapshot;
  resourceNodes: ResourceNode[];
  agents: AgentRuntimeState[];
}

export interface AgentDelta {
  id: string;
  position?: { x: number; y: number; z: number };
  targetPosition?: { x: number; y: number; z: number };
  actionState?: string;
  gold?: number;
  inventory?: Partial<Record<ResourceType, number>>;
  recentThought?: string;
  backerAddress?: string;
  stakedMonAmount?: number;
  onChainTxStatus?: 'NONE' | 'PENDING' | 'CONFIRMED' | 'FAILED';
  lastOnChainTxHash?: string;
}

export interface DeltaSnapshot {
  epoch: number;
  serverTime: number;
  marketPrices?: MarketPriceBook;
  marketDesk?: MarketDeskSnapshot;
  resourceNodeCapacities?: Array<{ id: string; currentCapacity: number }>;
  agentDeltas: AgentDelta[];
}

export type WebSocketServerMessage =
  | { type: 'INIT_WORLD'; payload: WorldSnapshot }
  | { type: 'DELTA_UPDATE'; payload: DeltaSnapshot }
  | { type: 'AGENT_DECISION'; payload: AIDecisionOutput }
  | { type: 'TRADE_EVENT'; payload: { sellerId: string; buyerId: string; resource: ResourceType; amount: number; price: number } }
  | { type: 'ALLIANCE_EVENT'; payload: { agentA: string; agentB: string; terms: string } }
  | { type: 'BETRAYAL_EVENT'; payload: { betrayerId: string; victimId: string; details: string; goldStolen: number } }
  | { type: 'ECONOMIC_SHOCK'; payload: { shockName: string; resource: ResourceType; description: string } }
  | { type: 'MARKET_DESK_UPDATE'; payload: MarketDeskSnapshot }
  | { type: 'ORDER_EVENT'; payload: { kind: 'POSTED' | 'FILLED' | 'CANCELLED' | 'EXPIRED'; order: TradeOrder } }
  | { type: 'TREATY_EVENT'; payload: { kind: 'FORMED' | 'EXECUTED' | 'COMPLETED' | 'BROKEN'; treaty: TradingTreaty; detail: string } }
  | { type: 'BLOCKCHAIN_TX'; payload: { txHash: string; type: string; status: 'PENDING' | 'CONFIRMED' | 'FAILED'; summary: string } }
  | { type: 'PARTICIPANT_CLAIMED'; payload: { slotId: number; backerAddress: string } }
  | { type: 'PARTICIPANT_FUNDED'; payload: { slotId: number; amountMon: number; backerAddress: string } };

export type WebSocketClientMessage =
  | { type: 'PING'; timestamp: number }
  | { type: 'SUBSCRIBE_AGENT'; slotId: number }
  | { type: 'SEND_DIRECTIVE'; slotId: number; directive: string; backerAddress: string };
