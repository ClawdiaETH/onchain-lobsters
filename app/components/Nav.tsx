"use client";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/constants";

const MONO = "'Courier New',monospace";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [hov, setHov] = useState(false);

  return (
    <nav style={{
      borderBottom: "1px solid #1A1A2E",
      padding: "0 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 60,
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#050509",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: "#C84820", letterSpacing: "0.18em" }}>
          🦞 ONCHAIN LOBSTERS
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: "#4A4A6A", letterSpacing: "0.14em", marginTop: 2 }}>
          BASE · 8,004 · BURNS $CLAWDIA
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <NavLink href="/">GALLERY</NavLink>
        <NavLink href="/mine">MINE</NavLink>
        <a
          href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
          target="_blank" rel="noreferrer"
          style={{
            fontFamily: MONO, fontSize: 11, color: "#4A4A6A",
            letterSpacing: "0.14em", textDecoration: "none",
            padding: "6px 12px", marginLeft: 8,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#8888A8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#4A4A6A")}
        >
          CONTRACT ↗
        </a>
        <button
          onClick={() => isConnected ? disconnect() : connect({ connector: injected() })}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em",
            padding: "7px 16px", marginLeft: 4,
            background: isConnected ? "rgba(200,72,32,0.12)" : hov ? "#0E0E1E" : "transparent",
            color: isConnected ? "#C84820" : hov ? "#E8E8F2" : "#8888A8",
            border: `1px solid ${isConnected ? "#C84820" : hov ? "#282840" : "#1A1A2E"}`,
            borderRadius: 3, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {isConnected ? `${address!.slice(0, 6)}…${address!.slice(-4)}` : "CONNECT"}
        </button>
      </div>
    </nav>
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
        fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em",
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
