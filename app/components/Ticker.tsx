export default function Ticker() {
  const items = [
    "🦞 ONCHAIN LOBSTERS", "8,004 SUPPLY", "FULLY ONCHAIN", "40×52 PIXELS",
    "BURNS $CLAWDIA", "BASE CHAIN", "RRLE COMPRESSED", "COMMIT-REVEAL", "NO IPFS", "CC0",
  ];
  const text = items.join(" · ");
  return (
    <div style={{ overflow: "hidden", background: "#C84820", padding: "6px 0", borderBottom: "1px solid #8A2C10", borderTop: "1px solid #8A2C10" }}>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}} .ticker-inner{display:inline-block;white-space:nowrap;animation:ticker 28s linear infinite;}`}</style>
      <div className="ticker-inner" style={{ fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#fff" }}>
        {text} · {text} · {text} · {text} ·&nbsp;
      </div>
    </div>
  );
}
