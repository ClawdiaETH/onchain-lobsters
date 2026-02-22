"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";

// Base Builder Code — attributes all mints to Onchain Lobsters on base.dev
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_lul4sldw"] });

const config = createConfig({
  chains: [base, mainnet],  // mainnet listed so wagmi doesn't choke on ETH-connected wallets
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Onchain Lobsters" }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Onchain Lobsters — Minted with $CLAWDIA</title>
        <meta name="description" content="40×52 pixel lobsters. Fully onchain. Burns $CLAWDIA to mint." />
        <meta property="og:title" content="Onchain Lobsters" />
        <meta property="og:description" content="Fully onchain generative pixel lobsters on Base." />
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
      </body>
    </html>
  );
}
