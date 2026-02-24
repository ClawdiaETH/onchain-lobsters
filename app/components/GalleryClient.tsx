"use client";
import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LobsterCanvas from "./LobsterCanvas";
import TraitSheet from "./TraitSheet";
import {
  MUTATIONS,
  SCENES,
  MARKINGS,
  EYES_LIST,
  CLAWS_LIST,
  ACCESSORIES,
} from "@/lib/renderer";
import { SPECIAL_NAMES } from "@/lib/traits";
import type { Traits } from "@/lib/renderer";

const MONO = "'Courier New',monospace";
const PER_PAGE = 24;

export interface LobsterData {
  tokenId: number;
  traits: Traits;
}

interface Props {
  lobsters: LobsterData[];
  total: number;
}

// Filter definitions — options sourced from lib, never hardcoded
const FILTER_DEFS = [
  { key: "mutation",  label: "MUTATION",  options: MUTATIONS.map(m => m.name)    as readonly string[] },
  { key: "scene",     label: "SCENE",     options: SCENES.map(s => s.name)       as readonly string[] },
  { key: "special",   label: "SPECIAL",   options: SPECIAL_NAMES.slice(1)        as readonly string[] },
  { key: "eyes",      label: "EYES",      options: EYES_LIST                     as readonly string[] },
  { key: "claws",     label: "CLAWS",     options: CLAWS_LIST                    as readonly string[] },
  { key: "accessory", label: "ACCESSORY", options: ACCESSORIES                   as readonly string[] },
  { key: "marking",   label: "MARKING",   options: MARKINGS                      as readonly string[] },
] as const;

type FilterKey = typeof FILTER_DEFS[number]["key"];

export default function GalleryClient({ lobsters, total }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current page and active filters from URL
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const activeFilters: Partial<Record<FilterKey, string>> = {};
  for (const f of FILTER_DEFS) {
    const v = searchParams.get(f.key);
    if (v) activeFilters[f.key] = v;
  }

  // Build a new URL and navigate to it
  const updateParams = useCallback(
    (updates: Partial<Record<FilterKey | "page", string | null>>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      router.push(`/gallery${qs ? "?" + qs : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Apply filters
  const filtered = useMemo(() => {
    return lobsters.filter(({ traits }) => {
      if (activeFilters.mutation && MUTATIONS[traits.mutation]?.name !== activeFilters.mutation)
        return false;
      if (activeFilters.scene && SCENES[traits.scene]?.name !== activeFilters.scene)
        return false;
      if (activeFilters.special) {
        const name = SPECIAL_NAMES[traits.special] ?? "";
        if (!name || name !== activeFilters.special) return false;
      }
      if (activeFilters.eyes && EYES_LIST[traits.eyes] !== activeFilters.eyes)
        return false;
      if (activeFilters.claws && CLAWS_LIST[traits.claws] !== activeFilters.claws)
        return false;
      if (activeFilters.accessory && ACCESSORIES[traits.accessory] !== activeFilters.accessory)
        return false;
      if (activeFilters.marking && MARKINGS[traits.marking] !== activeFilters.marking)
        return false;
      return true;
    });
  }, [lobsters, JSON.stringify(activeFilters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageLobsters = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div style={{ padding: "0 24px 48px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Filter bar ── */}
      <div
        style={{
          marginBottom: 24,
          padding: "16px 20px",
          background: "#0A0A16",
          border: "1px solid #1A1A2E",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: "#8888A8",
              letterSpacing: "0.14em",
            }}
          >
            FILTER BY TRAIT
          </span>
          {hasActiveFilters && (
            <button
              onClick={() => {
                const clears: Partial<Record<FilterKey | "page", null>> = {};
                for (const f of FILTER_DEFS) clears[f.key] = null;
                updateParams(clears, true);
              }}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: "#C84820",
                background: "transparent",
                border: "1px solid #C84820",
                borderRadius: 3,
                padding: "3px 10px",
                cursor: "pointer",
                letterSpacing: "0.12em",
              }}
            >
              CLEAR ALL
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 8,
          }}
        >
          {FILTER_DEFS.map((f) => (
            <div key={f.key}>
              <label
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  color: "#4A4A6A",
                  letterSpacing: "0.12em",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {f.label}
              </label>
              <select
                value={activeFilters[f.key] ?? ""}
                onChange={(e) =>
                  updateParams({ [f.key]: e.target.value || null } as Partial<
                    Record<FilterKey | "page", string | null>
                  >)
                }
                style={{
                  width: "100%",
                  background: "#050509",
                  border: `1px solid ${activeFilters[f.key] ? "#C84820" : "#1A1A2E"}`,
                  borderRadius: 3,
                  color: activeFilters[f.key] ? "#E8E8F2" : "#4A4A6A",
                  fontFamily: MONO,
                  fontSize: 10,
                  padding: "5px 6px",
                  cursor: "pointer",
                  letterSpacing: "0.07em",
                  outline: "none",
                  appearance: "none" as const,
                  WebkitAppearance: "none" as const,
                }}
              >
                <option value="">ALL</option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ── Results summary ── */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 11,
          color: "#4A4A6A",
          letterSpacing: "0.12em",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          {hasActiveFilters ? (
            <>
              {filtered.length.toLocaleString()} MATCH
              {filtered.length !== 1 ? "ES" : ""} · PAGE {page}/{totalPages}
            </>
          ) : (
            <>
              {total.toLocaleString()} MINTED · PAGE {page}/{totalPages}
            </>
          )}
        </span>
        <span style={{ color: "#2A2A4A", fontSize: 10 }}>{PER_PAGE}/PAGE</span>
      </div>

      {/* ── Grid ── */}
      {pageLobsters.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            fontFamily: MONO,
            fontSize: 13,
            color: "#4A4A6A",
            letterSpacing: "0.18em",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 12 }}>🦞</div>
          NO LOBSTERS MATCH THESE FILTERS.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {pageLobsters.map(({ tokenId, traits }) => (
            <GalleryCard
              key={tokenId}
              traits={traits}
              tokenId={tokenId}
              onClick={() => router.push(`/lobster/${tokenId}`)}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            fontFamily: MONO,
            flexWrap: "wrap",
          }}
        >
          <PageButton
            label="← PREV"
            disabled={page <= 1}
            onClick={() =>
              updateParams({ page: String(page - 1) } as Partial<
                Record<FilterKey | "page", string | null>
              >, false)
            }
          />

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                style={{ color: "#4A4A6A", fontSize: 11, padding: "0 4px" }}
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() =>
                  updateParams({ page: String(p) } as Partial<
                    Record<FilterKey | "page", string | null>
                  >, false)
                }
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: p === page ? "#C84820" : "transparent",
                  color: p === page ? "#FFF" : "#4A4A6A",
                  border: `1px solid ${p === page ? "#C84820" : "#1A1A2E"}`,
                  borderRadius: 3,
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                }}
              >
                {p}
              </button>
            )
          )}

          <PageButton
            label="NEXT →"
            disabled={page >= totalPages}
            onClick={() =>
              updateParams({ page: String(page + 1) } as Partial<
                Record<FilterKey | "page", string | null>
              >, false)
            }
          />
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PageButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.1em",
        padding: "7px 14px",
        background: "transparent",
        color: disabled ? "#2A2A4A" : "#C84820",
        border: `1px solid ${disabled ? "#1A1A2E" : "#C84820"}`,
        borderRadius: 3,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, "...", total);
  } else if (current >= total - 3) {
    pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }
  return pages;
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
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        background: "#0A0A16",
        border: "1px solid #1A1A2E",
        borderRadius: 4,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C84820";
        e.currentTarget.style.boxShadow = "0 0 16px rgba(200,72,32,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#1A1A2E";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <LobsterCanvas traits={traits} size={220} />
      <div style={{ padding: "10px 12px", borderTop: "1px solid #1A1A2E" }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            color: "#C84820",
            letterSpacing: "0.12em",
            fontWeight: 700,
          }}
        >
          #{String(tokenId).padStart(4, "0")}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#8888A8",
            marginTop: 3,
            letterSpacing: "0.08em",
          }}
        >
          {MUTATIONS[traits.mutation]?.name} · {SCENES[traits.scene]?.name}
        </div>
      </div>
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #1A1A2E" }}>
        <TraitSheet traits={traits} />
      </div>
    </div>
  );
}
