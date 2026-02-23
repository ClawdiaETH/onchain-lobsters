import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { kv } from "@vercel/kv";
import { CONTRACT_ADDRESS } from "@/constants";

export const runtime = "nodejs";

const CLAWDIA_BURNED_EVENT = parseAbiItem(
  "event ClawdiaBurned(uint256 indexed tokenId, uint256 clawdiaAmount)"
);

const DEPLOY_BLOCK = 42506485n;
const CHUNK_SIZE = 18000n; // stay comfortably under Goldsky's ~20k limit
const CACHE_KEY = "lobsters:burned:state";
const CACHE_TTL = 120; // seconds

interface BurnedState {
  total: string;
  lastBlock: string;
}

export async function GET() {
  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || undefined) });
    const latest = await client.getBlockNumber();

    let total = 0n;
    let from = DEPLOY_BLOCK;

    // Try to load existing state for incremental scanning
    try {
      const cached = await kv.get<BurnedState>(CACHE_KEY);
      if (cached) {
        total = BigInt(cached.total);
        from = BigInt(cached.lastBlock) + 1n;

        // If we're already up-to-date, return cached total
        if (from > latest) {
          return NextResponse.json({ total: cached.total }, {
            headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
          });
        }
      }
    } catch { /* fall through to RPC scan */ }

    // Incrementally scan from last processed block to latest
    while (from <= latest) {
      const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;

      const logs = await client.getLogs({
        address: CONTRACT_ADDRESS,
        event: CLAWDIA_BURNED_EVENT,
        fromBlock: from,
        toBlock: to,
      });

      for (const log of logs) {
        total += log.args.clawdiaAmount ?? 0n;
      }

      from = to + 1n;
    }

    const state: BurnedState = { total: total.toString(), lastBlock: latest.toString() };

    // Persist state for incremental updates
    try { await kv.set(CACHE_KEY, state, { ex: CACHE_TTL }); } catch { /* non-fatal */ }

    return NextResponse.json({ total: state.total }, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
    });
  } catch (e) {
    console.error("burned route error:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
