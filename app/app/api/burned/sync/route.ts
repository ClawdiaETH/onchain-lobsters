/**
 * /api/burned/sync — Vercel cron job (every minute).
 * Incrementally scans ClawdiaBurned events and keeps KV state warm.
 */
import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { kvGet, kvSet } from "@/lib/kv";
import { CONTRACT_ADDRESS } from "@/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAWDIA_BURNED_EVENT = parseAbiItem(
  "event ClawdiaBurned(uint256 indexed tokenId, uint256 clawdiaAmount)"
);

const DEPLOY_BLOCK = 42506485n;
const CHUNK_SIZE   = 5000n;
const CACHE_KEY    = "lobsters:burned:state";
const CACHE_TTL    = 604800; // 7 days

const PUBLIC_BASE_RPC = "https://mainnet.base.org";

interface BurnedState { total: string; lastBlock: string; }

export async function GET() {
  try {
    const blockClient = createPublicClient({ chain: base, transport: http(PUBLIC_BASE_RPC) });
    const logsClient  = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || undefined) });
    const latest = await blockClient.getBlockNumber();

    let total = 0n;
    let from  = DEPLOY_BLOCK;

    try {
      const cached = await kvGet<BurnedState>(CACHE_KEY);
      if (cached?.total) {
        total = BigInt(cached.total);
        from  = BigInt(cached.lastBlock) + 1n;
        if (from > latest) {
          return NextResponse.json({ ok: true, total: cached.total, upToDate: true });
        }
      }
    } catch { /* start fresh */ }

    let chunksScanned = 0;
    let from_ = from;

    while (from_ <= latest) {
      const to = from_ + CHUNK_SIZE - 1n > latest ? latest : from_ + CHUNK_SIZE - 1n;
      try {
        const logs = await logsClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: CLAWDIA_BURNED_EVENT,
          fromBlock: from_,
          toBlock: to,
        });
        for (const log of logs) total += log.args.clawdiaAmount ?? 0n;

        await kvSet(CACHE_KEY, { total: total.toString(), lastBlock: to.toString() }, CACHE_TTL);
        chunksScanned++;
      } catch (chunkErr) {
        console.error(`sync: chunk ${from_}-${to} failed:`, chunkErr);
        break;
      }
      from_ = to + 1n;
    }

    return NextResponse.json({ ok: true, total: total.toString(), chunksScanned, latestBlock: latest.toString() });
  } catch (e) {
    console.error("sync error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
