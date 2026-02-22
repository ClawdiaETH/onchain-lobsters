"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Single flip tile ────────────────────────────────────────────────────────

interface TileProps {
  src: string;
  nextSrc: string | null; // set externally when a flip is requested
  onFlipDone: () => void;
  flipDuration?: number;   // ms
}

function FlipTile({ src, nextSrc, onFlipDone, flipDuration = 900 }: TileProps) {
  // "face" tracks which face is currently showing
  // "animating" is true during the flip
  const [front, setFront] = useState(src);
  const [back, setBack] = useState(src);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kick off a flip whenever nextSrc changes (and is different from current front)
  useEffect(() => {
    if (!nextSrc || nextSrc === front || animating) return;

    setBack(nextSrc);
    setAnimating(true);
    setFlipped(true);

    timerRef.current = setTimeout(() => {
      // Animation done — make the new image the "front" and reset silently
      setFront(nextSrc);
      setFlipped(false);
      setAnimating(false);
      onFlipDone();
    }, flipDuration + 50); // slight buffer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSrc]);

  // Also sync front when src prop changes externally without a flip (init)
  useEffect(() => {
    if (!animating) setFront(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const perspective = "400px";

  return (
    <div style={{ perspective, width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Flipper card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: animating
            ? `transform ${flipDuration}ms cubic-bezier(0.45, 0.05, 0.55, 0.95)`
            : "none",
        }}
      >
        {/* Front face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "#0A0A14",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={front}
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

        {/* Back face (pre-loaded next lobster) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "#0A0A14",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={back}
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
      </div>
    </div>
  );
}

// ─── Grid orchestrator ────────────────────────────────────────────────────────

interface Props {
  svgPool: string[];
  cols?: number;
  rows?: number;
  /** How often to flip a tile (ms). Default 3500 */
  intervalMs?: number;
  /** Duration of the flip animation (ms). Default 900 */
  flipDuration?: number;
}

export default function HeroMosaic({
  svgPool,
  cols = 4,
  rows = 5,
  intervalMs = 3500,
  flipDuration = 900,
}: Props) {
  const count = cols * rows;

  // Stable initial set
  const [current, setCurrent] = useState<string[]>(() =>
    [...svgPool].sort(() => Math.random() - 0.5).slice(0, count)
  );

  // nextSrc per tile — null means "no pending flip"
  const [pending, setPending] = useState<(string | null)[]>(() =>
    Array(count).fill(null)
  );

  // Track which tiles are mid-flip so we don't double-queue them
  const busyRef = useRef<Set<number>>(new Set());

  const triggerFlip = useCallback(() => {
    // Pick one tile that isn't already flipping
    const free = Array.from({ length: count }, (_, i) => i).filter(
      i => !busyRef.current.has(i)
    );
    if (free.length === 0) return;

    const idx = free[Math.floor(Math.random() * free.length)];
    busyRef.current.add(idx);

    // Pick a replacement not currently shown
    const pool = svgPool.filter(s => !current.includes(s));
    const next =
      pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : svgPool[Math.floor(Math.random() * svgPool.length)];

    setPending(prev => {
      const arr = [...prev];
      arr[idx] = next;
      return arr;
    });
  }, [svgPool, count, current]);

  useEffect(() => {
    const iv = setInterval(triggerFlip, intervalMs);
    return () => clearInterval(iv);
  }, [triggerFlip, intervalMs]);

  const handleDone = useCallback(
    (idx: number, nextSrc: string) => {
      busyRef.current.delete(idx);
      setCurrent(prev => {
        const arr = [...prev];
        arr[idx] = nextSrc;
        return arr;
      });
      setPending(prev => {
        const arr = [...prev];
        arr[idx] = null;
        return arr;
      });
    },
    []
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 3,
        height: "100%",
        background: "#0A0A14",
        padding: 3,
        overflow: "hidden",
      }}
    >
      {current.map((src, i) => (
        <FlipTile
          key={i}
          src={src}
          nextSrc={pending[i]}
          flipDuration={flipDuration}
          onFlipDone={() => handleDone(i, pending[i]!)}
        />
      ))}
    </div>
  );
}
