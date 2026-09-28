"use client";

import React, { useState } from "react";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  getExplorerContractUrl,
} from "@/lib/contracts";
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Terminal,
  Cpu,
  Layers,
  Shield,
  Coins,
  FileCode,
} from "lucide-react";

export default function DeveloperPage() {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAbi, setCopiedAbi] = useState(false);

  const copyToClipboard = (text: string, type: "addr" | "abi") => {
    navigator.clipboard.writeText(text);
    if (type === "addr") {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAbi(true);
      setTimeout(() => setCopiedAbi(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2.5">
          <Code2 className="w-7 h-7 text-cyan-400" />
          <span>Developer & Ecosystem Integration</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Technical specifications, ABI, integration guidelines, and ecosystem architecture for Botchain developers.
        </p>
      </div>

      {/* Network & Contract Deployment Details */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 space-y-6">
        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Botchain Testnet Deployment Configuration</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-sans block text-[11px]">Contract Address</span>
            <div className="flex items-center justify-between text-cyan-300">
              <span className="truncate mr-2">{BOTESCROW_ADDRESS}</span>
              <button
                onClick={() => copyToClipboard(BOTESCROW_ADDRESS, "addr")}
                className="text-zinc-400 hover:text-white"
                title="Copy Address"
              >
                {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-sans block text-[11px]">Chain ID & Network</span>
            <div className="text-white">968 (Botchain Testnet)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-sans block text-[11px]">RPC Endpoint</span>
            <div className="text-zinc-300">https://rpc.bohr.life</div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 font-sans block text-[11px]">Block Explorer</span>
            <a
              href={getExplorerContractUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>https://scan.bohr.life</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-400 font-sans">Full JSON Interface (ABI)</span>
          <button
            onClick={() => copyToClipboard(JSON.stringify(CONTRACT_CONFIG.abi, null, 2), "abi")}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            {copiedAbi ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>ABI Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Contract ABI</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Integration Code Examples */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <span>Viem & Wagmi Integration Examples</span>
        </h2>

        {/* Read Example */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-xs font-semibold text-zinc-300">1. Query Job Escrow State (Viem)</h3>
          <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
{`import { createPublicClient, http } from 'viem';
import { botchainTestnet } from '@/config/network';
import { BOTESCROW_ABI } from '@/lib/BotEscrowAbi';

const client = createPublicClient({
  chain: botchainTestnet,
  transport: http('https://rpc.bohr.life'),
});

// Fetch job struct and remaining balance
const job = await client.readContract({
  address: '${BOTESCROW_ADDRESS}',
  abi: BOTESCROW_ABI,
  functionName: 'getJob',
  args: [1n], // jobId
});

const milestones = await client.readContract({
  address: '${BOTESCROW_ADDRESS}',
  abi: BOTESCROW_ABI,
  functionName: 'getJobMilestones',
  args: [1n],
});`}
          </pre>
        </div>

        {/* Write Example */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
          <h3 className="text-xs font-semibold text-zinc-300">2. Create Escrow Agreement with Milestones</h3>
          <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
{`import { parseEther } from 'viem';

const milestones = [
  {
    title: 'Smart Contract Architecture',
    description: 'Initial implementation and test suite',
    amount: parseEther('1.5'),
    dueDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
  },
  {
    title: 'Frontend Dashboard',
    description: 'Next.js Web3 user interface',
    amount: parseEther('2.5'),
    dueDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 14),
  }
];

const totalValue = parseEther('4.0');

// Execute on-chain
const txHash = await walletClient.writeContract({
  address: '${BOTESCROW_ADDRESS}',
  abi: BOTESCROW_ABI,
  functionName: 'createJob',
  args: [
    '0xFreelancerAddress...',
    'Full Stack Web3 Project',
    'Scope description...',
    'ipfs://QmMetadataCID',
    BigInt(Math.floor(Date.now() / 1000) + 86400 * 21), // deadline
    milestones,
  ],
  value: totalValue,
});`}
          </pre>
        </div>
      </section>

      {/* Ecosystem Architecture Documentation */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Botchain Ecosystem Architecture</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BotNS */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <span>BotNS Ready Identity</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              BotEscrow includes an extensible identity abstraction (<code className="text-cyan-300">resolveIdentity(address)</code>). When BotNS launches on Botchain, wallet addresses throughout the protocol will resolve to human-readable names (e.g. <span className="font-mono text-cyan-300">alice.bot</span>) without modifying the smart contract layer.
            </p>
          </div>

          {/* BotRepute */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm">
              <Shield className="w-4 h-4" />
              <span>BotRepute Architecture</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              BotEscrow is structured with an on-chain reputation adapter interface. Unreleased milestones, timely approvals, and dispute histories provide verifiable behavioral signals for decentralized freelance credit scoring.
            </p>
            <div className="text-[11px] text-amber-400/90 font-mono bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              Status: BotRepute integration coming soon.
            </div>
          </div>

          {/* BotPay Relationship */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
              <Coins className="w-4 h-4" />
              <span>BotPay vs. BotEscrow</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              BotPay optimizes immediate peer-to-peer and merchant transaction flows. In contrast, BotEscrow provides conditional work-based custody: funds remain locked in smart contracts and are only disbursed upon cryptographic proof of milestone fulfillment or arbitrator settlement.
            </p>
          </div>

          {/* BotInsure */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm">
              <Shield className="w-4 h-4" />
              <span>BotInsure Future Integration</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Future releases will allow clients to purchase parametric milestone insurance via BotInsure. If a freelancer misses a milestone deadline by an agreed threshold or an off-chain oracle triggers a failure condition, smart coverage can automatically hedge client losses.
            </p>
          </div>

          {/* BotDAO */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-3 md:col-span-2">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
              <FileCode className="w-4 h-4" />
              <span>BotDAO Governance Roadmap</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              BotEscrow is built with OpenZeppelin AccessControl. In the upcoming phase, governance roles (<code className="text-amber-300">DEFAULT_ADMIN_ROLE</code>, <code className="text-amber-300">ARBITRATOR_MANAGER_ROLE</code>, <code className="text-amber-300">FEE_MANAGER_ROLE</code>) will transition to the BotDAO Timelock contract, enabling decentralized community voting on dispute policies and fee parameters.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
