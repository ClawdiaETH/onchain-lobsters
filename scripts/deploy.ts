// scripts/deploy.ts — Foundry deploy script
// Usage: forge script scripts/deploy.ts --rpc-url base --broadcast --verify

import { Script } from "forge-std/Script.sol";
import { OnchainLobsters } from "../contracts/OnchainLobsters.sol";

contract Deploy is Script {
    function run() external {
        address clawdia  = vm.envAddress("CLAWDIA_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 price    = vm.envUint("MINT_PRICE_WEI"); // e.g. 5000000000000000 (0.005 ETH)

        vm.startBroadcast();
        OnchainLobsters nft = new OnchainLobsters(clawdia, price, treasury);
        vm.stopBroadcast();

        console.log("OnchainLobsters deployed:", address(nft));
        console.log("  CLAWDIA:", clawdia);
        console.log("  Price:  ", price);
        console.log("  Treasury:", treasury);
    }
}
