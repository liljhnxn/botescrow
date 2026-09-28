"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useReadContract, usePublicClient } from "wagmi";
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
  Layers,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Coins,
  User,
  Shield,
  Loader2,
} from "lucide-react";

export default function JobsPage() {
  const publicClient = usePublicClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Read total job count
  const { data: jobCountData, isLoading: isLoadingCount } = useReadContract({
    address: BOTESCROW_ADDRESS,
    abi: CONTRACT_CONFIG.abi,
    functionName: "getJobCount",
    query: { enabled: isContractConfigured() },
  });

  useEffect(() => {
    async function fetchAllJobs() {
      if (!publicClient || !jobCountData || !isContractConfigured()) {
        setIsLoadingJobs(false);
        return;
      }

      const total = Number(jobCountData);
      if (total === 0) {
        setJobs([]);
        setIsLoadingJobs(false);
        return;
      }

      setIsLoadingJobs(true);
      try {
        const fetched: any[] = [];
        // Fetch jobs in parallel
        const promises = [];
        for (let i = 1; i <= total; i++) {
          promises.push(
            publicClient.readContract({
              address: BOTESCROW_ADDRESS,
              abi: CONTRACT_CONFIG.abi,
              functionName: "getJob",
              args: [BigInt(i)],
            })
          );
        }

        const results = await Promise.all(promises);
        results.forEach((job: any) => {
          if (job && job.jobId > BigInt(0)) {
            fetched.push(job);
          }
        });

        // Sort latest first
        fetched.sort((a, b) => Number(b.jobId - a.jobId));
        setJobs(fetched);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    }

    fetchAllJobs();
  }, [publicClient, jobCountData]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus =
      filterStatus === "all" || job.status.toString() === filterStatus;
    const matchesSearch =
      searchQuery === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.freelancer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobId.toString() === searchQuery;
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
            <Layers className="w-7 h-7 text-cyan-400" />
            <span>Escrow Jobs</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Browse all decentralized work agreements locked on Botchain Testnet.
          </p>
        </div>
        <Link
          href="/jobs/create"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02] self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Job</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by job title, ID, client, or freelancer address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All States</option>
            <option value={JobStatus.CREATED.toString()}>Created (Awaiting Acceptance)</option>
            <option value={JobStatus.ACTIVE.toString()}>Active</option>
            <option value={JobStatus.COMPLETED.toString()}>Completed</option>
            <option value={JobStatus.DISPUTED.toString()}>Disputed</option>
            <option value={JobStatus.CANCELLED.toString()}>Cancelled</option>
            <option value={JobStatus.RESOLVED.toString()}>Resolved</option>
          </select>
        </div>
      </div>

      {/* Jobs Grid or Empty State */}
      {isLoadingJobs || isLoadingCount ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs">Querying Botchain blockchain state...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title="No Escrow Jobs Found"
          description={
            jobs.length === 0
              ? "There are currently no freelance escrow contracts recorded on Botchain Testnet. Be the first to create one!"
              : "No jobs match your selected filter criteria."
          }
          actionText={jobs.length === 0 ? "Create First Job" : undefined}
          actionHref={jobs.length === 0 ? "/jobs/create" : undefined}
          icon={<Layers className="w-8 h-8 text-zinc-600" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => {
            const clientIdent = resolveIdentity(job.client);
            const freelancerIdent = resolveIdentity(job.freelancer);
            const remaining = job.totalAmount - job.releasedAmount;
            const deadlineDate = new Date(Number(job.deadline) * 1000).toLocaleDateString();

            return (
              <Link
                key={job.jobId.toString()}
                href={`/jobs/${job.jobId.toString()}`}
                className="glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between space-y-5 group border border-white/5"
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

                <div className="space-y-3 pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center space-x-1">
                      <Coins className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Total Escrow:</span>
                    </span>
                    <span className="font-mono font-semibold text-white">
                      {formatBOT(job.totalAmount)} BOT
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Deadline:</span>
                    </span>
                    <span className="text-zinc-300">{deadlineDate}</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-400 pt-1">
                    <span className="truncate max-w-[120px]">
                      Client: <span className="text-zinc-300 font-mono">{clientIdent.displayName}</span>
                    </span>
                    <span className="truncate max-w-[120px]">
                      Dev: <span className="text-zinc-300 font-mono">{freelancerIdent.displayName}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-medium border-t border-zinc-800/50">
                  <span>{job.milestoneCount.toString()} Milestone(s)</span>
                  <span className="flex items-center space-x-1">
                    <span>Manage Escrow</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
