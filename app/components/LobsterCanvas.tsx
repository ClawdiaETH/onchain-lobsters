"use client";
import { useRef, useEffect } from "react";
import { drawToCanvas, W, H } from "@/lib/renderer";
import type { Traits } from "@/lib/renderer";

interface Props {
  traits: Traits;
  size?: number;    // display width in px (default 280)
  style?: React.CSSProperties;
}

export default function LobsterCanvas({ traits, size = 280, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Always render at integer multiple of W for crisp pixels
  const scale = Math.max(1, Math.ceil(size / W));

  useEffect(() => {
    drawToCanvas(ref.current, traits);
  }, [traits]);

  return (
    <canvas
      ref={ref}
      width={W * scale}
      height={H * scale}
      style={{
        display: "block",
        width: size,
        height: size * (H / W),
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
