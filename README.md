# MONCRAFT — Living On-Chain Civilization (Monad Hackathon)

<div align="center">

<img src="apps/client/public/moncraft-logo.png" alt="MONCRAFT Logo" width="540" />

### *An Autonomous, Roblox-Style 3D Voxel Civilization on Monad*
**40 Autonomous AI Agents living, gathering, trading, and competing on Monad Testnet.**

[![Monad Testnet](https://img.shields.io/badge/Network-Monad%20Testnet%20(10143)-836ef9?style=for-the-badge&logo=ethereum&logoColor=white)](https://testnet.monadexplorer.com)
[![NVIDIA NIM](https://img.shields.io/badge/AI%20Runtime-NVIDIA%20NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://build.nvidia.com)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-Watch%20on%20X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/aalok_17_/status/2108918658630312406)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Performance](https://img.shields.io/badge/Performance-60%20FPS%20Target-10b981?style=for-the-badge)](PERFORMANCE.md)
[![System Audit](https://img.shields.io/badge/System%20Audit-13%2F13%20Passing-brightgreen?style=for-the-badge)](scripts/audit_system.ts)

</div>

---

## 🎤 3-Minute Pitch Quick Reference (Judges & Evaluation)

> **Mandatory Verbal Callouts for Hackathon Judges (Basic Points — 100/100):**

| Verbal Callout | Details | Verification Link |
| :--- | :--- | :--- |
| **1. Public GitHub Repo** | `Conqueror17-AALOK/MONCRAFT` | [github.com/Conqueror17-AALOK/MONCRAFT](https://github.com/Conqueror17-AALOK/MONCRAFT) |
| **2. CivilizationEconomy Contract** | `0x902Fb2930aF339f27405eeCc26d110F7bf280c53` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x902Fb2930aF339f27405eeCc26d110F7bf280c53) |
| **   AgentRegistry Contract** | `0x3846DD64271E806bf0DD612817797C7A35d08014` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x3846DD64271E806bf0DD612817797C7A35d08014) |
| **   ReputationLedger Contract** | `0xec91a69A6ec61dfe58C13738c94C5E38B9eD37c3` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0xec91a69A6ec61dfe58C13738c94C5E38B9eD37c3) |
| **3. Live Application URL** | Spectator 3D World & Mobile Claim Portal | [Live Web App](https://moncraft-production.up.railway.app) • [Mobile QR Portal](https://moncraft-production.up.railway.app/claim/10) |
| **4. Demo Video & X Announcement** | Official 30s Gameplay Demo & Post on X | [Watch Demo Video on X ↗](https://x.com/aalok_17_/status/2108918658630312406) |
| **5. Deployment & Infrastructure** | Monad Testnet (10143) + 10Hz Engine + NVIDIA NIM | Monad RPC: `https://testnet-rpc.monad.xyz` |

---

## 🔴 Live Transaction During Demo (Judges Step-by-Step)

Demonstrate live on-chain Monad transactions in **under 30 seconds** during your presentation:

1. **Scan QR Code:** On the 3D client, click any of the 10 Audience Agents or click the top-right **"Claim Agent"** button. A dynamic QR code appears.
2. **Back on Monad:** Scan the QR code on your mobile phone (or click the desktop claim drawer), connect your Monad Testnet wallet (MetaMask / Rabby / Brave), give your agent a custom name, and deposit testnet MON (e.g. `1 MON`).
3. **Instant On-Chain Confirmation:** 
   - Monad processes the transaction in **sub-second finality**.
   - The agent instantly receives a glowing cyber backing aura and displays your wallet backer address on their 3D nameplate.
   - The agent begins working and earning **native MON dividend rewards** that you can claim back to your wallet at any time!

---

## 🏛️ Smart Contracts on Monad Testnet (Chain ID: 10143)

All smart contracts are deployed, functional, and verified on the Monad testnet:

| Contract | Address | Purpose | Explorer Link |
| :--- | :--- | :--- | :--- |
| **`CivilizationEconomy.sol`** | `0x902Fb2930aF339f27405eeCc26d110F7bf280c53` | Participant funding escrow, 30s dividend payouts, non-reentrant native MON claims, economic settlement proofs | [Verify on Explorer ↗](https://testnet.monadexplorer.com/address/0x902Fb2930aF339f27405eeCc26d110F7bf280c53) |
| **`AgentRegistry.sol`** | `0x3846DD64271E806bf0DD612817797C7A35d08014` | Authoritative on-chain registry of 40 agent slots, metadata archetypes, custom backer names, and backing status | [Verify on Explorer ↗](https://testnet.monadexplorer.com/address/0x3846DD64271E806bf0DD612817797C7A35d08014) |
| **`ReputationLedger.sol`** | `0xec91a69A6ec61dfe58C13738c94C5E38B9eD37c3` | Immutable on-chain log recording major alliances, diplomatic pacts, and strategic economic betrayals | [Verify on Explorer ↗](https://testnet.monadexplorer.com/address/0xec91a69A6ec61dfe58C13738c94C5E38B9eD37c3) |
| **Backend Operator** | `0x3dae2705E4fe834E4f4e9DD262b4eD899bD0b9F1` | Game server signing key for asynchronous state batches and dividend credit transactions | [Verify on Explorer ↗](https://testnet.monadexplorer.com/address/0x3dae2705E4fe834E4f4e9DD262b4eD899bD0b9F1) |

---

## ⚡ System Architecture: "Brain vs. Body"

```mermaid
graph TD
    subgraph Brain ["THE BRAIN (AI Reasoning)"]
        NIM["NVIDIA NIM REST Engine\n(Llama-3.2-11b-instruct)"]
        CB["Circuit Breaker & Fallback\n(<12s timeout, max 2 concurrent)"]
        Mem["Layered Memory System\n(Trust Graph, Ring Buffer, History)"]
    end

    subgraph Body ["THE BODY (Game Server)"]
        GE["Authoritative 10Hz Game Loop\n(Node.js / Fastify / WebSocket)"]
        Mkt["Civilization Market Desk\n(Order Book, Tariffs, Subsistence)"]
        DB[("SQLite Persistence\ncivilization.db")]
    end

    subgraph Blockchain ["THE LEDGER (Monad Blockchain)"]
        RPC["Monad Testnet (Chain ID 10143)\n10,000 TPS Parallel EVM"]
        TXQ["Async Non-Blocking Tx Queue\n(Viem / Nonce Throttle)"]
        SC1["CivilizationEconomy.sol"]
        SC2["AgentRegistry.sol"]
    end

    subgraph Client ["THE WORLD (Spectator Client)"]
        R3F["Three.js / React Three Fiber\nStepped Voxel World @ 60 FPS"]
        QR["Mobile QR Claim Portal\n(Wagmi / Injected / Viem)"]
    end

    NIM --> GE
    CB -.-> GE
    GE --> Mkt
    GE --> DB
    GE --> TXQ
    TXQ --> RPC
    RPC --> SC1
    RPC --> SC2
    GE -->|WebSocket 10Hz Delta| R3F
    QR -->|Monad Funding Tx| SC1
```

- **LLM is the BRAIN; Game Engine is the BODY:** NVIDIA NIM emits strictly typed, schema-validated JSON actions. The authoritative server validates inventory, cooldowns, and physics coordinates.
- **Event-Driven AI (Zero Per-Frame LLM Waste):** Core agents reason periodically (15s cooldown) or on meaningful events (betrayals, alliance proposals, price shocks).
- **Asynchronous Blockchain Integration:** Smart contract writes happen in a background queue; the 60 FPS client rendering loop never stalls on RPC calls.

---

## 🎮 Game Mechanics & The 40-Agent Population

The civilization maintains a **strictly locked population of exactly 40 autonomous agents**:

1. **10 Core AI Agents (Harry Potter Archetypes):**
   - High-level strategic reasoning powered by NVIDIA NIM.
   - Distinct personality prompts: *Griphook* (shrewd banker), *Lord Voldemort* (monopolist warlord), *Albus Dumbledore* (diplomatic stabilizer), *Hermione Granger* (market arbitrageur), *Harry Potter* (heroic trader), *Rubeus Hagrid* (resource gatherer), *Arthur Weasley* (technologist), *Draco Malfoy* (opportunist), *Dobby The Elf* (humble accumulator), *Prof Trelawney* (speculative forecaster).
2. **10 Audience Agent Slots:**
   - Claimable by live hackathon participants via QR code + Monad wallet funding.
   - Backers can rename their agent, provide strategic directives, and earn real-time native MON dividends from trading profits.
   - Automatically fall back to autonomous AI if unclaimed.
3. **20 NPC Agents:**
   - Deterministic, high-speed agents driving foundational civilization labor: farming wheat, felling trees, mining iron, and quarrying gold.

### The 4-Resource Subsistence Economy
- 🪵 **WOOD:** Building construction, infrastructure repairs, and defensive palisades.
- 🌾 **WHEAT:** Civilization food supply. Every agent must consume 1 Wheat ration every 25s; food shortages cause famine penalties and slowed movement!
- ⛏️ **IRON:** Tools, blast furnace smelting, weapons, and mechanical upgrades.
- 🪙 **GOLD:** Universal trading currency, stored in wallets and traded on the Agora market desk.
- 🏛️ **Agora Municipal Treasury:** Collects a 6% civic tariff on all market trades to fund public infrastructure and treaty caravans.

---

## 🚀 Quick Start (Run Locally in 60 Seconds Without Help)

### 1. Clone & Install
```bash
git clone https://github.com/Conqueror17-AALOK/MONCRAFT.git
cd MONCRAFT
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(The repository works out of the box with deterministic fallback AI even if you don't supply an NVIDIA NIM key!)*

### 3. Start Game Server & Spectator Client
```bash
npm run dev
```

- **Spectator 3D Client:** Open [http://localhost:3000](http://localhost:3000)
- **Mobile QR Participant Portal:** Open [http://localhost:3000/claim](http://localhost:3000/claim)
- **Game Engine Health Check:** Open [http://localhost:4000/health](http://localhost:4000/health)

### 4. Run Automated Compliance Audit
Verify that all 13 architectural rules pass:
```bash
npm run audit:system
```

---

## 🐳 Docker Deployment (One-Command Reproducibility)

Run the full production stack inside Docker:
```bash
docker compose up --build
```
- Game Server runs on port `4000`.
- 3D Spectator Client served via Nginx on port `3000`.


---

## 📢 Build in Public & Social Media Links

- **Twitter / X Announcement & 30s Gameplay Demo:** [Check Project Post & Demo Video on X ↗](https://x.com/aalok_17_/status/2108918658630312406)  
  *Tagging `@monad`, `@monad_dev`, `@geeky_kartikey` with `#MonadBlitz #MonadTestnet #BuildOnMonad`*
- **Direct Link:** `https://x.com/aalok_17_/status/2108918658630312406`
- **Full Social Post Drafts & Media Kit:** See [PITCH_AND_SOCIALS.md](PITCH_AND_SOCIALS.md)

---

## 📁 Repository Structure

```
├── README.md                  # This file (Judges & evaluation quickstart)
├── CONTRIBUTORS.md            # Core team members & contribution details
├── CONTRIBUTING.md            # Guidelines for community contributions
├── LICENSE                    # MIT License open-source specification
├── AGENTS.md                  # Coding-agent operating manual & memory
├── CONTRACTS.md               # Smart contracts, ABIs, and deployed addresses
├── PITCH_AND_SOCIALS.md       # 3-minute pitch script & ready-to-post socials
├── ARCHITECTURE.md            # Brain vs. Body technical system design
├── PERFORMANCE.md             # 60 FPS budgets, triangles, and draw calls
├── packages/
│   └── shared/                # Zod schemas, action contracts, shared types
├── apps/
│   ├── server/                # 10Hz game loop, NVIDIA NIM, Viem tx queue, SQLite
│   └── client/                # 3D R3F spectator client, LoadingScreen, QR modal
└── contracts/                 # Hardhat smart contracts (Solidity 0.8.24)
```

---

## 👥 Contributors & Core Team

| Contributor | Role | Focus Area |
| :--- | :--- | :--- |
| [**Aalok Aage**](https://github.com/Conqueror17-AALOK) | Project Lead & Core Architect | Full-Stack Architecture, Monad Smart Contracts, NVIDIA NIM, Deployment Pipelines |
| [**Indra Kurkute**](https://github.com/indrak31) | 3D World & Gameplay Engineer | Three.js / R3F Voxel Engine, Character Animations, Subsistence Economy Balancing |
| [**Yash Kanse**](https://github.com/kanseyash65-lang) | Frontend UI & Web3 Engineer | Web3 Wallet Connect, Mobile QR Claiming Portal, Market Desk Charts, System Audits |

- 🌟 **Full Contribution Details:** See [CONTRIBUTORS.md](CONTRIBUTORS.md) for individual responsibilities and historical commits.
- 🤝 **Community Guidelines:** See [CONTRIBUTING.md](CONTRIBUTING.md) for pull request instructions and architectural rules.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---
*Created for Monad Blitz Pune V3 Hackathon (October 2026).*
