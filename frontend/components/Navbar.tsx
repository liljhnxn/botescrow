"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from "wagmi";
import { botchainTestnet } from "@/config/network";
import {
  formatBOT,
  shortenAddress,
  getExplorerAddressUrl,
  isContractConfigured,
} from "@/lib/contracts";
import {
  Shield,
  Layers,
  PlusCircle,
  Briefcase,
  FileCheck,
  Scale,
  Gavel,
  Activity,
  Settings,
  Code2,
  Menu,
  X,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  Wallet,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({ address });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  const isCorrectChain = chain?.id === botchainTestnet.id;

  const navLinks = [
    { name: "Browse Jobs", href: "/jobs", icon: Layers },
    { name: "Create Job", href: "/jobs/create", icon: PlusCircle },
    { name: "Freelancer", href: "/my-work", icon: Briefcase },
    { name: "Client", href: "/my-contracts", icon: FileCheck },
    { name: "Disputes", href: "/disputes", icon: Scale },
    { name: "Arbitration", href: "/arbitration", icon: Gavel },
    { name: "Activity", href: "/activity", icon: Activity },
    { name: "Admin", href: "/admin", icon: Settings },
    { name: "Developer", href: "/developer", icon: Code2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  BotEscrow
                </span>
                <span className="hidden md:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/40 text-cyan-300">
                  Botchain 968
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side: Network & Wallet Controls */}
          <div className="flex items-center space-x-3">
            {/* Network Badge */}
            {isConnected && (
              <div>
                {isCorrectChain ? (
                  <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Botchain 968</span>
                  </div>
                ) : (
                  <button
                    onClick={() => switchChain({ chainId: botchainTestnet.id })}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch to Botchain</span>
                  </button>
                )}
              </div>
            )}

            {/* Wallet Connect/Info */}
            {!isConnected ? (
              <button
                onClick={() => {
                  const injectedConnector = connectors.find(
                    (c) => c.id === "injected" || c.id === "metaMask"
                  ) || connectors[0];
                  if (injectedConnector) connect({ connector: injectedConnector });
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02]"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 hover:border-zinc-500 text-sm transition-all"
                >
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-cyan-400 font-mono font-medium">
                      {formatBOT(balanceData?.value)} BOT
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      {shortenAddress(address || "")}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Dropdown Menu */}
                {walletMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl glass-panel border border-zinc-700/80 p-3 shadow-2xl z-50">
                    <div className="border-b border-zinc-800 pb-2 mb-2">
                      <div className="text-xs text-zinc-400">Connected Wallet</div>
                      <div className="font-mono text-xs text-white truncate">{address}</div>
                    </div>
                    <div className="space-y-1">
                      <a
                        href={getExplorerAddressUrl(address || "")}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between px-2.5 py-1.5 text-xs text-zinc-300 hover:text-cyan-300 hover:bg-white/5 rounded-lg"
                      >
                        <span>View on BohrScan</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => {
                          disconnect();
                          setWalletMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Contract Configuration Warning Bar if not configured */}
      {!isContractConfigured() && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs text-amber-300">
          Contract not configured yet. Please configure NEXT_PUBLIC_BOTESCROW_ADDRESS in your environment.
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
