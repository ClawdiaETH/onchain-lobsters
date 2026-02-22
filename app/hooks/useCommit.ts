"use client";
import { useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESS, LOBSTERS_ABI, MINT_PRICE_ETH } from "@/constants";

export function useCommit() {
  const { writeContractAsync } = useWriteContract();

  const commit = async (commitment: `0x${string}`) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "commit",
      args: [commitment],
      value: parseEther(MINT_PRICE_ETH),
    });
  };

  return { commit };
}
