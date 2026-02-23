/**
 * Upstash/Vercel KV caching for chain data.
 *
 * Strategy:
 *  - `lobsters:total`         — totalMinted, 120s TTL (detects new mints every 2 min)
 *  - `lobsters:seed:{id}`     — individual tokenSeed, no TTL (immutable once set)
 *
 * On every page load:
 *  1. Read `total` from KV (or RPC if miss)
 *  2. For each tokenId 1..total, check KV for seed
 *  3. Batch-fetch only the missing seeds from chain (multicall)
 *  4. Write new seeds to KV (no TTL — they never change)
 *
 * Result: zero RPC calls once all seeds are cached; only 1 RPC call (multicall)
 * for newly minted tokens.
 */

import { kv } from "@vercel/kv";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

const RPC = process.env.BASE_RPC_URL;

function client() {
  return createPublicClient({ chain: base, transport: http(RPC) });
}

/** Get totalMinted — cached 120s. Falls back to RPC on miss/error. */
export async function getCachedTotal(): Promise<number> {
  try {
    const cached = await kv.get<number>("lobsters:total");
    if (cached !== null && cached !== undefined) return cached;

    const c = client();
    const total = Number(
      await c.readContract({ address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI, functionName: "totalMinted" })
    );
    await kv.set("lobsters:total", total, { ex: 120 }); // 120s TTL
    return total;
  } catch {
    try {
      const c = client();
      return Number(
        await c.readContract({ address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI, functionName: "totalMinted" })
      );
    } catch { return 0; }
  }
}

/** Get all seeds 1..total — KV-first, only RPC for uncached tokens. */
export async function getCachedSeeds(total: number): Promise<bigint[]> {
  if (total === 0) return [];

  try {
    // Read all seed keys in one pipeline
    const keys = Array.from({ length: total }, (_, i) => `lobsters:seed:${i + 1}`);
    const cached = await kv.mget<(string | null)[]>(...keys);

    // Find which tokenIds are missing from cache
    const missing: number[] = [];
    cached.forEach((v, i) => { if (v === null || v === undefined) missing.push(i + 1); });

    if (missing.length > 0) {
      // Multicall only the missing seeds
      const c = client();
      const calls = missing.map(id => ({
        address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI,
        functionName: "tokenSeed" as const, args: [BigInt(id)],
      }));
      const results = await c.multicall({ contracts: calls });

      // Write new seeds to KV — no TTL (immutable)
      const pipeline = kv.pipeline();
      results.forEach((r, i) => {
        const seed = (r.result as bigint) ?? 0n;
        pipeline.set(`lobsters:seed:${missing[i]}`, seed.toString());
        cached[missing[i] - 1] = seed.toString();
      });
      await pipeline.exec();
    }

    return cached.map(v => BigInt(v ?? "0"));
  } catch {
    // Full fallback: fetch everything from RPC
    try {
      const c = client();
      const calls = Array.from({ length: total }, (_, i) => ({
        address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI,
        functionName: "tokenSeed" as const, args: [BigInt(i + 1)],
      }));
      const results = await c.multicall({ contracts: calls });
      return results.map(r => (r.result as bigint) ?? 0n);
    } catch { return []; }
  }
}

/** Invalidate the total cache (call after a known mint). */
export async function invalidateTotal() {
  try { await kv.del("lobsters:total"); } catch {}
}
