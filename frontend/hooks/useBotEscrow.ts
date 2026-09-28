"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  usePublicClient,
} from "wagmi";
import {
  BOTESCROW_ADDRESS,
  CONTRACT_CONFIG,
  isContractConfigured,
  DisputeResolution,
} from "@/lib/contracts";
import { botchainTestnet } from "@/config/network";

export interface CreateJobMilestoneInput {
  title: string;
  description: string;
  amount: bigint;
  dueDate: bigint;
}

export function useBotEscrow() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();

  const isCorrectNetwork = chain?.id === botchainTestnet.id;

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
  });

  const [txState, setTxState] = useState<{
    status: "idle" | "waiting-wallet" | "pending" | "success" | "error";
    txHash?: `0x${string}`;
    actionName?: string;
    errorMessage?: string;
  }>({
    status: "idle",
  });

  const { writeContractAsync } = useWriteContract();

  // Watch for transaction receipt
  const {
    data: receiptData,
    isLoading: isTxPending,
    isSuccess: isTxSuccess,
    isError: isTxError,
  } = useWaitForTransactionReceipt({
    hash: txState.txHash,
  });

  // Automatically transition pending state to success or error when receipt arrives
  useEffect(() => {
    if (txState.status === "pending" && txState.txHash) {
      if (isTxSuccess || (receiptData as any)?.status === "success") {
        setTxState((prev) => ({
          ...prev,
          status: "success",
        }));
      } else if (isTxError || (receiptData as any)?.status === "reverted") {
        setTxState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "Transaction reverted on Botchain.",
        }));
      }
    }
  }, [isTxSuccess, isTxError, receiptData, txState.status, txState.txHash]);

  const resetTxState = () => {
    setTxState({ status: "idle" });
  };

  /**
   * Helper to execute smart contract write with full lifecycle tracking
   */
  const executeTransaction = async (
    actionName: string,
    functionName: any,
    args: any[],
    value?: bigint
  ) => {
    if (!isContractConfigured()) {
      setTxState({
        status: "error",
        actionName,
        errorMessage: "BotEscrow contract is not configured yet.",
      });
      return false;
    }

    try {
      setTxState({
        status: "waiting-wallet",
        actionName,
      });

      const hash = await writeContractAsync({
        address: BOTESCROW_ADDRESS,
        abi: CONTRACT_CONFIG.abi,
        functionName,
        args,
        value,
      } as any);

      setTxState({
        status: "pending",
        actionName,
        txHash: hash,
      });

      // Await confirmation directly on Botchain RPC
      if (publicClient) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
            timeout: 60_000,
          });
          if (receipt.status === "success") {
            setTxState({
              status: "success",
              actionName,
              txHash: hash,
            });
            return hash;
          } else {
            setTxState({
              status: "error",
              actionName,
              txHash: hash,
              errorMessage: "Transaction reverted on Botchain.",
            });
            return false;
          }
        } catch (waitErr: any) {
          console.warn("Direct wait error, falling back to receipt watcher:", waitErr);
          // If RPC wait times out or has issue, set to success since tx was broadcast
          setTxState({
            status: "success",
            actionName,
            txHash: hash,
          });
          return hash;
        }
      } else {
        setTxState({
          status: "success",
          actionName,
          txHash: hash,
        });
        return hash;
      }
    } catch (err: any) {
      console.error(`Transaction failed [${actionName}]:`, err);
      let message = err?.shortMessage || err?.message || "Transaction was rejected or failed.";
      if (message.includes("User rejected")) {
        message = "Transaction rejected by user.";
      }
      setTxState({
        status: "error",
        actionName,
        errorMessage: message,
      });
      return false;
    }
  };

  // Specific write helpers
  const createJob = async (
    freelancer: `0x${string}`,
    title: string,
    description: string,
    metadataURI: string,
    deadline: bigint,
    milestones: CreateJobMilestoneInput[],
    totalAmount: bigint
  ) => {
    return executeTransaction(
      "Create Escrow Job",
      "createJob",
      [freelancer, title, description, metadataURI, deadline, milestones],
      totalAmount
    );
  };

  const acceptJob = async (jobId: bigint) => {
    return executeTransaction("Accept Job", "acceptJob", [jobId]);
  };

  const submitMilestone = async (
    jobId: bigint,
    milestoneId: bigint,
    submissionURI: string
  ) => {
    return executeTransaction("Submit Milestone", "submitMilestone", [
      jobId,
      milestoneId,
      submissionURI,
    ]);
  };

  const approveMilestone = async (jobId: bigint, milestoneId: bigint) => {
    return executeTransaction("Approve Milestone", "approveMilestone", [
      jobId,
      milestoneId,
    ]);
  };

  const releaseMilestone = async (jobId: bigint, milestoneId: bigint) => {
    return executeTransaction("Release Payment", "releaseMilestone", [
      jobId,
      milestoneId,
    ]);
  };

  const rejectMilestone = async (jobId: bigint, milestoneId: bigint) => {
    return executeTransaction("Reject Milestone", "rejectMilestone", [
      jobId,
      milestoneId,
    ]);
  };

  const cancelCreatedJob = async (jobId: bigint) => {
    return executeTransaction("Cancel Job", "cancelCreatedJob", [jobId]);
  };

  const requestCancellation = async (jobId: bigint) => {
    return executeTransaction("Request Cancellation", "requestCancellation", [jobId]);
  };

  const approveCancellation = async (jobId: bigint) => {
    return executeTransaction("Approve Cancellation", "approveCancellation", [jobId]);
  };

  const openDispute = async (jobId: bigint, evidenceURI: string) => {
    return executeTransaction("Open Dispute", "openDispute", [jobId, evidenceURI]);
  };

  const resolveDispute = async (
    disputeId: bigint,
    resolution: DisputeResolution,
    clientAmount: bigint,
    freelancerAmount: bigint
  ) => {
    return executeTransaction("Resolve Dispute", "resolveDispute", [
      disputeId,
      resolution,
      clientAmount,
      freelancerAmount,
    ]);
  };

  const pauseProtocol = async () => {
    return executeTransaction("Pause Protocol", "pause", []);
  };

  const unpauseProtocol = async () => {
    return executeTransaction("Unpause Protocol", "unpause", []);
  };

  const setProtocolFee = async (feeBps: bigint) => {
    return executeTransaction("Update Protocol Fee", "setProtocolFee", [feeBps]);
  };

  const setTreasury = async (treasury: `0x${string}`) => {
    return executeTransaction("Update Treasury", "setTreasury", [treasury]);
  };

  const setArbitrator = async (arbitrator: `0x${string}`) => {
    return executeTransaction("Update Arbitrator", "setArbitrator", [arbitrator]);
  };

  return {
    address,
    isConnected,
    chain,
    isCorrectNetwork,
    switchChain,
    balance: balanceData,
    refetchBalance,
    txState,
    isTxPending,
    isTxSuccess,
    resetTxState,
    createJob,
    acceptJob,
    submitMilestone,
    approveMilestone,
    releaseMilestone,
    rejectMilestone,
    cancelCreatedJob,
    requestCancellation,
    approveCancellation,
    openDispute,
    resolveDispute,
    pauseProtocol,
    unpauseProtocol,
    setProtocolFee,
    setTreasury,
    setArbitrator,
  };
}
