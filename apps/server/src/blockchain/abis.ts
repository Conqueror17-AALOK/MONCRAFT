export const AgentRegistryABI = [
  {
    inputs: [
      { internalType: "uint256", name: "slotId", type: "uint256" },
      { internalType: "uint8", name: "category", type: "uint8" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint8", name: "archetype", type: "uint8" }
    ],
    name: "initializeSlot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "slotId", type: "uint256" }],
    name: "claimAudienceSlot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "slotId", type: "uint256" }],
    name: "getAgent",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "slotId", type: "uint256" },
          { internalType: "uint8", name: "category", type: "uint8" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "uint8", name: "archetype", type: "uint8" },
          { internalType: "address", name: "backer", type: "address" },
          { internalType: "bool", name: "isClaimed", type: "bool" },
          { internalType: "uint256", name: "registeredAt", type: "uint256" }
        ],
        internalType: "struct AgentRegistry.AgentProfile",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

export const CivilizationEconomyABI = [
  {
    inputs: [{ internalType: "uint256", name: "slotId", type: "uint256" }],
    name: "fundAgent",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "epoch", type: "uint256" },
      { internalType: "bytes32", name: "stateRoot", type: "bytes32" },
      { internalType: "uint256", name: "totalGoldCirculating", type: "uint256" }
    ],
    name: "recordSettlementProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "backer", type: "address" },
      { internalType: "uint256", name: "slotId", type: "uint256" },
      { internalType: "uint256", name: "rewardAmount", type: "uint256" }
    ],
    name: "recordBackerPayout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "claimPayout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "backer", type: "address" }],
    name: "getBackerInfo",
    outputs: [
      { internalType: "uint256", name: "staked", type: "uint256" },
      { internalType: "uint256", name: "claimable", type: "uint256" },
      { internalType: "uint256", name: "claimed", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getLatestCheckpoint",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "epoch", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "bytes32", name: "stateRoot", type: "bytes32" },
          { internalType: "uint256", name: "totalGoldCirculating", type: "uint256" }
        ],
        internalType: "struct CivilizationEconomy.SettlementCheckpoint",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

export const ReputationLedgerABI = [
  {
    inputs: [
      { internalType: "uint256", name: "agentA", type: "uint256" },
      { internalType: "uint256", name: "agentB", type: "uint256" },
      { internalType: "uint256", name: "epoch", type: "uint256" }
    ],
    name: "recordAlliance",
    outputs: [{ internalType: "uint256", name: "pactId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "betrayer", type: "uint256" },
      { internalType: "uint256", name: "victim", type: "uint256" },
      { internalType: "uint256", name: "epoch", type: "uint256" },
      { internalType: "string", name: "reason", type: "string" }
    ],
    name: "recordBetrayal",
    outputs: [{ internalType: "uint256", name: "betrayalId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "slotId", type: "uint256" }],
    name: "getReputation",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;
