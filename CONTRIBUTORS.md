# 👥 Contributors & Core Team — MONCRAFT

> **Living On-Chain Civilization (Monad Blitz Pune V3 Hackathon)**  
> An autonomous, Roblox-style 3D voxel civilization where 40 AI agents live, gather resources, trade, and build wealth on Monad Testnet with NVIDIA NIM strategic reasoning.

---

## 🌟 Core Team Members & Authors

| Contributor | Role & Domain | Key Focus Areas |
| :--- | :--- | :--- |
| [**Aalok Aage**](https://github.com/Conqueror17-AALOK) | **Project Lead & Core Systems Architect** | Full-Stack Architecture, Monad Smart Contracts (`CivilizationEconomy.sol`, `AgentRegistry.sol`, `ReputationLedger.sol`), NVIDIA NIM REST Integration, Viem Blockchain Queue, Docker & Production Deployments |
| [**Indra Kurkute**](https://github.com/indrak31) | **3D World & Gameplay Systems Engineer** | Three.js / React Three Fiber Voxel Environment, Biome Generation, Character Animation Engine, Dynamic Subsistence & Food Rationing Simulation |
| [**Yash Kanse**](https://github.com/kanseyash65-lang) | **Frontend UI & Web3 Integration Engineer** | Web3 Multi-Wallet Connect Modal, Mobile QR Claiming Portal, Agora Market Desk & Economic Trend Graphs, QA Audits & System Compliance Verification |

---

## 🛠️ Contribution Breakdown

### 1. [**Aalok Aage**](https://github.com/Conqueror17-AALOK)
- **Architecture & System Design:** Formulated the canonical "Brain vs. Body" architecture separating LLM strategic decisions (NVIDIA NIM) from authoritative 10Hz game physics.
- **Smart Contract Engineering:** Authored Solidity 0.8.24 contracts (`AgentRegistry`, `CivilizationEconomy`, `ReputationLedger`), Hardhat deployment pipelines, and passing unit test suites.
- **Asynchronous Blockchain Integration:** Engineered the FIFO transaction queue with non-blocking Monad RPC dispatch, zero-nonce collisions, and dividend distribution logic.
- **AI Orchestration & Guardrails:** Integrated NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`), strict Zod action validation, circuit breakers, and rate-limiting queues.
- **DevOps & Infrastructure:** Configured multi-stage Docker builds, production static SPA delivery, and automated deployment pipelines on Railway.

### 2. [**Indra Kurkute**](https://github.com/indrak31)
- **3D Procedural Voxel World:** Crafted the multi-tiered stepped terrain, winding river, arched stone bridge, Commoner Village, Agora central plaza, and Kaelen's castle braziers.
- **Performance & Asset Optimization:** Implemented instanced foliage (pines, oaks, bushes, rocks) achieving stable 60 FPS performance (<45 draw calls, <40k triangles).
- **Procedural Character Animations:** Designed the 40 voxel avatars with shortest-arc turning interpolation, torso side-sway, step bounce, head glancing, and resource extraction recoil.
- **Simulation Balancing:** Tuned resource harvest cycles, node replenishment rates (WOOD, WHEAT, IRON, GOLD), and agent pathfinding navigation meshes.

### 3. [**Yash Kanse**](https://github.com/kanseyash65-lang)
- **Web3 Wallet & Claims Portal:** Engineered the responsive mobile participant portal (`/claim/:slotId`) enabling instant QR code scanning, agent claiming, and backer dividend tracking.
- **Civilization Market Desk UI:** Built the interactive spectator modal with real-time SVG economic trend graphs for all 4 primary commodities and Agora municipal treasury tracking.
- **Spectator Experience & HUD:** Implemented the AAA loading overlay with animated bouncy dots, floating 3D agent thoughts, live world event toast notifications, and F3 performance profiler.
- **System Verification & Compliance:** Verified the 13/13 automated system audit rules, Monad Explorer transaction linking, and cross-browser wallet connectivity.

---

## 🤝 Contribution Guidelines

We welcome community contributions, suggestions, and extensions to the MONCRAFT civilization ecosystem!

### Core Architectural Rules (Non-Negotiable)
Before submitting a pull request, ensure your code complies with our canonical operating manual in [AGENTS.md](AGENTS.md):
1. **Agent Population:** Strictly locked at 40 agents (10 Core AI, 10 Audience slots, 20 NPCs).
2. **AI Decision Isolation:** NVIDIA NIM is the brain (typed JSON actions); the 10Hz game engine is the body. The LLM never controls coordinates directly.
3. **No Per-Frame LLM Calls:** All AI strategic reasoning is event-driven or periodic with circuit breakers.
4. **Real Monad Testnet Integration:** All on-chain events submit authentic transactions to Monad Testnet (Chain ID 10143).
5. **60 FPS Performance Target:** Retain instanced meshes and keep draw calls below 50.

### Development Workflow
```bash
# 1. Clone the repository
git clone https://github.com/Conqueror17-AALOK/MONCRAFT.git

# 2. Install workspace dependencies
npm install

# 3. Start local development environment
npm run dev

# 4. Run TypeScript checks and system audit
npm run typecheck
npm test
npm run audit:system
```

---

## 📜 Acknowledgments & Credits

- **Monad Foundation & Monad Devs:** For the blazing fast 10,000 TPS parallel EVM and developer ecosystem.
- **Monad Blitz Pune V3 Organizers:** Shoutout to `@geeky_kartikey` and the mentors for hosting an incredible builder hackathon.
- **NVIDIA Developer Program:** For providing access to NVIDIA NIM cloud inference endpoints.

---
*Maintained with ❤️ by [Aalok Aage](https://github.com/Conqueror17-AALOK), [Indra Kurkute](https://github.com/indrak31), and [Yash Kanse](https://github.com/kanseyash65-lang) for MONCRAFT (2026).*
