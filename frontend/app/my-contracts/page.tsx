"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  formatBOT,
  resolveIdentity,
  JobStatus,
} from "@/lib/contracts";
import { JobStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import {
  FileCheck,
  PlusCircle,
  Coins,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  Wallet,
} from "lucide-react";

export default function MyContractsPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClientJobs() {
      if (!publicClient || !address || !isContractConfigured()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const jobIds = (await publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getClientJobs",
          args: [address],
        })) as bigint[];

        if (!jobIds || jobIds.length === 0) {
          setJobs([]);
          setIsLoading(false);
          return;
        }

        const promises = jobIds.map((id) =>
          publicClient.readContract({
            address: BOTESCROW_ADDRESS,
            abi: CONTRACT_CONFIG.abi,
            functionName: "getJob",
            args: [id],
          })
        );

        const results = await Promise.all(promises);
        results.sort((a: any, b: any) => Number(b.jobId - a.jobId));
        setJobs(results);
      } catch (err) {
        console.error("Failed to load client jobs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientJobs();
  }, [publicClient, address]);

  // Derived metrics from on-chain state
  const activeContracts = jobs.filter((j) => j.status === JobStatus.ACTIVE);
  const completedContracts = jobs.filter((j) => j.status === JobStatus.COMPLETED);
  const totalEscrowedWei = jobs.reduce((acc, j) => acc + (j.totalAmount || BigInt(0)), BigInt(0));
  const totalReleasedWei = jobs.reduce((acc, j) => acc + (j.releasedAmount || BigInt(0)), BigInt(0));

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
            <FileCheck className="w-7 h-7 text-cyan-400" />
            <span>Client Contracts</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage your funded escrows, review milestone proofs, and authorize BOT payouts.
          </p>
        </div>
        <Link
          href="/jobs/create"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Escrow Job</span>
        </Link>
      </div>

      {!isConnected ? (
        <EmptyState
          title="Wallet Not Connected"
          description="Connect your Web3 wallet to manage your client escrow agreements on Botchain."
          icon={<Wallet className="w-8 h-8 text-zinc-600" />}
        />
      ) : isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs">Fetching your client escrow contracts...</span>
        </div>
      ) : (
        <>
          {/* On-Chain Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Total Funded Escrows</div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {jobs.length}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Active Contracts</div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {activeContracts.length}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Total Escrowed BOT</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatBOT(totalEscrowedWei)} BOT
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Total Released BOT</div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {formatBOT(totalReleasedWei)} BOT
              </div>
            </div>
          </div>

          {/* Client Contracts List */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Your Funded Escrows ({jobs.length})</h2>

            {jobs.length === 0 ? (
              <EmptyState
                title="No Client Contracts Found"
                description="You have not created any work escrow agreements on Botchain Testnet yet."
                actionText="Create Your First Escrow"
                actionHref="/jobs/create"
                icon={<FileCheck className="w-8 h-8 text-zinc-600" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => {
                  const freelancerIdent = resolveIdentity(job.freelancer);
                  const remaining = job.totalAmount - job.releasedAmount;
                  const deadlineDate = new Date(Number(job.deadline) * 1000).toLocaleDateString();

                  return (
                    <Link
                      key={job.jobId.toString()}
                      href={`/jobs/${job.jobId.toString()}`}
                      className="glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between space-y-4 group border border-white/5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                            #{job.jobId.toString()}
                          </span>
                          <JobStatusBadge status={job.status} />
                        </div>

                        <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {job.title}
                        </h3>

                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {job.description || "No description provided."}
                        </p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-zinc-800/80 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Total Escrow:</span>
                          <span className="font-mono text-white font-semibold">
                            {formatBOT(job.totalAmount)} BOT
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Remaining Locked:</span>
                          <span className="font-mono text-amber-400 font-semibold">
                            {formatBOT(remaining)} BOT
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Assigned Freelancer:</span>
                          <span className="font-mono text-zinc-300">{freelancerIdent.displayName}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-medium border-t border-zinc-800/50">
                        <span>{job.milestoneCount.toString()} Milestones</span>
                        <span className="flex items-center space-x-1">
                          <span>Manage Contract</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
