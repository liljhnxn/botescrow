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
  parseBOT,
  resolveIdentity,
  getExplorerAddressUrl,
  DISPUTE_RESOLUTION_LABELS,
  DisputeResolution,
} from "@/lib/contracts";
import { useBotEscrow } from "@/hooks/useBotEscrow";
import { TransactionModal } from "@/components/TransactionModal";
import { EmptyState } from "@/components/EmptyState";
import {
  Scale,
  Gavel,
  Shield,
  Clock,
  ExternalLink,
  ArrowLeft,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Coins,
} from "lucide-react";

export default function DisputeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const disputeIdStr = params?.id as string;
  const disputeId = BigInt(disputeIdStr || "0");

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { resolveDispute, txState, resetTxState } = useBotEscrow();

  const [dispute, setDispute] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [arbitratorAddress, setArbitratorAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Arbitration controls state
  const [resolutionType, setResolutionType] = useState<DisputeResolution>(DisputeResolution.CLIENT);
  const [clientSplitStr, setClientSplitStr] = useState<string>("");
  const [freelancerSplitStr, setFreelancerSplitStr] = useState<string>("");
  const [splitError, setSplitError] = useState<string | null>(null);

  const fetchDisputeDetails = async () => {
    if (!publicClient || !disputeId || !isContractConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const fetchedDispute = (await publicClient.readContract({
        address: BOTESCROW_ADDRESS,
        abi: CONTRACT_CONFIG.abi,
        functionName: "getDispute",
        args: [disputeId],
      })) as any;

      if (!fetchedDispute || fetchedDispute.openedAt === BigInt(0)) {
        setDispute(null);
        setIsLoading(false);
        return;
      }

      const [fetchedJob, protocolConfig] = await Promise.all([
        publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getJob",
          args: [fetchedDispute.jobId],
        }),
        publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getProtocolConfig",
        }),
      ]);

      setDispute(fetchedDispute);
      setJob(fetchedJob);
      setArbitratorAddress((protocolConfig as any)[2] as string);
    } catch (err) {
      console.error("Failed to load dispute details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputeDetails();
  }, [publicClient, disputeIdStr]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-zinc-400 flex flex-col items-center space-y-3">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        <span className="text-xs">Loading dispute #{disputeIdStr} on Botchain...</span>
      </div>
    );
  }

  if (!dispute || dispute.openedAt === BigInt(0)) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title={`Dispute #${disputeIdStr} Not Found`}
          description="This dispute does not exist on Botchain Testnet."
          actionText="Back to Disputes"
          actionHref="/disputes"
        />
      </div>
    );
  }

  const isArbitrator = address && arbitratorAddress.toLowerCase() === address.toLowerCase();
  const openedIdent = resolveIdentity(dispute.openedBy);
  const clientIdent = resolveIdentity(job?.client);
  const freelancerIdent = resolveIdentity(job?.freelancer);

  const remainingEscrow: bigint = job ? BigInt(job.totalAmount) - BigInt(job.releasedAmount) : BigInt(0);
  const openedDate = new Date(Number(dispute.openedAt) * 1000).toLocaleString();
  const resolvedDate =
    dispute.resolvedAt > BigInt(0)
      ? new Date(Number(dispute.resolvedAt) * 1000).toLocaleString()
      : "Pending";

  const handleExecuteArbitration = async () => {
    setSplitError(null);

    let clientAmt: bigint = BigInt(0);
    let freelancerAmt: bigint = BigInt(0);

    if (resolutionType === DisputeResolution.CLIENT) {
      clientAmt = remainingEscrow;
      freelancerAmt = BigInt(0);
    } else if (resolutionType === DisputeResolution.FREELANCER) {
      clientAmt = BigInt(0);
      freelancerAmt = remainingEscrow;
    } else if (resolutionType === DisputeResolution.SPLIT) {
      const c = parseBOT(clientSplitStr);
      const f = parseBOT(freelancerSplitStr);

      if (c + f !== remainingEscrow) {
        setSplitError(
          `Split amounts sum must equal the exact remaining escrow (${formatBOT(remainingEscrow)} BOT). Current sum: ${formatBOT(c + f)} BOT`
        );
        return;
      }
      clientAmt = c;
      freelancerAmt = f;
    }

    await resolveDispute(disputeId, resolutionType, clientAmt, freelancerAmt);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Transaction Modal */}
      <TransactionModal
        status={txState.status}
        actionName={txState.actionName}
        txHash={txState.txHash}
        errorMessage={txState.errorMessage}
        onClose={() => {
          resetTxState();
          fetchDisputeDetails();
        }}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/disputes"
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dispute Center</span>
        </Link>
        <Link
          href={`/jobs/${job?.jobId.toString()}`}
          className="text-xs text-cyan-400 hover:underline inline-flex items-center space-x-1"
        >
          <span>View Associated Job #{job?.jobId.toString()}</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Main Dispute Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-orange-400 bg-orange-950/60 border border-orange-800/40 px-2 py-0.5 rounded-md">
                Dispute #{dispute.disputeId.toString()}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                  dispute.resolved
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                    : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                }`}
              >
                {dispute.resolved ? "Resolved" : "Open for Arbitration"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Disputed Job: {job?.title}</h1>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-400">Contested Escrow:</div>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {formatBOT(remainingEscrow)} BOT
            </div>
          </div>
        </div>

        {/* Evidence URI Panel */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
          <div className="text-zinc-400 font-semibold flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-orange-400" />
            <span>Claimant Evidence Submission:</span>
          </div>
          <div className="font-mono text-cyan-300 break-all pl-5">
            {dispute.evidenceURI ? (
              <a
                href={
                  dispute.evidenceURI.startsWith("http")
                    ? dispute.evidenceURI
                    : `https://ipfs.io/ipfs/${dispute.evidenceURI.replace("ipfs://", "")}`
                }
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center space-x-1"
              >
                <span>{dispute.evidenceURI}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            ) : (
              <span className="text-zinc-500">No URI provided.</span>
            )}
          </div>
        </div>

        {/* Parties & Dates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-1">
            <span className="text-zinc-400">Opened By:</span>
            <div className="font-mono text-white flex items-center justify-between">
              <span>{openedIdent.displayName}</span>
              <a href={getExplorerAddressUrl(dispute.openedBy)} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            </div>
            <span className="text-[11px] text-zinc-500">Opened on {openedDate}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-1">
            <span className="text-zinc-400">Designated Arbitrator:</span>
            <div className="font-mono text-white flex items-center justify-between">
              <span>{arbitratorAddress ? resolveIdentity(arbitratorAddress).displayName : "None"}</span>
              <a href={getExplorerAddressUrl(arbitratorAddress)} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            </div>
            <span className="text-[11px] text-zinc-500">
              {isArbitrator ? "You are the authorized arbitrator" : "External arbitrator authority"}
            </span>
          </div>
        </div>

        {/* Resolution Outcome if Resolved */}
        {dispute.resolved && (
          <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-purple-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Arbitration Decision Enacted</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-zinc-400 block">Resolution:</span>
                <span className="text-white font-medium">
                  {DISPUTE_RESOLUTION_LABELS[dispute.resolution as DisputeResolution]}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Client Award:</span>
                <span className="text-cyan-400 font-mono font-semibold">
                  {formatBOT(dispute.clientAward)} BOT
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Freelancer Award:</span>
                <span className="text-purple-400 font-mono font-semibold">
                  {formatBOT(dispute.freelancerAward)} BOT
                </span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 border-t border-purple-900/50 pt-2">
              Resolved on {resolvedDate}. All funds have been transferred directly to recipient wallets on Botchain.
            </div>
          </div>
        )}
      </div>

      {/* Arbitrator Resolution Controls (Visible only to authorized arbitrator while unresolved) */}
      {!dispute.resolved && isArbitrator && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-purple-500/30 space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-purple-400" />
              <span>Arbitrator Decision Panel</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              As the configured arbitrator, you hold the cryptographic authority to disburse the remaining {formatBOT(remainingEscrow)} BOT escrow.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <label className="text-zinc-300 font-semibold">Choose Resolution Ruling:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setResolutionType(DisputeResolution.CLIENT)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    resolutionType === DisputeResolution.CLIENT
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">Award to Client</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Refund 100% remaining escrow</div>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionType(DisputeResolution.FREELANCER)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    resolutionType === DisputeResolution.FREELANCER
                      ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">Award to Freelancer</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Release 100% to freelancer</div>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionType(DisputeResolution.SPLIT)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    resolutionType === DisputeResolution.SPLIT
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">Split Escrow</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Distribute proportional amounts</div>
                </button>
              </div>
            </div>

            {/* Split inputs if SPLIT selected */}
            {resolutionType === DisputeResolution.SPLIT && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <span className="font-semibold text-zinc-200">Specify Award Distribution:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px]">Client Award (BOT):</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="0.00"
                      value={clientSplitStr}
                      onChange={(e) => setClientSplitStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px]">Freelancer Award (BOT):</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="0.00"
                      value={freelancerSplitStr}
                      onChange={(e) => setFreelancerSplitStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {splitError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {splitError}
              </div>
            )}

            <button
              type="button"
              onClick={handleExecuteArbitration}
              className="w-full py-3 px-6 rounded-xl font-semibold text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-400 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              Sign & Execute Arbitration Ruling
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
