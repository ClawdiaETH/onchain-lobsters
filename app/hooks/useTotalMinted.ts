"use client";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export function useTotalMinted() {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LOBSTERS_ABI,
    functionName: "totalMinted",
    query: { refetchInterval: 5000 },
  });
  return Number(data ?? 0n);
}
