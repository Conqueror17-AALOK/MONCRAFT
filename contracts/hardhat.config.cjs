require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

let rawKey = (process.env.MONAD_OPERATOR_PRIVATE_KEY || "").trim().replace(/^["']|["']$/g, "");
if (rawKey && !rawKey.startsWith("0x")) {
  rawKey = "0x" + rawKey;
}

const isPlaceholder = !rawKey || /^0x?0+$/.test(rawKey);
if (isPlaceholder && process.argv.includes("monadTestnet")) {
  console.error("\n❌ ERROR: MONAD_OPERATOR_PRIVATE_KEY in .env is still set to placeholder zeros!");
  console.error("👉 Please open your .env file, paste your real wallet private key on line 32, and save (Ctrl+S).\n");
  process.exit(1);
}

const OPERATOR_PRIVATE_KEY = isPlaceholder
  ? "0x0000000000000000000000000000000000000000000000000000000000000001"
  : rawKey;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    monadTestnet: {
      url: MONAD_RPC_URL,
      chainId: 10143,
      accounts: [OPERATOR_PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
