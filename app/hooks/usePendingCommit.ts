"use client";
import { useCallback, useEffect, useState } from "react";
import { loadPendingCommit, type PendingCommit } from "@/lib/salt";

// Returns [pending, reload]
// Call reload() after savePendingCommit() to trigger a re-read without requiring
// an address change — fixes the bug where the WAITING phase had no pending data.
export function usePendingCommit(address: string | undefined): [PendingCommit | null, () => void] {
  const [pending, setPending] = useState<PendingCommit | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!address) { setPending(null); return; }
    setPending(loadPendingCommit(address));
  }, [address, tick]);

  return [pending, reload];
}
