"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import { parseEther, isAddress } from "viem";
import { useBotEscrow } from "@/hooks/useBotEscrow";
import { formatBOT, parseBOT } from "@/lib/contracts";
import { TransactionModal } from "@/components/TransactionModal";
import {
  PlusCircle,
  Trash2,
  Calendar,
  Coins,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Info,
  Clock,
} from "lucide-react";

interface MilestoneRow {
  title: string;
  description: string;
  amountStr: string;
  dueDateStr: string;
}

export default function CreateJobPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { createJob, txState, resetTxState } = useBotEscrow();

  const [freelancer, setFreelancer] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [deadlineStr, setDeadlineStr] = useState("");

  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    {
      title: "Milestone 1: Prototype / Architecture",
      description: "Initial specification, architecture diagrams, and wireframes.",
      amountStr: "1.0",
      dueDateStr: "",
    },
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmSummary, setShowConfirmSummary] = useState(false);

  // Add milestone
  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length + 1}`,
        description: "",
        amountStr: "1.0",
        dueDateStr: "",
      },
    ]);
  };

  // Remove milestone
  const removeMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  // Update milestone field
  const updateMilestone = (index: number, field: keyof MilestoneRow, val: string) => {
    const updated = [...milestones];
    updated[index][field] = val;
    setMilestones(updated);
  };

  // Compute total escrow amount
  const totalAmountBOT = milestones.reduce((acc, m) => {
    const val = parseFloat(m.amountStr);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const totalAmountWei = parseBOT(totalAmountBOT.toString());

  // Form validation
  const validateForm = () => {
    setValidationError(null);

    if (!isConnected) {
      setValidationError("Please connect your wallet first.");
      return false;
    }

    if (!isAddress(freelancer)) {
      setValidationError("Invalid freelancer address. Must be a valid 42-character Ethereum address.");
      return false;
    }

    if (address && freelancer.toLowerCase() === address.toLowerCase()) {
      setValidationError("You cannot assign yourself as the freelancer.");
      return false;
    }

    if (!title.trim()) {
      setValidationError("Job title cannot be empty.");
      return false;
    }

    if (!deadlineStr) {
      setValidationError("Please choose a project deadline.");
      return false;
    }

    const deadlineTimestamp = Math.floor(new Date(deadlineStr).getTime() / 1000);
    const nowTimestamp = Math.floor(Date.now() / 1000);
    if (deadlineTimestamp <= nowTimestamp) {
      setValidationError("Project deadline must be in the future.");
      return false;
    }

    if (milestones.length === 0) {
      setValidationError("At least one milestone is required.");
      return false;
    }

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.title.trim()) {
        setValidationError(`Milestone #${i + 1} must have a title.`);
        return false;
      }
      const amt = parseFloat(m.amountStr);
      if (isNaN(amt) || amt <= 0) {
        setValidationError(`Milestone #${i + 1} amount must be greater than zero.`);
        return false;
      }
    }

    if (balanceData && balanceData.value < totalAmountWei) {
      setValidationError(
        `Insufficient BOT balance. Required: ${totalAmountBOT} BOT, Available: ${formatBOT(balanceData.value)} BOT`
      );
      return false;
    }

    return true;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmSummary(true);
    }
  };

  const handleExecuteCreate = async () => {
    setShowConfirmSummary(false);

    const deadlineTimestamp = BigInt(Math.floor(new Date(deadlineStr).getTime() / 1000));
    const formattedMilestones = milestones.map((m) => {
      const due = m.dueDateStr
        ? BigInt(Math.floor(new Date(m.dueDateStr).getTime() / 1000))
        : deadlineTimestamp;
      return {
        title: m.title.trim(),
        description: m.description.trim(),
        amount: parseBOT(m.amountStr),
        dueDate: due,
      };
    });

    const res = await createJob(
      freelancer as `0x${string}`,
      title.trim(),
      description.trim(),
      metadataURI.trim() || "ipfs://botescrow-metadata",
      deadlineTimestamp,
      formattedMilestones,
      totalAmountWei
    );

    if (res) {
      // Auto-redirect to /jobs after a brief delay so user sees confirmation
      setTimeout(() => {
        router.push("/jobs");
      }, 2000);
    }
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
          const wasSuccess = txState.status === "success";
          resetTxState();
          if (wasSuccess) {
            router.push("/jobs");
          }
        }}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
          <PlusCircle className="w-7 h-7 text-cyan-400" />
          <span>Create Escrow Job</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Lock native BOT into smart contract custody and assign deliverables with milestone guarantees.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handlePreSubmit} className="space-y-8">
        {/* Project Details Panel */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-5 border border-white/5">
          <h2 className="text-base font-semibold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Job Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Freelancer Botchain Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="0x..."
                value={freelancer}
                onChange={(e) => setFreelancer(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-zinc-500">
                The designated developer/freelancer wallet who will perform the work and receive payments.
              </p>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Project Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Build Web3 Dashboard on Botchain"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Detailed Scope & Description</label>
              <textarea
                rows={3}
                placeholder="Describe project requirements, tech stack, and acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Off-chain Metadata URI</label>
              <input
                type="text"
                placeholder="ipfs://Qm... or https://github.com/..."
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-zinc-500">
                Link to specifications, contracts, or PRD (IPFS, GitHub, or public hash).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Final Project Deadline <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={deadlineStr}
                onChange={(e) => setDeadlineStr(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Milestones Panel */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Milestones & Escrow Allocation</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Break work into verifiable deliverables. The sum of milestone amounts will be deposited into escrow.
              </p>
            </div>
            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
          </div>

          <div className="space-y-4">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>Milestone #{idx + 1}</span>
                  </span>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(idx)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Remove milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Milestone title (e.g. Smart Contract Core)"
                      value={m.title}
                      onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        required
                        placeholder="Amount"
                        value={m.amountStr}
                        onChange={(e) => updateMilestone(idx, "amountStr", e.target.value)}
                        className="w-full pl-3 pr-12 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                        BOT
                      </span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <input
                      type="text"
                      placeholder="Deliverables description..."
                      value={m.description}
                      onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={m.dueDateStr}
                      onChange={(e) => updateMilestone(idx, "dueDateStr", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700/80 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Escrow Calculation Strip */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-zinc-400">Total Escrow Deposit:</div>
              <div className="text-lg font-bold font-mono text-cyan-300">
                {totalAmountBOT.toFixed(4)} BOT
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-zinc-400">Wallet Balance:</div>
              <div className="font-mono text-zinc-200">
                {isConnected ? `${formatBOT(balanceData?.value)} BOT` : "Not connected"}
              </div>
            </div>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Review & Deposit Escrow</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Confirmation Modal Summary */}
      {showConfirmSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl glass-panel p-6 border border-zinc-700/80 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white">Confirm Escrow Deposit</h3>
            <p className="text-xs text-zinc-400">
              Please review the escrow terms before signing the transaction on Botchain.
            </p>

            <div className="space-y-2.5 text-xs bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between">
                <span className="text-zinc-400">Project:</span>
                <span className="text-white font-medium">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Freelancer:</span>
                <span className="text-cyan-400 font-mono text-[11px] truncate max-w-[240px]">
                  {freelancer}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Milestone Count:</span>
                <span className="text-white font-mono">{milestones.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Deadline:</span>
                <span className="text-white">{deadlineStr}</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-sm">
                <span className="text-zinc-300">Required Deposit:</span>
                <span className="text-cyan-400 font-mono">{totalAmountBOT.toFixed(4)} BOT</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSummary(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleExecuteCreate}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/25 transition-all"
              >
                Confirm & Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
