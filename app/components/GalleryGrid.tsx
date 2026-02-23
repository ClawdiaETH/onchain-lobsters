"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        <div>NO LOBSTERS MINTED YET.</div>
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
          {total} / 8,004 MINTED
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {allTraits.map((traits, i) => {
          const tokenId = i + 1;
          return (
            <GalleryCard
              key={i}
              traits={traits}
              tokenId={tokenId}
              onClick={() => router.push(`/lobster/${tokenId}`)}
            />
          );
        })}
      </div>
    </div>
  );
}

function GalleryCard({
  traits,
  tokenId,
  onClick,
}: {
  traits: Traits;
  tokenId: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick()}
      style={{
        background: "#0A0A16",
        border: "1px solid #1A1A2E",
        borderRadius: 4,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "#C84820";
        e.currentTarget.style.boxShadow = "0 0 16px rgba(200,72,32,0.18)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "#1A1A2E";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Lobster render */}
      <LobsterCanvas traits={traits} size={220} />

      {/* Token info */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #1A1A2E" }}>
        <div style={{
          fontFamily: MONO, fontSize: 12, color: "#C84820",
          letterSpacing: "0.12em", fontWeight: 700,
        }}>
          #{String(tokenId).padStart(4, "0")}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 11, color: "#8888A8",
          marginTop: 3, letterSpacing: "0.08em",
        }}>
          {MUTATIONS[traits.mutation]?.name} · {SCENES[traits.scene]?.name}
        </div>
      </div>

      {/* Traits — always visible */}
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #1A1A2E" }}>
        <TraitSheet traits={traits} />
      </div>
    </div>
  );
}
