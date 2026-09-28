import { expect } from "chai";
import { ethers } from "hardhat";
import { BotEscrow, MockArbitrator } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BotEscrow Protocol", function () {
  let botEscrow: BotEscrow;
  let mockArbitrator: MockArbitrator;
  let admin: SignerWithAddress;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let arbitrator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let stranger: SignerWithAddress;

  const INITIAL_FEE_BPS = 250; // 2.5%
  const ONE_DAY = 24 * 60 * 60;

  beforeEach(async function () {
    [admin, client, freelancer, arbitrator, treasury, stranger] = await ethers.getSigners();

    // Deploy MockArbitrator
    const MockArbitratorFactory = await ethers.getContractFactory("MockArbitrator");
    mockArbitrator = await MockArbitratorFactory.deploy();
    await mockArbitrator.waitForDeployment();

    // Deploy BotEscrow
    const BotEscrowFactory = await ethers.getContractFactory("BotEscrow");
    botEscrow = await BotEscrowFactory.deploy(
      admin.address,
      arbitrator.address,
      treasury.address,
      INITIAL_FEE_BPS
    );
    await botEscrow.waitForDeployment();
  });

  describe("Deployment & Configuration", function () {
    it("should initialize with correct roles, fee, treasury, and arbitrator", async function () {
      const config = await botEscrow.getProtocolConfig();
      expect(config.feeBps).to.equal(INITIAL_FEE_BPS);
      expect(config.treasuryAddr).to.equal(treasury.address);
      expect(config.arbitratorAddr).to.equal(arbitrator.address);
      expect(config.isPaused).to.be.false;

      expect(await botEscrow.hasRole(await botEscrow.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await botEscrow.hasRole(await botEscrow.ARBITRATOR_MANAGER_ROLE(), admin.address)).to.be.true;
      expect(await botEscrow.hasRole(await botEscrow.PAUSER_ROLE(), admin.address)).to.be.true;
      expect(await botEscrow.hasRole(await botEscrow.FEE_MANAGER_ROLE(), admin.address)).to.be.true;
    });

    it("should reject deployment with zero addresses or excessive fee", async function () {
      const BotEscrowFactory = await ethers.getContractFactory("BotEscrow");
      await expect(
        BotEscrowFactory.deploy(ethers.ZeroAddress, arbitrator.address, treasury.address, 100)
      ).to.be.revertedWithCustomError(botEscrow, "InvalidAddress");

      await expect(
        BotEscrowFactory.deploy(admin.address, ethers.ZeroAddress, treasury.address, 100)
      ).to.be.revertedWithCustomError(botEscrow, "InvalidAddress");

      await expect(
        BotEscrowFactory.deploy(admin.address, arbitrator.address, ethers.ZeroAddress, 100)
      ).to.be.revertedWithCustomError(botEscrow, "InvalidAddress");

      await expect(
        BotEscrowFactory.deploy(admin.address, arbitrator.address, treasury.address, 1001)
      ).to.be.revertedWithCustomError(botEscrow, "FeeTooHigh");
    });
  });

  describe("Job Creation", function () {
    it("should successfully create a job with valid native BOT funding and milestones", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || Math.floor(Date.now() / 1000)) + ONE_DAY * 10;

      const milestones = [
        {
          title: "Milestone 1: Design Specs",
          description: "Architecture and design documentation",
          amount: ethers.parseEther("1.0"),
          dueDate: deadline - ONE_DAY * 5,
        },
        {
          title: "Milestone 2: Implementation",
          description: "Smart contract implementation & tests",
          amount: ethers.parseEther("2.0"),
          dueDate: deadline,
        },
      ];

      const totalAmount = ethers.parseEther("3.0");

      const tx = await botEscrow.connect(client).createJob(
        freelancer.address,
        "Build Web3 Escrow",
        "Full stack escrow MVP on Botchain",
        "ipfs://QmMetadata123",
        deadline,
        milestones,
        { value: totalAmount }
      );

      await expect(tx)
        .to.emit(botEscrow, "JobCreated")
        .withArgs(1, client.address, freelancer.address, totalAmount);

      const job = await botEscrow.getJob(1);
      expect(job.jobId).to.equal(1);
      expect(job.client).to.equal(client.address);
      expect(job.freelancer).to.equal(freelancer.address);
      expect(job.totalAmount).to.equal(totalAmount);
      expect(job.releasedAmount).to.equal(0);
      expect(job.status).to.equal(0); // CREATED
      expect(job.milestoneCount).to.equal(2);

      const jobMilestones = await botEscrow.getJobMilestones(1);
      expect(jobMilestones.length).to.equal(2);
      expect(jobMilestones[0].title).to.equal("Milestone 1: Design Specs");
      expect(jobMilestones[0].amount).to.equal(ethers.parseEther("1.0"));
      expect(jobMilestones[0].status).to.equal(0); // PENDING

      expect(await botEscrow.getRemainingEscrow(1)).to.equal(totalAmount);

      const clientJobs = await botEscrow.getClientJobs(client.address);
      expect(clientJobs.length).to.equal(1);
      expect(clientJobs[0]).to.equal(1);

      const freelancerJobs = await botEscrow.getFreelancerJobs(freelancer.address);
      expect(freelancerJobs.length).to.equal(1);
      expect(freelancerJobs[0]).to.equal(1);
    });

    it("should revert if funding does not match milestone total", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;

      const milestones = [
        {
          title: "M1",
          description: "Desc",
          amount: ethers.parseEther("1.0"),
          dueDate: deadline,
        },
      ];

      await expect(
        botEscrow.connect(client).createJob(
          freelancer.address,
          "Title",
          "Desc",
          "ipfs://",
          deadline,
          milestones,
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWithCustomError(botEscrow, "MilestoneAmountMismatch");
    });

    it("should revert on zero freelancer address, empty title, past deadline, or zero milestone", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const pastDeadline = (latestBlock?.timestamp || 0) - 100;
      const validDeadline = (latestBlock?.timestamp || 0) + ONE_DAY;

      const validMilestones = [
        { title: "M1", description: "Desc", amount: ethers.parseEther("1"), dueDate: validDeadline },
      ];

      // Zero freelancer address
      await expect(
        botEscrow.connect(client).createJob(
          ethers.ZeroAddress,
          "Title",
          "Desc",
          "ipfs://",
          validDeadline,
          validMilestones,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(botEscrow, "InvalidAddress");

      // Self as freelancer
      await expect(
        botEscrow.connect(client).createJob(
          client.address,
          "Title",
          "Desc",
          "ipfs://",
          validDeadline,
          validMilestones,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(botEscrow, "InvalidAddress");

      // Empty title
      await expect(
        botEscrow.connect(client).createJob(
          freelancer.address,
          "",
          "Desc",
          "ipfs://",
          validDeadline,
          validMilestones,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(botEscrow, "EmptyTitle");

      // Past deadline
      await expect(
        botEscrow.connect(client).createJob(
          freelancer.address,
          "Title",
          "Desc",
          "ipfs://",
          pastDeadline,
          validMilestones,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(botEscrow, "InvalidDeadline");

      // No milestones
      await expect(
        botEscrow.connect(client).createJob(
          freelancer.address,
          "Title",
          "Desc",
          "ipfs://",
          validDeadline,
          [],
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(botEscrow, "NoMilestones");

      // Zero milestone amount
      const zeroMilestones = [
        { title: "M1", description: "Desc", amount: 0, dueDate: validDeadline },
      ];
      await expect(
        botEscrow.connect(client).createJob(
          freelancer.address,
          "Title",
          "Desc",
          "ipfs://",
          validDeadline,
          zeroMilestones,
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(botEscrow, "ZeroMilestoneAmount");
    });
  });

  describe("Job Acceptance", function () {
    let jobId: number;

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;
      const milestones = [
        { title: "M1", description: "Desc", amount: ethers.parseEther("1"), dueDate: deadline },
      ];
      await botEscrow.connect(client).createJob(
        freelancer.address,
        "Job 1",
        "Desc",
        "uri",
        deadline,
        milestones,
        { value: ethers.parseEther("1") }
      );
      jobId = 1;
    });

    it("should allow only the assigned freelancer to accept", async function () {
      // Client cannot accept
      await expect(botEscrow.connect(client).acceptJob(jobId)).to.be.revertedWithCustomError(
        botEscrow,
        "Unauthorized"
      );

      // Stranger cannot accept
      await expect(botEscrow.connect(stranger).acceptJob(jobId)).to.be.revertedWithCustomError(
        botEscrow,
        "Unauthorized"
      );

      // Freelancer accepts
      await expect(botEscrow.connect(freelancer).acceptJob(jobId))
        .to.emit(botEscrow, "JobAccepted")
        .withArgs(jobId, freelancer.address);

      const job = await botEscrow.getJob(jobId);
      expect(job.status).to.equal(1); // ACTIVE

      // Cannot accept again
      await expect(botEscrow.connect(freelancer).acceptJob(jobId)).to.be.revertedWithCustomError(
        botEscrow,
        "InvalidState"
      );
    });
  });

  describe("Milestone Lifecycle & Payment Releases", function () {
    let jobId: number;
    const m1Amount = ethers.parseEther("2.0");
    const m2Amount = ethers.parseEther("3.0");

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;
      const milestones = [
        { title: "M1", description: "First Phase", amount: m1Amount, dueDate: deadline },
        { title: "M2", description: "Second Phase", amount: m2Amount, dueDate: deadline },
      ];
      await botEscrow.connect(client).createJob(
        freelancer.address,
        "Dev Protocol",
        "Desc",
        "uri",
        deadline,
        milestones,
        { value: m1Amount + m2Amount }
      );
      jobId = 1;
      await botEscrow.connect(freelancer).acceptJob(jobId);
    });

    it("should handle submission, rejection, resubmission, and approval correctly", async function () {
      // Stranger cannot submit
      await expect(
        botEscrow.connect(stranger).submitMilestone(jobId, 0, "ipfs://evidence1")
      ).to.be.revertedWithCustomError(botEscrow, "Unauthorized");

      // Freelancer submits milestone 0
      await expect(
        botEscrow.connect(freelancer).submitMilestone(jobId, 0, "ipfs://evidence1")
      )
        .to.emit(botEscrow, "MilestoneSubmitted")
        .withArgs(jobId, 0, "ipfs://evidence1");

      let m0 = await botEscrow.getMilestone(jobId, 0);
      expect(m0.status).to.equal(1); // SUBMITTED
      expect(m0.submissionURI).to.equal("ipfs://evidence1");

      // Stranger cannot reject or approve
      await expect(botEscrow.connect(stranger).rejectMilestone(jobId, 0)).to.be.revertedWithCustomError(
        botEscrow,
        "Unauthorized"
      );
      await expect(botEscrow.connect(stranger).approveMilestone(jobId, 0)).to.be.revertedWithCustomError(
        botEscrow,
        "Unauthorized"
      );

      // Client rejects milestone with revisions needed
      await expect(botEscrow.connect(client).rejectMilestone(jobId, 0))
        .to.emit(botEscrow, "MilestoneRejected")
        .withArgs(jobId, 0);

      m0 = await botEscrow.getMilestone(jobId, 0);
      expect(m0.status).to.equal(4); // REJECTED

      // Freelancer resubmits with updated evidence
      await expect(
        botEscrow.connect(freelancer).submitMilestone(jobId, 0, "ipfs://evidence1-v2")
      )
        .to.emit(botEscrow, "MilestoneSubmitted")
        .withArgs(jobId, 0, "ipfs://evidence1-v2");

      m0 = await botEscrow.getMilestone(jobId, 0);
      expect(m0.status).to.equal(1); // SUBMITTED
      expect(m0.submissionURI).to.equal("ipfs://evidence1-v2");

      // Client approves milestone
      await expect(botEscrow.connect(client).approveMilestone(jobId, 0))
        .to.emit(botEscrow, "MilestoneApproved")
        .withArgs(jobId, 0);

      m0 = await botEscrow.getMilestone(jobId, 0);
      expect(m0.status).to.equal(2); // APPROVED
    });

    it("should release milestone payments with correct protocol fee deduction", async function () {
      // Submit & approve milestone 0
      await botEscrow.connect(freelancer).submitMilestone(jobId, 0, "ipfs://evidence1");
      await botEscrow.connect(client).approveMilestone(jobId, 0);

      const fee = (m1Amount * BigInt(INITIAL_FEE_BPS)) / 10000n;
      const netFreelancer = m1Amount - fee;

      const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);
      const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);

      // Client releases payment
      const releaseTx = await botEscrow.connect(client).releaseMilestone(jobId, 0);

      await expect(releaseTx)
        .to.emit(botEscrow, "MilestonePaymentReleased")
        .withArgs(jobId, 0, m1Amount);

      await expect(releaseTx)
        .to.emit(botEscrow, "FeeCollected")
        .withArgs(jobId, treasury.address, fee);

      const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);
      const treasuryBalAfter = await ethers.provider.getBalance(treasury.address);

      expect(freelancerBalAfter - freelancerBalBefore).to.equal(netFreelancer);
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(fee);

      const jobAfter = await botEscrow.getJob(jobId);
      expect(jobAfter.releasedAmount).to.equal(m1Amount);
      expect(jobAfter.status).to.equal(1); // Still ACTIVE since M2 is remaining

      // Cannot release same milestone twice
      await expect(botEscrow.connect(client).releaseMilestone(jobId, 0)).to.be.revertedWithCustomError(
        botEscrow,
        "InvalidMilestoneState"
      );

      // Now complete Milestone 1 to complete the entire job
      await botEscrow.connect(freelancer).submitMilestone(jobId, 1, "ipfs://evidence2");
      await botEscrow.connect(client).approveMilestone(jobId, 1);

      await expect(botEscrow.connect(client).releaseMilestone(jobId, 1))
        .to.emit(botEscrow, "JobCompleted")
        .withArgs(jobId);

      const jobCompleted = await botEscrow.getJob(jobId);
      expect(jobCompleted.status).to.equal(2); // COMPLETED
      expect(jobCompleted.releasedAmount).to.equal(m1Amount + m2Amount);
      expect(await botEscrow.getRemainingEscrow(jobId)).to.equal(0);
    });
  });

  describe("Cancellations & Refunds", function () {
    it("should allow client to cancel CREATED job and receive full refund", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;
      const amount = ethers.parseEther("1.5");
      const milestones = [{ title: "M1", description: "Desc", amount, dueDate: deadline }];

      await botEscrow.connect(client).createJob(
        freelancer.address,
        "Job Cancel",
        "Desc",
        "uri",
        deadline,
        milestones,
        { value: amount }
      );

      const clientBalBefore = await ethers.provider.getBalance(client.address);

      const tx = await botEscrow.connect(client).cancelCreatedJob(1);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      await expect(tx)
        .to.emit(botEscrow, "JobCancelled")
        .withArgs(1);
      await expect(tx)
        .to.emit(botEscrow, "RefundIssued")
        .withArgs(1, client.address, amount);

      const clientBalAfter = await ethers.provider.getBalance(client.address);
      expect(clientBalAfter + gasCost - clientBalBefore).to.equal(amount);

      const job = await botEscrow.getJob(1);
      expect(job.status).to.equal(3); // CANCELLED
      expect(await botEscrow.getRemainingEscrow(1)).to.equal(0);
    });

    it("should handle mutual cancellation on ACTIVE job", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;
      const m1 = ethers.parseEther("1.0");
      const m2 = ethers.parseEther("1.0");
      const milestones = [
        { title: "M1", description: "Desc", amount: m1, dueDate: deadline },
        { title: "M2", description: "Desc", amount: m2, dueDate: deadline },
      ];

      await botEscrow.connect(client).createJob(
        freelancer.address,
        "Active Job Cancel",
        "Desc",
        "uri",
        deadline,
        milestones,
        { value: m1 + m2 }
      );

      await botEscrow.connect(freelancer).acceptJob(1);

      // Release first milestone
      await botEscrow.connect(freelancer).submitMilestone(1, 0, "uri");
      await botEscrow.connect(client).approveMilestone(1, 0);
      await botEscrow.connect(client).releaseMilestone(1, 0);

      // Now client requests mutual cancellation
      await expect(botEscrow.connect(client).requestCancellation(1))
        .to.emit(botEscrow, "CancellationRequested")
        .withArgs(1, client.address);

      // Client cannot approve own cancellation request
      await expect(botEscrow.connect(client).approveCancellation(1)).to.be.revertedWithCustomError(
        botEscrow,
        "CannotApproveOwnCancellation"
      );

      // Stranger cannot approve
      await expect(botEscrow.connect(stranger).approveCancellation(1)).to.be.revertedWithCustomError(
        botEscrow,
        "Unauthorized"
      );

      // Freelancer approves cancellation request
      const clientBalBefore = await ethers.provider.getBalance(client.address);
      const approveTx = await botEscrow.connect(freelancer).approveCancellation(1);

      await expect(approveTx).to.emit(botEscrow, "JobCancelled").withArgs(1);
      await expect(approveTx).to.emit(botEscrow, "RefundIssued").withArgs(1, client.address, m2);

      const clientBalAfter = await ethers.provider.getBalance(client.address);
      expect(clientBalAfter - clientBalBefore).to.equal(m2);

      const job = await botEscrow.getJob(1);
      expect(job.status).to.equal(3); // CANCELLED
      expect(await botEscrow.getRemainingEscrow(1)).to.equal(0);
    });
  });

  describe("Disputes & Arbitration", function () {
    let jobId: number;
    const totalAmount = ethers.parseEther("4.0");

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;
      const milestones = [
        { title: "M1", description: "Desc", amount: totalAmount, dueDate: deadline },
      ];

      await botEscrow.connect(client).createJob(
        freelancer.address,
        "Disputed Project",
        "Desc",
        "uri",
        deadline,
        milestones,
        { value: totalAmount }
      );
      jobId = 1;
      await botEscrow.connect(freelancer).acceptJob(jobId);
    });

    it("should allow either party to open a dispute and freeze milestone releases", async function () {
      // Freelancer submits milestone
      await botEscrow.connect(freelancer).submitMilestone(jobId, 0, "ipfs://evidence");

      // Client opens dispute
      await expect(botEscrow.connect(client).openDispute(jobId, "ipfs://dispute-evidence"))
        .to.emit(botEscrow, "DisputeOpened")
        .withArgs(1, jobId, client.address, "ipfs://dispute-evidence");

      const job = await botEscrow.getJob(jobId);
      expect(job.status).to.equal(4); // DISPUTED
      expect(job.disputeId).to.equal(1);

      const dispute = await botEscrow.getDispute(1);
      expect(dispute.jobId).to.equal(jobId);
      expect(dispute.openedBy).to.equal(client.address);
      expect(dispute.resolved).to.be.false;

      // Normal actions should be blocked while disputed
      await expect(botEscrow.connect(client).approveMilestone(jobId, 0)).to.be.revertedWithCustomError(
        botEscrow,
        "InvalidState"
      );
      await expect(botEscrow.connect(client).releaseMilestone(jobId, 0)).to.be.revertedWithCustomError(
        botEscrow,
        "InvalidState"
      );
    });

    it("should allow only authorized arbitrator to resolve dispute in favor of Client", async function () {
      await botEscrow.connect(client).openDispute(jobId, "ipfs://dispute-evidence");

      // Stranger cannot resolve
      await expect(
        botEscrow.connect(stranger).resolveDispute(1, 1, totalAmount, 0)
      ).to.be.revertedWithCustomError(botEscrow, "Unauthorized");

      const clientBalBefore = await ethers.provider.getBalance(client.address);

      // Arbitrator resolves: 1 = CLIENT
      const tx = await botEscrow.connect(arbitrator).resolveDispute(1, 1, 0, 0);

      await expect(tx)
        .to.emit(botEscrow, "DisputeResolved")
        .withArgs(1, jobId, 1, totalAmount, 0);

      await expect(tx)
        .to.emit(botEscrow, "FundsReleasedByArbitration")
        .withArgs(jobId, 1, client.address, totalAmount);

      const clientBalAfter = await ethers.provider.getBalance(client.address);
      expect(clientBalAfter - clientBalBefore).to.equal(totalAmount);

      const job = await botEscrow.getJob(jobId);
      expect(job.status).to.equal(5); // RESOLVED
      expect(await botEscrow.getRemainingEscrow(jobId)).to.equal(0);

      // Cannot resolve twice
      await expect(
        botEscrow.connect(arbitrator).resolveDispute(1, 1, 0, 0)
      ).to.be.revertedWithCustomError(botEscrow, "DisputeAlreadyResolved");
    });

    it("should allow arbitrator to resolve dispute in favor of Freelancer with fee deduction", async function () {
      await botEscrow.connect(client).openDispute(jobId, "ipfs://dispute-evidence");

      const fee = (totalAmount * BigInt(INITIAL_FEE_BPS)) / 10000n;
      const netFreelancer = totalAmount - fee;

      const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);
      const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);

      // Arbitrator resolves: 2 = FREELANCER
      const tx = await botEscrow.connect(arbitrator).resolveDispute(1, 2, 0, 0);

      await expect(tx)
        .to.emit(botEscrow, "DisputeResolved")
        .withArgs(1, jobId, 2, 0, totalAmount);

      const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);
      const treasuryBalAfter = await ethers.provider.getBalance(treasury.address);

      expect(freelancerBalAfter - freelancerBalBefore).to.equal(netFreelancer);
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(fee);
    });

    it("should allow arbitrator to SPLIT funds between client and freelancer", async function () {
      await botEscrow.connect(client).openDispute(jobId, "ipfs://dispute-evidence");

      const clientAward = ethers.parseEther("1.5");
      const freelancerAward = ethers.parseEther("2.5");
      expect(clientAward + freelancerAward).to.equal(totalAmount);

      const fee = (freelancerAward * BigInt(INITIAL_FEE_BPS)) / 10000n;
      const netFreelancer = freelancerAward - fee;

      const clientBalBefore = await ethers.provider.getBalance(client.address);
      const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);

      // Arbitrator resolves: 3 = SPLIT
      const tx = await botEscrow.connect(arbitrator).resolveDispute(1, 3, clientAward, freelancerAward);

      await expect(tx)
        .to.emit(botEscrow, "DisputeResolved")
        .withArgs(1, jobId, 3, clientAward, freelancerAward);

      const clientBalAfter = await ethers.provider.getBalance(client.address);
      const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);

      expect(clientBalAfter - clientBalBefore).to.equal(clientAward);
      expect(freelancerBalAfter - freelancerBalBefore).to.equal(netFreelancer);
    });

    it("should revert if SPLIT amounts do not equal remaining escrow", async function () {
      await botEscrow.connect(client).openDispute(jobId, "ipfs://dispute-evidence");

      // Split total doesn't match
      await expect(
        botEscrow.connect(arbitrator).resolveDispute(1, 3, ethers.parseEther("1.0"), ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(botEscrow, "ExceedsEscrow");
    });

    it("should notify MockArbitrator contract if arbitrator is a smart contract", async function () {
      // Set arbitrator to MockArbitrator
      await botEscrow.connect(admin).setArbitrator(await mockArbitrator.getAddress());

      // Open new dispute on Job
      await botEscrow.connect(freelancer).openDispute(jobId, "ipfs://mock-evidence");

      const log = await mockArbitrator.disputeLogs(1);
      expect(log.notified).to.be.true;
      expect(log.jobId).to.equal(jobId);
      expect(log.disputedAmount).to.equal(totalAmount);
    });
  });

  describe("Admin, Roles & Security", function () {
    it("should allow FEE_MANAGER to update fee within limit", async function () {
      await expect(botEscrow.connect(admin).setProtocolFee(500))
        .to.emit(botEscrow, "ProtocolFeeUpdated")
        .withArgs(500);

      expect(await botEscrow.protocolFeeBps()).to.equal(500);

      // Exceeding 1000 bps should revert
      await expect(botEscrow.connect(admin).setProtocolFee(1001)).to.be.revertedWithCustomError(
        botEscrow,
        "FeeTooHigh"
      );

      // Unauthorized address cannot update fee
      await expect(botEscrow.connect(stranger).setProtocolFee(100)).to.be.revertedWithCustomError(
        botEscrow,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should allow ARBITRATOR_MANAGER to update arbitrator", async function () {
      await expect(botEscrow.connect(admin).setArbitrator(stranger.address))
        .to.emit(botEscrow, "ArbitratorUpdated")
        .withArgs(stranger.address);

      expect(await botEscrow.arbitrator()).to.equal(stranger.address);

      // Cannot set zero address
      await expect(botEscrow.connect(admin).setArbitrator(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        botEscrow,
        "InvalidAddress"
      );
    });

    it("should support pausing and unpausing by PAUSER_ROLE", async function () {
      await botEscrow.connect(admin).pause();
      expect(await botEscrow.paused()).to.be.true;

      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = (latestBlock?.timestamp || 0) + ONE_DAY * 10;
      const milestones = [
        { title: "M1", description: "Desc", amount: ethers.parseEther("1"), dueDate: deadline },
      ];

      // Actions should revert while paused
      await expect(
        botEscrow.connect(client).createJob(
          freelancer.address,
          "Paused Job",
          "Desc",
          "uri",
          deadline,
          milestones,
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(botEscrow, "EnforcedPause");

      await botEscrow.connect(admin).unpause();
      expect(await botEscrow.paused()).to.be.false;
    });

    it("should reject direct native transfers to the contract", async function () {
      await expect(
        client.sendTransaction({
          to: await botEscrow.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWithCustomError(botEscrow, "Unauthorized");
    });
  });
});
