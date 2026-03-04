/**
 * /api/burned — instant read from KV.
 * Kept warm by /api/burned/sync cron (every minute via vercel.json).
 * No log scanning here — zero timeout risk.
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always read fresh from KV

const CACHE_KEY = "lobsters:burned:state";

interface BurnedState {
  total: string;
  lastBlock: string;
}

export async function GET() {
  try {
    const cached = await kv.get<BurnedState>(CACHE_KEY);
    if (cached?.total) {
      return NextResponse.json({ total: cached.total }, {
        headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
      });
    }
    // KV cold — return 0 but never cache this so the next request retries immediately
    return NextResponse.json({ total: "0" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("burned GET error:", e);
    return NextResponse.json({ total: "0" }, { status: 200 });
  }
}
