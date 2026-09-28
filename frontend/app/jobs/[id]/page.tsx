"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  formatBOT,
  resolveIdentity,
  getExplorerAddressUrl,
  JobStatus,
  MilestoneStatus,
} from "@/lib/contracts";
import { useBotEscrow } from "@/hooks/useBotEscrow";
import { JobStatusBadge, MilestoneStatusBadge } from "@/components/StatusBadge";
import { TransactionModal } from "@/components/TransactionModal";
import { EmptyState } from "@/components/EmptyState";
import {
  Shield,
  Layers,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  UploadCloud,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  Scale,
  Calendar,
  User,
  ArrowLeft,
  Loader2,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobIdStr = params?.id as string;
  const jobId = BigInt(jobIdStr || "0");

  const { address } = useAccount();
  const publicClient = usePublicClient();

  const {
    acceptJob,
    submitMilestone,
    approveMilestone,
    releaseMilestone,
    rejectMilestone,
    cancelCreatedJob,
    requestCancellation,
    approveCancellation,
    openDispute,
    txState,
    resetTxState,
  } = useBotEscrow();

  const [job, setJob] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals for submission and dispute
  const [submitModal, setSubmitModal] = useState<{ open: boolean; milestoneId: number; uri: string }>({
    open: false,
    milestoneId: 0,
    uri: "",
  });

  const [disputeModal, setDisputeModal] = useState<{
    open: boolean;
    uri: string;
    milestoneIndex?: number;
  }>({
    open: false,
    uri: "",
  });

  const fetchJobData = async () => {
    if (!publicClient || !jobId || !isContractConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [fetchedJob, fetchedMilestones] = await Promise.all([
        publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getJob",
          args: [jobId],
        }),
        publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getJobMilestones",
          args: [jobId],
        }),
      ]);

      setJob(fetchedJob);
      setMilestones(fetchedMilestones as any[]);
    } catch (err) {
      console.error("Failed to load job details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [publicClient, jobIdStr]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-zinc-400 flex flex-col items-center space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Fetching job #{jobIdStr} from Botchain...</span>
      </div>
    );
  }

  if (!job || job.jobId === BigInt(0)) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title={`Job #${jobIdStr} Not Found`}
          description="This job does not exist on Botchain Testnet or has invalid parameters."
          actionText="Back to Jobs"
          actionHref="/jobs"
        />
      </div>
    );
  }

  const isClient = address && job.client.toLowerCase() === address.toLowerCase();
  const isFreelancer = address && job.freelancer.toLowerCase() === address.toLowerCase();
  const isParticipant = isClient || isFreelancer;

  const clientIdent = resolveIdentity(job.client);
  const freelancerIdent = resolveIdentity(job.freelancer);
  const remainingEscrow = job.totalAmount - job.releasedAmount;
  const createdDate = new Date(Number(job.createdAt) * 1000).toLocaleString();
  const deadlineDate = new Date(Number(job.deadline) * 1000).toLocaleDateString();

  return (
    <div className="space-y-8 py-4">
      {/* Transaction Modal */}
      <TransactionModal
        status={txState.status}
        actionName={txState.actionName}
        txHash={txState.txHash}
        errorMessage={txState.errorMessage}
        onClose={() => {
          resetTxState();
          fetchJobData();
        }}
      />

      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Jobs</span>
        </Link>
        <button
          onClick={fetchJobData}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Refresh On-Chain State"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Job Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                Job #{job.jobId.toString()}
              </span>
              <JobStatusBadge status={job.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{job.title}</h1>
          </div>

          {/* Quick Actions for Job State */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Freelancer Accept button */}
            {isFreelancer && job.status === JobStatus.CREATED && (
              <button
                onClick={() => acceptJob(jobId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Accept Assigned Job
              </button>
            )}

            {/* Cancel Created Job (Client or Freelancer) */}
            {isParticipant && job.status === JobStatus.CREATED && (
              <button
                onClick={() => cancelCreatedJob(jobId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                Cancel & Refund
              </button>
            )}

            {/* Active Mutual Cancellation Request */}
            {isParticipant && job.status === JobStatus.ACTIVE && !job.cancellationRequested && (
              <button
                onClick={() => requestCancellation(jobId)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              >
                Request Cancellation
              </button>
            )}

            {/* Open Dispute Button */}
            {isParticipant && job.status === JobStatus.ACTIVE && (
              <button
                onClick={() => setDisputeModal({ open: true, uri: "" })}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Open Dispute</span>
              </button>
            )}
          </div>
        </div>

        {/* Awaiting Acceptance Banner if Job is CREATED */}
        {job.status === JobStatus.CREATED && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-300">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Awaiting Freelancer Acceptance:</strong> The contract is created with funds locked in escrow. Once the freelancer accepts, work begins and milestone submissions and disputes unlock.
              </span>
            </div>
            {isFreelancer && (
              <button
                onClick={() => acceptJob(jobId)}
                className="px-3.5 py-1.5 rounded-lg font-semibold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 self-start sm:self-auto cursor-pointer shrink-0"
              >
                Accept Assigned Job
              </button>
            )}
          </div>
        )}

        {/* Cancellation Notice Banner if active request */}
        {job.cancellationRequested && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
            <div>
              <span className="font-semibold">Cancellation Requested:</span> An escrow refund has been requested by{" "}
              {job.cancellationInitiator.toLowerCase() === address?.toLowerCase() ? "you" : "counterparty"}.
            </div>
            {address && job.cancellationInitiator.toLowerCase() !== address.toLowerCase() && (
              <button
                onClick={() => approveCancellation(jobId)}
                className="px-3 py-1.5 rounded-lg font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 self-start sm:self-auto cursor-pointer"
              >
                Approve Mutual Cancellation
              </button>
            )}
          </div>
        )}

        {/* Dispute Notice if Disputed */}
        {job.status === JobStatus.DISPUTED && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between text-xs text-orange-300">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-orange-400" />
              <span>This job is currently in DISPUTE (Dispute #{job.disputeId.toString()}). Escrow releases are frozen pending arbitrator decision.</span>
            </div>
            <Link
              href={`/dispute/${job.disputeId.toString()}`}
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold ml-2"
            >
              View Dispute Details
            </Link>
          </div>
        )}

        {/* Description & Metadata */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scope of Work</h3>
          <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
            {job.description || "No description provided."}
          </p>
          {job.metadataURI && (
            <div className="pt-1">
              <span className="text-xs text-zinc-400">Off-chain Spec URI: </span>
              <a
                href={job.metadataURI.startsWith("http") ? job.metadataURI : `https://ipfs.io/ipfs/${job.metadataURI.replace("ipfs://", "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline inline-flex items-center space-x-1"
              >
                <span>{job.metadataURI}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Escrow Details Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400">Total Escrow</div>
            <div className="text-base font-bold font-mono text-cyan-400">
              {formatBOT(job.totalAmount)} BOT
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400">Released</div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {formatBOT(job.releasedAmount)} BOT
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400">Remaining Locked</div>
            <div className="text-base font-bold font-mono text-amber-400">
              {formatBOT(remainingEscrow)} BOT
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400">Final Deadline</div>
            <div className="text-base font-bold font-mono text-zinc-200">{deadlineDate}</div>
          </div>
        </div>

        {/* Parties Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div>
              <span className="text-zinc-400 block text-[11px]">Client</span>
              <a
                href={getExplorerAddressUrl(job.client)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white hover:text-cyan-300 inline-flex items-center space-x-1"
              >
                <span>{clientIdent.displayName}</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            </div>
            {isClient && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                You (Client)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div>
              <span className="text-zinc-400 block text-[11px]">Freelancer</span>
              <a
                href={getExplorerAddressUrl(job.freelancer)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white hover:text-cyan-300 inline-flex items-center space-x-1"
              >
                <span>{freelancerIdent.displayName}</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            </div>
            {isFreelancer && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                You (Freelancer)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Milestones Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Coins className="w-5 h-5 text-cyan-400" />
          <span>Milestones Timeline ({milestones.length})</span>
        </h2>

        <div className="space-y-4">
          {milestones.map((m, idx) => {
            const milestoneDue = new Date(Number(m.dueDate) * 1000).toLocaleDateString();
            const isSubmitted = m.status === MilestoneStatus.SUBMITTED;
            const isApproved = m.status === MilestoneStatus.APPROVED;
            const isReleased = m.status === MilestoneStatus.RELEASED;
            const isRejected = m.status === MilestoneStatus.REJECTED;
            const isPending = m.status === MilestoneStatus.PENDING;

            return (
              <div
                key={idx}
                className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center text-xs font-mono font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                        <span>Due: {milestoneDue}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono font-semibold">
                          {formatBOT(m.amount)} BOT
                        </span>
                      </div>
                    </div>
                  </div>

                  <MilestoneStatusBadge status={m.status} />
                </div>

                {m.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60">
                    {m.description}
                  </p>
                )}

                {/* Submission Evidence if present */}
                {m.submissionURI && (
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs space-y-1">
                    <span className="text-zinc-400 font-medium">Submitted Evidence / Proof:</span>
                    <div className="flex items-center space-x-2 font-mono text-cyan-300 break-all">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <a
                        href={m.submissionURI.startsWith("http") ? m.submissionURI : `https://ipfs.io/ipfs/${m.submissionURI.replace("ipfs://", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span>{m.submissionURI}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    {m.submittedAt > BigInt(0) && (
                      <div className="text-[10px] text-zinc-500 pt-0.5">
                        Submitted on {new Date(Number(m.submittedAt) * 1000).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Role Specific Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-800/60">
                  {/* Freelancer: Submit / Resubmit */}
                  {isFreelancer && job.status === JobStatus.ACTIVE && (isPending || isRejected) && (
                    <button
                      onClick={() =>
                        setSubmitModal({
                          open: true,
                          milestoneId: idx,
                          uri: "",
                        })
                      }
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{isRejected ? "Resubmit Evidence" : "Submit Evidence"}</span>
                    </button>
                  )}

                  {/* Client: Approve or Reject */}
                  {isClient && job.status === JobStatus.ACTIVE && isSubmitted && (
                    <>
                      <button
                        onClick={() => rejectMilestone(jobId, BigInt(idx))}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Request Revision (Reject)</span>
                      </button>
                      <button
                        onClick={() => approveMilestone(jobId, BigInt(idx))}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-400 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Approve Milestone</span>
                      </button>
                    </>
                  )}

                  {/* Client or Freelancer: Release Payment if Approved */}
                  {job.status === JobStatus.ACTIVE && isApproved && (isClient || isFreelancer) && (
                    <button
                      onClick={() => releaseMilestone(jobId, BigInt(idx))}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Release {formatBOT(m.amount)} BOT Payment</span>
                    </button>
                  )}

                  {/* Dispute Milestone Button - Available to Client and Freelancer on Active jobs */}
                  {isParticipant && job.status === JobStatus.ACTIVE && !isReleased && (
                    <button
                      onClick={() =>
                        setDisputeModal({
                          open: true,
                          uri: `ipfs://dispute-job-${jobId.toString()}-milestone-${idx + 1}`,
                          milestoneIndex: idx,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Dispute Milestone #{idx + 1}</span>
                    </button>
                  )}

                  {/* Informational hint if job is still in CREATED status */}
                  {isParticipant && job.status === JobStatus.CREATED && (
                    <span className="text-[11px] text-zinc-500 flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>Job pending freelancer acceptance to unlock dispute / submission actions</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Milestone Modal */}
      {submitModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 border border-zinc-700/80 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-cyan-400" />
              <span>Submit Milestone #{submitModal.milestoneId + 1}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Provide evidence URI (e.g. IPFS CID, GitHub pull request, or commit hash) for client verification.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Submission Evidence URI</label>
              <input
                type="text"
                required
                placeholder="ipfs://bafy... or https://github.com/org/repo/pull/1"
                value={submitModal.uri}
                onChange={(e) => setSubmitModal({ ...submitModal, uri: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModal({ open: false, milestoneId: 0, uri: "" })}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!submitModal.uri.trim()}
                onClick={async () => {
                  const mId = BigInt(submitModal.milestoneId);
                  const uri = submitModal.uri.trim();
                  setSubmitModal({ open: false, milestoneId: 0, uri: "" });
                  await submitMilestone(jobId, mId, uri);
                }}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Dispute Modal */}
      {disputeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl glass-panel p-6 border border-zinc-700/80 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Scale className="w-5 h-5 text-orange-400" />
              <span>
                {disputeModal.milestoneIndex !== undefined
                  ? `Open Dispute on Milestone #${disputeModal.milestoneIndex + 1}`
                  : `Open Dispute on Job #${job.jobId.toString()}`}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {disputeModal.milestoneIndex !== undefined
                ? `Opening a dispute on Milestone #${disputeModal.milestoneIndex + 1} freezes remaining escrow payments and escalates to the official protocol arbitrator for resolution.`
                : `Opening a dispute freezes all milestone payouts and transfers authority to the configured arbitrator. Provide your claim evidence URI below.`}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Dispute Claim Evidence URI</label>
              <input
                type="text"
                required
                placeholder="ipfs://... or https://..."
                value={disputeModal.uri}
                onChange={(e) => setDisputeModal({ ...disputeModal, uri: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDisputeModal({ open: false, uri: "" })}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!disputeModal.uri.trim()}
                onClick={async () => {
                  const uri = disputeModal.uri.trim();
                  setDisputeModal({ open: false, uri: "" });
                  await openDispute(jobId, uri);
                }}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-50"
              >
                Initiate Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
