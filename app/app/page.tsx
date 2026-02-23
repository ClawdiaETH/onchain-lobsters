import Link from "next/link";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import GalleryGrid from "@/components/GalleryGrid";
import HeroMosaic from "@/components/HeroMosaic";
import TotalBurned from "@/components/TotalBurned";
import { CONTRACT_ADDRESS, LOBSTERS_ABI, MINT_PRICE_ETH, MAX_SUPPLY } from "@/constants";
import { seedToTraits } from "@/lib/traits";
import { renderLobsterSVG } from "@/lib/renderer";

export const revalidate = 60;

// 60 diverse preset seeds — covers all 8 mutations, specials, varied scenes + accessories
const PRESET_SEEDS: bigint[] = [
  0x1A2B3C4D5E6F7089n, 0x9876543210ABCDEFn, 0x2468ACE02468ACE0n, 0xFEDCBA9876543210n,
  0x0F1E2D3C4B5A6978n, 0x80706050A0302010n, 0xAABBCCDD11223344n, 0x5566778899AABBCCn,
  0x1357924601234567n, 0xDEADBEEF12345678n, 0x0102030405060708n, 0xF0E0D0C0B0A09080n,
  0x1234ABCD5678EF90n, 0x9ABC1234DEF05678n, 0x0011223344556677n, 0x8899AABBCCDDEEFFn,
  0x3141592653589793n, 0x2718281828459045n, 0x1618033988749894n, 0x1414213562373095n,
  0xA1B2C3D4E5F60718n, 0x5A4B3C2D1E0F9807n, 0xCAFEBABE12345678n, 0xDEADC0DEBEEF1234n,
  0x0BADCAFE87654321n, 0x600DC0DE00000000n, 0xABCDEF0123456789n, 0xFEDCBA0987654321n,
  0x0123456789ABCDEFn, 0x1111111122222222n, 0x3333333344444444n, 0x5555555566666666n,
  0x7777777788888888n, 0x9999999900000000n, 0xAAAAAAAABBBBBBBBn, 0xCCCCCCCCDDDDDDDDn,
  0xEEEEEEEEFFFFFFFFn, 0x0F0F0F0FF0F0F0F0n, 0x1234567887654321n, 0xABCDEFEFCDAB0123n,
  0x246813579ABCDEF0n, 0xF1E2D3C4B5A69780n, 0x0A1B2C3D4E5F6789n, 0x9870123456ABCDEFn,
  0x1122334455667788n, 0x99AABBCCDDEEFF00n, 0xFEEDFACECAFED00Dn, 0xC0FFEE0123456789n,
  0xDEAF00DBEEFDEAD0n, 0x1234FEDC5678BA98n, 0xA0B1C2D3E4F50617n, 0x7061504030201000n,
  0xF0CACC1A00ABCF12n, 0x314159265358979Dn, 0x161803398874989An, 0x271828182845904Bn,
  0x577215664901532Cn, 0x302775637731670Dn, 0x693147180559945Fn, 0x424242424242424En,
];

async function getTotalMinted(): Promise<number> {
  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL) });
    const n = await client.readContract({
      address: CONTRACT_ADDRESS, abi: LOBSTERS_ABI, functionName: "totalMinted",
    });
    return Number(n);
  } catch { return 0; }
}

async function getAllSeeds(total: number): Promise<bigint[]> {
  if (total === 0) return [];
  const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL) });
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

  // Pool: real minted lobsters first, fill with presets up to 60 total for shuffle variety
  const poolSeeds = [...seeds, ...PRESET_SEEDS].slice(0, 60);
  const svgPool = poolSeeds.map(s => svgToDataUrl(renderLobsterSVG(seedToTraits(s), 10)));

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "42% 58%",
        height: "calc(100vh - 120px)",
        overflow: "hidden",
      }}>
        {/* Left — headline + CTA */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "60px 48px 60px 40px",
          borderRight: "1px solid #1A1A2E",
          background: "radial-gradient(ellipse at 30% 40%, rgba(200,72,32,0.07) 0%, transparent 65%)",
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
            fontSize: 15, color: "#9090B0", lineHeight: 1.9,
            margin: "0 0 36px 0", letterSpacing: "0.04em",
            maxWidth: 360,
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
            fontSize: 14, color: "#6A6A8A", letterSpacing: "0.1em",
          }}>
            <span><span style={{ color: "#E8E8F2", fontWeight: 700 }}>{MINT_PRICE_ETH}</span> ETH</span>
            <span>·</span>
            <span><span style={{ color: "#E8E8F2", fontWeight: 700 }}>{total.toLocaleString()}</span> / {MAX_SUPPLY.toLocaleString()} MINTED</span>
            <span>·</span>
            <TotalBurned />
          </div>
        </div>

        {/* Right — shuffling NFT mosaic (client component) */}
        <div style={{ height: "100%", overflow: "hidden" }}>
          <HeroMosaic svgPool={svgPool} cols={4} rows={5} />
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
              fontSize: 12, color: "#6A6A8A", letterSpacing: "0.18em", marginBottom: 4,
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
          <GalleryGrid seeds={seeds.slice(0, 8)} total={total} />
          <div style={{ textAlign: "center", padding: "8px 0 40px" }}>
            <a
              href="/gallery"
              style={{
                fontFamily: "'Courier New',monospace",
                fontSize: 13,
                letterSpacing: "0.16em",
                color: "#C84820",
                textDecoration: "none",
                padding: "10px 28px",
                border: "1px solid #C84820",
                borderRadius: 3,
                display: "inline-block",
              }}
            >
              VIEW ALL {total} LOBSTERS →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
