"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { CONTRACT_ADDRESS } from "@/constants";

// Sums all ClawdiaBurned events emitted by the contract.
// event ClawdiaBurned(uint256 indexed tokenId, uint256 clawdiaAmount)
const CLAWDIA_BURNED_EVENT = parseAbiItem(
  "event ClawdiaBurned(uint256 indexed tokenId, uint256 clawdiaAmount)"
);

// Contract deploy block (v8) — avoid scanning entire chain history.
const DEPLOY_BLOCK = 42506485n;

export function useTotalBurned(): { total: bigint; loading: boolean } {
  const [total, setTotal] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const client = createPublicClient({ chain: base, transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) });
        const logs = await client.getLogs({
          address: CONTRACT_ADDRESS,
          event: CLAWDIA_BURNED_EVENT,
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });

        const sum = logs.reduce(
          (acc, log) => acc + (log.args.clawdiaAmount ?? 0n),
          0n
        );

        if (!cancelled) {
          setTotal(sum);
          setLoading(false);
        }
      } catch (e) {
        console.error("useTotalBurned error:", e);
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    // Refresh every 30s
    const id = setInterval(fetch, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { total, loading };
}
