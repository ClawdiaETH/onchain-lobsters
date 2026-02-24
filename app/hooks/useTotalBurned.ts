"use client";
import { useEffect, useState } from "react";

// Fetches total $CLAWDIA burned via /api/burned (server-side, paginated, KV-cached).
// Previously used getLogs directly from client, but Goldsky RPC has a ~20k block
// range limit which the growing chain range quickly exceeds.
export function useTotalBurned(): { total: bigint; loading: boolean } {
  const [total, setTotal] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const res = await window.fetch("/api/burned");
        if (!res.ok) throw new Error("api error");
        const { total: t } = await res.json();
        if (!cancelled) {
          setTotal(BigInt(t ?? "0"));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    const id = setInterval(fetch, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { total, loading };
}
