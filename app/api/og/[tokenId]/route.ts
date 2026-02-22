import { NextRequest, NextResponse } from "next/server";
import { createCanvas, createImageData } from "canvas";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { seedToTraits } from "@/lib/traits";
import { renderLobster, W, H, MUTATIONS, SCENES } from "@/lib/renderer";
import { CONTRACT_ADDRESS, LOBSTERS_ABI } from "@/constants";

export const runtime = "nodejs"; // requires canvas package

export async function GET(
  req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = parseInt(params.tokenId);
  if (isNaN(tokenId) || tokenId < 1) return new NextResponse("invalid token id", { status: 400 });

  try {
    const client = createPublicClient({ chain: base, transport: http() });
    const seed = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "tokenSeed",
      args: [BigInt(tokenId)],
    }) as bigint;

    const traits = seedToTraits(seed);
    const pixelBuf = renderLobster(traits);

    const SCALE = 10;
    // Draw pixel art to temp canvas
    const artCanvas = createCanvas(W * SCALE, H * SCALE);
    const artCtx = artCanvas.getContext("2d");
    const tmp = createCanvas(W, H);
    const tmpCtx = tmp.getContext("2d");
    const id = tmpCtx.createImageData(W, H);
    for (let i = 0; i < pixelBuf.length; i++) id.data[i] = pixelBuf[i];
    tmpCtx.putImageData(id, 0, 0);
    (artCtx as any).imageSmoothingEnabled = false;
    artCtx.drawImage(tmp as any, 0, 0, W * SCALE, H * SCALE);

    // Build 1200×630 OG image
    const OG_W = 1200, OG_H = 630;
    const og = createCanvas(OG_W, OG_H);
    const ogc = og.getContext("2d");

    // Background
    ogc.fillStyle = "#050509";
    ogc.fillRect(0, 0, OG_W, OG_H);

    // Left: centered lobster art
    const lW = W * SCALE, lH = H * SCALE;
    const lx = Math.round(OG_W / 4 - lW / 2);
    const ly = Math.round((OG_H - lH) / 2);
    ogc.drawImage(artCanvas as any, lx, ly);

    // Right: text panel
    const textX = OG_W / 2 + 40;

    ogc.fillStyle = "#C84820";
    ogc.font = `bold 52px "Courier New"`;
    ogc.fillText(`#${String(tokenId).padStart(4, "0")}`, textX, 200);

    ogc.fillStyle = "#1e1e2e";
    ogc.font = `18px "Courier New"`;
    ogc.fillText("ONCHAIN LOBSTERS", textX, 250);

    ogc.fillStyle = "#2a2a3a";
    ogc.font = `16px "Courier New"`;
    ogc.fillText(`${MUTATIONS[traits.mutation]?.name} · ${SCENES[traits.scene]?.name}`, textX, 285);
    ogc.fillText("BASE · BURNS $CLAWDIA · NO IPFS", textX, 310);

    // Subtle grid overlay on right side for texture
    ogc.strokeStyle = "rgba(200,72,32,0.04)";
    ogc.lineWidth = 1;
    for (let x = textX - 20; x < OG_W - 20; x += 20) {
      ogc.beginPath(); ogc.moveTo(x, 0); ogc.lineTo(x, OG_H); ogc.stroke();
    }
    for (let y = 0; y < OG_H; y += 20) {
      ogc.beginPath(); ogc.moveTo(textX - 20, y); ogc.lineTo(OG_W, y); ogc.stroke();
    }

    const buf = og.toBuffer("image/png");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("OG error:", e);
    return new NextResponse("error generating image", { status: 500 });
  }
}
