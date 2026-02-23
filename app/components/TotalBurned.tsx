"use client";
import { useTotalBurned } from "@/hooks/useTotalBurned";
import { formatClawdia } from "@/lib/format";

export default function TotalBurned() {
  const { total, loading } = useTotalBurned();

  if (loading || total === 0n) {
    return <span style={{ color: "#C84820" }}>BURNS $CLAWDIA</span>;
  }

  return (
    <span>
      <span style={{ color: "#C84820", fontWeight: 700 }}>{formatClawdia(total)}</span>
      <span style={{ color: "#C84820" }}> $CLAWDIA BURNED 🔥</span>
    </span>
  );
}
