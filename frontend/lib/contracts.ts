import { formatEther, parseEther } from "viem";
import { botchainTestnet } from "../config/network";
import { BOTESCROW_ABI } from "./BotEscrowAbi";

// Centralized contract address configuration
export const BOTESCROW_ADDRESS = (process.env.NEXT_PUBLIC_BOTESCROW_ADDRESS ||
  "0x8db360CD0D94B557a587Eb023AD75444A9573b14") as `0x${string}`;

export const CONTRACT_CONFIG = {
  address: BOTESCROW_ADDRESS,
  chainId: botchainTestnet.id,
  chainName: botchainTestnet.name,
  rpcUrl: "https://rpc.bohr.life",
  explorerUrl: "https://scan.bohr.life",
  nativeCurrency: botchainTestnet.nativeCurrency,
  abi: BOTESCROW_ABI,
} as const;

/**
 * Checks if the contract address is configured and valid
 */
export function isContractConfigured(): boolean {
  return (
    Boolean(BOTESCROW_ADDRESS) &&
    BOTESCROW_ADDRESS.startsWith("0x") &&
    BOTESCROW_ADDRESS.length === 42 &&
    BOTESCROW_ADDRESS !== "0x0000000000000000000000000000000000000000"
  );
}

/**
 * Explorer link helpers for Botchain
 */
export function getExplorerAddressUrl(address: string): string {
  if (!address) return "#";
  return `${CONTRACT_CONFIG.explorerUrl}/address/${address}`;
}

export function getExplorerTxUrl(txHash: string): string {
  if (!txHash) return "#";
  return `${CONTRACT_CONFIG.explorerUrl}/tx/${txHash}`;
}

export function getExplorerContractUrl(): string {
  return getExplorerAddressUrl(BOTESCROW_ADDRESS);
}

/**
 * Address formatting helper
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Token formatting helpers for native BOT
 */
export function formatBOT(amountWei?: bigint | string | number): string {
  if (amountWei === undefined || amountWei === null) return "0.00";
  try {
    const weiBigInt = typeof amountWei === "bigint" ? amountWei : BigInt(amountWei.toString());
    const etherStr = formatEther(weiBigInt);
    const num = parseFloat(etherStr);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  } catch {
    return "0.00";
  }
}

export function parseBOT(botAmount: string): bigint {
  try {
    return parseEther(botAmount || "0");
  } catch {
    return BigInt(0);
  }
}

/**
 * BotNS Identity Abstraction
 * Currently resolves to raw address format for MVP.
 * Prepared for pluggable BotNS name resolution (e.g. alice.bot)
 */
export interface ResolvedIdentity {
  rawAddress: string;
  displayName: string;
  isBotNS: boolean;
  avatarUrl?: string;
}

export function resolveIdentity(address?: string): ResolvedIdentity {
  if (!address) {
    return {
      rawAddress: "",
      displayName: "Unknown",
      isBotNS: false,
    };
  }
  return {
    rawAddress: address,
    displayName: shortenAddress(address),
    isBotNS: false, // Set to true once BotNS resolver contract is deployed
  };
}

/**
 * BotRepute Interface Abstraction
 * Real blockchain status without fabricated scores
 */
export interface BotReputeProfile {
  isIntegrated: boolean;
  statusNotice: string;
  score?: number;
  completedJobs?: number;
}

export function getReputationProfile(_address: string): BotReputeProfile {
  return {
    isIntegrated: false,
    statusNotice: "BotRepute integration coming soon.",
  };
}

// State Enums
export enum JobStatus {
  CREATED = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  CANCELLED = 3,
  DISPUTED = 4,
  RESOLVED = 5,
}

export const JOB_STATUS_LABELS: Record<JobStatus, { label: string; color: string; bg: string }> = {
  [JobStatus.CREATED]: { label: "Created (Awaiting Acceptance)", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  [JobStatus.ACTIVE]: { label: "Active & In Progress", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  [JobStatus.COMPLETED]: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  [JobStatus.CANCELLED]: { label: "Cancelled & Refunded", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
  [JobStatus.DISPUTED]: { label: "Disputed", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  [JobStatus.RESOLVED]: { label: "Resolved by Arbitration", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
};

export enum MilestoneStatus {
  PENDING = 0,
  SUBMITTED = 1,
  APPROVED = 2,
  RELEASED = 3,
  REJECTED = 4,
  DISPUTED = 5,
  CANCELLED = 6,
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, { label: string; color: string; bg: string }> = {
  [MilestoneStatus.PENDING]: { label: "Pending", color: "text-zinc-400", bg: "bg-zinc-800/60 border-zinc-700" },
  [MilestoneStatus.SUBMITTED]: { label: "Submitted for Review", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  [MilestoneStatus.APPROVED]: { label: "Approved (Ready for Release)", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  [MilestoneStatus.RELEASED]: { label: "Payment Released", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  [MilestoneStatus.REJECTED]: { label: "Rejected (Needs Revision)", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
  [MilestoneStatus.DISPUTED]: { label: "Disputed", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  [MilestoneStatus.CANCELLED]: { label: "Cancelled", color: "text-zinc-500", bg: "bg-zinc-900 border-zinc-800" },
};

export enum DisputeResolution {
  NONE = 0,
  CLIENT = 1,
  FREELANCER = 2,
  SPLIT = 3,
}

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  [DisputeResolution.NONE]: "Pending Resolution",
  [DisputeResolution.CLIENT]: "Awarded to Client",
  [DisputeResolution.FREELANCER]: "Awarded to Freelancer",
  [DisputeResolution.SPLIT]: "Split Award",
};
