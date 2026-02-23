import { ImageResponse } from "next/og";
import { LobsterIconSvg } from "../lib/lobster-icon";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <LobsterIconSvg width={160} height={160} />
      </div>
    ),
    { ...size }
  );
}
