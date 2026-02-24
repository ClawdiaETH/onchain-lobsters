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
const CHUNK_SIZE = 5000n;   // conservative — Goldsky can drop results on larger ranges
const CACHE_KEY = "lobsters:burned:state";
const CACHE_TTL = 300;      // 5 min — state is additive; we extend on every chunk

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

    // Load existing incremental state
    try {
      const cached = await kv.get<BurnedState>(CACHE_KEY);
      if (cached) {
        total = BigInt(cached.total);
        from = BigInt(cached.lastBlock) + 1n;

        // Already fully caught up — serve immediately
        if (from > latest) {
          return NextResponse.json({ total: cached.total }, {
            headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
          });
        }
      }
    } catch { /* fall through to full scan */ }

    // Scan new blocks chunk by chunk, persisting after each chunk so we
    // survive Vercel function timeouts without losing progress
    let from_ = from;
    while (from_ <= latest) {
      const to = from_ + CHUNK_SIZE - 1n > latest ? latest : from_ + CHUNK_SIZE - 1n;

      try {
        const logs = await client.getLogs({
          address: CONTRACT_ADDRESS,
          event: CLAWDIA_BURNED_EVENT,
          fromBlock: from_,
          toBlock: to,
        });

        for (const log of logs) {
          total += log.args.clawdiaAmount ?? 0n;
        }

        // ✅ Persist after every successful chunk — survives timeouts
        const state: BurnedState = { total: total.toString(), lastBlock: to.toString() };
        await kv.set(CACHE_KEY, state, { ex: CACHE_TTL });
      } catch (chunkErr) {
        console.error(`burned: chunk ${from_}-${to} failed:`, chunkErr);
        // Stop here; next request retries from current lastBlock + 1
        break;
      }

      from_ = to + 1n;
    }

    return NextResponse.json({ total: total.toString() }, {
      headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
    });
  } catch (e) {
    console.error("burned route error:", e);
    // Try to serve stale cache rather than a hard error
    try {
      const cached = await kv.get<BurnedState>(CACHE_KEY);
      if (cached) return NextResponse.json({ total: cached.total }, { status: 200 });
    } catch { /* give up */ }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
