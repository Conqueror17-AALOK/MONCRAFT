# ARCHITECTURE.md — Authoritative Technical Architecture

> **Living On-Chain Civilization — Monad Hackathon**  
> **System Architecture Specification**

---

## 1. System Overview & Macro Architecture

The system decouples **rendering (client)**, **simulation & authoritative state (server)**, **strategic reasoning (NVIDIA NIM)**, and **economic consensus (Monad blockchain)**.

```
+-----------------------------------------------------------------------------------+
|                                  MONAD TESTNET                                    |
|   [AgentRegistry.sol]        [CivilizationEconomy.sol]     [ReputationLedger.sol]  |
+------------------------------------------^----------------------------------------+
                                           | Async Viem RPC
+------------------------------------------v----------------------------------------+
|                                  GAME SERVER                                      |
|                                                                                   |
|  +---------------------+   +---------------------+   +--------------------------+ |
|  | Authoritative State |   |  Economy Simulator  |   |    Agent Orchestrator    | |
|  | - 40 Agents         |   |  - Supply & Demand  |   |    - 10 Core AI (NIM)    | |
|  | - Inventory / Gold  |   |  - Dynamic Pricing  |   |    - 10 Audience Slots   | |
|  | - Spatial Grid/Zones|   |  - Economic Shocks  |   |    - 20 Deterministic NPC| |
|  +----------^----------+   +----------^----------+   +------------^-------------+ |
|             |                         |                           |               |
|  +----------v-------------------------v---------------------------v-------------+ |
|  |                      Layered Memory & Event Bus                              | |
|  |                      (Short-term, Relationships, Long-term)                  | |
|  +------------------------------------^-----------------------------------------+ |
|                                       | HTTP (Asynchronous & Queued)              |
|                                       v                                           |
|                            [ NVIDIA NIM RUNTIME ]                                 |
|                         (Llama-3.3-70b-instruct API)                              |
+---------------------------------------^-------------------------------------------+
                                        | Delta Snapshots (WebSocket 10-20 Hz)
+---------------------------------------v-------------------------------------------+
|                                CLIENT FRONTEND                                    |
|                                                                                   |
|  +------------------------------------+   +------------------------------------+  |
|  |       3D World Viewport (R3F)      |   |   Audience Mobile Portal & QR      |  |
|  | - Roblox-style Voxel Town/Terrain  |   | - Connect Wallet (Wagmi/Viem)      |  |
|  | - Instanced Meshes & LOD           |   | - Fund Agent with testnet MON      |  |
|  | - 60 FPS Render Loop (Three.js)    |   | - Strategic Influence Directives   |  |
|  | - Performance Debug HUD            |   | - Live Agent Telemetry View        |  |
|  +------------------------------------+   +------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Server & Simulation Architecture
- **Runtime:** Node.js 26+ with TypeScript.
- **Framework:** Fastify for HTTP REST API and native WebSocket (`ws`) connection manager.
- **Authoritative Ticking:**
  - `Simulation Tick (10 Hz)`: Updates agent target positions, resource node harvesting, collision/grid boundaries.
  - `NPC Logic Tick (2-5 Hz)`: Finite State Machines (FSMs) for 20 NPCs (Harvest -> Transport -> Sell -> Rest).
  - `Delta Broadcast (10 Hz)`: Sends compacted delta messages over WebSocket to connected spectators. Full snapshots sent only on client initial connection or reconnection.
  - `Persistence Sync (1 Hz / On Event)`: Writes ledger state, trade logs, and agent memories to SQLite database (`./data/civilization.db`).

---

## 3. NVIDIA NIM Integration & Agent Decision Engine

### Brain vs. Body Separation
- The LLM **never** controls rendering, animations, coordinates per frame, or executes smart contract calls directly.
- The LLM acts purely as a strategic decision brain emitting structured JSON validated via Zod.

### Event-Driven Triggers & Cooldowns
LLM calls are triggered **only** on significant world events or epoch intervals:
1. Periodic strategic cycle (default cooldown: 15–30 seconds per core agent).
2. Incoming trade or alliance proposal from another agent.
3. Market price shock (resource price delta > 25%).
4. Betrayal or broken alliance event.
5. Participant deposit or guidance command received.

### Structured Output Contract (Zod Schema)
```typescript
interface AIDecisionOutput {
  decisionId: string;
  agentId: string;
  action: 'GATHER' | 'TRADE' | 'PROPOSE_ALLIANCE' | 'BETRAY' | 'BUILD' | 'REST';
  targetAgentId?: string;
  targetResourceId?: 'WOOD' | 'WHEAT' | 'IRON' | 'GOLD';
  amount?: number;
  expectedBenefit: number;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoningSummary: string; // Human-readable for 3D speech bubble & logs
  confidence: number; // 0.0 to 1.0
}
```

### Circuit Breaker & Concurrency Management
- Concurrency limit: Maximum 2 concurrent NIM HTTP requests across the server.
- Request queue: Priority queue prioritizing betrayal/counter-offer decisions over routine gathering cycles.
- Circuit breaker: After 3 consecutive timeouts/failures, Core AI falls back seamlessly to deterministic utility-based decision logic without freezing the civilization.

---

## 4. Agent Memory Architecture

To prevent context window bloat and unnecessary token costs:
1. **Short-Term Memory (Ring Buffer):** Keeps last 10 events (e.g. "Sold 50 Wheat for 10 Gold", "Lysander offered iron trade").
2. **Relationship Graph (Dynamic Trust Matrix):**
   - For each interacting agent: `trustScore (-100 to +100)`, `status ('allied' | 'neutral' | 'hostile')`, `interactionCount`, `lastBetrayalEpoch`.
3. **Long-Term Memory (Compacted Highlights):**
   - Key milestone events (e.g. "Betrayed by Kaelen during Season 1, lost 40 Gold"). Summarized to 1-2 sentence records.

---

## 5. Blockchain Architecture (Monad Testnet)

- **Network:** Monad Testnet (`chainId: 10143`, RPC: `https://testnet-rpc.monad.xyz`).
- **Core Contracts:**
  - `AgentRegistry.sol`: Registers the 40 agent identities, metadata, and backer address bindings.
  - `CivilizationEconomy.sol`: Handles participant funding (deposits), resource settlement proofs, and gold balance locks.
  - `ReputationLedger.sol`: Records immutable logs of major alliances, betrayals, and season winners.
- **Asynchronous Execution Pipeline:**
  - Server maintains an asynchronous transaction queue using `viem`.
  - Game state updates immediately in memory with `PENDING_TX` status.
  - When the Monad block confirms, status upgrades to `CONFIRMED`. If reverted, the server reconciles state gracefully.
  - **The 3D render loop never waits for blockchain RPC.**

---

## 6. 3D Game Client & Rendering Architecture

- **Engine:** React Three Fiber (Three.js wrapper) with Vite.
- **Art Style:** Roblox-inspired voxel/low-poly aesthetic with colorful materials, soft directional shadows, and crisp silhouettes.
- **World Zones:**
  - Town Center & Marketplace (central hub, trading stalls)
  - Wheat Fields & Mill (agricultural sector)
  - Iron Mines & Quarry (rocky cliffs, smelting huts)
  - Deep Forest (timber harvesting zone)
  - Wilderness & Gold Ruins (high-risk high-reward frontier)
- **Spectator Cameras:**
  - Orbit Spectator (pan, zoom, tilt across the entire settlement)
  - Agent Follow Cam (smooth dampening following any selected of the 40 agents)
  - Free-Fly Cinematic Drone Cam
- **Optimization Strategy:**
  - Instanced rendering for static environment props (trees, rocks, voxel blocks).
  - Shared materials and color palette textures.
  - Frustum culling and distance-based level of detail (LOD).
  - Target: **Consistent 60 FPS**.

---

## 7. Participant QR Code Flow
- Desktop client renders dynamic QR codes for available audience agent slots.
- Mobile browser scans QR -> opens `/claim/:agentId`.
- Participant views agent archetype, bio, and status.
- Participant connects wallet (MetaMask / injected EVM) on Monad testnet.
- Participant sends transaction to fund agent -> WebSocket notifies 3D client -> visual aura and nametag update in real time.
