"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  resolveIdentity,
  DISPUTE_RESOLUTION_LABELS,
  DisputeResolution,
} from "@/lib/contracts";
import { EmptyState } from "@/components/EmptyState";
import {
  Scale,
  Gavel,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Filter,
  ExternalLink,
} from "lucide-react";

export default function DisputesPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [disputes, setDisputes] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"all" | "open" | "resolved" | "my">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDisputes() {
      if (!publicClient || !isContractConfigured()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const count = (await publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getDisputeCount",
        })) as bigint;

        const total = Number(count || BigInt(0));
        if (total === 0) {
          setDisputes([]);
          setIsLoading(false);
          return;
        }

        const promises = [];
        for (let i = 1; i <= total; i++) {
          promises.push(
            publicClient.readContract({
              address: BOTESCROW_ADDRESS,
              abi: CONTRACT_CONFIG.abi,
              functionName: "getDispute",
              args: [BigInt(i)],
            })
          );
        }

        const results = await Promise.all(promises);
        results.sort((a: any, b: any) => Number(b.disputeId - a.disputeId));
        setDisputes(results);
      } catch (err) {
        console.error("Failed to load disputes:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDisputes();
  }, [publicClient]);

  const filteredDisputes = disputes.filter((d) => {
    if (filterType === "open") return !d.resolved;
    if (filterType === "resolved") return d.resolved;
    if (filterType === "my") {
      return address && d.openedBy.toLowerCase() === address.toLowerCase();
    }
    return true;
  });

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
            <Scale className="w-7 h-7 text-orange-400" />
            <span>Dispute Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Review contested escrow agreements, evidence submissions, and arbitrator rulings.
          </p>
        </div>
        <Link
          href="/arbitration"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 transition-colors self-start sm:self-auto"
        >
          <Gavel className="w-4 h-4 text-purple-400" />
          <span>Arbitrator Portal</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3 text-xs">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === "all"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          All Disputes ({disputes.length})
        </button>
        <button
          onClick={() => setFilterType("open")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === "open"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Open ({disputes.filter((d) => !d.resolved).length})
        </button>
        <button
          onClick={() => setFilterType("resolved")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            filterType === "resolved"
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Resolved ({disputes.filter((d) => d.resolved).length})
        </button>
        {address && (
          <button
            onClick={() => setFilterType("my")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterType === "my"
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            My Disputes
          </button>
        )}
      </div>

      {/* Disputes List */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <span className="text-xs">Fetching disputes from Botchain...</span>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <EmptyState
          title="No Disputes Found"
          description={
            disputes.length === 0
              ? "There are currently no disputes opened on BotEscrow. All project agreements are operating smoothly!"
              : "No disputes match the selected filter."
          }
          icon={<Scale className="w-8 h-8 text-zinc-600" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDisputes.map((dispute) => {
            const openedIdent = resolveIdentity(dispute.openedBy);
            const openedDate = new Date(Number(dispute.openedAt) * 1000).toLocaleString();

            return (
              <Link
                key={dispute.disputeId.toString()}
                href={`/dispute/${dispute.disputeId.toString()}`}
                className="glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between space-y-4 group border border-white/5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
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
                      {dispute.resolved ? "Resolved" : "Open Dispute"}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-orange-300 transition-colors">
                    Job #{dispute.jobId.toString()}
                  </h3>

                  <div className="text-xs text-zinc-400 space-y-1">
                    <div>
                      Opened by: <span className="font-mono text-zinc-300">{openedIdent.displayName}</span>
                    </div>
                    <div>Opened on: <span className="text-zinc-300">{openedDate}</span></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="text-zinc-400">
                    Resolution Status:{" "}
                    <span className="text-white font-medium">
                      {DISPUTE_RESOLUTION_LABELS[dispute.resolution as DisputeResolution]}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-orange-400 group-hover:text-orange-300 font-medium border-t border-zinc-800/50">
                  <span>Inspect Evidence</span>
                  <span className="flex items-center space-x-1">
                    <span>Dispute Room</span>
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
