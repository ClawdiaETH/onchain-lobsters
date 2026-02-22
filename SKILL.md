# SKILL.md — Onchain Lobsters Mining Guide (Agent Edition)

> Mine a fully onchain pixel lobster NFT on Base. Commit-reveal minting.
> Half of your 0.005 ETH gets swapped for $CLAWDIA and burned forever.

---

## What You're Doing

1. **Commit** — pay 0.005 ETH, lock a hash of your salt
2. **Wait 1 block** (at least)
3. **Reveal** — submit the original salt; contract hashes it with blockhash
   to derive your lobster's seed. Swap + burn happens automatically.

You cannot predict your lobster before commit. That's the point.

---

## Prerequisites

- Wallet with ≥ 0.006 ETH on Base (mint + gas buffer)
- RPC access to Base mainnet
- `cast` (Foundry) or equivalent

```bash
# Check you have cast
cast --version

# Check wallet balance on Base
cast balance <YOUR_WALLET> --rpc-url https://mainnet.base.org
```

---

## Contract

| Item | Value |
|------|-------|
| **Contract** | TBD after deploy (update here) |
| **Chain** | Base Mainnet (8453) |
| **Mint price** | 0.005 ETH |
| **Max supply** | 8,004 |
| **Commit window** | 100 blocks (~2 min) |
| **$CLAWDIA** | `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07` |

---

## Step 1: Generate a Salt

The salt can be anything you keep secret until reveal. Use a random bytes32:

```bash
SALT=$(cast keccak "$(date +%s%N)-$(openssl rand -hex 16)")
echo "Your salt (KEEP THIS): $SALT"
```

Or generate it deterministically from your wallet + a nonce:

```bash
WALLET=0xYOUR_WALLET
NONCE=1
SALT=$(cast keccak "${WALLET}-${NONCE}")
```

---

## Step 2: Build the Commitment

The commitment is `keccak256(abi.encodePacked(salt, msg.sender))`:

```bash
CONTRACT=0xCONTRACT_ADDRESS
WALLET=0xYOUR_WALLET

# Compute commitment
COMMITMENT=$(cast keccak \
  $(cast abi-encode "f(bytes32,address)" $SALT $WALLET) \
)
echo "Commitment: $COMMITMENT"
```

---

## Step 3: Commit (pay ETH)

```bash
cast send $CONTRACT \
  "commit(bytes32)" $COMMITMENT \
  --value 0.005ether \
  --private-key $PRIVATE_KEY \
  --rpc-url https://mainnet.base.org
```

Note the **block number** from the tx receipt — you need it to know when you
can reveal and when your commit expires.

```bash
# Get block number from tx receipt
COMMIT_TX=0xYOUR_TX_HASH
cast receipt $COMMIT_TX --rpc-url https://mainnet.base.org | grep blockNumber
```

---

## Step 4: Wait ≥ 1 Block

```bash
# Current block
CURRENT=$(cast block-number --rpc-url https://mainnet.base.org)

# Your commit block (from receipt)
COMMIT_BLOCK=YOUR_BLOCK_NUMBER

# Wait until current > commit block
while [ $(cast block-number --rpc-url https://mainnet.base.org) -le $COMMIT_BLOCK ]; do
  echo "Waiting... current block: $(cast block-number --rpc-url https://mainnet.base.org)"
  sleep 2
done
echo "Ready to reveal!"
```

---

## Step 5: Reveal (mints the NFT)

```bash
# Recipient can be any address — send to yourself or a collector
RECIPIENT=$WALLET

cast send $CONTRACT \
  "reveal(bytes32,address)" $SALT $RECIPIENT \
  --private-key $PRIVATE_KEY \
  --rpc-url https://mainnet.base.org
```

This will:
1. Verify your commitment matches
2. Derive seed from `keccak256(blockhash(commitBlock), salt, recipient, supply)`
3. Swap half the ETH for $CLAWDIA → burn
4. Mint the NFT to `recipient`

---

## Step 6: View Your Lobster

```bash
TOKEN_ID=YOUR_TOKEN_ID  # totalMinted at time of reveal

# Get token URI (base64 encoded JSON with inline SVG)
URI=$(cast call $CONTRACT "tokenURI(uint256)(string)" $TOKEN_ID \
  --rpc-url https://mainnet.base.org)

# Decode and pretty print
echo $URI | sed 's/data:application\/json;base64,//' | base64 -d | python3 -m json.tool
```

Or open the frontend:
```
https://onchain-lobsters.xyz/lobster/<TOKEN_ID>
```

---

## Checking Pending Commits

```bash
# Check if you have a pending commit
cast call $CONTRACT \
  "commits(address)(bytes32,uint256,uint256)" $WALLET \
  --rpc-url https://mainnet.base.org
# Returns: (commitment, blockNumber, burnAmount)
# blockNumber == 0 means no pending commit
```

---

## Commit Expired? (> 100 blocks)

If you miss the window, your commit expires. The ETH you paid is stuck until
you call a new `commit()`. The contract refunds any overpayment during commit,
but if your reveal window expires the funds are held. Contact the deployer.

**Don't let your commit expire.** Keep the salt and reveal within 100 blocks.

---

## Gas Estimates

| Action | ~Gas |
|--------|------|
| `commit()` | ~80,000 |
| `reveal()` (with swap) | ~200,000 |
| `reveal()` (swap fails, treasury fallback) | ~100,000 |

At 0.01 gwei base fee: reveal costs ~$0.002. Comfortable.

---

## Traits Preview (before minting)

You can't see your exact lobster until after reveal (that's the point), but
you can preview what each seed WOULD look like using the renderer:

```bash
# Install renderer deps (one-time)
cd app && npm install

# Preview a seed
node -e "
const { seedToTraits } = require('./app/lib/traits');
const { renderLobsterSVG } = require('./app/lib/renderer');
const seed = BigInt('0xYOUR_SEED_HERE');
const traits = seedToTraits(seed);
const svg = renderLobsterSVG(traits, 10);
require('fs').writeFileSync('/tmp/lobster-preview.svg', svg);
console.log('Traits:', JSON.stringify(traits));
console.log('SVG written to /tmp/lobster-preview.svg');
"
```

---

## Trait Rarity Reference

### Mutations (base color)
| # | Name | Rarity |
|---|------|--------|
| 0 | Classic | ~24% |
| 1 | Blue | ~10% |
| 2 | Void | ~8% |
| 3 | Ghost White | ~6% |
| 4 | Gilded | ~5% |
| 5 | Calico | ~12% |
| 6 | Cotton Candy | ~4% |
| 7 | Burnt | ~31% |

### Specials (override mutation + scene + eyes)
| # | Name | Threshold | ~Chance |
|---|------|-----------|---------|
| 1 | Ghost | seed>>57 < 10 | 3.9% |
| 2 | Infernal | < 18 | 3.1% |
| 3 | Celestial | < 21 | 1.2% |
| 4 | Nounish | < 26 | 2.0% |
| 5 | Doodled | < 34 | 3.1% |

---

## Automation Script (full flow)

```bash
#!/usr/bin/env bash
# mine-lobster.sh — fully automated commit-reveal

set -e

CONTRACT="${LOBSTER_CONTRACT:?Set LOBSTER_CONTRACT}"
PRIVATE_KEY="${PRIVATE_KEY:?Set PRIVATE_KEY}"
RPC="https://mainnet.base.org"

WALLET=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Wallet: $WALLET"

# Balance check
BALANCE=$(cast balance $WALLET --rpc-url $RPC)
if [ "$(echo "$BALANCE < 6000000000000000" | bc)" = "1" ]; then
  echo "ERROR: Need at least 0.006 ETH on Base"
  exit 1
fi

# Generate salt
NONCE=$(date +%s%N)
SALT=$(cast keccak "${WALLET}-${NONCE}")
echo "Salt: $SALT"

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

COMMIT_BLOCK=$(cast receipt $COMMIT_TX --rpc-url $RPC --json | jq -r .blockNumber)
echo "Commit block: $COMMIT_BLOCK (hex: $COMMIT_BLOCK)"
COMMIT_BLOCK_DEC=$(printf "%d" $COMMIT_BLOCK)
echo "Commit block (dec): $COMMIT_BLOCK_DEC"

# Wait for next block
echo "Waiting for block $((COMMIT_BLOCK_DEC + 1))..."
while true; do
  CURRENT=$(cast block-number --rpc-url $RPC)
  if [ "$CURRENT" -gt "$COMMIT_BLOCK_DEC" ]; then
    echo "Block $CURRENT — ready to reveal"
    break
  fi
  sleep 1
done

# Reveal
echo "Revealing..."
REVEAL_TX=$(cast send $CONTRACT "reveal(bytes32,address)" $SALT $WALLET \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC \
  --json | jq -r .transactionHash)
echo "Reveal tx: $REVEAL_TX"

# Get token ID from Revealed event
echo "Minted! Tx: $REVEAL_TX"
echo "Check your lobster at: https://onchain-lobsters.xyz"
```

---

## Notes for Agent Miners

- **Store your salt** between commit and reveal — loss means your ETH is
  stuck (no recovery without the salt)
- **Don't replay commits** — `commits(address)` must be zero before you
  can commit again
- **Gas price on Base** is typically 0.001–0.1 gwei — no need to worry
- **Swap failure is safe** — if the Uniswap pool is illiquid, ETH goes to
  treasury and the NFT still mints
- **One mint per wallet at a time** — parallel mints require multiple wallets

---

*Built by Clawdia 🐚 · $CLAWDIA burns with every mint · CC0*
