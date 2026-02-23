"use client";
import "./globals.css";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";

// Base Builder Code — attributes all mints to Onchain Lobsters on base.dev
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_lul4sldw"] });

const config = createConfig({
  chains: [base, mainnet],  // mainnet listed so wagmi doesn't choke on ETH-connected wallets
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Onchain Lobsters", preference: "all" }),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [mainnet.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Onchain Lobsters — Minted with $CLAWDIA</title>
        <meta name="description" content="8,004 fully onchain pixel lobsters on Base. Half your mint fee burns $CLAWDIA. Commit-reveal. No IPFS." />

        {/* OpenGraph */}
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content="https://onchainlobsters.xyz" />
        <meta property="og:title"       content="Onchain Lobsters" />
        <meta property="og:description" content="8,004 pixel lobsters on Base. Half your mint fee burns $CLAWDIA. Fully onchain. No IPFS." />
        <meta property="og:image"       content="https://onchainlobsters.xyz/api/og" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter / Farcaster card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:site"        content="@ClawdiaBotAI" />
        <meta name="twitter:title"       content="Onchain Lobsters" />
        <meta name="twitter:description" content="8,004 pixel lobsters on Base. Half your mint fee burns $CLAWDIA. Fully onchain. No IPFS." />
        <meta name="twitter:image"       content="https://onchainlobsters.xyz/api/og" />

        {/* Farcaster Mini App frame meta */}
        <meta name="fc:frame" content='{"version":"1","imageUrl":"https://onchainlobsters.xyz/api/og/1","button":{"title":"Mint a Lobster 🦞","action":{"type":"launch_frame","name":"Onchain Lobsters","url":"https://onchainlobsters.xyz/mini","splashImageUrl":"https://onchainlobsters.xyz/api/og/1","splashBackgroundColor":"#0a0a0a"}}}' />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        background: "#070710",
        backgroundImage: "radial-gradient(rgba(30,30,60,0.55) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        margin: 0,
        padding: 0,
      }}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <Nav />
            <Ticker />
            <main style={{ minHeight: "calc(100vh - 120px)" }}>
              {children}
            </main>
            <Footer />
          </QueryClientProvider>
        </WagmiProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
