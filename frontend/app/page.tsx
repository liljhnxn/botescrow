"use client";

import React from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  formatBOT,
  getExplorerContractUrl,
} from "@/lib/contracts";
import {
  ShieldCheck,
  CheckCircle,
  FileCode,
  Scale,
  Lock,
  ArrowRight,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Coins,
  FileCheck2,
  Users,
} from "lucide-react";

export default function HomePage() {
  // Real on-chain metrics
  const { data: jobCountData, isLoading: isLoadingJobCount } = useReadContract({
    address: BOTESCROW_ADDRESS,
    abi: CONTRACT_CONFIG.abi,
    functionName: "getJobCount",
    query: { enabled: isContractConfigured() },
  });

  const { data: disputeCountData, isLoading: isLoadingDisputeCount } = useReadContract({
    address: BOTESCROW_ADDRESS,
    abi: CONTRACT_CONFIG.abi,
    functionName: "getDisputeCount",
    query: { enabled: isContractConfigured() },
  });

  const { data: protocolConfigData } = useReadContract({
    address: BOTESCROW_ADDRESS,
    abi: CONTRACT_CONFIG.abi,
    functionName: "getProtocolConfig",
    query: { enabled: isContractConfigured() },
  });

  const jobCount = jobCountData ? Number(jobCountData) : 0;
  const disputeCount = disputeCountData ? Number(disputeCountData) : 0;
  const protocolFeeBps = protocolConfigData ? Number(protocolConfigData[0]) : 0;
  const isPaused = protocolConfigData ? Boolean(protocolConfigData[3]) : false;

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="relative text-center py-16 lg:py-24 space-y-8 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-panel border border-cyan-500/30 text-xs font-medium text-cyan-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Decentralized Escrow Protocol Live on Botchain (Chain ID: 968)</span>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Work secured. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Payments protected.
            </span>
          </h1>
          <p className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            BotEscrow lets clients and freelancers lock native BOT in smart-contract escrow, manage milestones, and resolve disputes transparently on-chain.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/jobs/create"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
          >
            <span>Create a Job</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/jobs"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center space-x-2"
          >
            <Layers className="w-4 h-4" />
            <span>Explore Jobs</span>
          </Link>
        </div>

        {/* Real Blockchain Stats Strip */}
        <div className="pt-10 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl text-center space-y-1">
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {isLoadingJobCount ? "..." : jobCount}
            </div>
            <div className="text-xs text-zinc-400">Escrow Jobs Created</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center space-y-1">
            <div className="text-2xl font-bold font-mono text-indigo-400">
              {isLoadingDisputeCount ? "..." : disputeCount}
            </div>
            <div className="text-xs text-zinc-400">On-Chain Disputes</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center space-y-1">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {protocolFeeBps / 100}%
            </div>
            <div className="text-xs text-zinc-400">Protocol Fee</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center space-y-1">
            <div className="text-2xl font-bold font-mono text-amber-400">
              {isPaused ? "Paused" : "Active"}
            </div>
            <div className="text-xs text-zinc-400">Protocol Status</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">How BotEscrow Works</h2>
          <p className="text-sm text-zinc-400">
            A trustless smart-contract lifecycle designed for zero counterparty risk and verifiable work proof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl space-y-3 relative border-t-2 border-t-cyan-500">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h3 className="text-base font-semibold text-white">Deposit & Define</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Client assigns a freelancer, details project deliverables, breaks work into milestones, and locks native BOT into the contract.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3 relative border-t-2 border-t-blue-500">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h3 className="text-base font-semibold text-white">Accept & Submit</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Freelancer accepts the terms on-chain. Upon finishing work, freelancer submits IPFS hashes or public repository evidence links.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3 relative border-t-2 border-t-emerald-500">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h3 className="text-base font-semibold text-white">Approve & Release</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Client reviews the milestone submission. When satisfied, client approves and triggers instant trustless BOT release to the freelancer.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3 relative border-t-2 border-t-purple-500">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold font-mono">
              04
            </div>
            <h3 className="text-base font-semibold text-white">Dispute & Arbitrate</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If disagreements arise, either party can open a dispute. Funds remain locked until the designated arbitrator reviews proof and awards escrow.
            </p>
          </div>
        </div>
      </section>

      {/* Role Workflows */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Client Workflow */}
        <div className="glass-panel p-8 rounded-2xl space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">For Clients</h3>
              <p className="text-xs text-zinc-400">Total control over milestones and budget</p>
            </div>
          </div>
          <ul className="space-y-3 text-xs text-zinc-300">
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>Lock native BOT securely — funds cannot be stolen or pulled out arbitrarily.</span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>Review submitted IPFS or code evidence before authorizing any payout.</span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>Request mutual cancellation with automatic escrow refund if scope changes.</span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <span>Escalate to unbiased on-chain arbitration if deliverables are not met.</span>
            </li>
          </ul>
          <Link
            href="/jobs/create"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 pt-2"
          >
            <span>Start a Client Escrow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Freelancer Workflow */}
        <div className="glass-panel p-8 rounded-2xl space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <BriefcaseIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">For Freelancers</h3>
              <p className="text-xs text-zinc-400">Guaranteed payment backed by smart contract</p>
            </div>
          </div>
          <ul className="space-y-3 text-xs text-zinc-300">
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <span>Verify that funds are 100% locked on-chain before writing a single line of code.</span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <span>Attach cryptographic evidence and immutable hashes for completed work.</span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <span>Immediate native BOT transfer upon milestone approval without delays.</span>
            </li>
            <li className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <span>Full protection against non-paying clients through on-chain dispute system.</span>
            </li>
          </ul>
          <Link
            href="/my-work"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-purple-400 hover:text-purple-300 pt-2"
          >
            <span>Open Freelancer Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Security Architecture Highlights */}
      <section className="glass-panel p-8 sm:p-10 rounded-2xl space-y-6 border border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Smart Contract Security Architecture</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Engineered with checks-effects-interactions, reentrancy guards, and strict access controls.
            </p>
          </div>
          <a
            href={getExplorerContractUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-mono bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-cyan-300 transition-colors"
          >
            <span>Contract on BohrScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Native Escrow Custody</span>
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Locks genuine native BOT via msg.value with explicit balance tracking. Neither party nor admin can arbitrarily drain locked escrow.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-blue-400" />
              <span>Arbitrator Safeguards</span>
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Arbitrator awards cannot exceed the remaining escrow balance. Dispute resolution enforces strict arithmetic and resets job balance to zero.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Ecosystem Integrations</span>
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Engineered with abstractions ready for BotNS domain identities, BotRepute scoring, BotPay payment routes, BotInsure, and BotDAO governance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function BriefcaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
