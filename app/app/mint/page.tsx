"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import LobsterCanvas from "@/components/LobsterCanvas";
import TraitSheet from "@/components/TraitSheet";
import { useCommit } from "@/hooks/useCommit";
import { useReveal } from "@/hooks/useReveal";
import { usePendingCommit } from "@/hooks/usePendingCommit";
import { useBlockCountdown } from "@/hooks/useBlockCountdown";
import { seedToTraits } from "@/lib/traits";
import { generateSalt, computeCommitment, savePendingCommit, clearPendingCommit } from "@/lib/salt";
import { CONTRACT_ADDRESS, LOBSTERS_ABI, MINT_PRICE_ETH, COMMIT_WINDOW_BLOCKS } from "@/constants";
import { drawToCanvas, W, H } from "@/lib/renderer";
import type { Traits } from "@/lib/renderer";

const MONO = "'Courier New',monospace";

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  accent:     "#C84820",
  gold:       "#C8A020",
  textPri:    "#E8E8F2",
  textSec:    "#8888A8",
  textMuted:  "#4A4A6A",
  border:     "#1A1A2E",
  borderAct:  "#282840",
  cardBg:     "#0A0A16",
  panelBg:    "#07070F",
  error:      "#E05050",
  errorBg:    "#140808",
  errorBord:  "#3A1010",
};

// ─── Full 64-bit random seed — covers ALL trait bytes (0–7) ──────────────────
// Traits use bytes 0-7 of the seed: eyes=byte4, accessory=byte5, tail=byte6,
// brokenAntenna/special=byte7. A 32-bit seed locks all those to index 0
// (every preview = Ghost special, no accessory, broken antenna). Fix: 64-bit.
function rand64(): bigint {
  const hi = BigInt(Math.floor(Math.random() * 0x100000000)) << 32n;
  const lo = BigInt(Math.floor(Math.random() * 0x100000000));
  return hi | lo;
}

function useRandomTraits(): Traits {
  const [traits, setTraits] = useState<Traits>(() => seedToTraits(rand64()));
  useEffect(() => {
    const iv = setInterval(() => setTraits(seedToTraits(rand64())), 1800);
    return () => clearInterval(iv);
  }, []);
  return traits;
}

type Phase = "idle" | "committing" | "waiting" | "revealing" | "minted" | "error";

const PULSE_CSS = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.7); }
  }
`;

function SpinnerPanel({ label, sub, color = C.accent }: { label: string; sub: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 0" }}>
      <style>{PULSE_CSS}</style>
      <div style={{
        width: 12, height: 12, borderRadius: "50%",
        background: color, boxShadow: `0 0 14px ${color}`,
        animation: "pulse 1.2s ease-in-out infinite",
      }} />
      <div style={{ fontFamily: MONO, fontSize: 12, color, letterSpacing: "0.18em", marginTop: 16 }}>
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
}

export default function MintPage() {
  const { address, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isWrongChain = !!address && chain?.id !== base.id;
  const publicClient = usePublicClient();
  const randomTraits = useRandomTraits();
  const [pending, reloadPending] = usePendingCommit(address);
  const { commit } = useCommit();
  const { reveal } = useReveal();

  const [phase, setPhase] = useState<Phase>("idle");
  const [mintedTraits, setMinted] = useState<Traits | null>(null);
  const [mintedId, setMintedId] = useState<number | null>(null);
  const [revealTxHash, setRevealTx] = useState<string | null>(null);
  const [errorMsg, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pending && phase === "idle") setPhase("waiting");
  }, [pending]);

  const blocksLeft = useBlockCountdown(pending?.commitBlock ?? null);
  const canReveal = phase === "waiting" && blocksLeft !== null && blocksLeft <= 0;
  const isExpired = phase === "waiting" && blocksLeft !== null && blocksLeft < -COMMIT_WINDOW_BLOCKS;

  // ── Commit ────────────────────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
    if (!address) return;
    setPhase("committing");
    setError(null);
    try {
      const salt = generateSalt();
      const commitment = computeCommitment(salt, address);
      savePendingCommit(address, { salt, commitment, commitBlock: 0, txHash: "0x" as `0x${string}` });
      const txHash = await commit(commitment);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      savePendingCommit(address, { salt, commitment, commitBlock: Number(receipt.blockNumber), txHash });
      reloadPending();
      setPhase("waiting");
    } catch (e: any) {
      clearPendingCommit(address);
      setError(e.shortMessage ?? e.message ?? "Commit failed");
      setPhase("idle");
    }
  }, [address, commit, publicClient, reloadPending]);

  // ── Reveal ────────────────────────────────────────────────────────────────
  const handleReveal = useCallback(async () => {
    if (!address || !pending) return;
    setPhase("revealing");
    setError(null);
    try {
      const txHash = await reveal(pending.salt, address);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });

      // Read seed directly from Revealed(address indexed minter, uint256 indexed tokenId, uint256 seed)
      // event log — avoids a race condition where a follow-up readContract({ tokenSeed }) returns 0
      // (uninitialized) when the RPC node hasn't yet propagated the updated state.
      // keccak256("Revealed(address,uint256,uint256)") = 0xc100f0...
      const REVEALED_SIG = "0xc100f01fdaa206bf36f50fd3c33f747cd602df3abaed791458e1d50d6084e125";
      const revealedLog  = receipt.logs.find(l => l.topics[0] === REVEALED_SIG);

      // Fallback sig for Transfer(address,address,uint256) in case Revealed log is missing
      const TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

      let tokenId: number | null = null;
      let seed: bigint | null = null;

      if (revealedLog) {
        tokenId = Number(BigInt(revealedLog.topics[2]!)); // indexed tokenId
        seed    = BigInt(revealedLog.data);               // non-indexed seed
      } else {
        // Fallback: get tokenId from Transfer, skip seed (will show placeholder)
        const transferLog = receipt.logs.find(l => l.topics[0] === TRANSFER_SIG);
        if (transferLog) tokenId = Number(BigInt(transferLog.topics[3]!));
      }

      if (tokenId) {
        setMinted(seed !== null ? seedToTraits(seed) : null);
        setMintedId(tokenId);
      }

      setRevealTx(txHash);
      clearPendingCommit(address);
      setPhase("minted");
    } catch (e: any) {
      setError(e.shortMessage ?? e.message ?? "Reveal failed");
      setPhase("waiting");
    }
  }, [address, pending, reveal, publicClient]);

  const displayTraits = mintedTraits ?? randomTraits;

  // ─── Download PNG ────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!mintedTraits || mintedId === null) return;
    const scale = 10;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    drawToCanvas(canvas, mintedTraits);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `onchain-lobster-${String(mintedId).padStart(4, "0")}.png`;
    a.click();
  }, [mintedTraits, mintedId]);

  // ─── Share URLs ──────────────────────────────────────────────────────────
  const tokenShareUrl = `https://onchainlobsters.xyz/lobster/${mintedId ?? 1}`;

  // Twitter: include token URL so Twitter unfurls the per-token OG image card.
  const xText = (() => {
    const num = String(mintedId ?? 1).padStart(4, "0");
    return `I just minted Onchain Lobster #${num} by @ClawdiaBotAI\n\n8004 supply (get it?), fully onchain, half of mint fees burn $CLAWDIA\n\n${tokenShareUrl}`;
  })();
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`;

  // Farcaster: text without URL + embeds[] for the rich card.
  const fcText = (() => {
    const num = String(mintedId ?? 1).padStart(4, "0");
    return `I just minted Onchain Lobster #${num} by @clawdia\n\n8004 supply (get it?), fully onchain, half of mint fees burn $CLAWDIA`;
  })();
  const fcShareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(fcText)}&embeds[]=${encodeURIComponent(tokenShareUrl)}`;

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: "0 20px" }}>
      <div className="mint-grid">

        {/* ── LEFT: lobster preview ─────────────────────────────────────── */}
        <div style={{
          background: C.cardBg,
          padding: 28,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          {/* Canvas */}
          <div style={{
            border: `2px solid ${phase === "minted" ? C.gold : C.border}`,
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
            boxShadow: phase === "minted" ? `0 0 40px rgba(200,160,32,0.25)` : "none",
            transition: "box-shadow 0.6s, border-color 0.4s",
          }}>
            <LobsterCanvas traits={displayTraits} size={280} />

            {/* Minted overlay label */}
            {phase === "minted" && mintedId && (
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.88))",
                padding: "24px 12px 12px", textAlign: "center",
              }}>
                <div style={{ fontFamily: MONO, fontSize: 13, color: C.gold, letterSpacing: "0.2em", fontWeight: 700 }}>
                  LOBSTER #{String(mintedId).padStart(4, "0")}
                </div>
              </div>
            )}

            {/* Tx overlay */}
            {(phase === "committing" || phase === "revealing") && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.65)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.accent, letterSpacing: "0.2em" }}>
                  {phase === "committing" ? "COMMITTING..." : "REVEALING..."}
                </span>
              </div>
            )}
          </div>

          {/* Preview label / trait sheet */}
          <div style={{ width: "100%", marginTop: 16 }}>
            {phase === "minted" && mintedTraits ? (
              <TraitSheet traits={mintedTraits} />
            ) : (
              <div style={{
                padding: "10px 14px",
                background: C.panelBg,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                textAlign: "center",
              }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, letterSpacing: "0.12em" }}>
                  {phase === "idle" ? "RANDOMIZING PREVIEWS" : "TRAITS REVEALED ON MINT"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: controls ───────────────────────────────────────────── */}
        <div style={{ background: C.panelBg, padding: 28 }}>

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.accent, letterSpacing: "0.1em" }}>
              MINT A LOBSTER
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.textMuted, marginTop: 6, letterSpacing: "0.1em" }}>
              {MINT_PRICE_ETH} ETH · BURNS $CLAWDIA · BASE
            </div>
          </div>

          {/* Not connected */}
          {!address && (
            <div style={{
              padding: "32px 0",
              fontFamily: MONO, fontSize: 13, color: C.textSec,
              letterSpacing: "0.14em", lineHeight: 2,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>🔌</div>
              CONNECT WALLET TO MINT
            </div>
          )}

          {/* WRONG CHAIN */}
          {address && isWrongChain && (
            <div style={{ paddingTop: 8 }}>
              <div style={{
                fontFamily: MONO, fontSize: 12, color: C.error,
                letterSpacing: "0.1em", lineHeight: 1.8,
                padding: "12px 14px", marginBottom: 20,
                background: C.errorBg, border: `1px solid ${C.errorBord}`, borderRadius: 3,
              }}>
                ⚠️ WRONG NETWORK<br />
                <span style={{ color: C.textMuted }}>
                  Switch to Base to mint.
                </span>
              </div>
              <button
                onClick={() => switchChain({ chainId: base.id })}
                disabled={isSwitching}
                style={{
                  fontFamily: MONO, fontSize: 13, letterSpacing: "0.18em", fontWeight: 700,
                  padding: "13px 24px", width: "100%", borderRadius: 3,
                  background: isSwitching ? "transparent" : C.accent,
                  color: isSwitching ? C.textMuted : "#fff",
                  border: `1px solid ${isSwitching ? C.border : C.accent}`,
                  cursor: isSwitching ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {isSwitching ? "SWITCHING..." : "SWITCH TO BASE →"}
              </button>
            </div>
          )}

          {/* IDLE */}
          {address && phase === "idle" && !isWrongChain && (
            <div>
              <div style={{ marginBottom: 20 }}>
                {[
                  `SIGN #1 — PAY ${MINT_PRICE_ETH} ETH (COMMIT)`,
                  "HALF SWAPS TO $CLAWDIA + BURNS",
                  "WAIT 1-100 BLOCKS (ANTI-FRONTRUN)",
                  "SIGN #2 — REVEAL YOUR LOBSTER",
                ].map((step, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    fontFamily: MONO, fontSize: 12, color: C.textSec,
                    letterSpacing: "0.1em", marginBottom: 10,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: `1px solid ${C.borderAct}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: C.textMuted, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
              <button
                onClick={handleCommit}
                style={{
                  fontFamily: MONO, fontSize: 13, letterSpacing: "0.18em", fontWeight: 700,
                  padding: "13px 24px", background: C.accent, color: "#fff",
                  border: "none", borderRadius: 3, cursor: "pointer", width: "100%",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                MINT (SIGNATURE 1 OF 2)
              </button>
            </div>
          )}

          {/* COMMITTING */}
          {address && phase === "committing" && (
            <SpinnerPanel label="COMMITTING..." sub="Signature 1 of 2 — confirm in your wallet" />
          )}

          {/* WAITING */}
          {address && phase === "waiting" && pending && !isWrongChain && (
            <div>
              <div style={{
                fontFamily: MONO, fontSize: 11, color: C.textMuted,
                letterSpacing: "0.08em", marginBottom: 12, lineHeight: 1.6,
              }}>
                ✓ SIGNATURE 1 DONE · WAITING FOR BLOCKS · SIGNATURE 2 WILL REVEAL YOUR LOBSTER
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 12, color: C.textSec,
                letterSpacing: "0.12em", marginBottom: 16,
                padding: "12px 14px", background: C.cardBg,
                border: `1px solid ${C.border}`, borderRadius: 3,
              }}>
                <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>COMMIT BLOCK</div>
                <div style={{ color: C.textPri, fontSize: 14 }}>{pending.commitBlock}</div>
              </div>

              {isExpired ? (
                <div>
                  <div style={{
                    fontFamily: MONO, fontSize: 12, color: C.error,
                    marginBottom: 14, letterSpacing: "0.1em",
                    padding: "10px 14px", background: C.errorBg,
                    border: `1px solid ${C.errorBord}`, borderRadius: 3,
                  }}>
                    WINDOW EXPIRED. BURN FORFEITED.
                  </div>
                  <button
                    onClick={() => { clearPendingCommit(address!); setPhase("idle"); }}
                    style={{
                      fontFamily: MONO, fontSize: 12, padding: "10px 18px",
                      background: "transparent", color: C.textSec,
                      border: `1px solid ${C.border}`, borderRadius: 3, cursor: "pointer",
                    }}
                  >
                    START OVER
                  </button>
                </div>
              ) : (
                <div>
                  {blocksLeft !== null && blocksLeft > 0 && (
                    <div style={{
                      fontFamily: MONO, fontSize: 12, color: C.textSec,
                      marginBottom: 16, letterSpacing: "0.12em",
                      textAlign: "center",
                    }}>
                      WAITING {blocksLeft} BLOCK{blocksLeft !== 1 ? "S" : ""}...
                    </div>
                  )}
                  <button
                    onClick={handleReveal}
                    disabled={!canReveal}
                    style={{
                      fontFamily: MONO, fontSize: 13, letterSpacing: "0.18em", fontWeight: 700,
                      padding: "13px 24px", width: "100%", borderRadius: 3,
                      cursor: canReveal ? "pointer" : "not-allowed",
                      background: canReveal ? C.accent : "transparent",
                      color: canReveal ? "#fff" : C.textMuted,
                      border: `1px solid ${canReveal ? C.accent : C.border}`,
                      transition: "all 0.15s",
                    }}
                  >
                    {canReveal ? "REVEAL LOBSTER (SIGNATURE 2 OF 2) →" : "WAITING FOR BLOCK..."}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* REVEALING */}
          {address && phase === "revealing" && (
            <SpinnerPanel
              label="GENERATING LOBSTER"
              sub="Swapping ETH → $CLAWDIA → 🔥"
              color={C.gold}
            />
          )}

          {/* MINTED */}
          {address && phase === "minted" && mintedId && (
            <div>
              <div style={{
                fontFamily: MONO, fontSize: 16, fontWeight: 700,
                color: C.gold, letterSpacing: "0.16em", marginBottom: 16,
              }}>
                🦞 LOBSTER #{String(mintedId).padStart(4, "0")} MINTED
              </div>
              {/* Explorer links */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "BASESCAN ↗", href: `https://basescan.org/tx/${revealTxHash}` },
                  { label: "OPENSEA ↗", href: `https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${mintedId}` },
                ].map(link => (
                  <a key={link.label}
                    href={link.href} target="_blank" rel="noreferrer"
                    style={{
                      fontFamily: MONO, fontSize: 11, color: C.textSec,
                      letterSpacing: "0.12em", textDecoration: "none",
                      padding: "6px 12px", border: `1px solid ${C.border}`,
                      borderRadius: 3, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.textPri; e.currentTarget.style.borderColor = C.borderAct; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.border; }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Download + Share */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <button
                  onClick={handleDownload}
                  style={{
                    fontFamily: MONO, fontSize: 11, padding: "6px 14px",
                    background: "transparent", color: C.textSec,
                    border: `1px solid ${C.border}`, borderRadius: 3, cursor: "pointer",
                    letterSpacing: "0.12em", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.textPri; e.currentTarget.style.borderColor = C.borderAct; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.border; }}
                >
                  DOWNLOAD ↓
                </button>
                <a
                  href={xShareUrl} target="_blank" rel="noreferrer"
                  style={{
                    fontFamily: MONO, fontSize: 11, color: C.textSec,
                    letterSpacing: "0.12em", textDecoration: "none",
                    padding: "6px 14px", border: `1px solid ${C.border}`,
                    borderRadius: 3, transition: "all 0.15s", display: "inline-block",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.textPri; e.currentTarget.style.borderColor = C.borderAct; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.border; }}
                >
                  SHARE ON X ↗
                </a>
                <a
                  href={fcShareUrl} target="_blank" rel="noreferrer"
                  style={{
                    fontFamily: MONO, fontSize: 11, color: C.textSec,
                    letterSpacing: "0.12em", textDecoration: "none",
                    padding: "6px 14px", border: `1px solid ${C.border}`,
                    borderRadius: 3, transition: "all 0.15s", display: "inline-block",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.border; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#9B59B6"; e.currentTarget.style.borderColor = "#4A2060"; }}
                >
                  SHARE ON FC ↗
                </a>
              </div>

              <button
                onClick={() => { setPhase("idle"); setMinted(null); setMintedId(null); setRevealTx(null); }}
                style={{
                  fontFamily: MONO, fontSize: 12, padding: "10px 18px",
                  background: "transparent", color: C.accent,
                  border: `1px solid ${C.accent}`, borderRadius: 3, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,72,32,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                MINT ANOTHER
              </button>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div style={{
              marginTop: 14,
              padding: "10px 14px",
              background: C.errorBg,
              border: `1px solid ${C.errorBord}`,
              borderRadius: 3,
              fontFamily: MONO, fontSize: 11, color: C.error,
              lineHeight: 1.8, letterSpacing: "0.08em",
            }}>
              ERROR: {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
