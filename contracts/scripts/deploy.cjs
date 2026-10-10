const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Living Civilization Contracts to Monad Testnet (Chain ID: 10143)...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function getDeploymentOverrides() {
    const feeData = await hre.ethers.provider.getFeeData();
    const baseGas = feeData.gasPrice || 105000000000n;
    const gasPrice = (baseGas * 150n) / 100n; // 50% buffer to prevent priority clash
    return { gasPrice };
  }

  // 1. Deploy AgentRegistry
  console.log("Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(await getDeploymentOverrides());
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("AgentRegistry deployed to:", agentRegistryAddress);
  await delay(4000);

  // 2. Deploy CivilizationEconomy
  console.log("Deploying CivilizationEconomy...");
  const CivilizationEconomy = await hre.ethers.getContractFactory("CivilizationEconomy");
  const economy = await CivilizationEconomy.deploy(await getDeploymentOverrides());
  await economy.waitForDeployment();
  const economyAddress = await economy.getAddress();
  console.log("CivilizationEconomy deployed to:", economyAddress);
  await delay(4000);

  // 3. Deploy ReputationLedger
  console.log("Deploying ReputationLedger...");
  const ReputationLedger = await hre.ethers.getContractFactory("ReputationLedger");
  const reputation = await ReputationLedger.deploy(await getDeploymentOverrides());
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("ReputationLedger deployed to:", reputationAddress);
  await delay(4000);

  // Set game server if GAME_SERVER_ADDRESS is provided in env
  const gameServerAddress = process.env.GAME_SERVER_WALLET_ADDRESS || deployer.address;
  if (gameServerAddress !== deployer.address) {
    console.log(`Setting game server to: ${gameServerAddress}`);
    await (await agentRegistry.setGameServer(gameServerAddress, await getDeploymentOverrides())).wait();
    await (await economy.setGameServer(gameServerAddress, await getDeploymentOverrides())).wait();
    await (await reputation.setGameServer(gameServerAddress, await getDeploymentOverrides())).wait();
  }

  const deployedInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 10143,
    deployer: deployer.address,
    gameServer: gameServerAddress,
    contracts: {
      AgentRegistry: agentRegistryAddress,
      CivilizationEconomy: economyAddress,
      ReputationLedger: reputationAddress
    },
    timestamp: new Date().toISOString()
  };

  const outputPath = path.join(__dirname, "../deployedAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployedInfo, null, 2));
  console.log(`Addresses saved to: ${outputPath}`);

  console.log("\nDeployment complete! Environment variables:");
  console.log(`CONTRACT_AGENT_REGISTRY=${agentRegistryAddress}`);
  console.log(`CONTRACT_CIVILIZATION_ECONOMY=${economyAddress}`);
  console.log(`CONTRACT_REPUTATION_LEDGER=${reputationAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
