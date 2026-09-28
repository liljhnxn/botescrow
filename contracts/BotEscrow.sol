// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IArbitrator.sol";

/**
 * @title BotEscrow
 * @author BotEscrow Protocol
 * @notice Production-grade decentralized freelance/work escrow protocol running on Botchain.
 *         Custodies native BOT in smart contract escrow, manages milestone lifecycle,
 *         facilitates mutual cancellations, and enables fair dispute resolution via arbitrators.
 */
contract BotEscrow is ReentrancyGuard, Pausable, AccessControl {
    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------
    bytes32 public constant ARBITRATOR_MANAGER_ROLE = keccak256("ARBITRATOR_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    uint256 public constant MAX_FEE_BPS = 1000; // 10.00% maximum protocol fee

    // -------------------------------------------------------------------------
    // Enums
    // -------------------------------------------------------------------------
    enum JobStatus {
        CREATED,
        ACTIVE,
        COMPLETED,
        CANCELLED,
        DISPUTED,
        RESOLVED
    }

    enum MilestoneStatus {
        PENDING,
        SUBMITTED,
        APPROVED,
        RELEASED,
        REJECTED,
        DISPUTED,
        CANCELLED
    }

    enum DisputeResolution {
        NONE,
        CLIENT,
        FREELANCER,
        SPLIT
    }

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------
    struct MilestoneInput {
        string title;
        string description;
        uint256 amount;
        uint256 dueDate;
    }

    struct Milestone {
        uint256 milestoneId;
        uint256 jobId;
        string title;
        string description;
        uint256 amount;
        uint256 dueDate;
        MilestoneStatus status;
        string submissionURI;
        uint256 submittedAt;
        uint256 releasedAt;
    }

    struct Job {
        uint256 jobId;
        address client;
        address freelancer;
        string title;
        string description;
        string metadataURI;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 createdAt;
        uint256 deadline;
        JobStatus status;
        uint256 disputeId;
        uint256 milestoneCount;
        bool cancellationRequested;
        address cancellationInitiator;
    }

    struct Dispute {
        uint256 disputeId;
        uint256 jobId;
        address openedBy;
        uint256 openedAt;
        string evidenceURI;
        bool resolved;
        DisputeResolution resolution;
        uint256 clientAward;
        uint256 freelancerAward;
        uint256 resolvedAt;
    }

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    uint256 private _jobCounter;
    uint256 private _disputeCounter;

    uint256 public protocolFeeBps; // Fee in basis points (100 = 1%)
    address public treasury;
    address public arbitrator;

    mapping(uint256 => Job) private _jobs;
    mapping(uint256 => Milestone[]) private _jobMilestones;
    mapping(uint256 => Dispute) private _disputes;

    mapping(address => uint256[]) private _clientJobs;
    mapping(address => uint256[]) private _freelancerJobs;

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------
    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidState(JobStatus current, JobStatus required);
    error InvalidMilestoneState(MilestoneStatus current, MilestoneStatus required);
    error Unauthorized();
    error EmptyTitle();
    error NoMilestones();
    error MilestoneAmountMismatch(uint256 expected, uint256 actual);
    error ZeroMilestoneAmount(uint256 index);
    error NativeTransferFailed();
    error MilestoneNotSubmitted();
    error MilestoneNotApproved();
    error AlreadyReleased();
    error DisputeNotActive();
    error DisputeAlreadyResolved();
    error ExceedsEscrow(uint256 requested, uint256 available);
    error InvalidResolution();
    error FeeTooHigh(uint256 bps, uint256 maxBps);
    error CancellationAlreadyRequested();
    error CancellationNotRequested();
    error CannotApproveOwnCancellation();
    error NotJobParticipant();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );
    event JobAccepted(uint256 indexed jobId, address indexed freelancer);
    event MilestoneSubmitted(
        uint256 indexed jobId,
        uint256 indexed milestoneId,
        string submissionURI
    );
    event MilestoneApproved(uint256 indexed jobId, uint256 indexed milestoneId);
    event MilestoneRejected(uint256 indexed jobId, uint256 indexed milestoneId);
    event MilestonePaymentReleased(
        uint256 indexed jobId,
        uint256 indexed milestoneId,
        uint256 amount
    );
    event JobCompleted(uint256 indexed jobId);
    event CancellationRequested(uint256 indexed jobId, address indexed initiator);
    event CancellationRevoked(uint256 indexed jobId, address indexed initiator);
    event JobCancelled(uint256 indexed jobId);
    event RefundIssued(uint256 indexed jobId, address indexed client, uint256 amount);
    event DisputeOpened(
        uint256 indexed disputeId,
        uint256 indexed jobId,
        address indexed openedBy,
        string evidenceURI
    );
    event DisputeResolved(
        uint256 indexed disputeId,
        uint256 indexed jobId,
        DisputeResolution resolution,
        uint256 clientAward,
        uint256 freelancerAward
    );
    event FundsReleasedByArbitration(
        uint256 indexed jobId,
        uint256 indexed disputeId,
        address indexed recipient,
        uint256 amount
    );
    event ProtocolFeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address indexed newTreasury);
    event ArbitratorUpdated(address indexed newArbitrator);
    event FeeCollected(uint256 indexed jobId, address indexed treasury, uint256 amount);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(
        address initialAdmin,
        address initialArbitrator,
        address initialTreasury,
        uint256 initialFeeBps
    ) {
        if (initialAdmin == address(0)) revert InvalidAddress();
        if (initialArbitrator == address(0)) revert InvalidAddress();
        if (initialTreasury == address(0)) revert InvalidAddress();
        if (initialFeeBps > MAX_FEE_BPS) revert FeeTooHigh(initialFeeBps, MAX_FEE_BPS);

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ARBITRATOR_MANAGER_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
        _grantRole(FEE_MANAGER_ROLE, initialAdmin);

        arbitrator = initialArbitrator;
        treasury = initialTreasury;
        protocolFeeBps = initialFeeBps;

        emit ArbitratorUpdated(initialArbitrator);
        emit TreasuryUpdated(initialTreasury);
        emit ProtocolFeeUpdated(initialFeeBps);
    }

    // -------------------------------------------------------------------------
    // Core Job Lifecycle
    // -------------------------------------------------------------------------

    /**
     * @notice Create a new escrow job with native BOT deposit and defined milestones
     */
    function createJob(
        address freelancer,
        string calldata title,
        string calldata description,
        string calldata metadataURI,
        uint256 deadline,
        MilestoneInput[] calldata milestones
    ) external payable whenNotPaused returns (uint256 jobId) {
        if (freelancer == address(0)) revert InvalidAddress();
        if (freelancer == msg.sender) revert InvalidAddress();
        if (bytes(title).length == 0) revert EmptyTitle();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (milestones.length == 0) revert NoMilestones();

        uint256 totalRequired = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].amount == 0) revert ZeroMilestoneAmount(i);
            totalRequired += milestones[i].amount;
        }

        if (msg.value != totalRequired || msg.value == 0) {
            revert MilestoneAmountMismatch(msg.value, totalRequired);
        }

        _jobCounter++;
        jobId = _jobCounter;

        Job storage newJob = _jobs[jobId];
        newJob.jobId = jobId;
        newJob.client = msg.sender;
        newJob.freelancer = freelancer;
        newJob.title = title;
        newJob.description = description;
        newJob.metadataURI = metadataURI;
        newJob.totalAmount = msg.value;
        newJob.releasedAmount = 0;
        newJob.createdAt = block.timestamp;
        newJob.deadline = deadline;
        newJob.status = JobStatus.CREATED;
        newJob.disputeId = 0;
        newJob.milestoneCount = milestones.length;

        for (uint256 i = 0; i < milestones.length; i++) {
            _jobMilestones[jobId].push(
                Milestone({
                    milestoneId: i,
                    jobId: jobId,
                    title: milestones[i].title,
                    description: milestones[i].description,
                    amount: milestones[i].amount,
                    dueDate: milestones[i].dueDate,
                    status: MilestoneStatus.PENDING,
                    submissionURI: "",
                    submittedAt: 0,
                    releasedAt: 0
                })
            );
        }

        _clientJobs[msg.sender].push(jobId);
        _freelancerJobs[freelancer].push(jobId);

        emit JobCreated(jobId, msg.sender, freelancer, msg.value);
    }

    /**
     * @notice Accept an assigned job as the assigned freelancer
     */
    function acceptJob(uint256 jobId) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.CREATED) {
            revert InvalidState(job.status, JobStatus.CREATED);
        }
        if (msg.sender != job.freelancer) revert Unauthorized();

        job.status = JobStatus.ACTIVE;
        emit JobAccepted(jobId, msg.sender);
    }

    /**
     * @notice Submit evidence of milestone completion by the assigned freelancer
     */
    function submitMilestone(
        uint256 jobId,
        uint256 milestoneId,
        string calldata submissionURI
    ) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (msg.sender != job.freelancer) revert Unauthorized();
        if (milestoneId >= job.milestoneCount) revert InvalidAmount();

        Milestone storage milestone = _jobMilestones[jobId][milestoneId];
        if (
            milestone.status != MilestoneStatus.PENDING &&
            milestone.status != MilestoneStatus.REJECTED
        ) {
            revert InvalidMilestoneState(milestone.status, MilestoneStatus.PENDING);
        }

        milestone.status = MilestoneStatus.SUBMITTED;
        milestone.submissionURI = submissionURI;
        milestone.submittedAt = block.timestamp;

        emit MilestoneSubmitted(jobId, milestoneId, submissionURI);
    }

    /**
     * @notice Client approves a submitted milestone
     */
    function approveMilestone(uint256 jobId, uint256 milestoneId) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (msg.sender != job.client) revert Unauthorized();
        if (milestoneId >= job.milestoneCount) revert InvalidAmount();

        Milestone storage milestone = _jobMilestones[jobId][milestoneId];
        if (milestone.status != MilestoneStatus.SUBMITTED) {
            revert InvalidMilestoneState(milestone.status, MilestoneStatus.SUBMITTED);
        }

        milestone.status = MilestoneStatus.APPROVED;
        emit MilestoneApproved(jobId, milestoneId);
    }

    /**
     * @notice Release payment for an approved milestone
     */
    function releaseMilestone(
        uint256 jobId,
        uint256 milestoneId
    ) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        // Client or freelancer can trigger release once milestone is approved
        if (msg.sender != job.client && msg.sender != job.freelancer) revert Unauthorized();
        if (milestoneId >= job.milestoneCount) revert InvalidAmount();

        Milestone storage milestone = _jobMilestones[jobId][milestoneId];
        if (milestone.status != MilestoneStatus.APPROVED) {
            revert InvalidMilestoneState(milestone.status, MilestoneStatus.APPROVED);
        }

        uint256 paymentAmount = milestone.amount;
        uint256 remaining = job.totalAmount - job.releasedAmount;
        if (paymentAmount > remaining) revert ExceedsEscrow(paymentAmount, remaining);

        // Checks-Effects
        milestone.status = MilestoneStatus.RELEASED;
        milestone.releasedAt = block.timestamp;
        job.releasedAmount += paymentAmount;

        // Check if all milestones are released
        bool allReleased = true;
        for (uint256 i = 0; i < job.milestoneCount; i++) {
            if (_jobMilestones[jobId][i].status != MilestoneStatus.RELEASED) {
                allReleased = false;
                break;
            }
        }
        if (allReleased) {
            job.status = JobStatus.COMPLETED;
            emit JobCompleted(jobId);
        }

        // Handle Protocol Fee deduction if configured
        uint256 fee = 0;
        if (protocolFeeBps > 0 && treasury != address(0)) {
            fee = (paymentAmount * protocolFeeBps) / 10000;
        }
        uint256 netPayout = paymentAmount - fee;

        // Interactions
        emit MilestonePaymentReleased(jobId, milestoneId, paymentAmount);

        if (fee > 0) {
            emit FeeCollected(jobId, treasury, fee);
            _transferBOT(treasury, fee);
        }
        _transferBOT(job.freelancer, netPayout);
    }

    /**
     * @notice Reject a submitted milestone with feedback
     */
    function rejectMilestone(uint256 jobId, uint256 milestoneId) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (msg.sender != job.client) revert Unauthorized();
        if (milestoneId >= job.milestoneCount) revert InvalidAmount();

        Milestone storage milestone = _jobMilestones[jobId][milestoneId];
        if (milestone.status != MilestoneStatus.SUBMITTED) {
            revert InvalidMilestoneState(milestone.status, MilestoneStatus.SUBMITTED);
        }

        milestone.status = MilestoneStatus.REJECTED;
        emit MilestoneRejected(jobId, milestoneId);
    }

    // -------------------------------------------------------------------------
    // Cancellation & Refunds
    // -------------------------------------------------------------------------

    /**
     * @notice Cancel job in CREATED status before acceptance (client or freelancer)
     */
    function cancelCreatedJob(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.CREATED) {
            revert InvalidState(job.status, JobStatus.CREATED);
        }
        if (msg.sender != job.client && msg.sender != job.freelancer) revert Unauthorized();

        uint256 refundAmount = job.totalAmount;
        job.status = JobStatus.CANCELLED;

        for (uint256 i = 0; i < job.milestoneCount; i++) {
            _jobMilestones[jobId][i].status = MilestoneStatus.CANCELLED;
        }

        emit JobCancelled(jobId);
        emit RefundIssued(jobId, job.client, refundAmount);

        _transferBOT(job.client, refundAmount);
    }

    /**
     * @notice Request mutual cancellation of an ACTIVE job
     */
    function requestCancellation(uint256 jobId) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (msg.sender != job.client && msg.sender != job.freelancer) revert Unauthorized();
        if (job.cancellationRequested) revert CancellationAlreadyRequested();

        job.cancellationRequested = true;
        job.cancellationInitiator = msg.sender;

        emit CancellationRequested(jobId, msg.sender);
    }

    /**
     * @notice Revoke a pending cancellation request by the initiator
     */
    function revokeCancellationRequest(uint256 jobId) external whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (!job.cancellationRequested) revert CancellationNotRequested();
        if (msg.sender != job.cancellationInitiator) revert Unauthorized();

        job.cancellationRequested = false;
        job.cancellationInitiator = address(0);

        emit CancellationRevoked(jobId, msg.sender);
    }

    /**
     * @notice Counterparty approves cancellation request, releasing remaining escrow to client
     */
    function approveCancellation(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (!job.cancellationRequested) revert CancellationNotRequested();
        if (msg.sender == job.cancellationInitiator) revert CannotApproveOwnCancellation();
        if (msg.sender != job.client && msg.sender != job.freelancer) revert Unauthorized();

        uint256 remainingEscrow = job.totalAmount - job.releasedAmount;
        job.status = JobStatus.CANCELLED;
        job.cancellationRequested = false;

        for (uint256 i = 0; i < job.milestoneCount; i++) {
            if (_jobMilestones[jobId][i].status != MilestoneStatus.RELEASED) {
                _jobMilestones[jobId][i].status = MilestoneStatus.CANCELLED;
            }
        }

        emit JobCancelled(jobId);
        emit RefundIssued(jobId, job.client, remainingEscrow);

        if (remainingEscrow > 0) {
            _transferBOT(job.client, remainingEscrow);
        }
    }

    // -------------------------------------------------------------------------
    // Dispute System & Arbitration
    // -------------------------------------------------------------------------

    /**
     * @notice Open a dispute on an ACTIVE job by client or freelancer
     */
    function openDispute(
        uint256 jobId,
        string calldata evidenceURI
    ) external whenNotPaused returns (uint256 disputeId) {
        Job storage job = _jobs[jobId];
        if (job.status != JobStatus.ACTIVE) {
            revert InvalidState(job.status, JobStatus.ACTIVE);
        }
        if (msg.sender != job.client && msg.sender != job.freelancer) revert Unauthorized();

        job.status = JobStatus.DISPUTED;

        // Mark unreleased milestones as DISPUTED
        for (uint256 i = 0; i < job.milestoneCount; i++) {
            if (_jobMilestones[jobId][i].status != MilestoneStatus.RELEASED) {
                _jobMilestones[jobId][i].status = MilestoneStatus.DISPUTED;
            }
        }

        _disputeCounter++;
        disputeId = _disputeCounter;

        Dispute storage newDispute = _disputes[disputeId];
        newDispute.disputeId = disputeId;
        newDispute.jobId = jobId;
        newDispute.openedBy = msg.sender;
        newDispute.openedAt = block.timestamp;
        newDispute.evidenceURI = evidenceURI;
        newDispute.resolved = false;
        newDispute.resolution = DisputeResolution.NONE;
        newDispute.clientAward = 0;
        newDispute.freelancerAward = 0;
        newDispute.resolvedAt = 0;

        job.disputeId = disputeId;

        emit DisputeOpened(disputeId, jobId, msg.sender, evidenceURI);

        // Safe callback to external arbitrator contract if applicable
        if (arbitrator.code.length > 0) {
            uint256 remaining = job.totalAmount - job.releasedAmount;
            try
                IArbitrator(arbitrator).onDisputeOpened(
                    disputeId,
                    jobId,
                    job.client,
                    job.freelancer,
                    remaining,
                    evidenceURI
                )
            {} catch {}
        }
    }

    /**
     * @notice Resolve an open dispute by the configured arbitrator
     * @param disputeId The ID of the dispute to resolve
     * @param resolution Enum (1: CLIENT, 2: FREELANCER, 3: SPLIT)
     * @param clientAmount Amount awarded to client (if SPLIT)
     * @param freelancerAmount Amount awarded to freelancer (if SPLIT)
     */
    function resolveDispute(
        uint256 disputeId,
        DisputeResolution resolution,
        uint256 clientAmount,
        uint256 freelancerAmount
    ) external nonReentrant whenNotPaused {
        if (msg.sender != arbitrator) revert Unauthorized();

        Dispute storage dispute = _disputes[disputeId];
        if (dispute.openedAt == 0) revert DisputeNotActive();
        if (dispute.resolved) revert DisputeAlreadyResolved();

        Job storage job = _jobs[dispute.jobId];
        if (job.status != JobStatus.DISPUTED) {
            revert InvalidState(job.status, JobStatus.DISPUTED);
        }

        uint256 remainingEscrow = job.totalAmount - job.releasedAmount;

        if (resolution == DisputeResolution.CLIENT) {
            clientAmount = remainingEscrow;
            freelancerAmount = 0;
        } else if (resolution == DisputeResolution.FREELANCER) {
            clientAmount = 0;
            freelancerAmount = remainingEscrow;
        } else if (resolution == DisputeResolution.SPLIT) {
            if (clientAmount + freelancerAmount != remainingEscrow) {
                revert ExceedsEscrow(clientAmount + freelancerAmount, remainingEscrow);
            }
        } else {
            revert InvalidResolution();
        }

        // Checks-Effects
        dispute.resolved = true;
        dispute.resolution = resolution;
        dispute.clientAward = clientAmount;
        dispute.freelancerAward = freelancerAmount;
        dispute.resolvedAt = block.timestamp;

        job.status = JobStatus.RESOLVED;
        job.releasedAmount = job.totalAmount; // All remaining escrow is cleared

        emit DisputeResolved(
            disputeId,
            job.jobId,
            resolution,
            clientAmount,
            freelancerAmount
        );

        // Interactions
        if (freelancerAmount > 0) {
            uint256 fee = 0;
            if (protocolFeeBps > 0 && treasury != address(0)) {
                fee = (freelancerAmount * protocolFeeBps) / 10000;
            }
            uint256 netFreelancer = freelancerAmount - fee;

            emit FundsReleasedByArbitration(
                job.jobId,
                disputeId,
                job.freelancer,
                freelancerAmount
            );

            if (fee > 0) {
                emit FeeCollected(job.jobId, treasury, fee);
                _transferBOT(treasury, fee);
            }
            _transferBOT(job.freelancer, netFreelancer);
        }

        if (clientAmount > 0) {
            emit FundsReleasedByArbitration(
                job.jobId,
                disputeId,
                job.client,
                clientAmount
            );
            _transferBOT(job.client, clientAmount);
        }
    }

    // -------------------------------------------------------------------------
    // Protocol Administration
    // -------------------------------------------------------------------------

    /**
     * @notice Set protocol fee in basis points
     */
    function setProtocolFee(uint256 newFeeBps) external onlyRole(FEE_MANAGER_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    /**
     * @notice Update treasury destination address
     */
    function setTreasury(address newTreasury) external onlyRole(FEE_MANAGER_ROLE) {
        if (newTreasury == address(0)) revert InvalidAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Update arbitrator address
     */
    function setArbitrator(
        address newArbitrator
    ) external onlyRole(ARBITRATOR_MANAGER_ROLE) {
        if (newArbitrator == address(0)) revert InvalidAddress();
        arbitrator = newArbitrator;
        emit ArbitratorUpdated(newArbitrator);
    }

    /**
     * @notice Pause protocol actions
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause protocol actions
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function getMilestone(
        uint256 jobId,
        uint256 milestoneId
    ) external view returns (Milestone memory) {
        if (milestoneId >= _jobs[jobId].milestoneCount) revert InvalidAmount();
        return _jobMilestones[jobId][milestoneId];
    }

    function getJobMilestones(
        uint256 jobId
    ) external view returns (Milestone[] memory) {
        return _jobMilestones[jobId];
    }

    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return _disputes[disputeId];
    }

    function getRemainingEscrow(uint256 jobId) public view returns (uint256) {
        Job storage job = _jobs[jobId];
        if (
            job.status == JobStatus.CANCELLED ||
            job.status == JobStatus.COMPLETED ||
            job.status == JobStatus.RESOLVED
        ) {
            return 0;
        }
        return job.totalAmount - job.releasedAmount;
    }

    function getJobBalance(uint256 jobId) external view returns (uint256) {
        return getRemainingEscrow(jobId);
    }

    function getJobCount() external view returns (uint256) {
        return _jobCounter;
    }

    function getDisputeCount() external view returns (uint256) {
        return _disputeCounter;
    }

    function getClientJobs(address client) external view returns (uint256[] memory) {
        return _clientJobs[client];
    }

    function getFreelancerJobs(
        address freelancer
    ) external view returns (uint256[] memory) {
        return _freelancerJobs[freelancer];
    }

    function getProtocolConfig()
        external
        view
        returns (
            uint256 feeBps,
            address treasuryAddr,
            address arbitratorAddr,
            bool isPaused
        )
    {
        return (protocolFeeBps, treasury, arbitrator, paused());
    }

    // -------------------------------------------------------------------------
    // Internal Utilities
    // -------------------------------------------------------------------------

    /**
     * @notice Safe native BOT transfer helper
     */
    function _transferBOT(address recipient, uint256 amount) internal {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) return;
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert NativeTransferFailed();
    }

    // Reject direct unknown transfers to contract
    receive() external payable {
        revert Unauthorized();
    }
}
