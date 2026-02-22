import { ImageResponse } from "next/og";
import { renderLobsterSVG } from "@/lib/renderer";

export const runtime = "nodejs";

// Default OG image for onchainlobsters.xyz (no specific token)
// Shows two lobsters (Classic Red + Calico) with brand copy.
export async function GET() {
  const svgA = renderLobsterSVG({ mutation: 0, scene: 1, marking: 3, claws: 0, eyes: 0, accessory: 2, tailVariant: 0, brokenAntenna: false, special: 0 }, 7);
  const svgB = renderLobsterSVG({ mutation: 5, scene: 2, marking: 0, claws: 4, eyes: 3, accessory: 0, tailVariant: 1, brokenAntenna: false, special: 0 }, 7);

  const imgA = `data:image/svg+xml;base64,${Buffer.from(svgA).toString("base64")}`;
  const imgB = `data:image/svg+xml;base64,${Buffer.from(svgB).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#070710",
          display: "flex",
          width: "1200px",
          height: "630px",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 64px",
        }}
      >
        {/* Left lobster */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgA}
          width={280}
          height={364}
          style={{ imageRendering: "pixelated", flexShrink: 0, opacity: 0.9 }}
          alt=""
        />

        {/* Centre text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            flex: 1,
            padding: "0 40px",
          }}
        >
          <span
            style={{
              color: "#C84820",
              fontFamily: "monospace",
              fontSize: "56px",
              fontWeight: "bold",
              letterSpacing: "2px",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            ONCHAIN{"\n"}LOBSTERS
          </span>
          <span
            style={{
              color: "#AAAACC",
              fontFamily: "monospace",
              fontSize: "20px",
              letterSpacing: "3px",
              marginTop: "6px",
              textAlign: "center",
            }}
          >
            8,004 · BASE · BURNS $CLAWDIA
          </span>
          <span
            style={{
              color: "#444466",
              fontFamily: "monospace",
              fontSize: "15px",
              letterSpacing: "2px",
              textAlign: "center",
            }}
          >
            FULLY ONCHAIN · COMMIT-REVEAL · NO IPFS
          </span>
          <div
            style={{
              marginTop: "18px",
              background: "#C84820",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: "15px",
              letterSpacing: "3px",
              padding: "10px 28px",
              borderRadius: "3px",
              fontWeight: "bold",
            }}
          >
            MINT NOW — 0.005 ETH
          </div>
        </div>

        {/* Right lobster */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgB}
          width={280}
          height={364}
          style={{ imageRendering: "pixelated", flexShrink: 0, opacity: 0.9 }}
          alt=""
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
