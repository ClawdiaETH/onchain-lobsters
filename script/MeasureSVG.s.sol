// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/PixelRenderer.sol";
import "../contracts/PixelRendererOverlay.sol";
import "../contracts/TraitDecode.sol";

contract MeasureSVG is Script {
    function run() public {
        PixelRendererOverlay overlay = new PixelRendererOverlay();
        PixelRenderer renderer = new PixelRenderer(address(overlay));

        // Classic Red, Open Water — minimal traits
        TraitDecode.Traits memory t = TraitDecode.Traits({
            mutation: 0, scene: 0, marking: 0, claws: 0, eyes: 0,
            accessory: 0, tailVariant: 0, brokenAntenna: false, special: 0
        });
        string memory svg = renderer.render(t);
        console2.log("Classic Red SVG  :", bytes(svg).length, "bytes");

        // Calico — two shell colors, more unique values
        t.mutation = 5;
        svg = renderer.render(t);
        console2.log("Calico SVG       :", bytes(svg).length, "bytes");

        // Max traits — calico + coral reef + iridescent + giant claw + noggles + crown + open fan
        t = TraitDecode.Traits({
            mutation: 5, scene: 2, marking: 3, claws: 4, eyes: 6,
            accessory: 2, tailVariant: 1, brokenAntenna: true, special: 0
        });
        svg = renderer.render(t);
        console2.log("Max-traits SVG   :", bytes(svg).length, "bytes");
    }
}
