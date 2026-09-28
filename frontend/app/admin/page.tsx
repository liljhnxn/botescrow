"use client";

import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress } from "viem";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  getExplorerAddressUrl,
  resolveIdentity,
} from "@/lib/contracts";
import { useBotEscrow } from "@/hooks/useBotEscrow";
import { TransactionModal } from "@/components/TransactionModal";
import {
  Settings,
  Shield,
  Lock,
  Pause,
  Play,
  Percent,
  Landmark,
  Gavel,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const {
    pauseProtocol,
    unpauseProtocol,
    setProtocolFee,
    setTreasury,
    setArbitrator,
    txState,
    resetTxState,
  } = useBotEscrow();

  const [config, setConfig] = useState<{
    feeBps: number;
    treasury: string;
    arbitrator: string;
    isPaused: boolean;
  }>({
    feeBps: 0,
    treasury: "",
    arbitrator: "",
    isPaused: false,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newFeeStr, setNewFeeStr] = useState("");
  const [newTreasury, setNewTreasury] = useState("");
  const [newArbitrator, setNewArbitrator] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const fetchProtocolConfig = async () => {
    if (!publicClient || !isContractConfigured()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = (await publicClient.readContract({
        address: BOTESCROW_ADDRESS,
        abi: CONTRACT_CONFIG.abi,
        functionName: "getProtocolConfig",
      })) as any;

      const feeBps = Number(data[0]);
      const treasury = data[1] as string;
      const arbitrator = data[2] as string;
      const isPaused = Boolean(data[3]);

      setConfig({ feeBps, treasury, arbitrator, isPaused });
      setNewFeeStr(feeBps.toString());
      setNewTreasury(treasury);
      setNewArbitrator(arbitrator);

      if (address) {
        const DEFAULT_ADMIN_ROLE =
          "0x0000000000000000000000000000000000000000000000000000000000000000";
        const hasAdminRole = (await publicClient.readContract({
          address: BOTESCROW_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: "hasRole",
          args: [DEFAULT_ADMIN_ROLE, address],
        })) as boolean;

        setIsAdmin(hasAdminRole);
      }
    } catch (err) {
      console.error("Failed to load admin config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocolConfig();
  }, [publicClient, address]);

  const handleUpdateFee = async () => {
    setInputError(null);
    const fee = parseInt(newFeeStr);
    if (isNaN(fee) || fee < 0 || fee > 1000) {
      setInputError("Protocol fee must be between 0 and 1000 basis points (max 10%).");
      return;
    }
    await setProtocolFee(BigInt(fee));
  };

  const handleUpdateTreasury = async () => {
    setInputError(null);
    if (!isAddress(newTreasury)) {
      setInputError("Invalid Ethereum treasury address.");
      return;
    }
    await setTreasury(newTreasury as `0x${string}`);
  };

  const handleUpdateArbitrator = async () => {
    setInputError(null);
    if (!isAddress(newArbitrator)) {
      setInputError("Invalid Ethereum arbitrator address.");
      return;
    }
    await setArbitrator(newArbitrator as `0x${string}`);
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
          fetchProtocolConfig();
        }}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
          <Settings className="w-7 h-7 text-cyan-400" />
          <span>Protocol Administration</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Smart contract parameter governance, circuit breakers, and fee configuration.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs">Loading protocol configuration from Botchain...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admin Guard Notice */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>
                {isAdmin ? (
                  <span className="text-emerald-400 font-semibold">
                    Admin Access Confirmed for {address ? resolveIdentity(address).displayName : ""}
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Connected wallet does not possess DEFAULT_ADMIN_ROLE. Actions will require admin signatures.
                  </span>
                )}
              </span>
            </div>
            <span className="font-mono text-zinc-500 text-[11px]">Role: DEFAULT_ADMIN_ROLE</span>
          </div>

          {/* Current Live Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-zinc-400">Protocol Fee</span>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {config.feeBps / 100}%
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">{config.feeBps} bps</span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-1">
              <span className="text-[11px] text-zinc-400">Circuit Breaker</span>
              <div
                className={`text-xl font-bold font-mono ${
                  config.isPaused ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {config.isPaused ? "PAUSED" : "ACTIVE"}
              </div>
              <span className="text-[10px] text-zinc-500">
                {config.isPaused ? "Contract halted" : "Operations normal"}
              </span>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/5 space-y-1 sm:col-span-2">
              <span className="text-[11px] text-zinc-400">Treasury Destination</span>
              <div className="text-xs font-mono text-white truncate pt-1">
                {config.treasury || "None"}
              </div>
            </div>
          </div>

          {/* Input Error Alert */}
          {inputError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {inputError}
            </div>
          )}

          {/* Circuit Breaker Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Protocol Circuit Breaker (Pause / Unpause)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Allows authorized PAUSER_ROLE to halt deposits and releases during critical upgrades or emergencies.
                </p>
              </div>

              {config.isPaused ? (
                <button
                  onClick={unpauseProtocol}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Protocol</span>
                </button>
              ) : (
                <button
                  onClick={pauseProtocol}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Protocol</span>
                </button>
              )}
            </div>
          </div>

          {/* Configuration Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fee Configuration */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                <span>Update Protocol Fee</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Configured in basis points (100 = 1%). Hard-capped at 1000 bps (10.00%) in smart contract bytecode.
              </p>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={newFeeStr}
                  onChange={(e) => setNewFeeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleUpdateFee}
                  className="w-full py-2 px-4 rounded-lg text-xs font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 cursor-pointer"
                >
                  Save Protocol Fee
                </button>
              </div>
            </div>

            {/* Treasury Configuration */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-blue-400" />
                <span>Update Treasury Address</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Specifies the address receiving collected protocol fees from successfully released milestones.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newTreasury}
                  onChange={(e) => setNewTreasury(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleUpdateTreasury}
                  className="w-full py-2 px-4 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
                >
                  Save Treasury Address
                </button>
              </div>
            </div>

            {/* Arbitrator Configuration */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Gavel className="w-4 h-4 text-purple-400" />
                <span>Update Designated Arbitrator</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Designate the external arbitrator address or decentralized arbitration smart contract.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newArbitrator}
                  onChange={(e) => setNewArbitrator(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleUpdateArbitrator}
                  className="py-2 px-6 rounded-lg text-xs font-semibold bg-purple-500 text-white hover:bg-purple-400 cursor-pointer"
                >
                  Save Arbitrator
                </button>
              </div>
            </div>
          </div>

          {/* Security Architecture Guarantee Callout */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
            <span className="font-semibold text-zinc-200">Non-Custodial Escrow Invariance:</span>
            <p className="leading-relaxed text-zinc-400">
              The BotEscrow smart contract architecture contains zero backdoors. Administrators cannot withdraw active user escrow, cannot rewrite job ownership, and cannot fabricate milestone completion. Funds can only be disbursed through approved client releases or verified arbitrator dispute resolutions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
