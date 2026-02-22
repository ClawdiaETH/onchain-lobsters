import Link from "next/link";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import GalleryGrid from "@/components/GalleryGrid";
import { CONTRACT_ADDRESS, LOBSTERS_ABI, MINT_PRICE_ETH, MAX_SUPPLY } from "@/constants";
import { seedToTraits } from "@/lib/traits";
import { renderLobsterSVG } from "@/lib/renderer";

export const revalidate = 60;

// Diverse preset seeds for hero grid (covers all mutations + specials visually)
const PRESET_SEEDS: bigint[] = [
  0x1A2B3C4D5E6F7089n, 0x9876543210ABCDEFn, 0x2468ACE02468ACE0n, 0xFEDCBA9876543210n,
  0x0F1E2D3C4B5A6978n, 0x80706050A0302010n, 0xAABBCCDD11223344n, 0x5566778899AABBCCn,
  0x1357924601234567n, 0xDEADBEEF12345678n, 0x0102030405060708n, 0xF0E0D0C0B0A09080n,
  0x1234ABCD5678EF90n, 0x9ABC1234DEF05678n, 0x0011223344556677n, 0x8899AABBCCDDEEFFn,
  0x3141592653589793n, 0x2718281828459045n, 0x1618033988749894n, 0x1414213562373095n,
];

async function getTotalMinted(): Promise<number> {
  try {
    const client = createPublicClient({ chain: base, transport: http() });
    const n = await client.readContract({
      address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI, functionName: "totalMinted",
    });
    return Number(n);
  } catch { return 0; }
}

async function getAllSeeds(total: number): Promise<bigint[]> {
  if (total === 0) return [];
  const client = createPublicClient({ chain: base, transport: http() });
  const calls = Array.from({ length: total }, (_, i) => ({
    address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI,
    functionName: "tokenSeed" as const, args: [BigInt(i + 1)],
  }));
  const results = await client.multicall({ contracts: calls });
  return results.map(r => (r.result as bigint) ?? 0n);
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function HomePage() {
  const total = await getTotalMinted();
  const seeds = await getAllSeeds(total);

  // Hero grid: use real minted lobsters, pad with presets if needed
  const heroSeeds = seeds.length >= 20
    ? seeds.slice(0, 20)
    : [...seeds, ...PRESET_SEEDS].slice(0, 20);
  const heroSVGs = heroSeeds.map(s => svgToDataUrl(renderLobsterSVG(seedToTraits(s), 10)));

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "42% 58%",
        minHeight: "calc(100vh - 120px)",
        overflow: "hidden",
      }}>
        {/* Left — headline + CTA */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "60px 48px 60px 40px",
          borderRight: "1px solid #1A1A2E",
        }}>
          {/* Big pixel headline */}
          <h1 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "clamp(18px, 2.4vw, 32px)",
            lineHeight: 1.6,
            margin: "0 0 32px 0",
            letterSpacing: "0.04em",
          }}>
            <span style={{ color: "#E8E8F2", display: "block" }}>FULLY</span>
            <span style={{ color: "#E8E8F2", display: "block" }}>ONCHAIN</span>
            <span style={{ color: "#C84820", display: "block", marginTop: 8 }}>PIXEL</span>
            <span style={{ color: "#C84820", display: "block" }}>LOBSTERS</span>
            <span style={{ color: "#E8E8F2", display: "block", marginTop: 8 }}>ON BASE</span>
          </h1>

          {/* Description */}
          <p style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12, color: "#8888A8", lineHeight: 1.9,
            margin: "0 0 36px 0", letterSpacing: "0.06em",
            maxWidth: 340,
          }}>
            8,004 generative pixel lobsters. Every sprite lives onchain.
            Minting burns $CLAWDIA forever. Commit-reveal randomness. No IPFS.
          </p>

          {/* CTA */}
          <Link href="/mint" style={{
            display: "inline-block",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 13,
            color: "#fff",
            background: "#C84820",
            padding: "16px 28px",
            textDecoration: "none",
            borderRadius: 2,
            letterSpacing: "0.08em",
            marginBottom: 28,
            transition: "opacity 0.15s",
            alignSelf: "flex-start",
          }}>
            MINT NOW →
          </Link>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: 24, flexWrap: "wrap",
            fontFamily: "'Courier New', monospace",
            fontSize: 11, color: "#4A4A6A", letterSpacing: "0.12em",
          }}>
            <span><span style={{ color: "#E8E8F2", fontWeight: 700 }}>{MINT_PRICE_ETH}</span> ETH</span>
            <span>·</span>
            <span><span style={{ color: "#E8E8F2", fontWeight: 700 }}>{total.toLocaleString()}</span> / {MAX_SUPPLY.toLocaleString()} MINTED</span>
            <span>·</span>
            <span style={{ color: "#C84820" }}>BURNS $CLAWDIA</span>
          </div>
        </div>

        {/* Right — NFT mosaic */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(5, 1fr)",
          gap: 3,
          background: "#0A0A14",
          padding: 3,
        }}>
          {heroSVGs.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Lobster #${i + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "pixelated",
                display: "block",
              }}
            />
          ))}
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid #1A1A2E",
        borderBottom: "1px solid #1A1A2E",
        background: "#07070F",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "center",
        gap: 48,
        flexWrap: "wrap",
      }}>
        {[
          { label: "MINT PRICE", value: `${MINT_PRICE_ETH} ETH` },
          { label: "SUPPLY",     value: `${MAX_SUPPLY.toLocaleString()}` },
          { label: "MINTED",     value: `${total.toLocaleString()}` },
          { label: "ONCHAIN",    value: "100%" },
          { label: "IPFS",       value: "NONE" },
          { label: "BURN TOKEN", value: "$CLAWDIA" },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10, color: "#4A4A6A", letterSpacing: "0.18em", marginBottom: 4,
            }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 14, color: stat.label === "BURN TOKEN" ? "#C84820" : "#E8E8F2",
              letterSpacing: "0.04em",
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 1, background: "#1A1A2E",
        margin: "48px 40px",
        border: "1px solid #1A1A2E",
        borderRadius: 4,
        overflow: "hidden",
      }}>
        {[
          { icon: "🎨", title: "FULLY ONCHAIN",    body: "Every pixel rendered in Solidity. No IPFS, no external deps, no rugs." },
          { icon: "🔥", title: "BURNS $CLAWDIA",   body: "Half your mint goes to buying and burning $CLAWDIA on Uniswap V4." },
          { icon: "🎲", title: "COMMIT-REVEAL",    body: "Provably fair. Your seed uses a future blockhash — nobody can snipe." },
          { icon: "🦞", title: "8,004 LOBSTERS",   body: "40×52 pixels. 8 mutations, 7 scenes, 11 accessories, 5 specials." },
        ].map(f => (
          <div key={f.title} style={{
            background: "#07070F", padding: "28px 24px",
          }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 11, color: "#E8E8F2",
              letterSpacing: "0.06em", marginBottom: 12, lineHeight: 1.6,
            }}>
              {f.title}
            </div>
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 12, color: "#8888A8", lineHeight: 1.8,
            }}>
              {f.body}
            </div>
          </div>
        ))}
      </div>

      {/* ── GALLERY ──────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div style={{ borderTop: "1px solid #1A1A2E", paddingTop: 8 }}>
          <GalleryGrid seeds={seeds} total={total} />
        </div>
      )}
    </>
  );
}
