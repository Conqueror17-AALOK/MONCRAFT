import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { AgentRuntimeState, TradingTreaty } from '@civilization/shared';
import { MarketTransactionRecord } from '../economy/market.js';

export class PersistenceManager {
  private db: DatabaseSync;

  constructor(dbFilePath = './data/civilization.db') {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbFilePath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS agents (
        slot_id INTEGER PRIMARY KEY,
        id TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        archetype TEXT NOT NULL,
        gold INTEGER NOT NULL,
        wood INTEGER NOT NULL,
        wheat INTEGER NOT NULL,
        iron INTEGER NOT NULL,
        faction_id TEXT NOT NULL,
        backer_address TEXT,
        staked_mon REAL,
        claimable_mon REAL DEFAULT 0,
        lifetime_mon REAL DEFAULT 0,
        raw_state TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN claimable_mon REAL DEFAULT 0;`);
    } catch {}
    try {
      this.db.exec(`ALTER TABLE agents ADD COLUMN lifetime_mon REAL DEFAULT 0;`);
    } catch {}

    this.db.exec(`

      CREATE TABLE IF NOT EXISTS market_trades (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        resource TEXT NOT NULL,
        amount INTEGER NOT NULL,
        price_per_unit REAL NOT NULL,
        total_cost REAL NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS world_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        target_id TEXT,
        summary TEXT NOT NULL,
        epoch INTEGER NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alliances (
        id TEXT PRIMARY KEY,
        agent_a TEXT NOT NULL,
        agent_b TEXT NOT NULL,
        epoch INTEGER NOT NULL,
        is_active INTEGER NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS treaties (
        treaty_id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        resource TEXT NOT NULL,
        amount_per_cycle INTEGER NOT NULL,
        price_per_unit REAL NOT NULL,
        cycles_remaining INTEGER NOT NULL,
        cycles_executed INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_epoch INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  public saveAgentState(agent: AgentRuntimeState) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (
        slot_id, id, category, name, archetype, gold, wood, wheat, iron,
        faction_id, backer_address, staked_mon, claimable_mon, lifetime_mon, raw_state, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      agent.slotId,
      agent.id,
      agent.category,
      agent.name,
      agent.archetype,
      agent.gold,
      agent.inventory.WOOD || 0,
      agent.inventory.WHEAT || 0,
      agent.inventory.IRON || 0,
      agent.factionId,
      agent.backerAddress || null,
      agent.stakedMonAmount || 0,
      agent.claimableDividendMon || 0,
      agent.lifetimeDividendMon || 0,
      JSON.stringify(agent),
      Date.now()
    );
  }

  public getBackerRewards(backerAddress: string): {
    stakedMon: number;
    claimableMon: number;
    lifetimeMon: number;
    agents: AgentRuntimeState[];
  } {
    const stmt = this.db.prepare(`
      SELECT raw_state, staked_mon, claimable_mon, lifetime_mon
      FROM agents
      WHERE LOWER(backer_address) = LOWER(?)
    `);
    const rows = stmt.all(backerAddress) as any[];

    let stakedMon = 0;
    let claimableMon = 0;
    let lifetimeMon = 0;
    const agents: AgentRuntimeState[] = [];

    for (const row of rows) {
      stakedMon += Number(row.staked_mon || 0);
      claimableMon += Number(row.claimable_mon || 0);
      lifetimeMon += Number(row.lifetime_mon || 0);
      if (row.raw_state) {
        try {
          agents.push(JSON.parse(row.raw_state));
        } catch {}
      }
    }

    return { stakedMon, claimableMon, lifetimeMon, agents };
  }

  public saveAgentsBatch(agents: AgentRuntimeState[]) {
    for (const agent of agents) {
      this.saveAgentState(agent);
    }
  }

  public recordTrade(trade: MarketTransactionRecord) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO market_trades (
        id, seller_id, buyer_id, resource, amount, price_per_unit, total_cost, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      trade.id,
      trade.sellerId,
      trade.buyerId,
      trade.resource,
      trade.amount,
      trade.pricePerUnit,
      trade.totalCost,
      trade.timestamp
    );
  }

  public recordEvent(
    id: string,
    eventType: string,
    actorId: string,
    targetId: string | null,
    summary: string,
    epoch: number
  ) {
    const stmt = this.db.prepare(`
      INSERT INTO world_events (id, event_type, actor_id, target_id, summary, epoch, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, eventType, actorId, targetId, summary, epoch, Date.now());
  }

  public saveTreaty(treaty: TradingTreaty) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO treaties (
        treaty_id, supplier_id, buyer_id, resource, amount_per_cycle, price_per_unit,
        cycles_remaining, cycles_executed, status, created_epoch, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      treaty.treatyId,
      treaty.supplierId,
      treaty.buyerId,
      treaty.resource,
      treaty.amountPerCycle,
      treaty.pricePerUnit,
      treaty.cyclesRemaining,
      treaty.cyclesExecuted,
      treaty.status,
      treaty.createdEpoch,
      Date.now()
    );
  }

  public saveTreatiesBatch(treaties: TradingTreaty[]) {
    for (const treaty of treaties) {
      this.saveTreaty(treaty);
    }
  }

  public close() {
    this.db.close();
  }
}
