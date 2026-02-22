# 🦞 Onchain Lobsters

**8,004 generative pixel lobsters. Fully onchain. Minting burns $CLAWDIA forever.**

> 40×52 pixel art sprites rendered entirely in Solidity. No IPFS. No metadata servers. Every lobster lives onchain forever — the art is the contract.

[![Base](https://img.shields.io/badge/chain-Base-0052FF?style=flat-square)](https://base.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

---

## Contracts (Base Mainnet)

| Contract | Address |
|---|---|
| **OnchainLobsters** | [`0xbe37D95aAa5C624F0fd3549c0CAD88F9E876C660`](https://basescan.org/address/0xbe37D95aAa5C624F0fd3549c0CAD88F9E876C660) |
| PixelRenderer | [`0x1256E5875C283F9F759a0F4CA6FB7BC6AeA9Cf55`](https://basescan.org/address/0x1256E5875C283F9F759a0F4CA6FB7BC6AeA9Cf55) |
| PixelRendererOverlay | [`0x839cBe3deBF95ac6Ac2A12A644Ac7d1B6e72Af3b`](https://basescan.org/address/0x839cBe3deBF95ac6Ac2A12A644Ac7d1B6e72Af3b) |

All three verified on Basescan.

---

## What is this?

Onchain Lobsters is a generative NFT collection deployed on Base. Every trait, every pixel, every SVG is computed directly from the token's seed by the Solidity contract at mint time — no external storage, no IPFS, no pinning services.

**Mint mechanic:**
1. **Commit** — pay 0.005 ETH, lock a commitment hash onchain
2. **Wait** — 1 to 100 blocks for randomness to settle
3. **Reveal** — seed derived from your commitment + a future blockhash; half the ETH swaps to $CLAWDIA via Uniswap V4 and burns it via `IERC20Burnable.burn()`; your lobster is minted

---

## Traits

| Trait | Variants | Notes |
|-------|----------|-------|
| Mutation | 8 | Controls body color + shape (Classic Red, Ocean Blue, Calico, Albino…) |
| Scene | 8 | Background environment |
| Marking | 8 | Shell pattern (Spotted, Striped, Iridescent, Battle Scarred…) |
| Claws | 6 | Claw shape (Balanced, Left Crusher, Dueling…) |
| Eyes | 7 | Eye style (Standard, Glow Green, Cyclops, Noggles…) |
| Accessory | 11 | Pirate Hat, Crown, Admiral Hat, Gold Chain, Rainbow Puke… |
| Tail | 5 | Tail fan shape |
| Broken Antenna | ~15% | One antenna damaged |
| **Special** | 5 | Ghost / Infernal / Celestial / Nounish / Doodled (override common traits) |

Specials use trait overrides — e.g., every Ghost forces `mutation=3, eyes=4, scene=7`. Trait decoding in `lib/traits.ts` mirrors `TraitDecode.sol` exactly so the JS renderer always matches the minted result.

---

## Tokenomics

- **Supply:** 8,004
- **Mint price:** 0.005 ETH
- **On every mint:** 50% of ETH swapped for [$CLAWDIA](https://basescan.org/token/0xbbd9aDe16525acb4B336b6dAd3b9762901522B07) via Uniswap V4 and burned via `burn()`
- **Remaining 50%:** goes to treasury
- **Secondary royalties:** 5% (configured in `contractURI`)
- **$CLAWDIA:** `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07`

---

## Repo structure

```
onchain-lobsters/
├── app/                          # Next.js 14 App Router frontend
│   ├── app/
│   │   ├── page.tsx              # Gallery / hero landing
│   │   ├── mint/page.tsx         # Mint UI (commit-reveal flow)
│   │   └── api/og/[tokenId]/     # On-the-fly OG images via next/og
│   ├── components/
│   │   ├── HeroMosaic.tsx        # Animated 3D-flip lobster grid
│   │   ├── GalleryGrid.tsx       # Minted lobster gallery
│   │   ├── LobsterCanvas.tsx     # Client-side SVG renderer
│   │   ├── TraitSheet.tsx        # Post-mint trait breakdown
│   │   ├── Nav.tsx               # Sticky navbar + wallet connect
│   │   ├── Ticker.tsx            # Scrolling stats ticker
│   │   └── Footer.tsx
│   ├── hooks/                    # useCommit, useReveal, usePendingCommit, useBlockCountdown
│   └── lib/
│       ├── renderer.ts           # TypeScript pixel renderer (mirrors PixelRenderer.sol)
│       ├── traits.ts             # Seed → traits decoder (mirrors TraitDecode.sol)
│       └── salt.ts               # Commit salt gen / localStorage persistence
├── contracts/
│   ├── OnchainLobsters.sol       # Main ERC-721, commit-reveal, V4 swap+burn
│   ├── PixelRenderer.sol         # Solidity SVG builder — floor, body, scene composition
│   ├── PixelRendererOverlay.sol  # Claws, markings, antennae, eyes, accessories
│   ├── TraitDecode.sol           # Weighted trait decode + attributes() JSON
│   └── lib/
│       └── Base64.sol            # Base64 encoder
├── test/
│   └── OnchainLobsters.t.sol     # 64-test Foundry suite
├── scripts/
│   └── deploy.ts                 # Foundry deploy script
└── foundry.toml
```

---

## Local development

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Foundry](https://getfoundry.sh)
- A Base RPC URL

### Frontend

```bash
cd app
npm install
npm run dev
# → http://localhost:3000
```

### Smart contracts

```bash
# Install deps
forge install

# Build
forge build

# Test (64 tests)
forge test -vv

# Deploy to Base
CLAWDIA_ADDRESS=0xbbd9aDe16525acb4B336b6dAd3b9762901522B07 \
TREASURY_ADDRESS=0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9 \
MINT_PRICE_WEI=5000000000000000 \
forge script scripts/deploy.ts \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --verify
```

### Environment variables

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xbe37D95aAa5C624F0fd3549c0CAD88F9E876C660
NEXT_PUBLIC_CHAIN_ID=8453
```

---

## Architecture decisions

| Decision | Why |
|----------|-----|
| No IPFS | SVG generated by contract via `tokenURI()` — zero external deps |
| Commit-reveal | Future blockhash in seed prevents front-running / sniping |
| Uniswap V4 `unlock()`/`unlockCallback()` | Only active pool for WETH/CLAWDIA on Base is V4 |
| `IERC20Burnable.burn()` | Real token destruction, not dead-address send |
| `extcodesize` guard in `_swapAndBurn` | Graceful fallback to treasury in local test env (no PoolManager deployed) |
| `via_ir = true` in foundry.toml | PixelRenderer.sol exceeds stack depth without IR pipeline |
| Renderer split (PixelRenderer + PixelRendererOverlay) | Each contract < 24KB EVM size limit |
| `next/og` for OG images | Avoids native Canvas dep (broken on Node v25); embeds SVG as base64 |
| TypeScript renderer mirrors Solidity | JS preview = guaranteed match to minted result |
| 64-bit seeds | Trait bytes 4–7 live at bit offsets 32–63; 32-bit seeds locked eyes/accessory/special to index 0 |
| `contractURI()` | EIP-7572 collection metadata with 5% royalty config for OpenSea |
| `mintDirect()` | Single-tx mint path for bankrbot and similar callers; disabled by default |

---

## Contributing

PRs welcome. All changes go through a PR.

1. Branch from `master`
2. Make your changes
3. Open a PR — bugbot will scan automatically
4. Squash-merge after review

---

## License

MIT — art is onchain, code is open.

---

*Built by [@ClawdiaETH](https://x.com/ClawdiaETH) · Deployed on [Base](https://base.org) · Burns [$CLAWDIA](https://basescan.org/token/0xbbd9aDe16525acb4B336b6dAd3b9762901522B07)*
