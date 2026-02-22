// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library TraitDecode {
    struct Traits {
        uint8 mutation;       // 0-7
        uint8 scene;          // 0-7
        uint8 marking;        // 0-7
        uint8 claws;          // 0-5
        uint8 eyes;           // 0-6
        uint8 accessory;      // 0-10
        uint8 tailVariant;    // 0-4
        bool  brokenAntenna;
        uint8 special;        // 0=none, 1-5 = special override
    }

    // Weighted decode using inline thresholds (Solidity doesn't support constant arrays)
    function _wMutation(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 0) & 0xFF);
        if (r < 102) return 0; if (r < 127) return 1; if (r < 148) return 2;
        if (r < 163) return 3; if (r < 176) return 4; if (r < 207) return 5;
        if (r < 217) return 6; return 7;
    }
    function _wScene(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 8) & 0xFF);
        if (r < 32)  return 0; if (r < 64)  return 1; if (r < 96)  return 2;
        if (r < 128) return 3; if (r < 160) return 4; if (r < 192) return 5;
        if (r < 224) return 6; return 7;
    }
    function _wMarking(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 16) & 0xFF);
        if (r < 89)  return 0; if (r < 135) return 1; if (r < 166) return 2;
        if (r < 186) return 3; if (r < 204) return 4; if (r < 219) return 5;
        if (r < 244) return 6; return 7;
    }
    function _wClaws(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 24) & 0xFF);
        if (r < 89)  return 0; if (r < 135) return 1; if (r < 181) return 2;
        if (r < 212) return 3; if (r < 238) return 4; return 5;
    }
    function _wEyes(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 32) & 0xFF);
        if (r < 115) return 0; if (r < 153) return 1; if (r < 191) return 2;
        if (r < 211) return 3; if (r < 231) return 4; if (r < 244) return 5; return 6;
    }
    function _wAccessory(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 40) & 0xFF);
        if (r < 77)  return 0; if (r < 102) return 1; if (r < 122) return 2;
        if (r < 142) return 3; if (r < 162) return 4; if (r < 177) return 5;
        if (r < 192) return 6; if (r < 204) return 7; if (r < 217) return 8;
        if (r < 237) return 9; return 10;
    }
    function _wTail(uint256 seed) private pure returns (uint8) {
        uint8 r = uint8((seed >> 48) & 0xFF);
        if (r < 128) return 0; if (r < 179) return 1; if (r < 209) return 2;
        if (r < 235) return 3; return 4;
    }

    function decode(uint256 seed) internal pure returns (Traits memory t) {
        t.mutation      = _wMutation(seed);
        t.scene         = _wScene(seed);
        t.marking       = _wMarking(seed);
        t.claws         = _wClaws(seed);
        t.eyes          = _wEyes(seed);
        t.accessory     = _wAccessory(seed);
        t.tailVariant   = _wTail(seed);
        t.brokenAntenna = uint8((seed >> 56) & 0xFF) < 38; // ~15%
        t = _applySpecial(t, seed);
    }

    function _applySpecial(Traits memory t, uint256 seed) private pure returns (Traits memory) {
        uint8 sp = uint8((seed >> 57) & 0xFF);
        if (sp < 10) {
            t.mutation = 3; t.eyes = 4; t.scene = 7; t.special = 1; // Ghost
        } else if (sp < 18) {
            t.mutation = 2; t.scene = 3; t.accessory = 6; t.eyes = 5; t.special = 2; // Infernal
        } else if (sp < 21) {
            t.mutation = 6; t.scene = 7; t.accessory = 2; t.eyes = 2; t.special = 3; // Celestial
        } else if (sp < 26) {
            t.eyes = 6; t.mutation = 0; t.scene = 6; t.special = 4; // Nounish
        } else if (sp < 34) {
            t.accessory = 8; t.mutation = 3; t.scene = 5; t.special = 5; // Doodled
        }
        return t;
    }

    function _mutationName(uint8 i) private pure returns (string memory) {
        if (i==0) return "Classic Red"; if (i==1) return "Ocean Blue";   if (i==2) return "Melanistic";
        if (i==3) return "Albino";      if (i==4) return "Yellow";       if (i==5) return "Calico";
        if (i==6) return "Cotton Candy"; return "Burnt Sienna";
    }
    function _sceneName(uint8 i) private pure returns (string memory) {
        if (i==0) return "Open Water";  if (i==1) return "Kelp Forest";  if (i==2) return "Coral Reef";
        if (i==3) return "Volcanic Vent"; if (i==4) return "Shipwreck";  if (i==5) return "Tide Pool";
        if (i==6) return "Ocean Floor"; return "The Abyss";
    }
    function _markingName(uint8 i) private pure returns (string memory) {
        if (i==0) return "None";      if (i==1) return "Spotted";       if (i==2) return "Striped";
        if (i==3) return "Iridescent"; if (i==4) return "Battle Scarred"; if (i==5) return "Banded";
        if (i==6) return "Mottled";   return "Chitin Sheen";
    }
    function _clawName(uint8 i) private pure returns (string memory) {
        if (i==0) return "Balanced";  if (i==1) return "Left Crusher";  if (i==2) return "Right Crusher";
        if (i==3) return "Dueling";   if (i==4) return "Giant Left";    return "Regenerating";
    }
    function _eyeName(uint8 i) private pure returns (string memory) {
        if (i==0) return "Standard";  if (i==1) return "Glow Green";    if (i==2) return "Glow Blue";
        if (i==3) return "Cyclops";   if (i==4) return "Void";          if (i==5) return "Laser";
        return "Noggles";
    }
    function _accessoryName(uint8 i) private pure returns (string memory) {
        if (i==0)  return "None";        if (i==1)  return "Pirate Hat";  if (i==2)  return "Crown";
        if (i==3)  return "Eye Patch";   if (i==4)  return "Barnacles";   if (i==5)  return "Old Coin";
        if (i==6)  return "Admiral Hat"; if (i==7)  return "Pearl";       if (i==8)  return "Rainbow Puke";
        if (i==9)  return "Gold Chain";  return "Blush";
    }
    function _specialName(uint8 i) private pure returns (string memory) {
        if (i==1) return "Ghost"; if (i==2) return "Infernal"; if (i==3) return "Celestial";
        if (i==4) return "Nounish"; return "Doodled";
    }

    function attributes(Traits memory t) internal pure returns (string memory) {
        bytes memory a = abi.encodePacked(
            '[',
            _attr("Mutation",  _mutationName(t.mutation)), ',',
            _attr("Scene",     _sceneName(t.scene)),       ',',
            _attr("Marking",   _markingName(t.marking)),   ',',
            _attr("Claws",     _clawName(t.claws)),        ',',
            _attr("Eyes",      _eyeName(t.eyes)),          ',',
            _attr("Accessory", _accessoryName(t.accessory)), ','
        );
        a = abi.encodePacked(
            a,
            _attr("Tail Variant", _uint(t.tailVariant)), ',',
            _attrBool("Broken Antenna", t.brokenAntenna),
            t.special > 0 ? abi.encodePacked(',', _attr("Special", _specialName(t.special))) : bytes(''),
            ']'
        );
        return string(a);
    }

    function _attr(string memory k, string memory v) private pure returns (bytes memory) {
        return abi.encodePacked('{"trait_type":"', k, '","value":"', v, '"}');
    }
    function _attrBool(string memory k, bool v) private pure returns (bytes memory) {
        return abi.encodePacked('{"trait_type":"', k, '","value":"', v ? 'true' : 'false', '"}');
    }
    function _uint(uint8 v) private pure returns (string memory) {
        if (v == 0) return "0";
        bytes memory b;
        uint8 tmp = v;
        while (tmp > 0) { b = abi.encodePacked(bytes1(48 + tmp % 10), b); tmp /= 10; }
        return string(b);
    }
}
