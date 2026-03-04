import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_KEY = "lobsters:burned:state";

interface BurnedState { total: string; lastBlock: string; }

export async function GET() {
  try {
    const cached = await kvGet<BurnedState>(CACHE_KEY);
    if (cached?.total && cached.total !== "0") {
      return NextResponse.json({ total: cached.total }, {
        headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=10" },
      });
    }
    return NextResponse.json({ total: "0" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("burned GET error:", e);
    return NextResponse.json({ total: "0" }, { headers: { "Cache-Control": "no-store" } });
  }
}
