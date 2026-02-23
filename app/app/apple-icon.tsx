import { ImageResponse } from "next/og";

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
        <svg
          width="160"
          height="160"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Antennae */}
          <rect x="11" y="1" width="2" height="5" fill="#C84820" />
          <rect x="15" y="1" width="2" height="5" fill="#C84820" />
          {/* Head */}
          <rect x="9" y="6" width="10" height="5" fill="#C84820" />
          {/* Eyes */}
          <rect x="10" y="7" width="2" height="2" fill="#E8E8F2" />
          <rect x="16" y="7" width="2" height="2" fill="#E8E8F2" />
          {/* Body */}
          <rect x="10" y="11" width="8" height="8" fill="#C84820" />
          {/* Left claw */}
          <rect x="4" y="11" width="5" height="3" fill="#C84820" />
          <rect x="2" y="9" width="3" height="5" fill="#C84820" />
          {/* Right claw */}
          <rect x="19" y="11" width="5" height="3" fill="#C84820" />
          <rect x="23" y="9" width="3" height="5" fill="#C84820" />
          {/* Tail segments */}
          <rect x="11" y="19" width="6" height="3" fill="#A83810" />
          <rect x="12" y="22" width="4" height="3" fill="#C84820" />
          <rect x="13" y="25" width="2" height="2" fill="#A83810" />
          {/* Legs */}
          <rect x="8" y="14" width="2" height="4" fill="#A83810" />
          <rect x="18" y="14" width="2" height="4" fill="#A83810" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
