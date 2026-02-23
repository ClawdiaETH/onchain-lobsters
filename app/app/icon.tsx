import { ImageResponse } from "next/og";
import { LobsterIconSvg } from "../lib/lobster-icon";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Generates /favicon.ico equivalent via Next.js App Router icon convention.
// Renders a crisp pixel lobster icon on brand dark background.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
        }}
      >
        <LobsterIconSvg width={28} height={28} />
      </div>
    ),
    { ...size }
  );
}
