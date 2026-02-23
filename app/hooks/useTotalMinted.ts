"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export function useTotalMinted(): { total: number | null; loading: boolean } {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const client = createPublicClient({ chain: base, transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) });
        const value = await client.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOBSTERS_ABI,
          functionName: "totalMinted",
        });

        if (!cancelled) {
          setTotal(Number(value));
          setLoading(false);
        }
      } catch (e) {
        console.error("useTotalMinted error:", e);
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    const id = setInterval(fetch, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { total, loading };
}
