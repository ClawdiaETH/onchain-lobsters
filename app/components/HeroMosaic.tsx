"use client";
import { useState, useEffect, useCallback } from "react";

interface Props {
  svgPool: string[]; // pre-generated data URLs from server
  cols?: number;
  rows?: number;
}

export default function HeroMosaic({ svgPool, cols = 4, rows = 5 }: Props) {
  const count = cols * rows;
  const [shown, setShown] = useState<string[]>(() =>
    [...svgPool].sort(() => Math.random() - 0.5).slice(0, count)
  );
  const [fading, setFading] = useState<Set<number>>(new Set());

  const tick = useCallback(() => {
    // Replace 1-2 random cells with something from the pool not currently shown
    const numReplace = Math.floor(Math.random() * 2) + 1;
    const toReplace = new Set<number>();
    while (toReplace.size < numReplace) {
      toReplace.add(Math.floor(Math.random() * count));
    }

    // Fade out
    setFading(toReplace);

    setTimeout(() => {
      setShown(prev => {
        const next = [...prev];
        toReplace.forEach(idx => {
          const pool = svgPool.filter(s => !next.includes(s));
          const src = pool.length > 0
            ? pool[Math.floor(Math.random() * pool.length)]
            : svgPool[Math.floor(Math.random() * svgPool.length)];
          next[idx] = src;
        });
        return next;
      });
      setFading(new Set());
    }, 350);
  }, [svgPool, count]);

  useEffect(() => {
    const iv = setInterval(tick, 1600);
    return () => clearInterval(iv);
  }, [tick]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: 3,
      height: "100%",
      background: "#0A0A14",
      padding: 3,
      overflow: "hidden",
    }}>
      {shown.map((src, i) => (
        <div
          key={i}
          style={{
            background: "#0A0A14",
            overflow: "hidden",
            opacity: fading.has(i) ? 0 : 1,
            transition: "opacity 0.35s ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              imageRendering: "pixelated",
              display: "block",
            }}
          />
        </div>
      ))}
    </div>
  );
}
