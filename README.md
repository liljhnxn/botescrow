# BotEscrow Protocol

> **Work secured. Payments protected.**  
> A decentralized, trustless freelance and work escrow protocol running natively on **Botchain**.

---

## 1. Project Overview

**BotEscrow** is a decentralized work escrow protocol engineered specifically for the **Botchain** ecosystem. It provides trustless smart-contract custody for native BOT deposits, verifiable milestone management, controlled mutual cancellations, and an on-chain arbitration system for fair dispute settlement.

Neither the client nor the freelancer can unilaterally seize or drain locked escrow funds. Funds can only be disbursed through approved milestone completion or authorized arbitrator dispute rulings.

---

## 2. Key Features

- **Native BOT Custody**: Direct escrow deposits using `msg.value` and safe native transfers. No ERC-20 wrappers needed.
- **Granular Milestone Lifecycle**: Break projects into individual deliverables with independent deadlines, amounts, and completion evidence.
- **Cryptographic Evidence Verification**: Freelancers link milestone deliverables to IPFS CIDs, Git commit hashes, or public URLs.
- **Controlled Mutual Cancellation**:
  - Unilateral cancellation before job acceptance with a 100% refund to the client.
  - Mutual multi-sig cancellation for active projects (protects freelancer against stolen labor and client against abandoned jobs).
- **On-Chain Dispute & Arbitration Engine**:
  - Either client or freelancer can initiate a dispute, freezing unreleased payouts.
  - Designated arbitrators can award 100% to Client, 100% to Freelancer, or enforce a custom Split award.
- **Optional Protocol Fee**: Configurable basis points fee (hard-capped at 10.00% max) deducted only from successful payouts to freelancers.
- **Role-Based Access Control**: Built on OpenZeppelin `AccessControl`, `ReentrancyGuard`, and `Pausable`.
- **Botchain-Native Web3 Dashboard**: Built with Next.js 16, TypeScript, Tailwind CSS, wagmi, viem, and Lucide icons.
- **Real Blockchain State**: Zero mock balances, fake jobs, or fabricated transaction hashes.

---

## 3. Technology Stack

### Smart Contracts & Development Toolchain
- **Solidity**: `^0.8.24`
- **Framework**: Hardhat 2 + TypeChain
- **Security & Libraries**: OpenZeppelin Contracts v5 (`ReentrancyGuard`, `Pausable`, `AccessControl`)
- **Testing**: TypeScript, Mocha, Chai, `@nomicfoundation/hardhat-toolbox`

### Frontend Application
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (ES2022)
- **Styling**: Tailwind CSS + Custom futuristic Web3 glassmorphism
- **Web3 Connectivity**: `wagmi` v2, `viem` v2, `@tanstack/react-query`
- **Icons**: `lucide-react`

---

## 4. Botchain Network Configuration

| Parameter | Value |
| :--- | :--- |
| **Network Name** | Botchain Testnet |
| **Chain ID** | `968` |
| **RPC Endpoint** | `https://rpc.bohr.life` |
| **Block Explorer** | `https://scan.bohr.life` |
| **Native Currency** | `BOT` (18 Decimals) |

Network settings are centralized in `frontend/config/network.ts` and `frontend/lib/contracts.ts`.

---

## 5. Smart Contract Architecture

The smart contract suite is organized under `contracts/`:

```
contracts/
├── BotEscrow.sol             # Core escrow protocol with milestones & disputes
├── interfaces/
│   └── IArbitrator.sol       # Standard interface for external arbitrator contracts
└── mocks/
    └── MockArbitrator.sol    # Testing harness for dispute notifications & rulings
```

### State Machines

#### Job Lifecycle (`JobStatus`)
```
[CREATED] ──(Freelancer: acceptJob)──────────────> [ACTIVE]
    │                                                 │
    ├──(Client/Dev: cancelCreatedJob)                 ├──(Client/Dev: openDispute)──> [DISPUTED]
    ▼                                                 │                                    │
[CANCELLED]                                           ├──(Mutual: approveCancellation)     ▼
                                                      ▼                                [RESOLVED]
                                                 [CANCELLED]
                                                      │
                                                      └──(All Milestones Released)──> [COMPLETED]
```

#### Milestone Lifecycle (`MilestoneStatus`)
```
[PENDING] ──(Freelancer: submitMilestone)──> [SUBMITTED]
    ▲                                             │
    └──(Client: rejectMilestone) ─────────────────┤
                                                  ├──(Client: approveMilestone)──> [APPROVED]
                                                  │                                    │
                                                  ▼                                    ▼
                                             [REJECTED]                            [RELEASED]
```

---

## 6. Project Structure

```
Work 15/
├── contracts/
│   ├── BotEscrow.sol
│   ├── interfaces/
│   │   └── IArbitrator.sol
│   └── mocks/
│       └── MockArbitrator.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── BotEscrow.test.ts
├── frontend/
│   ├── app/
│   │   ├── activity/page.tsx      # On-chain event activity
│   │   ├── admin/page.tsx         # Protocol administration
│   │   ├── arbitration/page.tsx   # Arbitrator dashboard
│   │   ├── developer/page.tsx     # Dev docs, ABI & samples
│   │   ├── dispute/[id]/page.tsx  # Dispute room & settlement
│   │   ├── disputes/page.tsx      # All disputes
│   │   ├── jobs/[id]/page.tsx     # Job detail & milestone timeline
│   │   ├── jobs/create/page.tsx   # Create escrow job
│   │   ├── jobs/page.tsx          # Browse all escrow jobs
│   │   ├── my-contracts/page.tsx  # Client dashboard
│   │   ├── my-work/page.tsx       # Freelancer dashboard
│   │   ├── layout.tsx
│   │   └── page.tsx               # Protocol landing & overview
│   ├── components/
│   │   ├── EmptyState.tsx
│   │   ├── Footer.tsx
│   │   ├── Navbar.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── TransactionModal.tsx
│   │   └── Web3Provider.tsx
│   ├── config/
│   │   ├── network.ts
│   │   └── wagmi.ts
│   ├── hooks/
│   │   └── useBotEscrow.ts
│   └── lib/
│       ├── BotEscrowAbi.ts
│       └── contracts.ts
├── hardhat.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 7. Installation & Setup

### Prerequisites
- Node.js v18+ (tested on Node v25.2.0)
- npm v10+

### Install Dependencies
```bash
# Install root contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the parameters:
```env
PRIVATE_KEY=your_private_key_here
BOTCHAIN_RPC_URL=https://rpc.bohr.life
TREASURY_ADDRESS=0x...
ARBITRATOR_ADDRESS=0x...
NEXT_PUBLIC_BOTESCROW_ADDRESS=0x...
```

---

## 8. Automated Testing

The protocol includes a 20-scenario automated test suite covering job creation, funding verification, milestone lifecycle, payment releases, cancellations, dispute escalation, arbitrator rulings, and security invariants.

Run the test suite:
```bash
npm test
```

### Test Coverage Highlights
- ✅ Correct and mismatched native BOT escrow funding
- ✅ Zero freelancer address, empty title, and invalid deadline guards
- ✅ Freelancer acceptance permissions
- ✅ Milestone submission, rejection, resubmission, and approval
- ✅ Accurate native BOT transfers and protocol fee deductions to treasury
- ✅ Unilateral cancellation of unaccepted jobs with 100% refund
- ✅ Mutual cancellation requiring counterparty consent
- ✅ Dispute freezes on normal payouts
- ✅ Arbitrator rulings: Client award, Freelancer award, and proportional Split
- ✅ Access control roles and emergency circuit breaker (pause/unpause)
- ✅ Direct native transfer rejection

---

## 9. Deployment

### Local Network Deployment
```bash
npm run deploy:local
```

### Botchain Testnet Deployment
Ensure `PRIVATE_KEY` has native `BOT` on Botchain Testnet:
```bash
npm run deploy:botchain
```

#### Verified Live Deployment:
- **Contract Address**: [`0x8db360CD0D94B557a587Eb023AD75444A9573b14`](https://scan.bohr.life/address/0x8db360CD0D94B557a587Eb023AD75444A9573b14#code)
- **Deployment Tx Hash**: [`0x49f60a3caf33a488c72e89af963682c28d4de86fd469b6d87ccfc8cd01ae0463`](https://scan.bohr.life/tx/0x49f60a3caf33a488c72e89af963682c28d4de86fd469b6d87ccfc8cd01ae0463)
- **Verification Status**: ✅ Verified on BohrScan

### Contract Verification
```bash
npx hardhat verify --network botchainTestnet 0x8db360CD0D94B557a587Eb023AD75444A9573b14 0x17e1D0C9Dbe1959b237Ec41d4Fb5643D166A97aC 0x17e1D0C9Dbe1959b237Ec41d4Fb5643D166A97aC 0x17e1D0C9Dbe1959b237Ec41d4Fb5643D166A97aC 250
```

---

## 10. Running the Frontend

```bash
# Start Next.js development server
npm run frontend:dev

# Or build for production
npm run frontend:build
```
Navigate to `http://localhost:3000`.

---

## 11. Ecosystem Integration Roadmap

1. **BotNS (Botchain Name Service)**:
   The frontend includes `resolveIdentity(address)` ready to resolve human-readable domains (e.g. `dev.bot`) as soon as BotNS contracts launch.
2. **BotRepute**:
   Behavioral signals (successful releases, milestone timeliness, dispute records) will feed into decentralized freelance reputation scoring.
3. **BotPay Relationship**:
   BotPay handles instant payments, while BotEscrow handles conditional milestone custody and dispute resolution.
4. **BotInsure**:
   Future milestone insurance modules to hedge client loss against missed deliverables.
5. **BotDAO Governance**:
   Smart contract roles are designed for transfer to the BotDAO Timelock to facilitate community governance.

---

## 12. Security Disclaimer & Limitations

> [!WARNING]
> **Experimental Software**: BotEscrow is experimental decentralized software. Users should exercise caution and not deposit funds they cannot afford to lose. All dispute resolutions are final and subject to the actions of the configured arbitrator.
> 
> **Evidence Verification**: On-chain evidence URIs (IPFS hashes, URLs, commit hashes) provide timestamped cryptographic records of submission; they do not automatically verify the factual correctness or quality of off-chain deliverables.
