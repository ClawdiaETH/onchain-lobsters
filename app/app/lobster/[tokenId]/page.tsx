import { Metadata } from "next";
import Link from "next/link";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { CONTRACT_ADDRESS, LOBSTERS_ABI, OPENSEA_COLLECTION } from "@/constants";
import { seedToTraits } from "@/lib/traits";
import { getCachedTotal } from "@/lib/cache";

// Pre-render all currently minted lobster pages at build time.
// dynamicParams=true (default) means new mints after build still SSR on demand.
export const revalidate = false;

export async function generateStaticParams() {
  try {
    const total = await getCachedTotal();
    return Array.from({ length: total }, (_, i) => ({ tokenId: String(i + 1) }));
  } catch {
    return [];
  }
}

interface Props {
  params: { tokenId: string };
}

const CONTRACT = CONTRACT_ADDRESS;
const MONO = "'Courier New', monospace";
const ACCENT = "#C84820";
const BG = "#050509";
const CARD = "#0D0D1A";
const BORDER = "#1A1A2E";
const TEXT_PRI = "#E8E8F2";
const TEXT_SEC = "#6868A8";
const TEXT_MUT = "#3A3A5A";

// Trait label maps
const MUTATION_NAMES  = ["Classic Red","Calico","Melanistic","Ghost","Blue Ringed","Albino","Nounish","Doodled"];
const SCENE_NAMES     = ["Open Water","Kelp Forest","Coral Reef","Volcanic Vent","Shipwreck","Bioluminescent","Arctic","The Abyss"];
const MARKING_NAMES   = ["None","Banded","Spotted","Striped","Mottled","Iridescent","Camouflage","Luminous"];
const CLAW_NAMES      = ["Standard","Right Crusher","Left Crusher","Dual Crusher","Regenerating","Micro"];
const EYE_NAMES       = ["Standard","Compound","Stalked","Laser","Void","Googly","Nounish"];
const ACCESSORY_NAMES = ["None","Monocle","Top Hat","Pearl Necklace","Anchor Tattoo","Seaweed Crown","Admiral Hat","Party Hat","Doodle Glasses","Pirate Patch","Crystal Crown"];
const TAIL_NAMES      = ["Variant 1","Variant 2","Variant 3","Variant 4","Variant 5"];
const SPECIAL_NAMES   = ["","Ghost","Infernal","Celestial","Nounish","Doodled"];

async function getTokenData(tokenId: number) {
  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL) });
    const seed = (await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "tokenSeed",
      args: [BigInt(tokenId)],
    })) as bigint;
    return seed;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.tokenId);
  const num = String(id).padStart(4, "0");
  const title = `Onchain Lobster #${num}`;
  const description = "Fully onchain pixel art lobster. Minted with $CLAWDIA on Base. Commit-reveal. No IPFS. CC0.";
  const imageUrl = `https://onchainlobsters.xyz/api/og/${id}`;
  const pageUrl  = `https://onchainlobsters.xyz/lobster/${id}`;
  return {
    title, description,
    openGraph: { title, description, url: pageUrl, siteName: "Onchain Lobsters",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl], site: "@ClawdiaBotAI" },
  };
}

export default async function LobsterPage({ params }: Props) {
  const id  = parseInt(params.tokenId);
  const num = String(id).padStart(4, "0");
  const seed = await getTokenData(id);
  const isMinted = seed !== null && seed !== 0n;
  const traits = isMinted ? seedToTraits(seed!) : null;

  const opensea  = `https://opensea.io/assets/base/${CONTRACT}/${id}`;
  const basescan = `https://basescan.org/token/${CONTRACT}?a=${id}`;

  const traitRows = traits ? [
    { label: "SPECIAL",          value: traits.special   ? (SPECIAL_NAMES[traits.special]   ?? "—") : "—" },
    { label: "MUTATION",         value: MUTATION_NAMES[traits.mutation]   ?? "—" },
    { label: "SCENE",            value: SCENE_NAMES[traits.scene]         ?? "—" },
    { label: "MARKING",          value: MARKING_NAMES[traits.marking]     ?? "—" },
    { label: "CLAWS",            value: CLAW_NAMES[traits.claws]          ?? "—" },
    { label: "EYES",             value: EYE_NAMES[traits.eyes]            ?? "—" },
    { label: "ACCESSORY",        value: ACCESSORY_NAMES[traits.accessory] ?? "—" },
    { label: "TAIL",             value: TAIL_NAMES[traits.tailVariant]    ?? "—" },
    { label: "BROKEN ANTENNA",   value: traits.brokenAntenna ? "Yes" : "No" },
  ].filter(r => r.value !== "—" || r.label === "MARKING") : [];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: MONO, color: TEXT_PRI }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <Link href="/" style={{ fontFamily: MONO, fontSize: 11, color: TEXT_SEC, textDecoration: "none", letterSpacing: "0.15em" }}>
            ← ONCHAIN LOBSTERS
          </Link>
          <span style={{ fontFamily: MONO, fontSize: 11, color: TEXT_MUT, letterSpacing: "0.12em" }}>
            BASE · CC0
          </span>
        </div>

        {isMinted ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

            {/* Lobster display — iframe uses the crisp pixel renderer */}
            <div style={{ aspectRatio: "40/52", borderRadius: 4, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              <iframe
                src={`/api/render/${id}`}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                title={`Onchain Lobster #${num}`}
              />
            </div>

            {/* Info panel */}
            <div>
              <div style={{ marginBottom: 4, fontSize: 11, color: TEXT_MUT, letterSpacing: "0.15em" }}>TOKEN #{num}</div>
              <h1 style={{ fontSize: 20, color: ACCENT, letterSpacing: "0.18em", margin: "0 0 4px", fontWeight: 700 }}>
                ONCHAIN LOBSTER
              </h1>
              <p style={{ fontSize: 11, color: TEXT_SEC, margin: "0 0 20px", letterSpacing: "0.08em" }}>
                {traits?.special ? SPECIAL_NAMES[traits.special].toUpperCase() + " · " : ""}
                {MUTATION_NAMES[traits!.mutation].toUpperCase()}
              </p>

              {/* Traits table */}
              <div style={{ marginBottom: 20 }}>
                {traitRows.map(({ label, value }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "7px 0", borderBottom: `1px solid ${BORDER}`,
                    fontSize: 12, letterSpacing: "0.08em",
                  }}>
                    <span style={{ color: TEXT_SEC }}>{label}</span>
                    <span style={{ color: TEXT_PRI }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Links */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <a href={opensea} target="_blank" rel="noreferrer" style={{
                  fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em",
                  padding: "9px 16px", background: "transparent", color: TEXT_PRI,
                  border: `1px solid ${BORDER}`, borderRadius: 3, textDecoration: "none", textAlign: "center",
                }}>VIEW ON OPENSEA ↗</a>
                <a href={basescan} target="_blank" rel="noreferrer" style={{
                  fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em",
                  padding: "9px 16px", background: "transparent", color: TEXT_PRI,
                  border: `1px solid ${BORDER}`, borderRadius: 3, textDecoration: "none", textAlign: "center",
                }}>BASESCAN ↗</a>
                <Link href="/mint" style={{
                  fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em",
                  padding: "9px 16px", background: ACCENT, color: "#fff",
                  border: "none", borderRadius: 3, textDecoration: "none", textAlign: "center",
                }}>MINT YOUR OWN →</Link>
              </div>
            </div>
          </div>
        ) : (
          /* Not minted yet */
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🦞</div>
            <h1 style={{ fontSize: 18, color: ACCENT, letterSpacing: "0.2em", margin: "0 0 8px" }}>
              LOBSTER #{num} NOT YET MINTED
            </h1>
            <p style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 32, letterSpacing: "0.1em" }}>
              8,004 LOBSTERS TOTAL · {id > 1 ? `TOKENS 1–${id - 1} EXIST` : "BE THE FIRST"}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href={OPENSEA_COLLECTION} target="_blank" rel="noreferrer" style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em",
                padding: "10px 20px", background: "transparent", color: TEXT_PRI,
                border: `1px solid ${BORDER}`, borderRadius: 3, textDecoration: "none",
              }}>VIEW COLLECTION ↗</a>
              <Link href="/mint" style={{
                fontFamily: MONO, fontSize: 11, letterSpacing: "0.15em",
                padding: "10px 20px", background: ACCENT, color: "#fff",
                border: "none", borderRadius: 3, textDecoration: "none",
              }}>MINT IT →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
