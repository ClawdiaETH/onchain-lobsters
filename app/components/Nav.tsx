"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/constants";

const MONO = "'Courier New',monospace";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <nav style={{
      borderBottom: "1px solid #1A1A2E",
      padding: "0 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 68,
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#070710",
      backdropFilter: "blur(8px)",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: "#C84820", letterSpacing: "0.18em" }}>
          🦞 ONCHAIN LOBSTERS
        </div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: "#6A6A8A", letterSpacing: "0.14em", marginTop: 3 }}>
          BASE · 8,004 · BURNS $CLAWDIA
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <NavLink href="/gallery">GALLERY</NavLink>
        <NavLink href="/mint">MINT</NavLink>
        <a
          href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
          target="_blank" rel="noreferrer"
          style={{
            fontFamily: MONO, fontSize: 13, color: "#6A6A8A",
            letterSpacing: "0.14em", textDecoration: "none",
            padding: "6px 12px", marginLeft: 8,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#8888A8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#6A6A8A")}
        >
          CONTRACT ↗
        </a>

        {/* Connect / disconnect button */}
        <div ref={pickerRef} style={{ position: "relative", marginLeft: 4 }}>
          <ConnectButton
            isConnected={isConnected}
            address={address}
            onClick={() => isConnected ? disconnect() : setShowPicker(p => !p)}
          />

          {/* Wallet picker dropdown */}
          {showPicker && !isConnected && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: "#0A0A16", border: "1px solid #1A1A2E",
              borderRadius: 4, minWidth: 220, zIndex: 200,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 12px 6px",
                fontFamily: MONO, fontSize: 10, color: "#4A4A6A",
                letterSpacing: "0.14em", borderBottom: "1px solid #1A1A2E",
              }}>
                CONNECT WALLET
              </div>
              {connectors.map(connector => (
                <WalletOption
                  key={connector.uid}
                  name={connectorLabel(connector.name)}
                  onClick={() => {
                    connect({ connector });
                    setShowPicker(false);
                  }}
                />
              ))}
              <div style={{
                padding: "8px 12px",
                fontFamily: MONO, fontSize: 10, color: "#3A3A5A",
                letterSpacing: "0.10em", borderTop: "1px solid #1A1A2E",
              }}>
                Make sure you're on Base network
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function connectorLabel(name: string): string {
  if (name.toLowerCase().includes("injected") || name.toLowerCase().includes("metamask")) return "MetaMask / Browser Wallet";
  if (name.toLowerCase().includes("coinbase")) return "Coinbase Wallet";
  if (name.toLowerCase().includes("walletconnect")) return "WalletConnect";
  return name;
}

function ConnectButton({
  isConnected, address, onClick,
}: {
  isConnected: boolean;
  address?: string;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.14em",
        padding: "7px 16px",
        background: isConnected ? "rgba(200,72,32,0.12)" : hov ? "#0E0E1E" : "transparent",
        color: isConnected ? "#C84820" : hov ? "#E8E8F2" : "#8888A8",
        border: `1px solid ${isConnected ? "#C84820" : hov ? "#282840" : "#1A1A2E"}`,
        borderRadius: 3, cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "CONNECT"}
    </button>
  );
}

function WalletOption({ name, onClick }: { name: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "10px 14px",
        fontFamily: MONO, fontSize: 12, letterSpacing: "0.10em",
        color: hov ? "#E8E8F2" : "#8888A8",
        background: hov ? "#0E0E1E" : "transparent",
        border: "none", cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {name} →
    </button>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.16em",
        color: hov ? "#E8E8F2" : "#8888A8",
        textDecoration: "none", padding: "6px 14px",
        border: `1px solid ${hov ? "#282840" : "transparent"}`,
        borderRadius: 3,
        transition: "all 0.15s",
      }}
    >
      {children}
    </Link>
  );
}
