"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import LobsterCanvas from "@/components/LobsterCanvas";
import TraitSheet from "@/components/TraitSheet";
import { useCommit } from "@/hooks/useCommit";
import { useReveal } from "@/hooks/useReveal";
import { usePendingCommit } from "@/hooks/usePendingCommit";
import { useBlockCountdown } from "@/hooks/useBlockCountdown";
import { seedToTraits } from "@/lib/traits";
import { generateSalt, computeCommitment, savePendingCommit, clearPendingCommit } from "@/lib/salt";
import { CONTRACT_ADDRESS, LOBSTERS_ABI, MINT_PRICE_ETH, COMMIT_WINDOW_BLOCKS } from "@/constants";
import type { Traits } from "@/lib/renderer";

// ─── Cycle random preview traits during idle ─────────────────────────────────
function useRandomTraits(): Traits {
  const [traits, setTraits] = useState<Traits>(() =>
    seedToTraits(BigInt(Math.floor(Math.random() * 0xFFFFFFFF)))
  );
  useEffect(() => {
    const iv = setInterval(
      () => setTraits(seedToTraits(BigInt(Math.floor(Math.random() * 0xFFFFFFFF)))),
      2200
    );
    return () => clearInterval(iv);
  }, []);
  return traits;
}

type Phase = "idle" | "committing" | "waiting" | "revealing" | "minted" | "error";

const T = { fontFamily: "'Courier New',monospace" };
const PULSE_CSS = `@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}`;

function SpinnerPanel({ label, sub, color = "#C84820" }: { label: string; sub: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0" }}>
      <style>{PULSE_CSS}</style>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, boxShadow: `0 0 12px ${color}`, animation: "pulse 1.2s ease-in-out infinite" }} />
      <div style={{ ...T, fontSize: 9, color, letterSpacing: "0.18em", marginTop: 14 }}>{label}</div>
      <div style={{ ...T, fontSize: 8, color: "#1a1a2a", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

export default function MinePage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const randomTraits = useRandomTraits();
  const pending = usePendingCommit(address);
  const { commit } = useCommit();
  const { reveal } = useReveal();

  const [phase, setPhase] = useState<Phase>("idle");
  const [mintedTraits, setMinted] = useState<Traits | null>(null);
  const [mintedId, setMintedId] = useState<number | null>(null);
  const [revealTxHash, setRevealTx] = useState<string | null>(null);
  const [errorMsg, setError] = useState<string | null>(null);

  // Restore waiting state from localStorage
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
      // CRITICAL: persist salt BEFORE broadcasting tx
      // (pre-persist with placeholder block, update after receipt)
      savePendingCommit(address, { salt, commitment, commitBlock: 0, txHash: "0x" as `0x${string}` });
      const txHash = await commit(commitment);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      savePendingCommit(address, {
        salt,
        commitment,
        commitBlock: Number(receipt.blockNumber),
        txHash,
      });
      setPhase("waiting");
    } catch (e: any) {
      clearPendingCommit(address);
      setError(e.shortMessage ?? e.message ?? "Commit failed");
      setPhase("idle");
    }
  }, [address, commit, publicClient]);

  // ── Reveal ────────────────────────────────────────────────────────────────
  const handleReveal = useCallback(async () => {
    if (!address || !pending) return;
    setPhase("revealing");
    setError(null);
    try {
      const txHash = await reveal(pending.salt, address);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });

      const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      const transferLog = receipt.logs.find(l => l.topics[0] === TRANSFER_TOPIC);
      const tokenId = transferLog ? Number(BigInt(transferLog.topics[3]!)) : null;

      if (tokenId) {
        const seed = await publicClient!.readContract({
          address: CONTRACT_ADDRESS,
          abi: LOBSTERS_ABI,
          functionName: "tokenSeed",
          args: [BigInt(tokenId)],
        });
        setMinted(seedToTraits(seed as bigint));
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#0A0A14", maxWidth: 860, margin: "24px auto" }}>
      {/* LEFT — lobster preview */}
      <div style={{ background: "#06060E", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid #0c0c1a" }}>
        <div style={{
          border: `2px solid ${phase === "minted" ? "#C8A020" : "#0e0e1c"}`,
          borderRadius: 2, overflow: "hidden", position: "relative",
          boxShadow: phase === "minted" ? "0 0 40px #4A3000" : "none",
          transition: "box-shadow 0.6s, border-color 0.4s",
        }}>
          <LobsterCanvas traits={displayTraits} size={280} />
          {phase === "minted" && mintedId && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.85))", padding: "20px 12px 10px", textAlign: "center" }}>
              <div style={{ ...T, fontSize: 11, color: "#C8A020", letterSpacing: "0.2em", fontWeight: 700 }}>
                LOBSTER #{String(mintedId).padStart(4, "0")}
              </div>
            </div>
          )}
          {(phase === "committing" || phase === "revealing") && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ ...T, fontSize: 10, color: "#C84820", letterSpacing: "0.2em" }}>
                {phase === "committing" ? "COMMITTING..." : "REVEALING..."}
              </span>
            </div>
          )}
        </div>

        <div style={{ width: "100%", marginTop: 16 }}>
          {phase === "minted" && mintedTraits
            ? <TraitSheet traits={mintedTraits} />
            : (
              <div style={{ padding: "8px 10px", background: "#07070F", border: "1px solid #0c0c1a", borderRadius: 2, textAlign: "center" }}>
                <span style={{ ...T, fontSize: 8, color: "#161626", letterSpacing: "0.12em" }}>
                  {phase === "idle" ? "← POSSIBLE LOBSTERS (RANDOMIZING)" : "PREVIEW · TRAITS REVEALED ON MINT"}
                </span>
              </div>
            )
          }
        </div>
      </div>

      {/* RIGHT — controls */}
      <div style={{ background: "#07070F", padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...T, fontSize: 18, fontWeight: 700, color: "#C84820", letterSpacing: "0.12em" }}>MINE A LOBSTER</div>
          <div style={{ ...T, fontSize: 8, color: "#1e1e2e", marginTop: 4, letterSpacing: "0.1em" }}>
            0.005 ETH · BURNS $CLAWDIA · BASE
          </div>
        </div>

        {!address && (
          <div style={{ ...T, fontSize: 9, color: "#2a2a3a", letterSpacing: "0.12em", padding: "24px 0" }}>
            CONNECT WALLET TO MINE
          </div>
        )}

        {address && phase === "idle" && (
          <div>
            <div style={{ ...T, fontSize: 8, color: "#161626", lineHeight: 2, marginBottom: 16 }}>
              <div>→ PAY 0.005 ETH</div>
              <div>→ HALF SWAPS TO $CLAWDIA + BURNS</div>
              <div>→ WAIT 1-100 BLOCKS</div>
              <div>→ REVEAL YOUR LOBSTER</div>
            </div>
            <button
              onClick={handleCommit}
              style={{
                ...T, fontSize: 10, letterSpacing: "0.18em", fontWeight: 700,
                padding: "10px 20px", background: "#C84820", color: "#fff",
                border: "none", borderRadius: 2, cursor: "pointer", width: "100%",
              }}
            >
              COMMIT + BURN → MINE
            </button>
          </div>
        )}

        {address && phase === "committing" && (
          <SpinnerPanel label="COMMITTING..." sub="Confirm in your wallet" />
        )}

        {address && phase === "waiting" && pending && (
          <div>
            <div style={{ ...T, fontSize: 9, color: "#C84820", letterSpacing: "0.14em", marginBottom: 12 }}>
              COMMIT BLOCK: {pending.commitBlock}
            </div>
            {isExpired ? (
              <div>
                <div style={{ ...T, fontSize: 9, color: "#8A2820", marginBottom: 12 }}>
                  WINDOW EXPIRED. BURN FORFEITED.
                </div>
                <button
                  onClick={() => { clearPendingCommit(address!); setPhase("idle"); }}
                  style={{ ...T, fontSize: 9, padding: "8px 16px", background: "#0a0a14", color: "#2a2a3a", border: "1px solid #1a1a24", borderRadius: 2, cursor: "pointer" }}
                >
                  START OVER
                </button>
              </div>
            ) : (
              <div>
                {blocksLeft !== null && blocksLeft > 0 && (
                  <div style={{ ...T, fontSize: 9, color: "#2a2a3a", marginBottom: 12 }}>
                    WAITING {blocksLeft} BLOCK{blocksLeft !== 1 ? "S" : ""}...
                  </div>
                )}
                <button
                  onClick={handleReveal}
                  disabled={!canReveal}
                  style={{
                    ...T, fontSize: 10, letterSpacing: "0.18em", fontWeight: 700,
                    padding: "10px 20px", width: "100%", borderRadius: 2, cursor: canReveal ? "pointer" : "not-allowed",
                    background: canReveal ? "#C84820" : "#0a0a14",
                    color: canReveal ? "#fff" : "#1a1a2a",
                    border: `1px solid ${canReveal ? "#C84820" : "#1a1a24"}`,
                  }}
                >
                  {canReveal ? "REVEAL LOBSTER →" : "WAITING FOR BLOCK..."}
                </button>
              </div>
            )}
          </div>
        )}

        {address && phase === "revealing" && (
          <SpinnerPanel label="GENERATING LOBSTER" sub="Swapping ETH → $CLAWDIA → 🔥" color="#C8A020" />
        )}

        {address && phase === "minted" && mintedId && (
          <div>
            <div style={{ ...T, fontSize: 13, fontWeight: 700, color: "#C8A020", letterSpacing: "0.16em", marginBottom: 12 }}>
              🦞 LOBSTER #{String(mintedId).padStart(4, "0")} MINTED
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <a
                href={`https://basescan.org/tx/${revealTxHash}`}
                target="_blank" rel="noreferrer"
                style={{ ...T, fontSize: 8, color: "#2a2a3a", letterSpacing: "0.1em", textDecoration: "none" }}
              >
                BASESCAN ↗
              </a>
              <a
                href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${mintedId}`}
                target="_blank" rel="noreferrer"
                style={{ ...T, fontSize: 8, color: "#2a2a3a", letterSpacing: "0.1em", textDecoration: "none" }}
              >
                OPENSEA ↗
              </a>
            </div>
            <button
              onClick={() => { setPhase("idle"); setMinted(null); setMintedId(null); setRevealTx(null); }}
              style={{ ...T, fontSize: 9, padding: "8px 16px", background: "#09090f", color: "#C84820", border: "1px solid #C84820", borderRadius: 2, cursor: "pointer" }}
            >
              MINE ANOTHER
            </button>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: 12, padding: "8px 10px", background: "#0F0204", border: "1px solid #3A0810", borderRadius: 2, ...T, fontSize: 8, color: "#8A2820", lineHeight: 1.8 }}>
            ERROR: {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
