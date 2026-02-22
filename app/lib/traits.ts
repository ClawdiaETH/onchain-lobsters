// lib/traits.ts
// Mirrors TraitDecode.sol exactly. Must produce identical results for any seed.
import type { Traits } from "./renderer";

// Cumulative weight arrays (out of 255, matching Solidity uint8 thresholds)
const MUTATION_W =  [102, 127, 148, 163, 176, 207, 217, 255];
const SCENE_W    =  [ 32,  64,  96, 128, 160, 192, 224, 255];
const MARKING_W  =  [ 89, 135, 166, 186, 204, 219, 244, 255];
const CLAW_W     =  [ 89, 135, 181, 212, 238, 255];
const EYE_W      =  [115, 153, 191, 211, 231, 244, 255];
const ACCESSORY_W = [ 77, 102, 122, 142, 162, 177, 192, 204, 217, 237, 255];
const TAIL_W     =  [128, 179, 209, 235, 255];

function weighted(seed: bigint, shift: number, weights: number[]): number {
  const r = Number((seed >> BigInt(shift)) & 0xFFn);
  for (let i = 0; i < weights.length; i++) if (r < weights[i]) return i;
  return weights.length - 1;
}

export function seedToTraits(seed: bigint): Traits {
  let t: Traits = {
    mutation:      weighted(seed,  0, MUTATION_W),
    scene:         weighted(seed,  8, SCENE_W),
    marking:       weighted(seed, 16, MARKING_W),
    claws:         weighted(seed, 24, CLAW_W),
    eyes:          weighted(seed, 32, EYE_W),
    accessory:     weighted(seed, 40, ACCESSORY_W),
    tailVariant:   weighted(seed, 48, TAIL_W),
    brokenAntenna: (Number((seed >> 56n) & 0xFFn)) < 38, // ~15%
    special:       0,
  };

  // Special overrides — must exactly mirror applySpecial() in TraitDecode.sol
  const sp = Number((seed >> 57n) & 0xFFn);
  if      (sp < 10) { t = { ...t, mutation: 3, eyes: 4, scene: 7, special: 1 }; } // Ghost
  else if (sp < 18) { t = { ...t, mutation: 2, scene: 3, accessory: 6, eyes: 5, special: 2 }; } // Infernal
  else if (sp < 21) { t = { ...t, mutation: 6, scene: 7, accessory: 2, eyes: 2, special: 3 }; } // Celestial
  else if (sp < 26) { t = { ...t, eyes: 6, mutation: 0, scene: 6, special: 4 }; } // Nounish
  else if (sp < 34) { t = { ...t, accessory: 8, mutation: 3, scene: 5, special: 5 }; } // Doodled

  return t;
}

export const SPECIAL_NAMES = ["", "Ghost", "Infernal", "Celestial", "Nounish", "Doodled"];

// Utility: format trait index as human-readable name for display
import { MUTATIONS, SCENES, MARKINGS, EYES_LIST, CLAWS_LIST, ACCESSORIES } from "./renderer";
export function traitsToDisplay(t: Traits) {
  return {
    special:      SPECIAL_NAMES[t.special] || null,
    mutation:     MUTATIONS[t.mutation]?.name ?? "Unknown",
    scene:        SCENES[t.scene]?.name ?? "Unknown",
    marking:      MARKINGS[t.marking] ?? "Unknown",
    claws:        CLAWS_LIST[t.claws] ?? "Unknown",
    eyes:         EYES_LIST[t.eyes] ?? "Unknown",
    accessory:    ACCESSORIES[t.accessory] ?? "Unknown",
    brokenAntenna: t.brokenAntenna,
    tailVariant:  t.tailVariant,
  };
}
