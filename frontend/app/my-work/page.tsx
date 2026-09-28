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
  Briefcase,
  Layers,
  Coins,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  Wallet,
  Sparkles,
} from "lucide-react";

export default function MyWorkPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFreelancerJobs() {
      if (!publicClient || !address || !isContractConfigured()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const jobIds = (await publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getFreelancerJobs",
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
        // Sort newest first
        results.sort((a: any, b: any) => Number(b.jobId - a.jobId));
        setJobs(results);
      } catch (err) {
        console.error("Failed to load freelancer jobs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFreelancerJobs();
  }, [publicClient, address]);

  // Derived metrics purely from blockchain state
  const activeJobs = jobs.filter((j) => j.status === JobStatus.ACTIVE);
  const pendingAcceptance = jobs.filter((j) => j.status === JobStatus.CREATED);
  const completedJobs = jobs.filter((j) => j.status === JobStatus.COMPLETED);
  const totalEarnedWei = jobs.reduce((acc, j) => acc + (j.releasedAmount || BigInt(0)), BigInt(0));

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
          <Briefcase className="w-7 h-7 text-purple-400" />
          <span>Freelancer Workspace</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Track assigned deliverables, milestone submissions, and released BOT earnings.
        </p>
      </div>

      {!isConnected ? (
        <EmptyState
          title="Wallet Not Connected"
          description="Please connect your Web3 wallet to inspect jobs assigned to your address on Botchain Testnet."
          icon={<Wallet className="w-8 h-8 text-zinc-600" />}
        />
      ) : isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs">Fetching your assigned contracts from Botchain...</span>
        </div>
      ) : (
        <>
          {/* On-Chain Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Active Work</div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {activeJobs.length}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Awaiting Acceptance</div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {pendingAcceptance.length}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Completed Projects</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {completedJobs.length}
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-xs text-zinc-400">Total BOT Earned</div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {formatBOT(totalEarnedWei)} BOT
              </div>
            </div>
          </div>

          {/* Assigned Jobs List */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Your Assigned Escrows ({jobs.length})</h2>

            {jobs.length === 0 ? (
              <EmptyState
                title="No Assigned Contracts"
                description="You currently have no freelance contracts assigned to your connected address on Botchain."
                actionText="Explore Public Jobs"
                actionHref="/jobs"
                icon={<Briefcase className="w-8 h-8 text-zinc-600" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => {
                  const clientIdent = resolveIdentity(job.client);
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
                          <span className="text-xs font-mono text-purple-400 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-md">
                            #{job.jobId.toString()}
                          </span>
                          <JobStatusBadge status={job.status} />
                        </div>

                        <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
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
                          <span>Released to You:</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {formatBOT(job.releasedAmount)} BOT
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Client:</span>
                          <span className="font-mono text-zinc-300">{clientIdent.displayName}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-purple-400 group-hover:text-purple-300 font-medium border-t border-zinc-800/50">
                        <span>{job.milestoneCount.toString()} Milestones</span>
                        <span className="flex items-center space-x-1">
                          <span>Manage Workspace</span>
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
