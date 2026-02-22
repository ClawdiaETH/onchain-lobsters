"use client";
import { useEffect, useState } from "react";
import { useBlockNumber } from "wagmi";
import { MIN_REVEAL_BLOCKS } from "@/constants";

// Returns blocks remaining until reveal is possible.
// Negative = window has passed that many blocks ago (still valid if > -100).
export function useBlockCountdown(commitBlock: number | null): number | null {
  const { data: currentBlock } = useBlockNumber({ watch: true });
  const [blocksLeft, setBlocksLeft] = useState<number | null>(null);

  useEffect(() => {
    if (commitBlock === null || currentBlock === undefined) return;
    const elapsed = Number(currentBlock) - commitBlock;
    setBlocksLeft(MIN_REVEAL_BLOCKS - elapsed);
  }, [commitBlock, currentBlock]);

  return blocksLeft;
}
