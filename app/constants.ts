// constants.ts — single source of truth for all addresses and config
import { parseAbi } from "viem";
export const CHAIN_ID = 8453; // Base Mainnet
export const CHAIN_ID_TESTNET = 84532; // Base Sepolia

// Fill in after deployment
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const CLAWDIA_ADDRESS = "0xbbd9aDe16525acb4B336b6dAd3b9762901522B07" as `0x${string}`;
export const TREASURY_ADDRESS = "0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9" as `0x${string}`;

// Mint: user pays ETH → contract swaps half for $CLAWDIA → burns it
export const MINT_PRICE_ETH = "0.005"; // ETH total (half swapped+burned, half protocol)

export const MAX_SUPPLY = 8004;
export const COMMIT_WINDOW_BLOCKS = 100; // max blocks before reveal expires
export const MIN_REVEAL_BLOCKS = 1;      // must wait at least 1 block

// ABI — minimal surface the frontend calls (parseAbi gives viem a typed Abi)
export const LOBSTERS_ABI = parseAbi([
  "function commit(bytes32 commitment) external payable",
  "function reveal(bytes32 salt, address recipient) external",
  "function commits(address) external view returns (bytes32 commitment, uint256 blockNumber)",
  "function totalMinted() external view returns (uint256)",
  "function tokenSeed(uint256) external view returns (uint256)",
  "function tokenURI(uint256) external view returns (string)",
  "function mintPriceETH() external view returns (uint256)",
  "function clawdiaPoolKey() external view returns (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
  "event ClawdiaBurned(uint256 indexed tokenId, uint256 clawdiaAmount)",
  "event Revealed(address indexed minter, uint256 indexed tokenId, uint256 seed)",
]);

export const ERC20_ABI = parseAbi([
  "function balanceOf(address) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
]);
