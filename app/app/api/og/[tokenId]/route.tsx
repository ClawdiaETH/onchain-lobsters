import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { seedToTraits } from "@/lib/traits";
import { renderLobsterSVG, MUTATIONS, SCENES } from "@/lib/renderer";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = parseInt(params.tokenId);
  if (isNaN(tokenId) || tokenId < 1) {
    return new Response("invalid token id", { status: 400 });
  }

  try {
    const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL) });
    const seed = (await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "tokenSeed",
      args: [BigInt(tokenId)],
    })) as bigint;

    const traits = seedToTraits(seed);
    const svg = renderLobsterSVG(traits, 10);
    // Embed SVG as a base64 data URL so ImageResponse can render it
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

    const mutationName = MUTATIONS[traits.mutation]?.name ?? "Classic";
    const sceneName    = SCENES[traits.scene]?.name    ?? "Abyss";
    const idStr        = `#${String(tokenId).padStart(4, "0")}`;

    return new ImageResponse(
      (
        <div
          style={{
            background: "#050509",
            display: "flex",
            width: "1200px",
            height: "630px",
            alignItems: "center",
            padding: "0 80px",
            gap: "80px",
          }}
        >
          {/* Lobster art */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgDataUrl}
            width={400}
            height={520}
            style={{ imageRendering: "pixelated", flexShrink: 0 }}
            alt=""
          />

          {/* Right panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
            }}
          >
            <span
              style={{
                color: "#C84820",
                fontFamily: "monospace",
                fontSize: "64px",
                fontWeight: "bold",
                letterSpacing: "-2px",
              }}
            >
              {idStr}
            </span>
            <span
              style={{
                color: "#dddddd",
                fontFamily: "monospace",
                fontSize: "28px",
                fontWeight: "bold",
                letterSpacing: "4px",
              }}
            >
              ONCHAIN LOBSTERS
            </span>
            <span
              style={{
                color: "#888888",
                fontFamily: "monospace",
                fontSize: "18px",
                marginTop: "8px",
              }}
            >
              {mutationName} · {sceneName}
            </span>
            <span
              style={{
                color: "#444444",
                fontFamily: "monospace",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              BASE · BURNS $CLAWDIA · NO IPFS
            </span>
          </div>
        </div>
      ),
      {
        width: 1200, height: 630,
        headers: { "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400, immutable" },
      }
    );
  } catch (e) {
    console.error("OG error:", e);
    return new Response("error generating image", { status: 500 });
  }
}
