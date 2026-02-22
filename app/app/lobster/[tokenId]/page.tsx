import { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: { tokenId: string };
}

const CONTRACT = "0xccdC728B100F135d85340184313bCba68456dEaa";

// Dynamic OG tags per token — Twitter and Farcaster crawlers read these
// before any redirect, giving each token its own share card image.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.tokenId);
  const num = String(id).padStart(4, "0");
  const title = `Onchain Lobster #${num}`;
  const description = "Fully onchain pixel art lobster. Minted with $CLAWDIA on Base. Commit-reveal. No IPFS. CC0.";
  const imageUrl = `https://onchainlobsters.xyz/api/og/${id}`;
  const pageUrl = `https://onchainlobsters.xyz/lobster/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Onchain Lobsters",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      site: "@ClawdiaBotAI",
    },
  };
}

export default function LobsterPage({ params }: Props) {
  const id = parseInt(params.tokenId);
  const num = String(id).padStart(4, "0");
  const opensea = `https://opensea.io/assets/base/${CONTRACT}/${id}`;
  const basescan = `https://basescan.org/token/${CONTRACT}?a=${id}`;

  return (
    <div style={{
      minHeight: "100vh", background: "#050509",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Courier New', monospace", color: "#E8E8F2",
      padding: "40px 20px", textAlign: "center",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/og/${id}`}
        alt={`Onchain Lobster #${num}`}
        style={{ maxWidth: 600, width: "100%", borderRadius: 8, marginBottom: 32 }}
      />
      <h1 style={{ fontSize: 24, letterSpacing: "0.2em", margin: "0 0 8px", color: "#C84820" }}>
        ONCHAIN LOBSTER #{num}
      </h1>
      <p style={{ fontSize: 13, color: "#6868A8", marginBottom: 32, letterSpacing: "0.1em" }}>
        FULLY ONCHAIN · BURNS $CLAWDIA · BASE
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a href={opensea} target="_blank" rel="noreferrer" style={{
          fontFamily: "inherit", fontSize: 12, letterSpacing: "0.15em",
          padding: "10px 20px", background: "transparent", color: "#E8E8F2",
          border: "1px solid #2A2A4A", borderRadius: 3, textDecoration: "none",
        }}>VIEW ON OPENSEA ↗</a>
        <a href={basescan} target="_blank" rel="noreferrer" style={{
          fontFamily: "inherit", fontSize: 12, letterSpacing: "0.15em",
          padding: "10px 20px", background: "transparent", color: "#E8E8F2",
          border: "1px solid #2A2A4A", borderRadius: 3, textDecoration: "none",
        }}>BASESCAN ↗</a>
        <Link href="/mint" style={{
          fontFamily: "inherit", fontSize: 12, letterSpacing: "0.15em",
          padding: "10px 20px", background: "#C84820", color: "#fff",
          border: "none", borderRadius: 3, textDecoration: "none",
        }}>MINT YOUR OWN →</Link>
      </div>
    </div>
  );
}
