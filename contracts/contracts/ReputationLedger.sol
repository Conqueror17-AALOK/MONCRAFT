// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReputationLedger
 * @dev Immutable ledger of diplomatic pacts, alliances, and strategic betrayals on Monad Testnet.
 */
contract ReputationLedger {
    address public owner;
    address public gameServer;

    struct AlliancePact {
        uint256 pactId;
        uint256 agentA;
        uint256 agentB;
        uint256 epoch;
        bool isActive;
    }

    struct BetrayalRecord {
        uint256 betrayalId;
        uint256 betrayerAgent;
        uint256 victimAgent;
        uint256 epoch;
        string reason;
        uint256 timestamp;
    }

    AlliancePact[] public alliances;
    BetrayalRecord[] public betrayals;

    mapping(uint256 => int256) public agentReputationScores;

    event AllianceFormed(uint256 indexed pactId, uint256 indexed agentA, uint256 indexed agentB, uint256 epoch);
    event AllianceBroken(uint256 indexed pactId, uint256 epoch);
    event BetrayalCommitted(uint256 indexed betrayalId, uint256 indexed betrayer, uint256 indexed victim, string reason);

    modifier onlyServerOrOwner() {
        require(msg.sender == gameServer || msg.sender == owner, "Only server or owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        gameServer = msg.sender;
    }

    function setGameServer(address _gameServer) external {
        require(msg.sender == owner, "Only owner");
        gameServer = _gameServer;
    }

    function recordAlliance(uint256 agentA, uint256 agentB, uint256 epoch) external onlyServerOrOwner returns (uint256 pactId) {
        pactId = alliances.length;
        alliances.push(AlliancePact({
            pactId: pactId,
            agentA: agentA,
            agentB: agentB,
            epoch: epoch,
            isActive: true
        }));

        agentReputationScores[agentA] += 10;
        agentReputationScores[agentB] += 10;

        emit AllianceFormed(pactId, agentA, agentB, epoch);
    }

    function recordBetrayal(
        uint256 betrayer,
        uint256 victim,
        uint256 epoch,
        string calldata reason
    ) external onlyServerOrOwner returns (uint256 betrayalId) {
        betrayalId = betrayals.length;
        betrayals.push(BetrayalRecord({
            betrayalId: betrayalId,
            betrayerAgent: betrayer,
            victimAgent: victim,
            epoch: epoch,
            reason: reason,
            timestamp: block.timestamp
        }));

        agentReputationScores[betrayer] -= 35;

        emit BetrayalCommitted(betrayalId, betrayer, victim, reason);
    }

    function getReputation(uint256 slotId) external view returns (int256) {
        return agentReputationScores[slotId];
    }
}
