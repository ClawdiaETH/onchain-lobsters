# SKILL.md — Onchain Lobsters (Agent Edition)

> 8,004 fully onchain pixel lobsters on Base. Every mint burns $CLAWDIA.
> No IPFS. No metadata server. Art lives on the blockchain forever.
> Mint price: **0.005 ETH**

---

## Contract Info

| Item | Value |
|------|-------|
| **Contract (v8)** | `0xc9cDED1749AE3a46Bd4870115816037b82B24143` |
| **Chain** | Base Mainnet (chainId 8453) |
| **Mint price** | 0.005 ETH |
| **Max supply** | 8,004 |
| **$CLAWDIA token** | `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07` |
| **PixelRenderer** | `0x518f55B8b769fc5E50d571950279399599A64042` |
| **Frontend** | https://onchainlobsters.xyz |
| **OpenSea** | https://opensea.io/collection/onchain-lobsters |
| **Moltline group** | https://www.moltline.com/groups/19b9983b-0a6e-4f0e-9015-44fece59b018 |

```bash
CONTRACT=0xc9cDED1749AE3a46Bd4870115816037b82B24143
RPC=https://mainnet.base.org
```

---

## Mint Methods

Two ways to mint. Commit-reveal is the canonical experience; direct mint is the fast path.

### Option A — Direct Mint (fast, single tx)

Bankrbot and other agents should use this. One transaction, no waiting.

```bash
# Check mint is active
cast call $CONTRACT "saleIsActive()(bool)" --rpc-url $RPC

# Mint directly to yourself
cast send $CONTRACT \
  "mintDirect(address)" $YOUR_WALLET \
  --value 0.005ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

SeaDrop-compatible signature (what bankrbot calls):
```bash
cast send $CONTRACT \
  "mintSeaDrop(address,uint256)" $YOUR_WALLET 1 \
  --value 0.005ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

> **Note:** Half of the ETH is automatically swapped for $CLAWDIA via Uniswap V4 and burned to `0x0`. The swap happens atomically in the same transaction.

---

### Option B — Commit-Reveal (canonical, anti-frontrun)

The full 2-step flow. You cannot predict your lobster before commit.

#### Prerequisites

- Wallet with ≥ 0.006 ETH on Base (mint + gas buffer)
- `cast` (Foundry) or equivalent

```bash
cast balance <YOUR_WALLET> --rpc-url $RPC
```

#### Step 1 — Generate a salt

```bash
SALT=$(cast keccak "$(date +%s%N)-$(openssl rand -hex 16)")
echo "SAVE THIS SALT: $SALT"
```

#### Step 2 — Compute commitment

```bash
WALLET=0xYOUR_WALLET
COMMITMENT=$(cast keccak $(cast abi-encode "f(bytes32,address)" $SALT $WALLET))
echo "Commitment: $COMMITMENT"
```

#### Step 3 — Commit (pay 0.005 ETH)

```bash
cast send $CONTRACT \
  "commit(bytes32)" $COMMITMENT \
  --value 0.005ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
# Note the blockNumber from the receipt
```

#### Step 4 — Wait ≥ 1 block (≤ 100 blocks or commit expires)

```bash
COMMIT_BLOCK=YOUR_BLOCK_NUMBER
while [ $(cast block-number --rpc-url $RPC) -le $COMMIT_BLOCK ]; do
  sleep 2
done
echo "Ready to reveal!"
```

#### Step 5 — Reveal (mints the NFT + burns $CLAWDIA)

```bash
cast send $CONTRACT \
  "reveal(bytes32,address)" $SALT $YOUR_WALLET \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

---

## Checking Collection Status

```bash
# Total minted so far
cast call $CONTRACT "totalMinted()(uint256)" --rpc-url $RPC

# Check if mint is active
cast call $CONTRACT "saleIsActive()(bool)" --rpc-url $RPC

# Check a pending commit (returns commitment, blockNumber, amount)
cast call $CONTRACT "commits(address)(bytes32,uint256,uint256)" $WALLET --rpc-url $RPC

# Get price from SeaDrop interface
cast call $CONTRACT \
  "getPublicDrop(address)((uint80,uint48,uint48,uint16,uint16,bool))" \
  0x0000000000000000000000000000000000000000 --rpc-url $RPC
```

---

## Viewing Your Lobster

```bash
TOKEN_ID=1

# Get token URI (raw JSON, no outer base64)
cast call $CONTRACT "tokenURI(uint256)(string)" $TOKEN_ID --rpc-url $RPC

# Get the seed
cast call $CONTRACT "tokenSeed(uint256)(uint256)" $TOKEN_ID --rpc-url $RPC
```

Or view on the frontend:
```
https://onchainlobsters.xyz/lobster/<TOKEN_ID>
```

---

## Trait Rarity Reference

### Mutations (base color)
| Name | Rarity |
|------|--------|
| Classic Red | ~24% |
| Ocean Blue | ~10% |
| Melanistic | ~8% |
| Albino | ~6% |
| Yellow | ~5% |
| Calico | ~12% |
| Cotton Candy | ~4% |
| Burnt Sienna | ~31% |

### Scenes (background)
Open Water · Kelp Forest · Coral Reef · Volcanic Vent · Shipwreck · Tide Pool · Ocean Floor · The Abyss

### Accessories (11 total)
None · Monocle · Top Hat · Pearl Necklace · Anchor · Seaweed · Admiral Hat · Party Hat · Doodle Glasses · Pirate Hat · Crystal Crown

### Special Overrides (rare)
Specials override mutation + scene with unique visual themes.
~14% combined chance across all specials.

### Other Traits
- **Markings** — Stripe, Spots, Banded, None
- **Claws** — Standard, Right Crusher, Left Crusher, Twin Crushers
- **Eyes** — Standard, Noggles, Googly, Dead, Heart
- **Broken Antenna** — rare cosmetic

---

## Gas Estimates

| Action | ~Gas |
|--------|------|
| `commit()` | ~80,000 |
| `reveal()` (with swap) | ~200,000 |
| `mintDirect()` | ~200,000 |
| `mintSeaDrop()` | ~200,000 |

At Base typical gas prices (~0.001–0.1 gwei): each mint costs < $0.05 in gas.

---

## Automated Full-Flow Script

```bash
#!/usr/bin/env bash
# mine-lobster.sh — automated commit-reveal mint

set -e

CONTRACT="0xc9cDED1749AE3a46Bd4870115816037b82B24143"
RPC="https://mainnet.base.org"
PRIVATE_KEY="${PRIVATE_KEY:?Set PRIVATE_KEY}"

WALLET=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Wallet: $WALLET"

# Balance check (need >= 0.006 ETH)
BALANCE=$(cast balance $WALLET --rpc-url $RPC --ether)
echo "Balance: $BALANCE ETH"

# Mint active?
ACTIVE=$(cast call $CONTRACT "saleIsActive()(bool)" --rpc-url $RPC)
[ "$ACTIVE" = "true" ] || { echo "Mint not active"; exit 1; }

# Generate salt
SALT=$(cast keccak "${WALLET}-$(date +%s%N)")
echo "Salt (save this): $SALT"

# Commitment
COMMITMENT=$(cast keccak $(cast abi-encode "f(bytes32,address)" $SALT $WALLET))
echo "Commitment: $COMMITMENT"

# Commit
echo "Committing..."
COMMIT_TX=$(cast send $CONTRACT "commit(bytes32)" $COMMITMENT \
  --value 0.005ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC \
  --json | jq -r .transactionHash)
echo "Commit tx: $COMMIT_TX"

COMMIT_BLOCK=$(cast receipt $COMMIT_TX --rpc-url $RPC --json | jq .blockNumber -r)
COMMIT_BLOCK_DEC=$(printf "%d" $COMMIT_BLOCK)
echo "Commit block: $COMMIT_BLOCK_DEC — waiting for next block..."

while [ $(cast block-number --rpc-url $RPC) -le $COMMIT_BLOCK_DEC ]; do
  sleep 1
done

# Reveal
echo "Revealing..."
REVEAL_TX=$(cast send $CONTRACT "reveal(bytes32,address)" $SALT $WALLET \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC \
  --json | jq -r .transactionHash)
echo "Reveal tx: $REVEAL_TX"
echo "Done! View at: https://onchainlobsters.xyz"
```

---

## Key Notes for Agent Miners

- **Salt is critical** — loss means ETH is stuck. Store it before committing.
- **Commit window** — must reveal within 100 blocks (~2 min on Base). Don't delay.
- **One mint per wallet at a time** — `commits(address)` must be zero before a new commit.
- **Swap failure is safe** — if the Uniswap pool is dry, ETH goes to treasury and NFT still mints.
- **Direct mint is simpler** — use `mintDirect()` or `mintSeaDrop()` if you don't need the commit-reveal UX.
- **CC0** — fully public domain. Do what you want with your lobster.

---

*Built by @ClawdiaBotAI 🐚 · Burns $CLAWDIA with every mint · CC0*
