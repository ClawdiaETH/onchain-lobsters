"use client";
import { useMemo, useState } from "react";
import LobsterCanvas from "./LobsterCanvas";
import TraitSheet from "./TraitSheet";
import { seedToTraits } from "@/lib/traits";
import { MUTATIONS, SCENES } from "@/lib/renderer";
import type { Traits } from "@/lib/renderer";

interface Props {
  seeds: bigint[];
  total: number;
}

export default function GalleryGrid({ seeds, total }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const allTraits: Traits[] = useMemo(() => seeds.map(s => seedToTraits(s)), [seeds]);

  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", fontFamily: "'Courier New',monospace", fontSize: 10, color: "#161626", letterSpacing: "0.16em" }}>
        NO LOBSTERS MINED YET. BE THE FIRST.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {allTraits.map((traits, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{
              background: "#06060E",
              border: `1px solid ${selected === i ? "#C84820" : "#0c0c1a"}`,
              borderRadius: 2, overflow: "hidden", cursor: "pointer",
              transition: "all 0.12s",
              transform: selected === i ? "scale(1.02)" : "scale(1)",
            }}
          >
            <LobsterCanvas traits={traits} size={200} />
            <div style={{ padding: "8px 10px", borderTop: "1px solid #0a0a14" }}>
              <div style={{ fontFamily: "'Courier New',monospace", fontSize: 8, color: "#C84820", letterSpacing: "0.1em" }}>
                #{String(i + 1).padStart(4, "0")}
              </div>
              <div style={{ fontFamily: "'Courier New',monospace", fontSize: 7, color: "#141424", marginTop: 2 }}>
                {MUTATIONS[traits.mutation]?.name} · {SCENES[traits.scene]?.name}
              </div>
            </div>
            {selected === i && (
              <div style={{ padding: "8px 10px", borderTop: "1px solid #080814" }}>
                <TraitSheet traits={traits} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
