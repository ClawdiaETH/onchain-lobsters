import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { seedToTraits } from "@/lib/traits";
import { renderLobsterSVG } from "@/lib/renderer";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export const runtime = "nodejs";

// Serves an HTML page with image-rendering:pixelated applied to the lobster SVG.
// Used as animation_url in tokenURI so OpenSea's detail view shows crisp pixel art.
export async function GET(
  _req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = parseInt(params.tokenId);
  if (isNaN(tokenId) || tokenId < 1) {
    return new NextResponse("invalid token id", { status: 400 });
  }

  try {
    const client = createPublicClient({ chain: base, transport: http() });
    const seed = (await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "tokenSeed",
      args: [BigInt(tokenId)],
    })) as bigint;

    const traits = seedToTraits(seed);
    const svg = renderLobsterSVG(traits, 10);
    const svgB64 = Buffer.from(svg).toString("base64");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0}
body{background:#050509;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;overflow:hidden}
img{max-width:100%;max-height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
</style></head>
<body><img src="data:image/svg+xml;base64,${svgB64}" alt="Onchain Lobster #${tokenId}"/></body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("render error:", e);
    return new NextResponse("error rendering lobster", { status: 500 });
  }
}
