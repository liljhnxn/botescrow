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
  getExplorerAddressUrl,
} from "@/lib/contracts";
import { EmptyState } from "@/components/EmptyState";
import {
  Gavel,
  Scale,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Coins,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";

export default function ArbitrationPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [arbitratorAddress, setArbitratorAddress] = useState<string>("");
  const [disputes, setDisputes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchArbitratorData() {
      if (!publicClient || !isContractConfigured()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const protocolConfig = (await publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "getProtocolConfig",
        })) as any;

        const arb = protocolConfig[2] as string;
        setArbitratorAddress(arb);

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
        // Filter only open disputes needing arbitration ruling
        const openList = results.filter((d: any) => !d.resolved);
        openList.sort((a: any, b: any) => Number(b.disputeId - a.disputeId));
        setDisputes(openList);
      } catch (err) {
        console.error("Failed to load arbitration data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchArbitratorData();
  }, [publicClient]);

  const isArbitrator =
    isConnected &&
    address &&
    arbitratorAddress &&
    arbitratorAddress.toLowerCase() === address.toLowerCase();

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
          <Gavel className="w-7 h-7 text-purple-400" />
          <span>Arbitrator Portal</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Authorized dispute resolution center for the configured protocol arbitrator.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs">Verifying arbitrator permissions on Botchain...</span>
        </div>
      ) : !isArbitrator ? (
        <div className="glass-panel p-8 sm:p-10 rounded-2xl border border-amber-500/20 space-y-4 max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Restricted Portal</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This dashboard contains dispute settlement tools restricted strictly to the designated arbitrator configured in the BotEscrow smart contract.
          </p>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            Configured Arbitrator: <span className="text-purple-400">{arbitratorAddress || "Not set"}</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Your connected wallet: {address ? resolveIdentity(address).rawAddress : "Not connected"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Arbitrator Verified Badge */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-300">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-semibold">Arbitrator Authorization Verified</span>
            </div>
            <span className="font-mono text-[11px]">{arbitratorAddress}</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">
              Open Disputes Awaiting Your Ruling ({disputes.length})
            </h2>

            {disputes.length === 0 ? (
              <EmptyState
                title="No Pending Disputes"
                description="There are currently no active disputes requiring arbitrator resolution."
                icon={<Scale className="w-8 h-8 text-zinc-600" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {disputes.map((dispute) => {
                  const openedIdent = resolveIdentity(dispute.openedBy);
                  const openedDate = new Date(Number(dispute.openedAt) * 1000).toLocaleString();

                  return (
                    <div
                      key={dispute.disputeId.toString()}
                      className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-5 border border-purple-500/20"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-purple-400 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-md">
                            Dispute #{dispute.disputeId.toString()}
                          </span>
                          <span className="text-xs font-mono text-cyan-400">
                            Job #{dispute.jobId.toString()}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-white">
                          Job #{dispute.jobId.toString()} in Dispute
                        </h3>

                        <div className="text-xs text-zinc-400 space-y-1">
                          <div>
                            Claimant: <span className="text-zinc-300 font-mono">{openedIdent.displayName}</span>
                          </div>
                          <div>Opened: <span className="text-zinc-300">{openedDate}</span></div>
                        </div>

                        {dispute.evidenceURI && (
                          <div className="text-xs text-zinc-400 truncate">
                            Evidence: <span className="text-cyan-400 font-mono">{dispute.evidenceURI}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-800">
                        <Link
                          href={`/dispute/${dispute.disputeId.toString()}`}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-400 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all flex items-center justify-center space-x-1.5"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>Enter Arbitration Chamber</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
