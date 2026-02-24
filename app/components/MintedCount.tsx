"use client";
import { useTotalMinted } from "@/hooks/useTotalMinted";

// Displays live minted count, falling back to server-fetched initialTotal
// until the wagmi hook returns data (avoids flash of 0 on first render).
export default function MintedCount({ initialTotal }: { initialTotal: number }) {
  const live = useTotalMinted();
  const count = live > 0 ? live : initialTotal;
  return <>{count.toLocaleString()}</>;
}
