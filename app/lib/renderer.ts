// lib/renderer.ts
// Pixel-accurate TypeScript port of lobster-preview.jsx.
// Used client-side in LobsterCanvas and server-side in OG image route.
// DO NOT modify rendering logic without updating PixelRenderer.sol in parallel.

export const W = 40, H = 52;

type RGB = [number, number, number];
type PixelBuf = Uint8ClampedArray;

// ─── Color utils ─────────────────────────────────────────────────────────────
const h2r = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: RGB, b: RGB, t: number): RGB =>
  [0, 1, 2].map(i => Math.round(a[i] * (1 - t) + b[i] * t)) as RGB;
const dk = (c: RGB, t: number): RGB => mix(c, [0, 0, 0], t);
const lt = (c: RGB, t: number): RGB => mix(c, [255, 255, 255], t);
const nv = (x: number, y: number, s = 1): number =>
  Math.abs((Math.sin(x * 127.1 * s + y * 311.7 * s) * 43758.5453) % 1);

// ─── Pixel ops ───────────────────────────────────────────────────────────────
function sp(b: PixelBuf, x: number, y: number, c: RGB | null) {
  if (x < 0 || x >= W || y < 0 || y >= H || !c) return;
  const i = (y * W + x) * 4;
  b[i] = c[0]; b[i + 1] = c[1]; b[i + 2] = c[2]; b[i + 3] = 255;
}
function fr(b: PixelBuf, x1: number, y1: number, x2: number, y2: number, c: RGB) {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) sp(b, x, y, c);
}
function ln(b: PixelBuf, x0: number, y0: number, x1: number, y1: number, c: RGB) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, err = dx + dy;
  for (;;) {
    sp(b, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e = 2 * err;
    if (e >= dy) { err += dy; x0 += sx; }
    if (e <= dx) { err += dx; y0 += sy; }
  }
}
function ov(
  b: PixelBuf,
  cx: number, cy: number, rx: number, ry: number,
  fn: (nx: number, ny: number, x: number, y: number) => RGB | null
) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    const dy = (y + 0.5 - cy) / (ry + 0.5);
    if (Math.abs(dy) > 1) continue;
    const mw = (rx + 0.5) * Math.sqrt(1 - dy * dy);
    for (let x = Math.floor(cx - mw); x <= Math.floor(cx + mw); x++) {
      const c = fn((x + 0.5 - cx) / (rx + 0.5), dy, x, y);
      if (c) sp(b, x, y, c);
    }
  }
}

// ─── Trait data ──────────────────────────────────────────────────────────────
export const MUTATIONS = [
  { name: "Classic Red",   b: "#C84820", s: "#7A2C10", h: "#E8784A" },
  { name: "Ocean Blue",    b: "#1A4E8C", s: "#0C2E58", h: "#4A80BC" },
  { name: "Melanistic",    b: "#1E1E2A", s: "#0C0C14", h: "#383850" },
  { name: "Albino",        b: "#E4D8C0", s: "#B8A888", h: "#F4EEE4" },
  { name: "Yellow",        b: "#C8A014", s: "#7A5E08", h: "#E8C840" },
  { name: "Calico",        b: "#C84820", s: "#7A2C10", h: "#E8784A", b2: "#1A4E8C", s2: "#0C2E58" },
  { name: "Cotton Candy",  b: "#E090B4", s: "#B86090", h: "#F4B4CC", b2: "#88B4E8", s2: "#6090C8" },
  { name: "Burnt Sienna",  b: "#8A3A18", s: "#4A1C08", h: "#AA5428" },
] as const;

export const SCENES = [
  { name: "Open Water",    fl: "#0A1828", f2: "#0D2038", grain: false, type: "bubbles"  },
  { name: "Kelp Forest",   fl: "#071410", f2: "#0A1E14", grain: false, type: "kelp"     },
  { name: "Coral Reef",    fl: "#0C0614", f2: "#160824", grain: false, type: "coral"    },
  { name: "Volcanic Vent", fl: "#050202", f2: "#0A0402", grain: false, type: "vent"     },
  { name: "Shipwreck",     fl: "#100C06", f2: "#1A1408", grain: true,  type: "planks"   },
  { name: "Tide Pool",     fl: "#A0784A", f2: "#887040", grain: true,  type: "starfish" },
  { name: "Ocean Floor",   fl: "#2A2014", f2: "#1A1408", grain: true,  type: "rocks"    },
  { name: "The Abyss",     fl: "#000000", f2: "#000000", grain: false, type: "none"     },
] as const;

export const MARKINGS = [
  "None", "Spotted", "Striped", "Iridescent",
  "Battle Scarred", "Banded", "Mottled", "Chitin Sheen",
] as const;
export const EYES_LIST = [
  "Standard", "Glow Green", "Glow Blue", "Cyclops", "Void", "Laser", "Noggles",
] as const;
export const CLAWS_LIST = [
  "Balanced", "Left Crusher", "Right Crusher", "Dueling", "Giant Left", "Regenerating",
] as const;
export const ACCESSORIES = [
  "None", "Pirate Hat", "Crown", "Eye Patch", "Barnacles",
  "Old Coin", "Admiral Hat", "Pearl", "Rainbow Puke", "Gold Chain", "Blush",
] as const;

export interface Traits {
  mutation: number;
  scene: number;
  marking: number;
  claws: number;
  eyes: number;
  accessory: number;
  tailVariant: number;
  brokenAntenna: boolean;
  special: number;
}

// ─── Floor / scene background ────────────────────────────────────────────────
function drawFloor(b: PixelBuf, sc: typeof SCENES[number]) {
  const fl = h2r(sc.fl), f2 = h2r(sc.f2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const vx = (x - W / 2) / (W / 2), vy = (y - H / 2) / (H / 2);
    sp(b, x, y, mix(fl, dk(fl, 0.55), Math.min(1, (vx * vx + vy * vy) * 0.45)));
  }

  switch (sc.type) {
    case 'bubbles':
      [[3,4],[7,8],[15,3],[28,6],[37,4],[2,18],[36,14],[5,38],[33,42],[38,30],[1,46],[9,26],[24,2],[32,22]]
        .forEach(([x, y]) => {
          const c = lt(f2, 0.45);
          sp(b, x, y, c); sp(b, x + 1, y, lt(c, 0.2)); sp(b, x, y - 1, lt(c, 0.15));
        });
      break;

    case 'kelp':
      [2, 6, 10, 30, 35, 39].forEach((kx, ki) => {
        for (let y = 0; y < H; y++) {
          const wx = Math.round(Math.sin(y * 0.4 + ki * 1.3) * 1.5);
          sp(b, Math.max(0, Math.min(W - 1, kx + wx)), y,
            nv(kx, y, 2) > 0.6 ? lt(f2, 0.12) : dk(f2, 0.1));
          if (y % 7 === ki % 7)
            for (let f = 1; f <= 3; f++)
              sp(b, Math.max(0, Math.min(W - 1, kx + wx + (ki % 2 ? -f : f))), y, lt(f2, 0.07));
        }
      });
      break;

    case 'coral': {
      const cc = h2r("#8A2010");
      [[4,48,4,10],[8,44,3,8],[36,48,3,9],[33,44,4,10],[18,50,5,5],[22,50,5,5]]
        .forEach(([x, y, rx, h]) => {
          for (let r = y - h; r <= y; r++) {
            const wid = Math.round(rx * Math.sqrt(1 - ((r - y) / h) ** 2));
            for (let cx = x - wid; cx <= x + wid; cx++)
              sp(b, cx, r, dk(cc, (r - y + h) / h * 0.5));
          }
          for (let a = -2; a <= 2; a++) sp(b, x + a, y - h - 1, lt(cc, 0.12));
        });
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(nv(i, 0, 3) * W), y = Math.floor(nv(i, 1, 3) * H);
        if (x >= 0 && x < W && y >= 0 && y < H) sp(b, x, y, dk(cc, 0.5));
      }
      break;
    }

    case 'vent': {
      const hc = h2r("#7A2408");
      [[20,40],[8,45],[33,42]].forEach(([vx, vy]) => {
        for (let y = vy; y < H; y++) {
          const s2 = Math.round((y - vy) * 0.5);
          for (let x = vx - s2; x <= vx + s2; x++)
            sp(b, x, y, mix(fl, hc, (y - vy) / (H - vy)));
        }
        for (let y = vy - 20; y < vy; y++) {
          const dist = vy - y, wx = Math.round(Math.sin(y * 0.5));
          if (nv(vx, y, 5) > 0.55) sp(b, vx + wx, y, mix(fl, hc, Math.max(0, 0.4 - dist * 0.015)));
          if (nv(vx + 1, y, 6) > 0.65) sp(b, vx + wx + 1, y, mix(fl, hc, Math.max(0, 0.25 - dist * 0.01)));
        }
      });
      break;
    }

    case 'planks': {
      const pl = h2r("#3A2808"), nail = h2r("#181410");
      [[5,30,36,31],[3,36,32,37],[10,42,38,43],[0,14,22,15],[18,6,39,7]]
        .forEach(([x1, y1, x2]) => {
          for (let x = x1; x <= x2; x++) {
            sp(b, x, y1, mix(pl, dk(pl, 0.3), nv(x, y1, 7) * 0.4));
            sp(b, x, y1 + 1, dk(pl, 0.2));
          }
          sp(b, x1 + 2, y1, nail); sp(b, x2 - 2, y1, nail);
        });
      for (let i = 0; i < 25; i++) {
        const x = Math.floor(nv(i, 0, 9) * W), y = Math.floor(nv(i, 1, 9) * H);
        if (x >= 0 && x < W && y >= 0 && y < H) sp(b, x, y, dk(pl, 0.4));
      }
      break;
    }

    case 'starfish':
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        sp(b, x, y, mix(fl, f2, nv(x, y, 11) * 0.4));
      [[5,47],[34,44]].forEach(([sx, sy]) => {
        const sf = h2r("#D04018");
        sp(b, sx, sy, sf); sp(b, sx + 1, sy, sf); sp(b, sx - 1, sy, sf);
        sp(b, sx, sy - 1, sf); sp(b, sx, sy + 1, sf); sp(b, sx + 2, sy + 1, dk(sf, 0.3));
      });
      [[10,49],[28,47],[15,3],[35,8]].forEach(([x, y]) => {
        sp(b, x, y, lt(fl, 0.3)); sp(b, x + 1, y, lt(fl, 0.2));
      });
      break;

    case 'rocks':
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        sp(b, x, y, mix(fl, f2, nv(x, y, 13) * 0.38));
      [[5,48,4,2],[16,50,5,2],[35,47,4,2],[3,8,3,2],[37,10,4,2],[22,4,3,1]]
        .forEach(([cx, cy, rx, ry]) => {
          ov(b, cx, cy, rx, ry, (_nx, ny) => mix(f2, dk(f2, 0.4), Math.abs(ny) * 0.6 + 0.1));
        });
      [10, 22, 34, 46].forEach(ry => {
        for (let x = 0; x < W; x++) sp(b, x, ry, lt(fl, 0.04));
      });
      break;
  }

  if (sc.grain) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (nv(x, y, 17) > 0.72) {
        const i = (y * W + x) * 4;
        b[i] = Math.min(255, b[i] + 18);
        b[i + 1] = Math.min(255, b[i + 1] + 14);
        b[i + 2] = Math.min(255, b[i + 2] + 8);
      }
    }
  }
}

// ─── Claw renderer ───────────────────────────────────────────────────────────
function drawClaw(
  b: PixelBuf,
  side: 'left' | 'right',
  scale: number,
  shell: (x: number, zone: string) => RGB
) {
  const isR = side === 'right';
  const palmCX = isR ? 29 : 10;
  const palmCY = 10;
  const palmW = Math.max(5, Math.round(6 * scale));
  const palmH = Math.max(2, Math.round(2 * scale));
  const px1 = palmCX - Math.floor(palmW / 2);
  const px2 = palmCX + Math.floor(palmW / 2);
  const py1 = palmCY - Math.floor(palmH / 2);
  const py2 = palmCY + Math.floor(palmH / 2);

  const armSX = isR ? 25 : 14, armSY = 16;
  ln(b, armSX, armSY, palmCX, py2 + 1, shell(palmCX, 's'));
  ln(b, armSX, armSY - 1, palmCX, py2, shell(palmCX, ''));

  for (let y = py1; y <= py2; y++)
    for (let x = px1; x <= px2; x++)
      sp(b, x, y, shell(x, y === py1 ? 'h' : y === py2 ? 's' : ''));

  const gapX = palmCX;
  const fingerLen = Math.max(4, Math.round(6 * scale));
  const innerX1 = isR ? px1 : gapX + 1;
  const innerX2 = isR ? gapX - 1 : px2;
  const outerX1 = isR ? gapX + 1 : px1;
  const outerX2 = isR ? px2 : gapX - 1;

  const drawFinger = (fx1: number, fx2: number, taperSide: string) => {
    const baseW = fx2 - fx1 + 1;
    for (let step = 0; step <= fingerLen; step++) {
      const fy = py1 - 1 - step;
      if (fy < 0) break;
      const taper = Math.max(1, Math.round(baseW * (1 - step / (fingerLen + 0.5))));
      let lx: number, rx: number;
      if (taperSide === 'inner') { lx = fx1; rx = fx1 + taper - 1; }
      else { lx = fx2 - taper + 1; rx = fx2; }
      for (let x = lx; x <= rx; x++) {
        const tip = step >= fingerLen - 1;
        const top = step === 0;
        sp(b, x, fy, shell(x, tip ? 'd' : top ? 'h' : (x === lx || x === rx) ? 'd' : ''));
      }
    }
  };

  drawFinger(innerX1, innerX2, isR ? 'inner' : 'outer');
  drawFinger(outerX1, outerX2, isR ? 'outer' : 'inner');

  for (let step = 0; step <= fingerLen; step++) {
    const fy = py1 - 1 - step;
    if (fy < 0) break;
    sp(b, gapX, fy, dk(shell(gapX, 's'), 0.6));
  }

  sp(b, px1, py1, shell(px1, 'h'));
  sp(b, px2, py1, shell(px2, 'h'));
  sp(b, gapX, py1, dk(shell(gapX, ''), 0.15));
}

// ─── Main render ─────────────────────────────────────────────────────────────
export function renderLobster(t: Traits): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(W * H * 4);
  const mut = MUTATIONS[t.mutation] ?? MUTATIONS[0];
  const sc = SCENES[t.scene] ?? SCENES[0];
  const isCalico = t.mutation === 5 || t.mutation === 6;
  const B = h2r(mut.b), S = h2r(mut.s);
  const B2 = (mut as any).b2 ? h2r((mut as any).b2) : B;
  const S2 = (mut as any).s2 ? h2r((mut as any).s2) : S;

  const shell = (x: number, zone: string): RGB => {
    const left = !isCalico || x < 20;
    const base = left ? B : B2;
    if (zone === 'h') return lt(base, 0.28);
    if (zone === 's') return dk(base, 0.28);
    if (zone === 'd') return dk(base, 0.14);
    return base;
  };

  // 1. FLOOR
  drawFloor(buf, sc);

  // Body shadow
  for (let y = 17; y <= 49; y++) for (let x = 10; x <= 29; x++) {
    const dx = (x - 19.5) / 10, dy = (y - 33) / 17;
    if (dx * dx + dy * dy < 1.0) {
      const i = (y * W + x) * 4;
      buf[i] = Math.max(0, buf[i] - 20);
      buf[i + 1] = Math.max(0, buf[i + 1] - 20);
      buf[i + 2] = Math.max(0, buf[i + 2] - 20);
    }
  }

  // 2. LEGS
  const legC = dk(shell(15, 's'), 0.08);
  [[12,24,3,18],[12,27,1,24],[12,30,1,30],[12,33,3,36]]
    .forEach(([x0, y0, x1, y1]) => ln(buf, x0, y0, x1, y1, legC));
  [[27,24,36,18],[27,27,38,24],[27,30,38,30],[27,33,36,36]]
    .forEach(([x0, y0, x1, y1]) => ln(buf, x0, y0, x1, y1, legC));

  // 3. TAIL FAN
  const fanSpread = t.tailVariant === 1 ? 2 : 0;
  [[10 - fanSpread, 51],[15, 51],[20, 52],[25, 51],[30 + fanSpread, 51]]
    .forEach(([cx, cy]) => {
      ov(buf, cx, cy, 3, 2, (_nx, ny, x) => shell(x, ny > 0 ? 's' : ''));
    });
  fr(buf, 17, 49, 22, 50, shell(20, 's'));

  // 4. ABDOMEN SEGMENTS
  for (let i = 0; i < 5; i++) {
    const y = 33 + i * 4, x1 = 15 + i, x2 = 24 - i;
    for (let row = y; row <= y + 3; row++)
      for (let x = x1; x <= x2; x++)
        sp(buf, x, row, shell(x, row === y ? 'h' : row === y + 3 ? 's' : ''));
    if (i < 4) for (let x = x1; x <= x2; x++) sp(buf, x, y + 4, dk(shell(x, ''), 0.22));
    sp(buf, x1, y + 1, dk(shell(x1, ''), 0.18));
    sp(buf, x2, y + 1, dk(shell(x2, ''), 0.18));
  }

  // 5. CARAPACE
  ov(buf, 20, 25, 10, 8, (nx, ny, x) => {
    if (ny < -0.5) return shell(x, 'h');
    if (ny > 0.45) return shell(x, 's');
    if (Math.abs(nx) > 0.8) return shell(x, 'd');
    return shell(x, '');
  });
  for (let y = 18; y <= 32; y++) sp(buf, 20, y, dk(shell(20, ''), 0.12));
  for (let x = 15; x <= 24; x++) sp(buf, x, 32, dk(shell(x, ''), 0.2));

  // 6. HEAD + ROSTRUM
  ov(buf, 20, 18, 6, 4, (nx, ny, x) => {
    if (ny < -0.4) return shell(x, 'h');
    if (ny > 0.3) return shell(x, 's');
    return shell(x, '');
  });
  [[20,13,''],[19,14,''],[20,14,'h'],[21,14,''],[19,15,''],[20,15,'h'],[21,15,''],[20,12,'h']]
    .forEach(([x, y, z]) => sp(buf, +x, +y, shell(+x, z as string)));

  // 7. CHELIPEDS
  fr(buf, 12, 15, 15, 19, shell(13, ''));
  for (let y = 15; y <= 19; y++) {
    sp(buf, 12, y, shell(12, 's'));
    sp(buf, 15, y, shell(15, 's'));
    sp(buf, 13, y, shell(13, y === 15 ? 'h' : ''));
  }
  fr(buf, 24, 15, 27, 19, shell(26, ''));
  for (let y = 15; y <= 19; y++) {
    sp(buf, 27, y, shell(27, 's'));
    sp(buf, 24, y, shell(24, 's'));
    sp(buf, 26, y, shell(26, y === 15 ? 'h' : ''));
  }

  // 8. CLAWS
  const scaleMap = { left: [1, 1.5, 0.7, 0.9, 2.0, 0.5], right: [1, 0.7, 1.5, 0.9, 0.8, 1.0] };
  drawClaw(buf, 'left',  scaleMap.left[t.claws]  ?? 1, shell);
  drawClaw(buf, 'right', scaleMap.right[t.claws] ?? 1, shell);

  // 9. MARKINGS
  const irid = lt(B, 0.5), mkC = dk(shell(20, 's'), 0.18);
  switch (t.marking) {
    case 1: [[17,22],[21,25],[23,21],[16,28],[24,26],[19,21],[20,29]]
      .forEach(([x, y]) => sp(buf, x, y, mkC)); break;
    case 2: [22, 26, 30].forEach(sy => {
      for (let x = 12; x <= 28; x++) {
        const dx = (x - 20) / 10, dy = (sy - 25) / 9;
        if (dx * dx + dy * dy < 1) sp(buf, x, sy, mkC);
      }
    }); break;
    case 3: for (let i = 0; i < 16; i++) {
      const x = 11 + i, y = 20 + Math.floor(i * 0.6);
      sp(buf, x, y, mix(shell(x, ''), irid, 0.55));
    } break;
    case 4:
      [[15,22],[16,23],[15,23],[16,22]].forEach(([x, y]) => sp(buf, x, y, dk(S, 0.5)));
      [[24,27],[25,26],[25,28],[26,27]].forEach(([x, y]) => sp(buf, x, y, dk(S, 0.5)));
      break;
    case 5: for (let i = 0; i < 5; i++) {
      const y = 33 + i * 4, x1 = 15 + i, x2 = 24 - i;
      for (let x = x1; x <= x2; x++) sp(buf, x, y, mkC);
    } break;
    case 6: [[16,21],[20,23],[23,21],[15,27],[22,28],[18,25],[24,25]].forEach(([x, y]) => {
      sp(buf, x, y, mkC); sp(buf, x + 1, y, mkC); sp(buf, x, y + 1, mkC);
    }); break;
    case 7: for (let y = 19; y <= 31; y++) for (let x = 11; x <= 28; x++) {
      if ((x + y) % 2 === 0) {
        const dx = (x - 20) / 10, dy = (y - 25) / 9;
        if (dx * dx + dy * dy < 1) sp(buf, x, y, mix(shell(x, ''), irid, 0.38));
      }
    } break;
  }

  // 10. ANTENNAE
  const antC = dk(shell(20, 's'), 0.1);
  ln(buf, 18, 14, t.brokenAntenna ? 12 : 6, t.brokenAntenna ? 8 : 0, antC);
  ln(buf, 22, 14, 31, 0, antC);

  // 11. EYES
  const EG = h2r("#30E060"), EB = h2r("#2878F0"), VOID: RGB = [4, 4, 4];
  if (t.eyes === 3) {
    ov(buf, 20, 17, 2, 2, (nx, ny) =>
      nx * nx + ny * ny < 0.22 ? [12, 8, 6] as RGB : [28, 18, 10] as RGB);
    sp(buf, 19, 16, lt([28, 18, 10] as RGB, 0.4));
  } else if (t.eyes === 4) {
    [16, 23].forEach(ex => {
      fr(buf, ex - 1, 16, ex + 1, 18, VOID);
      [ex - 2, ex + 2].forEach(nx => sp(buf, nx, 17, dk(shell(nx, 's'), 0.4)));
      sp(buf, ex, 15, dk(shell(ex, 's'), 0.35));
      sp(buf, ex, 19, dk(shell(ex, 's'), 0.35));
    });
  } else if (t.eyes === 5) {
    const LC = h2r("#FF2808"), LG = h2r("#FF8820");
    [16, 23].forEach((ex, ei) => {
      fr(buf, ex - 1, 18, ex + 1, 19, dk(shell(ex, 's'), 0.1));
      fr(buf, ex - 1, 16, ex + 1, 18, LC);
      sp(buf, ex, 16, lt(LC, 0.4));
      for (let y = 0; y <= 15; y++) {
        const fade = y / 15;
        sp(buf, ex, 15 - y, mix(LC, LG, fade));
        sp(buf, ex + (ei === 0 ? -1 : 1), 15 - y, mix(LG, h2r(sc.fl), 0.5 + fade * 0.4));
      }
    });
  } else if (t.eyes === 6) {
    const NF = h2r("#2040E0"), NB = h2r("#080818");
    fr(buf, 12, 15, 17, 19, NF); fr(buf, 13, 16, 16, 18, NB);
    fr(buf, 21, 15, 26, 19, NF); fr(buf, 22, 16, 25, 18, NB);
    fr(buf, 18, 17, 20, 17, NF);
    fr(buf, 11, 17, 12, 17, NF);
    fr(buf, 26, 17, 27, 17, NF);
    sp(buf, 13, 16, lt(NB, 0.25));
    sp(buf, 22, 16, lt(NB, 0.25));
  } else {
    const gc = t.eyes === 1 ? EG : t.eyes === 2 ? EB : null;
    const ic: RGB = gc ?? [20, 12, 8];
    [16, 23].forEach((ex, ei) => {
      fr(buf, ex - 1, 18, ex + 1, 19, dk(shell(ex, 's'), 0.1));
      fr(buf, ex - 1, 16, ex + 1, 18, ic);
      sp(buf, ex - 1 + (ei === 0 ? 1 : 0), 16, lt(ic, 0.42));
      if (gc) {
        const gd = mix(h2r(sc.fl), gc, 0.35);
        sp(buf, ex - 2, 17, gd); sp(buf, ex + 2, 17, gd);
        sp(buf, ex, 15, gd); sp(buf, ex, 19, gd);
        sp(buf, ex - 1, 15, mix(gd, h2r(sc.fl), 0.5));
        sp(buf, ex + 1, 15, mix(gd, h2r(sc.fl), 0.5));
      }
    });
  }

  // 12. ACCESSORIES
  const GOLD = h2r("#D4A820"), BLK = h2r("#141414"), WHT = h2r("#E8E4DC"), RED = h2r("#C82820");
  switch (t.accessory) {
    case 1:
      fr(buf, 13, 9, 26, 10, BLK); fr(buf, 15, 6, 24, 9, BLK); fr(buf, 17, 5, 22, 6, BLK);
      sp(buf, 19, 7, WHT); sp(buf, 20, 7, WHT); sp(buf, 19, 8, WHT); sp(buf, 18, 8, WHT); sp(buf, 21, 8, WHT);
      for (let x = 15; x <= 24; x++) sp(buf, x, 9, mix(BLK, WHT, 0.14));
      break;
    case 2:
      fr(buf, 16, 10, 23, 11, GOLD);
      [17, 22, 15, 24].forEach(x => sp(buf, x, 9, GOLD));
      sp(buf, 19, 8, GOLD); sp(buf, 20, 8, GOLD);
      sp(buf, 19, 10, RED); sp(buf, 21, 10, RED);
      for (let x = 16; x <= 23; x++) sp(buf, x, 10, lt(GOLD, 0.18));
      break;
    case 3:
      fr(buf, 13, 16, 17, 18, BLK);
      ln(buf, 18, 16, 22, 14, BLK);
      sp(buf, 14, 16, mix(BLK, WHT, 0.12));
      break;
    case 4: {
      const BC = h2r("#B0A888");
      [[18,21],[22,20],[16,25],[24,27],[20,23]].forEach(([x, y]) => {
        fr(buf, x, y, x + 1, y + 1, BC);
        sp(buf, x + 1, y + 1, dk(BC, 0.3));
        sp(buf, x, y, lt(BC, 0.12));
      });
      break;
    }
    case 5:
      ov(buf, 7, 11, 2, 2, (_nx, ny) => ny < 0 ? lt(GOLD, 0.2) : dk(GOLD, 0.15));
      sp(buf, 7, 11, mix(GOLD, [200, 160, 0] as RGB, 0.6));
      sp(buf, 6, 10, lt(GOLD, 0.3));
      break;
    case 6:
      fr(buf, 12, 7, 27, 9, BLK); fr(buf, 15, 5, 24, 7, BLK); fr(buf, 17, 4, 22, 5, BLK);
      for (let x = 12; x <= 27; x++) sp(buf, x, 7, GOLD);
      for (let x = 15; x <= 24; x++) sp(buf, x, 5, dk(GOLD, 0.3));
      sp(buf, 13, 6, h2r("#E8E0D0")); sp(buf, 12, 5, h2r("#F0EAE0"));
      sp(buf, 11, 4, h2r("#F4EEE4")); sp(buf, 10, 3, h2r("#F8F4F0"));
      break;
    case 7:
      ov(buf, 32, 11, 2, 2, (nx, ny) =>
        mix([215, 210, 205] as RGB, [242, 240, 238] as RGB, (1 - (nx * nx + ny * ny)) * 0.65 + 0.35));
      sp(buf, 31, 10, h2r("#F8F6F4"));
      break;
    case 8: {
      const RAINBOW: RGB[] = [
        h2r("#FF2020"), h2r("#FF8C00"), h2r("#FFE020"), h2r("#20D020"),
        h2r("#2090FF"), h2r("#A020FF"), h2r("#FF40CC"),
      ];
      for (let step = 0; step < 12; step++) {
        const y = 11 - step;
        if (y < 0) break;
        const spread = step * 1.4;
        const lx = Math.round(20 - spread), rc = RAINBOW[step % 7];
        sp(buf, lx, y, rc);
        sp(buf, lx - 1, y, mix(rc, RAINBOW[(step + 1) % 7], 0.5));
        const rx = Math.round(20 + spread), rc2 = RAINBOW[(step + 3) % 7];
        sp(buf, rx, y, rc2);
        sp(buf, rx + 1, y, mix(rc2, RAINBOW[(step + 4) % 7], 0.5));
        if (step < 6) sp(buf, 20, y, RAINBOW[(step + 1) % 7]);
      }
      [[18,12,0],[19,12,1],[20,11,2],[21,12,3],[22,12,4]]
        .forEach(([x, y, ci]) => sp(buf, x, y, RAINBOW[ci]));
      break;
    }
    case 9: {
      const GC = h2r("#D4A820"), GD = h2r("#A07810"), GL = h2r("#F0CC50");
      const chainY = (x: number) => Math.round(28 + Math.sin((x - 20) / 8 * Math.PI) * 1.5);
      for (let x = 12; x <= 28; x++) {
        const y = chainY(x);
        const isLink = x % 3 === 0;
        sp(buf, x, y, isLink ? GL : GC);
        sp(buf, x, y + 1, isLink ? GC : GD);
        if (x === 20) {
          sp(buf, 20, y + 2, GL); sp(buf, 20, y + 3, GC);
          ov(buf, 20, y + 5, 2, 2, (_nx, ny) => ny < 0 ? lt(GC, 0.2) : dk(GC, 0.2));
          sp(buf, 20, y + 4, mix(GC, GL, 0.6));
        }
      }
      break;
    }
    case 10: {
      const BH = h2r("#E05080");
      [[13,23],[14,24],[13,24],[14,23],[12,24]]
        .forEach(([x, y]) => sp(buf, x, y, mix(BH, h2r(sc.fl), 0.35)));
      sp(buf, 13, 23, mix(BH, h2r(sc.fl), 0.2));
      [[26,23],[27,24],[26,24],[27,23],[28,24]]
        .forEach(([x, y]) => sp(buf, x, y, mix(BH, h2r(sc.fl), 0.35)));
      sp(buf, 27, 23, mix(BH, h2r(sc.fl), 0.2));
      break;
    }
  }

  return buf;
}

// ─── Canvas output ───────────────────────────────────────────────────────────
export function drawToCanvas(canvas: HTMLCanvasElement | null, traits: Traits) {
  if (!canvas) return;
  const buf = renderLobster(traits);
  const id = new ImageData(buf, W, H);
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  off.getContext('2d')!.putImageData(id, 0, 0);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
}
