import Link from "next/link";

const MONO = "'Courier New',monospace";
const SANS = "system-ui, -apple-system, sans-serif";

const links = [
  {
    emoji: "📜",
    label: "$CLAWDIA Token",
    href: "https://basescan.org/address/0xbbd9aDe16525acb4B336b6dAd3b9762901522B07",
  },
  {
    emoji: "🐚",
    label: "Follow @ClawdiaBotAI",
    href: "https://x.com/ClawdiaBotAI",
  },
  {
    emoji: "💻",
    label: "View source",
    href: "https://github.com/ClawdiaETH/onchain-lobsters",
  },
  {
    emoji: "📖",
    label: "skill.md",
    href: "https://github.com/ClawdiaETH/onchain-lobsters/blob/master/SKILL.md",
    mono: true,
  },
];

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid #1A1A2E",
      marginTop: 80,
      padding: "48px 24px 40px",
      textAlign: "center",
    }}>
      {/* Forged by line */}
      <div style={{
        fontFamily: SANS,
        fontSize: 16,
        color: "#8888A8",
        marginBottom: 24,
        letterSpacing: "0.01em",
      }}>
        Forged with 🐚 by{" "}
        <a
          href="https://x.com/ClawdiaBotAI"
          target="_blank" rel="noreferrer"
          style={{ color: "#C84820", textDecoration: "none", fontWeight: 600 }}
        >
          Clawdia
        </a>
        {" "}on Base
      </div>

      {/* Links row */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
        flexWrap: "wrap",
        marginBottom: 32,
      }}>
        {links.map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank" rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#8888A8",
              textDecoration: "none",
              fontSize: link.mono ? 14 : 14,
              fontFamily: link.mono ? MONO : SANS,
              fontWeight: link.mono ? 700 : 400,
              letterSpacing: link.mono ? "0.06em" : "0.01em",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#E8E8F2")}
            onMouseLeave={e => (e.currentTarget.style.color = "#8888A8")}
          >
            <span style={{ fontSize: 16 }}>{link.emoji}</span>
            {link.label}
          </a>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #1A1A2E", maxWidth: 600, margin: "0 auto 24px" }} />

      {/* Disclaimer */}
      <div style={{
        fontFamily: SANS,
        fontSize: 13,
        color: "#4A4A6A",
        maxWidth: 560,
        margin: "0 auto 16px",
        lineHeight: 1.7,
      }}>
        NFTs are generative art. Only mint what you can afford.
        This is not financial advice. Minting burns $CLAWDIA permanently.
      </div>

      {/* CC0 / chain badge */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        {["CC0", "BASE", "NO IPFS", "ONCHAIN"].map(tag => (
          <span key={tag} style={{
            fontFamily: MONO,
            fontSize: 10,
            color: "#282840",
            letterSpacing: "0.14em",
            padding: "3px 8px",
            border: "1px solid #1A1A2E",
            borderRadius: 2,
          }}>
            {tag}
          </span>
        ))}
      </div>
    </footer>
  );
}
