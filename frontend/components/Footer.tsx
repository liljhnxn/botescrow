import React from "react";
import Link from "next/link";
import { Shield, ExternalLink, AlertOctagon } from "lucide-react";
import { CONTRACT_CONFIG, getExplorerContractUrl } from "@/lib/contracts";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-md pt-12 pb-8 mt-20 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">BotEscrow</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Decentralized freelance and work escrow protocol running natively on Botchain. Trustless milestone payments and arbitration.
            </p>
            <div className="text-xs font-mono text-zinc-500">
              Chain ID: 968 | Native: BOT
            </div>
          </div>

          {/* Protocol Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Protocol</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/jobs" className="hover:text-cyan-400 transition-colors">
                  Explore Escrows
                </Link>
              </li>
              <li>
                <Link href="/jobs/create" className="hover:text-cyan-400 transition-colors">
                  Create Job Agreement
                </Link>
              </li>
              <li>
                <Link href="/my-work" className="hover:text-cyan-400 transition-colors">
                  Freelancer Workspace
                </Link>
              </li>
              <li>
                <Link href="/my-contracts" className="hover:text-cyan-400 transition-colors">
                  Client Contracts
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Arbitration & Dev</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/disputes" className="hover:text-cyan-400 transition-colors">
                  Dispute Center
                </Link>
              </li>
              <li>
                <Link href="/arbitration" className="hover:text-cyan-400 transition-colors">
                  Arbitrator Portal
                </Link>
              </li>
              <li>
                <Link href="/activity" className="hover:text-cyan-400 transition-colors">
                  On-chain Activity
                </Link>
              </li>
              <li>
                <Link href="/developer" className="hover:text-cyan-400 transition-colors">
                  Developer & Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Network & Explorer */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Botchain Testnet</h4>
            <div className="text-xs space-y-1.5 font-mono text-zinc-400">
              <div>RPC: <span className="text-zinc-300">rpc.bohr.life</span></div>
              <div>Explorer: <span className="text-zinc-300">scan.bohr.life</span></div>
              <div className="pt-1">
                <a
                  href={getExplorerContractUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <span>View Contract on BohrScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Security Disclaimer */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-amber-500/20 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <span>Security Disclaimer</span>
          </div>
          <p className="leading-relaxed text-zinc-400">
            BotEscrow is experimental Web3 smart-contract software deployed on Botchain. Users should exercise caution and not deposit funds they cannot afford to lose. All dispute resolutions are subject to the decisions of the configured arbitrator. On-chain evidence URIs and hashes do not automatically verify or prove the underlying truth of submitted documents or claims.
          </p>
        </div>

        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 space-y-4 sm:space-y-0">
          <div>© {new Date().getFullYear()} BotEscrow Protocol. Built for Botchain ecosystem.</div>
          <div className="flex items-center space-x-6">
            <span>BotNS-Ready</span>
            <span>BotRepute-Ready</span>
            <span>BotPay Compatible</span>
            <span>BotInsure Future Integration</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
