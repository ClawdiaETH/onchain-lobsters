# OpenSea safelist / badging request packet

Prepared: 2026-05-18

## Status

OpenSea collection API currently reports:

- Collection slug: `onchain-lobsters`
- Safelist status: `not_requested`
- OpenSea URL: https://opensea.io/collection/onchain-lobsters

I could not submit the request from the local browser because OpenSea Studio requires a wallet-authenticated owner session at:

https://opensea.io/collection/onchain-lobsters/edit

OpenSea's current help docs say collection badging is reviewed through account verification / collection eligibility, not a public unauthenticated API endpoint. The owner wallet/account must connect and apply from profile/settings or collection settings.

## Owner / collection facts

- Collection name: Onchain Lobsters
- Chain: Base
- Contract: `0xc9cDED1749AE3a46Bd4870115816037b82B24143`
- Owner / treasury: `0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9`
- Final collection size: 804
- Mint price: 0.005 ETH
- Mechanics: commit-reveal mint; half of mint ETH swaps for `$CLAWDIA` on Uniswap V4 and burns it
- `$CLAWDIA`: `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07`
- Site: https://onchainlobsters.xyz
- X: https://x.com/ClawdiaBotAI
- License: CC0
- Metadata: fully onchain SVG / no IPFS / no metadata server

## Important pre-submit cleanup

Before applying, update the OpenSea collection description from the stale 8,004 copy to 804:

Current API description:

> 8,004 fully onchain pixel lobsters on Base. Half of mint fees burn $CLAWDIA. Commit-reveal. No IPFS. CC0. Created by @ClawdiaBotAI on 𝕏.

Recommended replacement:

> 804 fully onchain pixel lobsters on Base. Half of mint fees burn $CLAWDIA. Commit-reveal minting. No IPFS, no metadata server, CC0. Created by @ClawdiaBotAI on 𝕏.

## Suggested application note

Onchain Lobsters is an 804-piece fully onchain generative pixel art collection on Base. The ERC-721 contract renders SVG and metadata directly onchain with no IPFS or external metadata server. Minting uses a commit-reveal flow, and half of each 0.005 ETH mint is swapped into `$CLAWDIA` via Uniswap V4 and burned. The collection is CC0 and operated by Clawdia / @ClawdiaBotAI.

Relevant links:

- Site: https://onchainlobsters.xyz
- OpenSea: https://opensea.io/collection/onchain-lobsters
- Contract: https://basescan.org/address/0xc9cDED1749AE3a46Bd4870115816037b82B24143
- X: https://x.com/ClawdiaBotAI
- GitHub: https://github.com/ClawdiaETH/onchain-lobsters

## Submission steps

1. Connect the owner wallet/account to OpenSea.
2. Go to https://opensea.io/collection/onchain-lobsters/edit.
3. Update the collection description to the 804-supply copy above.
4. Save collection edits.
5. Go to profile/settings verification or any available collection badging/safelist prompt.
6. Submit the application note above.
7. Re-check with:

```bash
opensea collections get onchain-lobsters --format json | jq '{safelist_status, description}'
```
