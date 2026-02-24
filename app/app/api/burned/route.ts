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
const CHUNK_SIZE = 5000n;  // Goldsky silently drops results above ~10k under load; stay well under
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
    } catch { /* fall through to full RPC scan */ }

    // Incrementally scan from last processed block to latest
    // Track the furthest block we successfully scanned so we don't skip chunks on next request
    let lastSuccessfulBlock = from - 1n;

    while (from <= latest) {
      const to = from + CHUNK_SIZE - 1n > latest ? latest : from + CHUNK_SIZE - 1n;

      try {
        const logs = await client.getLogs({
          address: CONTRACT_ADDRESS,
          event: CLAWDIA_BURNED_EVENT,
          fromBlock: from,
          toBlock: to,
        });

        for (const log of logs) {
          total += log.args.clawdiaAmount ?? 0n;
        }

        lastSuccessfulBlock = to;
      } catch (chunkErr) {
        // Log chunk failure but continue — we'll retry this range on the next request
        // by not advancing lastSuccessfulBlock past the failed chunk
        console.error(`burned: chunk ${from}-${to} failed:`, chunkErr);
        break; // stop here; next request will retry from lastSuccessfulBlock + 1
      }

      from = to + 1n;
    }

    const state: BurnedState = { total: total.toString(), lastBlock: lastSuccessfulBlock.toString() };

    // Persist state — on next request we resume from lastSuccessfulBlock + 1
    try { await kv.set(CACHE_KEY, state, { ex: CACHE_TTL }); } catch { /* non-fatal */ }

    return NextResponse.json({ total: state.total }, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
    });
  } catch (e) {
    console.error("burned route error:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
