// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IArbitrator
 * @notice Standard interface for external arbitrator contracts compatible with BotEscrow.
 */
interface IArbitrator {
    enum Resolution {
        NONE,
        CLIENT,
        FREELANCER,
        SPLIT
    }

    /**
     * @notice Callback when a dispute is opened on BotEscrow
     * @param disputeId The ID of the opened dispute
     * @param jobId The associated job ID
     * @param client The address of the job client
     * @param freelancer The address of the assigned freelancer
     * @param disputedAmount The remaining native BOT amount held in escrow
     * @param evidenceURI URI linking to dispute evidence
     */
    function onDisputeOpened(
        uint256 disputeId,
        uint256 jobId,
        address client,
        address freelancer,
        uint256 disputedAmount,
        string calldata evidenceURI
    ) external;

    /**
     * @notice Execute resolution on the target BotEscrow contract
     * @param escrowContract Address of the BotEscrow contract
     * @param disputeId The ID of the dispute to resolve
     * @param resolution The resolution decision (CLIENT, FREELANCER, SPLIT)
     * @param clientAmount Amount of native BOT to award the client
     * @param freelancerAmount Amount of native BOT to award the freelancer
     */
    function executeResolution(
        address escrowContract,
        uint256 disputeId,
        uint8 resolution,
        uint256 clientAmount,
        uint256 freelancerAmount
    ) external;
}
