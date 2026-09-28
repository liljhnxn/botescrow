"use client";

import React from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink, X } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/contracts";

interface TransactionModalProps {
  status: "idle" | "waiting-wallet" | "pending" | "success" | "error";
  actionName?: string;
  txHash?: string;
  errorMessage?: string;
  onClose: () => void;
}

export function TransactionModal({
  status,
  actionName,
  txHash,
  errorMessage,
  onClose,
}: TransactionModalProps) {
  if (status === "idle") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl glass-panel p-6 border border-zinc-700/80 shadow-2xl relative text-center">
        {/* Close Button always available */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* State Icons & Messages */}
        {status === "waiting-wallet" && (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Approve in Wallet</h3>
              <p className="text-xs text-zinc-400">
                Please confirm the {actionName ? `"${actionName}"` : "transaction"} request in your connected Web3 wallet.
              </p>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Confirming On-Chain</h3>
              <p className="text-xs text-zinc-400">
                Transaction submitted to Botchain Testnet. Waiting for block confirmation...
              </p>
            </div>
            {txHash && (
              <div className="pt-2">
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
                >
                  <span>View on BohrScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Continue in Background
              </button>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Transaction Confirmed!</h3>
              <p className="text-xs text-zinc-400">
                {actionName ? `${actionName} executed successfully on Botchain.` : "Action verified on-chain."}
              </p>
            </div>
            {txHash && (
              <div className="pt-2">
                <a
                  href={getExplorerTxUrl(txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  <span>View Transaction on BohrScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-rose-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Transaction Failed</h3>
              <p className="text-xs text-rose-300/90 break-words leading-relaxed font-mono">
                {errorMessage || "An unexpected error occurred while executing transaction."}
              </p>
            </div>
            <div className="pt-3">
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
