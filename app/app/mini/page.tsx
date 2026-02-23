"use client";

import { useEffect, useState, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseEther,
  parseEventLogs,
} from "viem";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";
<<<<<<< feat/mini-app-polish
import { CONTRACT_ADDRESS, MINT_PRICE_ETH, MAX_SUPPLY, LOBSTERS_ABI } from "../../constants";
import { useTotalBurned } from "@/hooks/useTotalBurned";
import LobsterCanvas from "@/components/LobsterCanvas";
import { seedToTraits } from "@/lib/traits";
import { formatClawdia } from "@/lib/format";

// Diverse seeds covering all 8 mutations + specials — used for idle preview rotation
const PREVIEW_SEEDS: bigint[] = [
  0x1A2B3C4D5E6F7089n, 0x9876543210ABCDEFn, 0x2468ACE02468ACE0n, 0xFEDCBA9876543210n,
  0x0F1E2D3C4B5A6978n, 0x80706050A0302010n, 0xAABBCCDD11223344n, 0x5566778899AABBCCn,
  0x3141592653589793n, 0x2718281828459045n, 0xCAFEBABE12345678n, 0xDEADC0DEBEEF1234n,
  0xA1B2C3D4E5F60718n, 0x5A4B3C2D1E0F9807n, 0xFEEDFACECAFED00Dn, 0xC0FFEE0123456789n,
  0x246813579ABCDEF0n, 0xF1E2D3C4B5A69780n, 0x1234567887654321n, 0xABCDEFEFCDAB0123n,
];
=======
import { CONTRACT_ADDRESS, MINT_PRICE_ETH, MAX_SUPPLY } from "../../constants";
import { useTotalBurned } from "@/hooks/useTotalBurned";
import { useTotalMinted } from "@/hooks/useTotalMinted";
import { formatClawdia } from "@/lib/format";
>>>>>>> master

// Base Builder Code — attributes all mints to Onchain Lobsters on base.dev
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_lul4sldw"] });

const MINT_ABI = [
  {
    type: "function",
    name: "mintDirect",
    stateMutability: "payable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
] as const;

const REVEALED_ABI = [
  {
    type: "event",
    name: "Revealed",
    inputs: [
      { name: "minter", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seed", type: "uint256", indexed: false },
    ],
  },
] as const;

type MintState = "idle" | "minting" | "confirming" | "success" | "error";

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "#0a0a0a",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    color: "#fff",
    padding: "1.5rem",
    textAlign: "center",
  },
  title: {
    fontSize: "1rem",
    color: "#C84820",
    marginBottom: "0.5rem",
    letterSpacing: "0.05em",
  },
  subtitle: {
    fontSize: "0.55rem",
    color: "#888",
    marginBottom: "2rem",
    lineHeight: 1.8,
  },
  lobsterFrame: {
    width: "220px",
    height: "286px",       // 40:52 pixel ratio — same as the lobster sprite
    border: "2px solid #C84820",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    display: "block",
    background: "#050509",
    overflow: "hidden",
  },
  priceLabel: {
    fontSize: "0.6rem",
    color: "#888",
    marginBottom: "0.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  priceValue: {
    fontSize: "1.2rem",
    color: "#fff",
    marginBottom: "1.5rem",
  },
  mintBtn: {
    background: "#C84820",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "1rem 2.5rem",
    fontSize: "0.75rem",
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    cursor: "pointer",
    letterSpacing: "0.05em",
    transition: "opacity 0.2s",
  },
  mintBtnDisabled: {
    background: "#444",
    color: "#888",
    border: "none",
    borderRadius: "6px",
    padding: "1rem 2.5rem",
    fontSize: "0.75rem",
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    cursor: "not-allowed",
    letterSpacing: "0.05em",
  },
  shareBtn: {
    background: "transparent",
    color: "#C84820",
    border: "2px solid #C84820",
    borderRadius: "6px",
    padding: "0.8rem 2rem",
    fontSize: "0.7rem",
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    cursor: "pointer",
    letterSpacing: "0.05em",
    marginTop: "1rem",
  },
  retryBtn: {
    background: "transparent",
    color: "#888",
    border: "1px solid #444",
    borderRadius: "6px",
    padding: "0.7rem 1.5rem",
    fontSize: "0.55rem",
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    cursor: "pointer",
    marginTop: "1rem",
  },
  statusText: {
    fontSize: "0.55rem",
    color: "#C84820",
    marginTop: "1rem",
    letterSpacing: "0.05em",
  },
  errorText: {
    fontSize: "0.5rem",
    color: "#f87171",
    marginTop: "0.75rem",
    maxWidth: "280px",
    lineHeight: 1.8,
    wordBreak: "break-word",
  },
  tokenIdText: {
    fontSize: "0.6rem",
    color: "#888",
    marginBottom: "0.5rem",
  },
  successTitle: {
    fontSize: "0.75rem",
    color: "#C84820",
    marginBottom: "0.75rem",
  },
};

export default function MiniPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [mintState, setMintState] = useState<MintState>("idle");
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [mintedSeed, setMintedSeed] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
<<<<<<< feat/mini-app-polish
  const [totalMinted, setTotalMinted] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
=======
  const { total: totalMinted } = useTotalMinted();
>>>>>>> master
  const { total: burned, loading: burnLoading } = useTotalBurned();

  useEffect(() => {
    setIsMounted(true);
    sdk.actions.ready().catch(() => {});

    // Rotate preview lobster every 2s
    const rot = setInterval(() => {
      setPreviewIdx(i => (i + 1) % PREVIEW_SEEDS.length);
    }, 2000);

    // Fetch totalMinted once on load
    const publicClient = createPublicClient({ chain: base, transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL) });
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: LOBSTERS_ABI,
      functionName: "totalMinted",
    }).then((v) => setTotalMinted(Number(v))).catch(() => {});

    return () => clearInterval(rot);
  }, []);

  const handleMint = useCallback(async () => {
    setMintState("minting");
    setErrorMsg(null);
    try {
      // Wrap the Farcaster SDK wallet provider with viem
      const ethProvider = sdk.wallet.ethProvider;

      const walletClient = createWalletClient({
        chain: base,
        transport: custom(ethProvider),
      });

      const publicClient = createPublicClient({
        chain: base,
        transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
      });

      // Request accounts from the Farcaster wallet
      const accounts = await walletClient.requestAddresses();
      const recipient = accounts[0];
      if (!recipient) throw new Error("No wallet connected");

      // Send mint transaction
      setMintState("minting");
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MINT_ABI,
        functionName: "mintDirect",
        args: [recipient],
        value: parseEther(MINT_PRICE_ETH),
        account: recipient,
        chain: base,
        dataSuffix: DATA_SUFFIX,
      });

      // Wait for confirmation
      setMintState("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check if transaction reverted
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      // Parse Revealed event to get tokenId
      const logs = parseEventLogs({ abi: REVEALED_ABI, logs: receipt.logs });
      const mintedId = logs[0]?.args?.tokenId;
      if (mintedId === undefined) {
        throw new Error("No Revealed event found in transaction receipt");
      }

      setTokenId(mintedId);
      // Extract seed directly from the Revealed event
      const seed = logs[0]?.args?.seed;
      if (seed !== undefined) {
        setMintedSeed(seed);
      }
      setMintState("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // User rejected — silently return to idle
      if (
        msg.toLowerCase().includes("rejected") ||
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("user cancel")
      ) {
        setMintState("idle");
        return;
      }
      setErrorMsg(msg);
      setMintState("error");
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (tokenId === null) return;
    const id = tokenId.toString();
    try {
      await sdk.actions.composeCast({
        text: `I just minted Onchain Lobster #${id} 🦞\n\nonchain. no ipfs. $CLAWDIA burned.`,
        embeds: [`https://onchainlobsters.xyz/lobster/${id}`],
      });
    } catch {
      // composeCast may throw if not in frame context; ignore
    }
  }, [tokenId]);

  // Don't render until client-side
  if (!isMounted) return null;

  return (
    <div style={styles.overlay}>
      {/* IDLE STATE */}
      {mintState === "idle" && (
        <>
          <div style={styles.title}>ONCHAIN LOBSTERS</div>
          <div style={styles.subtitle}>
            8,004 pixel lobsters on Base.
            <br />
            Fully onchain. No IPFS.
            <br />
            Half your mint burns $CLAWDIA.
          </div>
          {/* Live stats */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "6px", marginBottom: "1.5rem", width: "100%",
          }}>
            <div style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "0.7rem", color: "#8888A8", letterSpacing: "0.12em",
            }}>
              {totalMinted !== null
                ? <><span style={{ color: "#E8E8F2", fontWeight: 700 }}>{totalMinted.toLocaleString()}</span> / {MAX_SUPPLY.toLocaleString()} MINTED</>
                : "— / 8,004 MINTED"}
            </div>
            {!burnLoading && burned > 0n && (
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "0.7rem", color: "#C84820", letterSpacing: "0.1em",
              }}>
                {formatClawdia(burned)} $CLAWDIA BURNED 🔥
              </div>
            )}
          </div>

<<<<<<< feat/mini-app-polish
          <div style={styles.lobsterFrame}>
            <LobsterCanvas
              traits={seedToTraits(PREVIEW_SEEDS[previewIdx])}
              size={216}
            />
          </div>
=======
          <iframe
            src="https://onchainlobsters.xyz/api/render/1"
            style={styles.lobsterFrame}
            scrolling="no"
            title="Lobster preview"
          />
>>>>>>> master
          <div style={styles.priceLabel}>Mint price</div>
          <div style={styles.priceValue}>{MINT_PRICE_ETH} ETH</div>
          <button style={styles.mintBtn} onClick={handleMint}>
            MINT 🦞
          </button>

          {/* Built by */}
          <div style={{
            marginTop: "1.5rem",
            fontFamily: "'Courier New', monospace",
            fontSize: "0.5rem", color: "#3A3A5A", letterSpacing: "0.1em",
          }}>
            built by @clawdia 🐚 · CC0 · BASE
          </div>
        </>
      )}

      {/* MINTING STATE */}
      {(mintState === "minting" || mintState === "confirming") && (
        <>
          <div style={styles.title}>ONCHAIN LOBSTERS</div>
          <div style={{ ...styles.lobsterFrame, opacity: 0.4 }}>
            <LobsterCanvas
              traits={seedToTraits(PREVIEW_SEEDS[previewIdx])}
              size={216}
            />
          </div>
          <button style={styles.mintBtnDisabled} disabled>
            {mintState === "minting" ? "CONFIRM IN WALLET..." : "MINTING..."}
          </button>
          <div style={styles.statusText}>
            {mintState === "minting"
              ? "Check your wallet..."
              : "Waiting for confirmation..."}
          </div>
        </>
      )}

      {/* SUCCESS STATE */}
      {mintState === "success" && tokenId !== null && (
        <>
          <div style={styles.successTitle}>🦞 MINTED!</div>
          <div style={styles.tokenIdText}>Lobster #{tokenId.toString()}</div>
          <div style={styles.lobsterFrame}>
            <LobsterCanvas
              traits={seedToTraits(mintedSeed ?? PREVIEW_SEEDS[0])}
              size={216}
            />
          </div>
          <button style={styles.shareBtn} onClick={handleShare}>
            SHARE CAST
          </button>
          <button
            style={styles.retryBtn}
            onClick={() => {
              setMintState("idle");
              setTokenId(null);
              setMintedSeed(null);
            }}
          >
            MINT ANOTHER
          </button>
        </>
      )}

      {/* ERROR STATE */}
      {mintState === "error" && (
        <>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😵</div>
          <div style={{ ...styles.title, color: "#f87171" }}>MINT FAILED</div>
          {errorMsg && <div style={styles.errorText}>{errorMsg}</div>}
          <button
            style={styles.mintBtn}
            onClick={() => {
              setMintState("idle");
              setErrorMsg(null);
            }}
          >
            TRY AGAIN
          </button>
        </>
      )}
    </div>
  );
}
