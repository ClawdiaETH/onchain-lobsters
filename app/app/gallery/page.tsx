import { Suspense } from "react";
import GalleryClient from "@/components/GalleryClient";
import type { LobsterData } from "@/components/GalleryClient";
import { MAX_SUPPLY } from "@/constants";
import { getCachedTotal, getCachedSeeds } from "@/lib/cache";
import { seedToTraits } from "@/lib/traits";

export const revalidate = 60;

export const metadata = {
  title: "Gallery — Onchain Lobsters",
  description:
    "All 8,004 fully onchain pixel lobsters on Base. Every mint burns $CLAWDIA.",
};

const MONO = "'Courier New',monospace";

export default async function GalleryPage() {
  const total = await getCachedTotal();
  const seeds = await getCachedSeeds(total);

  // Decode traits server-side — plain objects, fully JSON-serializable
  const lobsters: LobsterData[] = seeds.map((seed, i) => ({
    tokenId: i + 1,
    traits: seedToTraits(seed),
  }));

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Page header */}
      <div className="gallery-header">
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              color: "#E8E8F2",
              letterSpacing: "0.16em",
              fontWeight: 700,
            }}
          >
            GALLERY
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "#8888A8",
              letterSpacing: "0.12em",
              marginTop: 6,
            }}
          >
            <a href="/" style={{ color: "#8888A8", textDecoration: "none" }}>
              ← BACK TO HOME
            </a>
          </div>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: "#8888A8",
            letterSpacing: "0.12em",
            textAlign: "right",
          }}
        >
          <div style={{ color: "#AAAACC" }}>
            {total.toLocaleString()} / {MAX_SUPPLY.toLocaleString()} MINTED
          </div>
          <div style={{ marginTop: 4 }}>
            <a
              href="/mint"
              style={{
                color: "#C84820",
                textDecoration: "none",
                border: "1px solid #C84820",
                padding: "4px 12px",
                borderRadius: 3,
                fontSize: 11,
                letterSpacing: "0.14em",
              }}
            >
              MINT YOURS →
            </a>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "100px 24px",
            fontFamily: MONO,
            fontSize: 14,
            color: "#8888A8",
            letterSpacing: "0.18em",
            lineHeight: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>🦞</div>
          <div>NO LOBSTERS MINTED YET.</div>
          <div style={{ fontSize: 12, color: "#4A4A6A", marginTop: 8 }}>
            <a
              href="/mint"
              style={{ color: "#C84820", textDecoration: "none" }}
            >
              BE THE FIRST →
            </a>
          </div>
        </div>
      ) : (
        <Suspense
          fallback={
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                fontFamily: MONO,
                fontSize: 12,
                color: "#4A4A6A",
                letterSpacing: "0.18em",
              }}
            >
              LOADING GALLERY…
            </div>
          }
        >
          <GalleryClient lobsters={lobsters} total={total} />
        </Suspense>
      )}
    </div>
  );
}
