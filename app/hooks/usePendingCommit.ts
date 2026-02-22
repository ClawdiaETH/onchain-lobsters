"use client";
import { useEffect, useState } from "react";
import { loadPendingCommit, type PendingCommit } from "@/lib/salt";

export function usePendingCommit(address: string | undefined): PendingCommit | null {
  const [pending, setPending] = useState<PendingCommit | null>(null);

  useEffect(() => {
    if (!address) { setPending(null); return; }
    setPending(loadPendingCommit(address));
  }, [address]);

  return pending;
}
