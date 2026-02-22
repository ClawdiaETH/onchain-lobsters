import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import GalleryGrid from "@/components/GalleryGrid";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export const revalidate = 60; // ISR — revalidate every 60s

async function getTotalMinted(): Promise<number> {
  try {
    const client = createPublicClient({ chain: base, transport: http() });
    const n = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "totalMinted",
    });
    return Number(n);
  } catch {
    return 0;
  }
}

async function getAllSeeds(total: number): Promise<bigint[]> {
  if (total === 0) return [];
  const client = createPublicClient({ chain: base, transport: http() });
  const calls = Array.from({ length: total }, (_, i) => ({
    address: CONTRACT_ADDRESS,
    abi: LOBSTERS_ABI,
    functionName: "tokenSeed" as const,
    args: [BigInt(i + 1)],
  }));
  const results = await client.multicall({ contracts: calls });
  return results.map(r => (r.result as bigint) ?? 0n);
}

export default async function GalleryPage() {
  const total = await getTotalMinted();
  const seeds = await getAllSeeds(total);
  return <GalleryGrid seeds={seeds} total={total} />;
}
