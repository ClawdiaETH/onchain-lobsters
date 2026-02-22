"use client";
import { useMemo, useState } from "react";
import LobsterCanvas from "./LobsterCanvas";
import TraitSheet from "./TraitSheet";
import { seedToTraits } from "@/lib/traits";
import { MUTATIONS, SCENES } from "@/lib/renderer";
import type { Traits } from "@/lib/renderer";

const MONO = "'Courier New',monospace";

interface Props {
  seeds: bigint[];
  total: number;
}

export default function GalleryGrid({ seeds, total }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const allTraits: Traits[] = useMemo(() => seeds.map(s => seedToTraits(s)), [seeds]);

  if (total === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "100px 24px",
        fontFamily: MONO,
        fontSize: 14,
        color: "#8888A8",
        letterSpacing: "0.18em",
        lineHeight: 2,
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🦞</div>
        <div>NO LOBSTERS MINED YET.</div>
        <div style={{ fontSize: 12, color: "#4A4A6A", marginTop: 8 }}>BE THE FIRST.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: "#E8E8F2", letterSpacing: "0.14em" }}>
          GALLERY
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#4A4A6A", letterSpacing: "0.12em" }}>
          {total} / 8,004 MINED
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {allTraits.map((traits, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{
              background: "#0A0A16",
              border: `1px solid ${selected === i ? "#C84820" : "#1A1A2E"}`,
              borderRadius: 4,
              overflow: "hidden",
              cursor: "pointer",
              transition: "all 0.15s",
              transform: selected === i ? "scale(1.02)" : "scale(1)",
              boxShadow: selected === i ? "0 0 20px rgba(200,72,32,0.2)" : "none",
            }}
            onMouseEnter={e => {
              if (selected !== i) e.currentTarget.style.borderColor = "#282840";
            }}
            onMouseLeave={e => {
              if (selected !== i) e.currentTarget.style.borderColor = "#1A1A2E";
            }}
          >
            <LobsterCanvas traits={traits} size={200} />

            <div style={{ padding: "10px 12px", borderTop: "1px solid #1A1A2E" }}>
              <div style={{
                fontFamily: MONO, fontSize: 12, color: "#C84820",
                letterSpacing: "0.12em", fontWeight: 700,
              }}>
                #{String(i + 1).padStart(4, "0")}
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 11, color: "#8888A8",
                marginTop: 3, letterSpacing: "0.08em",
              }}>
                {MUTATIONS[traits.mutation]?.name} · {SCENES[traits.scene]?.name}
              </div>
            </div>

            {selected === i && (
              <div style={{ padding: "10px 12px", borderTop: "1px solid #1A1A2E" }}>
                <TraitSheet traits={traits} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
