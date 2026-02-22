import { Metadata } from "next";
import { redirect } from "next/navigation";

interface Props {
  params: { tokenId: string };
}

// Dynamic OG tags per token — Twitter and Farcaster unfurl these for share cards.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.tokenId);
  const title = `Onchain Lobster #${String(id).padStart(4, "0")}`;
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

// Redirect to OpenSea for the actual token page.
export default function LobsterPage({ params }: Props) {
  const id = parseInt(params.tokenId);
  redirect(
    `https://opensea.io/assets/base/0xE1C8D0478eBa91541A8F3f62C7F74b650dbEA9EE/${id}`
  );
}
