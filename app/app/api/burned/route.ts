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
const CACHE_KEY = "lobsters:burned:total";
const CACHE_TTL = 120; // seconds

export async function GET() {
  // Serve from KV cache if fresh
  try {
    const cached = await kv.get<string>(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ total: cached }, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=60" },
      });
    }
  } catch { /* fall through to RPC */ }

  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL) });
    const latest = await client.getBlockNumber();

    let total = 0n;
    let from = DEPLOY_BLOCK;

    while (from <= latest) {
      const to = from + CHUNK_SIZE > latest ? latest : from + CHUNK_SIZE;

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

    const totalStr = total.toString();

    // Cache result
    try { await kv.set(CACHE_KEY, totalStr, { ex: CACHE_TTL }); } catch { /* non-fatal */ }

    return NextResponse.json({ total: totalStr }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("burned route error:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
