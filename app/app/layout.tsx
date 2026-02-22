"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, coinbaseWallet } from "wagmi/connectors";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";

const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Onchain Lobsters" }),
  ],
  transports: { [base.id]: http() },
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
      </head>
      <body style={{ background: "#050509", margin: 0, padding: 0 }}>
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
