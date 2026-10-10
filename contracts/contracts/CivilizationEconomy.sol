// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CivilizationEconomy
 * @dev Treasury, participant funding, settlement proof ledger, and backer dividend payouts for Monad Testnet.
 */
contract CivilizationEconomy {
    address public owner;
    address public gameServer;
    bool private _locked;

    struct BackerDeposit {
        address backer;
        uint256 slotId;
        uint256 amount;
        uint256 timestamp;
    }

    struct SettlementCheckpoint {
        uint256 epoch;
        uint256 timestamp;
        bytes32 stateRoot;
        uint256 totalGoldCirculating;
    }

    mapping(uint256 => uint256) public agentFundingBalances;
    mapping(uint256 => address) public slotBackers;
    mapping(address => uint256) public backerTotalStaked;
    mapping(address => uint256) public claimableRewards;
    mapping(address => uint256) public totalRewardsClaimed;
    SettlementCheckpoint[] public checkpoints;

    event AgentFunded(uint256 indexed slotId, address indexed backer, uint256 amount);
    event SettlementProofRecorded(uint256 indexed epoch, bytes32 stateRoot, uint256 totalGold);
    event BackerPayoutCredited(address indexed backer, uint256 indexed slotId, uint256 amount);
    event PayoutClaimed(address indexed backer, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    modifier onlyServerOrOwner() {
        require(msg.sender == gameServer || msg.sender == owner, "Only server or owner");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    constructor() {
        owner = msg.sender;
        gameServer = msg.sender;
    }

    receive() external payable {}

    function setGameServer(address _gameServer) external {
        require(msg.sender == owner, "Only owner");
        gameServer = _gameServer;
    }

    /**
     * @notice Participant funds an audience agent slot with native testnet MON
     * @param slotId Slot index (10-19 for audience agents)
     */
    function fundAgent(uint256 slotId) external payable {
        require(msg.value > 0, "Funding amount must be > 0");
        require(slotId < 40, "Invalid slot ID");

        agentFundingBalances[slotId] += msg.value;
        backerTotalStaked[msg.sender] += msg.value;
        if (slotBackers[slotId] == address(0)) {
            slotBackers[slotId] = msg.sender;
        }

        emit AgentFunded(slotId, msg.sender, msg.value);
    }

    /**
     * @notice Authoritative game server credits economic dividends / rewards earned by an agent to its backer
     * @param backer Address of the participant backer
     * @param slotId Slot ID of the backed agent
     * @param rewardAmount Reward in wei
     */
    function recordBackerPayout(
        address backer,
        uint256 slotId,
        uint256 rewardAmount
    ) external onlyServerOrOwner {
        require(backer != address(0), "Invalid backer address");
        require(rewardAmount > 0, "Reward must be > 0");
        require(address(this).balance >= rewardAmount, "Insufficient treasury balance");

        claimableRewards[backer] += rewardAmount;
        emit BackerPayoutCredited(backer, slotId, rewardAmount);
    }

    /**
     * @notice Participant claims their accumulated economic dividends/payouts in native MON
     */
    function claimPayout() external nonReentrant {
        uint256 amount = claimableRewards[msg.sender];
        require(amount > 0, "No claimable rewards");
        require(address(this).balance >= amount, "Insufficient contract balance");

        claimableRewards[msg.sender] = 0;
        totalRewardsClaimed[msg.sender] += amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(msg.sender, amount);
        emit PayoutClaimed(msg.sender, amount);
    }

    /**
     * @notice Record authoritative state root checkpoint
     */
    function recordSettlementProof(
        uint256 epoch,
        bytes32 stateRoot,
        uint256 totalGoldCirculating
    ) external onlyServerOrOwner {
        checkpoints.push(SettlementCheckpoint({
            epoch: epoch,
            timestamp: block.timestamp,
            stateRoot: stateRoot,
            totalGoldCirculating: totalGoldCirculating
        }));

        emit SettlementProofRecorded(epoch, stateRoot, totalGoldCirculating);
    }

    function getLatestCheckpoint() external view returns (SettlementCheckpoint memory) {
        require(checkpoints.length > 0, "No checkpoints yet");
        return checkpoints[checkpoints.length - 1];
    }

    function getBackerInfo(address backer) external view returns (
        uint256 staked,
        uint256 claimable,
        uint256 claimed
    ) {
        return (backerTotalStaked[backer], claimableRewards[backer], totalRewardsClaimed[backer]);
    }
}
