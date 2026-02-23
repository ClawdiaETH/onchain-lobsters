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
import { CONTRACT_ADDRESS, MINT_PRICE_ETH } from "../../constants";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // Signal to Farcaster that the mini app is ready
    sdk.actions.ready().catch(() => {});
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
          <iframe
            src="https://onchainlobsters.xyz/api/render/1"
            style={styles.lobsterFrame}
            scrolling="no"
            title="Lobster preview"
          />
          <div style={styles.priceLabel}>Mint price</div>
          <div style={styles.priceValue}>{MINT_PRICE_ETH} ETH</div>
          <button style={styles.mintBtn} onClick={handleMint}>
            MINT 🦞
          </button>
        </>
      )}

      {/* MINTING STATE */}
      {(mintState === "minting" || mintState === "confirming") && (
        <>
          <div style={styles.title}>ONCHAIN LOBSTERS</div>
          <div style={{ ...styles.lobsterFrame, opacity: 0.4 }}>
            <iframe
              src="https://onchainlobsters.xyz/api/render/1"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              scrolling="no"
              title="Lobster"
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
          <iframe
            src={`https://onchainlobsters.xyz/api/render/${tokenId.toString()}`}
            style={styles.lobsterFrame}
            scrolling="no"
            title={`Lobster #${tokenId.toString()}`}
          />
          <button style={styles.shareBtn} onClick={handleShare}>
            SHARE CAST
          </button>
          <button
            style={styles.retryBtn}
            onClick={() => {
              setMintState("idle");
              setTokenId(null);
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
