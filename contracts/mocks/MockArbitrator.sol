// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IArbitrator.sol";

interface IBotEscrowCallable {
    function resolveDispute(
        uint256 disputeId,
        uint8 resolution,
        uint256 clientAmount,
        uint256 freelancerAmount
    ) external;
}

/**
 * @title MockArbitrator
 * @notice Mock implementation of an arbitrator contract for testing BotEscrow integration
 */
contract MockArbitrator is IArbitrator {
    struct DisputeLog {
        uint256 disputeId;
        uint256 jobId;
        address client;
        address freelancer;
        uint256 disputedAmount;
        string evidenceURI;
        bool notified;
    }

    address public owner;
    mapping(uint256 => DisputeLog) public disputeLogs;

    event DisputeNotified(uint256 indexed disputeId, uint256 indexed jobId, uint256 amount);
    event DisputeResolvedViaArbitrator(uint256 indexed disputeId, uint8 resolution);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function onDisputeOpened(
        uint256 disputeId,
        uint256 jobId,
        address client,
        address freelancer,
        uint256 disputedAmount,
        string calldata evidenceURI
    ) external override {
        disputeLogs[disputeId] = DisputeLog({
            disputeId: disputeId,
            jobId: jobId,
            client: client,
            freelancer: freelancer,
            disputedAmount: disputedAmount,
            evidenceURI: evidenceURI,
            notified: true
        });

        emit DisputeNotified(disputeId, jobId, disputedAmount);
    }

    function executeResolution(
        address escrowContract,
        uint256 disputeId,
        uint8 resolution,
        uint256 clientAmount,
        uint256 freelancerAmount
    ) external override onlyOwner {
        IBotEscrowCallable(escrowContract).resolveDispute(
            disputeId,
            resolution,
            clientAmount,
            freelancerAmount
        );

        emit DisputeResolvedViaArbitrator(disputeId, resolution);
    }

    receive() external payable {}
}
