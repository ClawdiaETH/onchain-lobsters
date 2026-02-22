"use client";
import { useWriteContract } from "wagmi";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export function useReveal() {
  const { writeContractAsync } = useWriteContract();

  const reveal = async (salt: `0x${string}`, recipient: `0x${string}`) => {
    return writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "reveal",
      args: [salt, recipient],
    });
  };

  return { reveal };
}
