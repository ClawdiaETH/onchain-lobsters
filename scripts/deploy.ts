// scripts/deploy.ts — Foundry deploy script
// Usage:
//   forge script scripts/deploy.ts --rpc-url base --broadcast --verify
//
// Required env vars:
//   CLAWDIA_ADDRESS   = 0xbbd9aDe16525acb4B336b6dAd3b9762901522B07
//   TREASURY_ADDRESS  = 0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9
//   MINT_PRICE_WEI    = 5000000000000000  (0.005 ETH)

import { Script, console } from "forge-std/Script.sol";
import { PixelRendererOverlay } from "../contracts/PixelRendererOverlay.sol";
import { PixelRenderer } from "../contracts/PixelRenderer.sol";
import { OnchainLobsters } from "../contracts/OnchainLobsters.sol";

contract Deploy is Script {
    function run() external {
        address clawdia  = vm.envAddress("CLAWDIA_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 price    = vm.envUint("MINT_PRICE_WEI");

        vm.startBroadcast();

        // 1. Deploy overlay renderer (claws, markings, antennae, eyes, accessories)
        PixelRendererOverlay overlay = new PixelRendererOverlay();
        console.log("PixelRendererOverlay deployed:", address(overlay));

        // 2. Deploy main renderer (floor, body, SVG output) — passes overlay address
        PixelRenderer renderer = new PixelRenderer(address(overlay));
        console.log("PixelRenderer deployed:        ", address(renderer));

        // 3. Deploy main NFT contract
        OnchainLobsters nft = new OnchainLobsters(clawdia, price, treasury, address(renderer));
        console.log("OnchainLobsters deployed:      ", address(nft));

        vm.stopBroadcast();

        console.log("---");
        console.log("  CLAWDIA: ", clawdia);
        console.log("  Treasury:", treasury);
        console.log("  Price:   ", price);
        console.log("---");
        console.log("Set in Vercel:");
        console.log("  NEXT_PUBLIC_CONTRACT_ADDRESS=", address(nft));
    }
}
