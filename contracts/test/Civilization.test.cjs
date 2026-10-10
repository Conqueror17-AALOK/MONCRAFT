const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Living On-Chain Civilization Smart Contracts", function () {
  let owner, server, backer1, backer2;
  let agentRegistry, economy, reputation;

  beforeEach(async function () {
    [owner, server, backer1, backer2] = await ethers.getSigners();

    // 1. Deploy AgentRegistry
    const AgentRegistryFactory = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistryFactory.deploy();
    await agentRegistry.waitForDeployment();
    await agentRegistry.setGameServer(server.address);

    // 2. Deploy CivilizationEconomy
    const EconomyFactory = await ethers.getContractFactory("CivilizationEconomy");
    economy = await EconomyFactory.deploy();
    await economy.waitForDeployment();
    await economy.setGameServer(server.address);

    // 3. Deploy ReputationLedger
    const ReputationFactory = await ethers.getContractFactory("ReputationLedger");
    reputation = await ReputationFactory.deploy();
    await reputation.waitForDeployment();
    await reputation.setGameServer(server.address);
  });

  describe("AgentRegistry", function () {
    it("should initialize Core AI, Audience, and NPC slots", async function () {
      // Slot 0: Core AI
      await agentRegistry.connect(server).initializeSlot(0, 0, "Nexus Prime", 0);
      const agent0 = await agentRegistry.getAgent(0);
      expect(agent0.name).to.equal("Nexus Prime");
      expect(agent0.category).to.equal(0n);
      expect(agent0.isClaimed).to.equal(false);

      // Slot 12: Audience Slot
      await agentRegistry.connect(server).initializeSlot(12, 1, "Audience Slot #12", 1);
      const agent12 = await agentRegistry.getAgent(12);
      expect(agent12.category).to.equal(1n);
      expect(agent12.isClaimed).to.equal(false);

      // Slot 25: NPC Miner
      await agentRegistry.connect(server).initializeSlot(25, 2, "NPC Miner #5", 2);
      const agent25 = await agentRegistry.getAgent(25);
      expect(agent25.category).to.equal(2n);
    });

    it("should allow a backer to claim an audience slot", async function () {
      await agentRegistry.connect(server).initializeSlot(10, 1, "Audience Slot #10", 1);

      await expect(agentRegistry.connect(backer1).claimAudienceSlot(10))
        .to.emit(agentRegistry, "AudienceSlotClaimed")
        .withArgs(10, backer1.address);

      const agent = await agentRegistry.getAgent(10);
      expect(agent.isClaimed).to.equal(true);
      expect(agent.backer).to.equal(backer1.address);

      // Revert if already claimed
      await expect(
        agentRegistry.connect(backer2).claimAudienceSlot(10)
      ).to.be.revertedWith("Slot already claimed");
    });

    it("should reject claiming non-audience slots", async function () {
      await agentRegistry.connect(server).initializeSlot(0, 0, "Core AI #0", 0);
      await expect(
        agentRegistry.connect(backer1).claimAudienceSlot(0)
      ).to.be.revertedWith("Not an audience slot");
    });

    it("should restrict slot initialization to server or owner", async function () {
      await expect(
        agentRegistry.connect(backer1).initializeSlot(1, 0, "Unauthorized", 0)
      ).to.be.revertedWith("Only server or owner");
    });
  });

  describe("CivilizationEconomy", function () {
    it("should allow participants to fund agents with MON", async function () {
      const fundAmount = ethers.parseEther("2.5");

      await expect(
        economy.connect(backer1).fundAgent(10, { value: fundAmount })
      )
        .to.emit(economy, "AgentFunded")
        .withArgs(10, backer1.address, fundAmount);

      expect(await economy.agentFundingBalances(10)).to.equal(fundAmount);
      expect(await economy.backerTotalStaked(backer1.address)).to.equal(fundAmount);
    });

    it("should revert if funding with zero MON", async function () {
      await expect(
        economy.connect(backer1).fundAgent(10, { value: 0 })
      ).to.be.revertedWith("Funding amount must be > 0");
    });

    it("should record settlement proofs from game server", async function () {
      const stateHash = ethers.keccak256(ethers.toUtf8Bytes("state_epoch_42"));
      const totalGold = 12500n;

      await expect(
        economy.connect(server).recordSettlementProof(42, stateHash, totalGold)
      )
        .to.emit(economy, "SettlementProofRecorded")
        .withArgs(42, stateHash, totalGold);

      const latest = await economy.getLatestCheckpoint();
      expect(latest.epoch).to.equal(42n);
      expect(latest.stateRoot).to.equal(stateHash);
      expect(latest.totalGoldCirculating).to.equal(totalGold);
    });

    it("should prevent unauthorized accounts from recording settlement proofs", async function () {
      const stateHash = ethers.keccak256(ethers.toUtf8Bytes("fake_state"));
      await expect(
        economy.connect(backer1).recordSettlementProof(1, stateHash, 1000)
      ).to.be.revertedWith("Only server or owner");
    });

    it("should allow server to credit backer dividend payouts and backer to claim them", async function () {
      // 1. Backer funds agent slot 11 with 3 MON
      const stakeAmount = ethers.parseEther("3.0");
      await economy.connect(backer1).fundAgent(11, { value: stakeAmount });

      // 2. Server deposits treasury funds and credits 0.5 MON dividend profit
      const dividend = ethers.parseEther("0.5");
      await expect(
        economy.connect(server).recordBackerPayout(backer1.address, 11, dividend)
      )
        .to.emit(economy, "BackerPayoutCredited")
        .withArgs(backer1.address, 11, dividend);

      const [staked, claimable, claimed] = await economy.getBackerInfo(backer1.address);
      expect(staked).to.be.greaterThan(0n);
      expect(claimable).to.equal(dividend);
      expect(claimed).to.equal(0n);

      // 3. Backer claims payout
      const initialBalance = await ethers.provider.getBalance(backer1.address);
      const tx = await economy.connect(backer1).claimPayout();
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(backer1.address);
      expect(finalBalance + gasSpent - initialBalance).to.equal(dividend);

      // Verify claimable balance is now 0
      const afterInfo = await economy.getBackerInfo(backer1.address);
      expect(afterInfo.claimable).to.equal(0n);
      expect(afterInfo.claimed).to.equal(dividend);

      // Revert if claiming again with 0 balance
      await expect(
        economy.connect(backer1).claimPayout()
      ).to.be.revertedWith("No claimable rewards");
    });
  });

  describe("ReputationLedger", function () {
    it("should record an alliance and update reputation scores", async function () {
      await expect(reputation.connect(server).recordAlliance(0, 1, 10))
        .to.emit(reputation, "AllianceFormed")
        .withArgs(0, 0, 1, 10);

      expect(await reputation.getReputation(0)).to.equal(10n);
      expect(await reputation.getReputation(1)).to.equal(10n);
    });

    it("should record a betrayal and penalize the betrayer", async function () {
      await expect(
        reputation.connect(server).recordBetrayal(2, 3, 15, "Resource embargo broken")
      )
        .to.emit(reputation, "BetrayalCommitted")
        .withArgs(0, 2, 3, "Resource embargo broken");

      expect(await reputation.getReputation(2)).to.equal(-35n);
    });

    it("should prevent unauthorized accounts from recording alliances or betrayals", async function () {
      await expect(
        reputation.connect(backer1).recordAlliance(0, 1, 5)
      ).to.be.revertedWith("Only server or owner");

      await expect(
        reputation.connect(backer1).recordBetrayal(0, 1, 5, "Malice")
      ).to.be.revertedWith("Only server or owner");
    });
  });
});
