"use client";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";
import { CONTRACT_ADDRESS } from "@/constants";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [hov, setHov] = useState(false);

  return (
    <nav style={{
      borderBottom: "1px solid #0c0c1a", padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 52, position: "sticky", top: 0, zIndex: 100, background: "#050509",
    }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <div style={{ fontFamily: "'Courier New',monospace", fontSize: 13, fontWeight: 700, color: "#C84820", letterSpacing: "0.22em" }}>
          🦞 ONCHAIN LOBSTERS
        </div>
        <div style={{ fontFamily: "'Courier New',monospace", fontSize: 7, color: "#161626", letterSpacing: "0.18em", marginTop: -1 }}>
          BASE · 8,004 · BURNS $CLAWDIA
        </div>
      </Link>

      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <NavLink href="/">GALLERY</NavLink>
        <NavLink href="/mine">MINE</NavLink>
        <a
          href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
          target="_blank" rel="noreferrer"
          style={{ fontFamily: "'Courier New',monospace", fontSize: 9, color: "#1a1a2a", letterSpacing: "0.16em", textDecoration: "none", padding: "5px 10px", marginLeft: 8 }}
        >
          CONTRACT ↗
        </a>
        <button
          onClick={() => isConnected ? disconnect() : connect({ connector: injected() })}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.16em",
            padding: "5px 12px", marginLeft: 4,
            background: hov ? "#0e0e1e" : "#09090f",
            color: isConnected ? "#C84820" : hov ? "#C84820" : "#2a2a3a",
            border: `1px solid ${hov || isConnected ? "#0e0e1c" : "#0a0a14"}`,
            borderRadius: 2, cursor: "pointer",
          }}
        >
          {isConnected ? `${address!.slice(0, 6)}…${address!.slice(-4)}` : "CONNECT"}
        </button>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} style={{
      fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: "0.18em",
      color: "#1e1e2e", textDecoration: "none", padding: "5px 12px",
      border: "1px solid transparent", borderRadius: 2,
    }}>
      {children}
    </Link>
  );
}
