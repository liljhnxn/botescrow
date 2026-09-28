"use client";

import React, { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  formatBOT,
  getExplorerTxUrl,
  shortenAddress,
} from "@/lib/contracts";
import { EmptyState } from "@/components/EmptyState";
import {
  Activity as ActivityIcon,
  ExternalLink,
  Loader2,
  Clock,
  Shield,
  Layers,
  Coins,
  CheckCircle2,
  Scale,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface OnChainEventItem {
  id: string;
  eventName: string;
  txHash: string;
  blockNumber: bigint;
  jobId?: string;
  amount?: bigint;
  user?: string;
  details: string;
}

export default function ActivityPage() {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<OnChainEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    if (!publicClient || !isContractConfigured()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Query events from contract
      const currentBlock = await publicClient.getBlockNumber();
      // Look back reasonable range (e.g. 100,000 blocks or from deployment)
      const fromBlock = currentBlock > BigInt(50000) ? currentBlock - BigInt(50000) : BigInt(0);

      const logs = await publicClient.getLogs({
        address: BOTESCROW_ADDRESS,
        fromBlock,
        toBlock: currentBlock,
      });

      const parsedItems: OnChainEventItem[] = [];

      for (const log of logs) {
        // Try decoding log with ABI
        try {
          // Fallback parsing log topics and tx hash
          const txHash = log.transactionHash || "";
          parsedItems.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            eventName: "Contract Interaction",
            txHash,
            blockNumber: log.blockNumber,
            details: `On-chain event executed at block #${log.blockNumber.toString()}`,
          });
        } catch {
          // ignore parsing error
        }
      }

      parsedItems.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEvents(parsedItems);
    } catch (err) {
      console.error("Failed to query on-chain event logs:", err);
      // Fallback empty if node limits getLogs
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [publicClient]);

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
            <ActivityIcon className="w-7 h-7 text-cyan-400" />
            <span>On-Chain Activity</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real-time protocol event logs queried directly from Botchain Testnet.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Refresh Events"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs">Querying Botchain event logs...</span>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Recent Activity"
          description="No recent smart contract events were found within the scanned block range on Botchain Testnet."
          icon={<ActivityIcon className="w-8 h-8 text-zinc-600" />}
        />
      ) : (
        <div className="glass-panel rounded-2xl border border-white/5 divide-y divide-zinc-800/80 overflow-hidden">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <ActivityIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-white">{evt.eventName}</span>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                      Block #{evt.blockNumber.toString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{evt.details}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-auto text-xs font-mono">
                <a
                  href={getExplorerTxUrl(evt.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center space-x-1"
                >
                  <span>{shortenAddress(evt.txHash, 6)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
