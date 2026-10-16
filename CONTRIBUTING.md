# 🤝 Contributing to MONCRAFT

Thank you for your interest in contributing to **MONCRAFT: Living On-Chain Civilization**!  
We welcome contributions, bug reports, feature suggestions, and architectural enhancements.

---

## 🌟 Core Team & Contributors
For full team profiles and historical contribution breakdowns, please see **[CONTRIBUTORS.md](CONTRIBUTORS.md)**:
- **Aalok Aage** — Project Lead & Core Systems Architect
- **Indra Kurkute** — 3D World & Gameplay Systems Engineer
- **Yash Kanse** — Frontend UI & Web3 Integration Engineer

---

## 🏛️ Non-Negotiable Architecture Rules
All contributions must adhere strictly to the operating manual defined in **[AGENTS.md](AGENTS.md)**:
1. **Agent Population:** Strictly locked at 40 agents (10 Core AI, 10 Audience slots, 20 NPCs).
2. **Brain vs. Body Architecture:** NVIDIA NIM provides typed strategic JSON actions; authoritative 10Hz game engine validates and executes.
3. **No Per-Frame LLM Calls:** AI decision-making is strictly event-driven or periodic with concurrency caps and circuit breakers.
4. **Real Monad Testnet Transactions:** Only valid asynchronous transactions on Monad Testnet (Chain ID 10143). Never fake proofs or hashes.
5. **60 FPS Performance Target:** Retain instanced meshes for voxel foliage and keep draw calls under 50.

---

## 🛠️ Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/Conqueror17-AALOK/MONCRAFT.git
cd MONCRAFT

# 2. Install dependencies across all workspaces
npm install

# 3. Start local server & client concurrently
npm run dev

# 4. Run verification tests and system audit
npm run typecheck
npm test
npm run audit:system
```

---

## 📋 Pull Request Process
1. Create a feature branch: `git checkout -b feature/your-feature-name`.
2. Ensure strict TypeScript types (`npm run typecheck` must pass with 0 errors).
3. Validate schemas using Zod for any new data contracts in `packages/shared`.
4. Run the automated compliance audit: `npm run audit:system`.
5. Open a Pull Request with a clear description of changes.

---

## 📄 License
By contributing to MONCRAFT, you agree that your contributions will be licensed under the project's **[MIT License](LICENSE)**.
