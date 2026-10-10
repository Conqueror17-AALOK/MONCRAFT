// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @dev Authoritative on-chain registry of the 40 civilization agents on Monad Testnet.
 */
contract AgentRegistry {
    uint256 public constant TOTAL_SLOTS = 40;
    uint256 public constant CORE_AI_SLOTS = 10;
    uint256 public constant AUDIENCE_SLOTS = 10;
    uint256 public constant NPC_SLOTS = 20;

    address public owner;
    address public gameServer;

    enum AgentCategory { CORE_AI, AUDIENCE, NPC }

    struct AgentProfile {
        uint256 slotId;
        AgentCategory category;
        string name;
        uint8 archetype;
        address backer;
        bool isClaimed;
        uint256 registeredAt;
    }

    mapping(uint256 => AgentProfile) public agents;

    event AgentInitialized(uint256 indexed slotId, AgentCategory category, string name, uint8 archetype);
    event AudienceSlotClaimed(uint256 indexed slotId, address indexed backer);
    event GameServerUpdated(address indexed previousServer, address indexed newServer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyServerOrOwner() {
        require(msg.sender == gameServer || msg.sender == owner, "Only server or owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        gameServer = msg.sender;
    }

    function setGameServer(address _gameServer) external onlyOwner {
        address prev = gameServer;
        gameServer = _gameServer;
        emit GameServerUpdated(prev, _gameServer);
    }

    function initializeSlot(
        uint256 slotId,
        AgentCategory category,
        string calldata name,
        uint8 archetype
    ) external onlyServerOrOwner {
        require(slotId < TOTAL_SLOTS, "Slot out of range");
        agents[slotId] = AgentProfile({
            slotId: slotId,
            category: category,
            name: name,
            archetype: archetype,
            backer: address(0),
            isClaimed: false,
            registeredAt: block.timestamp
        });
        emit AgentInitialized(slotId, category, name, archetype);
    }

    function claimAudienceSlot(uint256 slotId) external {
        require(slotId >= CORE_AI_SLOTS && slotId < (CORE_AI_SLOTS + AUDIENCE_SLOTS), "Not an audience slot");
        require(!agents[slotId].isClaimed, "Slot already claimed");

        agents[slotId].backer = msg.sender;
        agents[slotId].isClaimed = true;

        emit AudienceSlotClaimed(slotId, msg.sender);
    }

    function getAgent(uint256 slotId) external view returns (AgentProfile memory) {
        require(slotId < TOTAL_SLOTS, "Slot out of range");
        return agents[slotId];
    }
}
