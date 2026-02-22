// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TraitDecode} from "./TraitDecode.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Renders a 40×52 pixel lobster as an SVG string from a Traits struct.
/// Mirrors lib/renderer.ts exactly — same rendering order, same color math.
/// Colors are derived at runtime from mutation index; no per-token storage needed.
library PixelRenderer {
    using Strings for uint256;

    uint256 constant W = 40;
    uint256 constant H = 52;
    uint256 constant PX = 10; // Each logical pixel = 10×10 SVG units → 400×520 viewport

    // ─── Color structs ────────────────────────────────────────────────────────
    struct RGB { uint8 r; uint8 g; uint8 b; }

    struct Palette {
        RGB base;     // shell base (A)
        RGB shadow;   // shell shadow (B)
        RGB hilight;  // shell highlight (C)
        RGB base2;    // calico right side (A2)
        RGB shadow2;  // calico right side (B2)
        RGB floorCol; // scene floor primary
        bool isCalico;
    }

    // ─── Pixel buffer ─────────────────────────────────────────────────────────
    // Each byte in the buffer stores packed (r,g,b) via indices into Palette.
    // We use a flat bytes array of W*H*3 for RGB, skip alpha in gas-sensitive path.
    // Packed pixel: 24-bit RGB in uint24, stored in a uint24[40*52] conceptually.
    // We use bytes (W*H*3) since Solidity won't let us do uint24 array cheaply.

    // ─── Math helpers ─────────────────────────────────────────────────────────
    function _mix(RGB memory a, RGB memory b, uint256 t_num, uint256 t_den) private pure returns (RGB memory) {
        return RGB(
            uint8((uint256(a.r) * (t_den - t_num) + uint256(b.r) * t_num) / t_den),
            uint8((uint256(a.g) * (t_den - t_num) + uint256(b.g) * t_num) / t_den),
            uint8((uint256(a.b) * (t_den - t_num) + uint256(b.b) * t_num) / t_den)
        );
    }
    function _dk(RGB memory c, uint256 num, uint256 den) private pure returns (RGB memory) {
        return RGB(
            uint8(uint256(c.r) * (den - num) / den),
            uint8(uint256(c.g) * (den - num) / den),
            uint8(uint256(c.b) * (den - num) / den)
        );
    }
    function _lt(RGB memory c, uint256 num, uint256 den) private pure returns (RGB memory) {
        return RGB(
            uint8(255 - (uint256(255 - c.r) * (den - num) / den)),
            uint8(255 - (uint256(255 - c.g) * (den - num) / den)),
            uint8(255 - (uint256(255 - c.b) * (den - num) / den))
        );
    }
    function _eq(RGB memory a, RGB memory b) private pure returns (bool) {
        return a.r == b.r && a.g == b.g && a.b == b.b;
    }
    function _hex3(RGB memory c) private pure returns (bytes memory) {
        bytes memory h = new bytes(6);
        bytes memory charset = "0123456789ABCDEF";
        h[0] = charset[c.r >> 4]; h[1] = charset[c.r & 0xF];
        h[2] = charset[c.g >> 4]; h[3] = charset[c.g & 0xF];
        h[4] = charset[c.b >> 4]; h[5] = charset[c.b & 0xF];
        return h;
    }

    // ─── Mutation color table ─────────────────────────────────────────────────
    function _mutationColors(uint8 m) private pure returns (RGB memory b, RGB memory s, RGB memory b2, RGB memory s2) {
        if (m == 0) { b = RGB(200, 72, 32);  s = RGB(122, 44, 16);  b2 = b; s2 = s; }
        else if (m == 1) { b = RGB(26,  78,140);  s = RGB(12, 46, 88);  b2 = b; s2 = s; }
        else if (m == 2) { b = RGB(30,  30, 42);  s = RGB(12, 12, 20);  b2 = b; s2 = s; }
        else if (m == 3) { b = RGB(228,216,192); s = RGB(184,168,136); b2 = b; s2 = s; }
        else if (m == 4) { b = RGB(200,160, 20);  s = RGB(122, 94,  8); b2 = b; s2 = s; }
        else if (m == 5) { b = RGB(200, 72, 32);  s = RGB(122, 44, 16); b2 = RGB(26, 78,140); s2 = RGB(12, 46, 88); }
        else if (m == 6) { b = RGB(224,144,180); s = RGB(184, 96,144); b2 = RGB(136,180,232); s2 = RGB(96,144,200); }
        else             { b = RGB(138, 58, 24);  s = RGB( 74, 28,  8); b2 = b; s2 = s; }
    }

    // ─── Floor colors ─────────────────────────────────────────────────────────
    function _sceneFloor(uint8 scene) private pure returns (RGB memory fl) {
        if      (scene == 0) fl = RGB(10, 24, 40);
        else if (scene == 1) fl = RGB( 7, 20, 16);
        else if (scene == 2) fl = RGB(12,  6, 20);
        else if (scene == 3) fl = RGB( 5,  2,  2);
        else if (scene == 4) fl = RGB(16, 12,  6);
        else if (scene == 5) fl = RGB(160,120, 74);
        else if (scene == 6) fl = RGB(42, 32, 20);
        else                 fl = RGB( 0,  0,  0);
    }

    // ─── Shell color for pixel x, zone ────────────────────────────────────────
    // zone: 0=base, 1=highlight, 2=shadow, 3=dark
    function _shell(Palette memory pal, uint256 x, uint8 zone) private pure returns (RGB memory) {
        bool left = !pal.isCalico || x < 20;
        RGB memory base   = left ? pal.base   : pal.base2;
        if (zone == 1) return _lt(base, 28, 100);
        if (zone == 2) return _dk(base, 28, 100);
        if (zone == 3) return _dk(base, 14, 100);
        return base;
    }

    // ─── Pixel buffer ops ─────────────────────────────────────────────────────
    // Buffer: W*H entries, each = packed uint24 RGB. 0xFFFFFF = transparent sentinel.
    uint24 constant TRANSPARENT = 0xFFFFFF;

    function _sp(uint24[] memory buf, int256 x, int256 y, RGB memory c) private pure {
        if (x < 0 || x >= int256(W) || y < 0 || y >= int256(H)) return;
        buf[uint256(y) * W + uint256(x)] = (uint24(c.r) << 16) | (uint24(c.g) << 8) | uint24(c.b);
    }
    function _fr(uint24[] memory buf, int256 x1, int256 y1, int256 x2, int256 y2, RGB memory c) private pure {
        for (int256 y = y1; y <= y2; y++) for (int256 x = x1; x <= x2; x++) _sp(buf, x, y, c);
    }
    // Bresenham line
    function _ln(uint24[] memory buf, int256 x0, int256 y0, int256 x1, int256 y1, RGB memory c) private pure {
        int256 dx = x0 < x1 ? x1 - x0 : x0 - x1;
        int256 sx = x0 < x1 ? int256(1) : -1;
        int256 dy = -(y0 < y1 ? y1 - y0 : y0 - y1);
        int256 sy = y0 < y1 ? int256(1) : -1;
        int256 err = dx + dy;
        for (;;) {
            _sp(buf, x0, y0, c);
            if (x0 == x1 && y0 == y1) break;
            int256 e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    }

    // ─── Main render entry ────────────────────────────────────────────────────
    function render(TraitDecode.Traits memory t) internal pure returns (string memory) {
        uint24[] memory buf = new uint24[](W * H);
        // Init transparent
        for (uint256 i = 0; i < W * H; i++) buf[i] = TRANSPARENT;

        Palette memory pal;
        {
            (RGB memory b, RGB memory s, RGB memory b2, RGB memory s2) = _mutationColors(t.mutation);
            pal.base     = b;
            pal.shadow   = s;
            pal.base2    = b2;
            pal.shadow2  = s2;
            pal.hilight  = _lt(b, 28, 100);
            pal.floorCol = _sceneFloor(t.scene);
            pal.isCalico = (t.mutation == 5 || t.mutation == 6);
        }

        _renderFloor(buf, t.scene, pal);
        _renderBodyShadow(buf, pal);
        _renderLegs(buf, pal);
        _renderTail(buf, t.tailVariant, pal);
        _renderAbdomen(buf, pal);
        _renderCarapace(buf, pal);
        _renderHead(buf, pal);
        _renderChelipeds(buf, pal);
        _renderClaws(buf, t.claws, pal);
        _renderMarkings(buf, t.marking, pal);
        _renderAntennae(buf, t.brokenAntenna, pal);
        _renderEyes(buf, t.eyes, t.scene, pal);
        _renderAccessory(buf, t.accessory, pal);

        return _bufToSVG(buf);
    }

    // ─── Floor ───────────────────────────────────────────────────────────────
    function _renderFloor(uint24[] memory buf, uint8 scene, Palette memory pal) private pure {
        RGB memory fl = pal.floorCol;
        // Fill with simple flat floor color (vignette approximated in SVG would be too expensive)
        for (uint256 y = 0; y < H; y++) {
            for (uint256 x = 0; x < W; x++) {
                // Vignette: darken edges — approximate with 3 zones
                uint256 cx = x < W / 2 ? W / 2 - x : x - W / 2;
                uint256 cy = y < H / 2 ? H / 2 - y : y - H / 2;
                // Normalized distance squared * 100
                uint256 d2 = (cx * cx * 400) / (W * W / 4) + (cy * cy * 400) / (H * H / 4);
                RGB memory px;
                if (d2 > 300)      px = _dk(fl, 50, 100);
                else if (d2 > 150) px = _dk(fl, 25, 100);
                else               px = fl;
                _sp(buf, int256(x), int256(y), px);
            }
        }

        // Scene-specific decorations
        if (scene == 0) _floorBubbles(buf, pal);
        else if (scene == 1) _floorKelp(buf, pal);
        else if (scene == 2) _floorCoral(buf, pal);
        else if (scene == 3) _floorVent(buf, pal);
        else if (scene == 4) _floorPlanks(buf, pal);
        else if (scene == 5) _floorStarfish(buf, pal);
        else if (scene == 6) _floorRocks(buf, pal);
        // scene 7 = The Abyss, no decoration
    }

    function _floorBubbles(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory fl = pal.floorCol;
        int256[28] memory pts;
        pts[0]=3;pts[1]=4;pts[2]=7;pts[3]=8;pts[4]=15;pts[5]=3;pts[6]=28;pts[7]=6;
        pts[8]=37;pts[9]=4;pts[10]=2;pts[11]=18;pts[12]=36;pts[13]=14;
        pts[14]=5;pts[15]=38;pts[16]=33;pts[17]=42;pts[18]=38;pts[19]=30;
        pts[20]=1;pts[21]=46;pts[22]=9;pts[23]=26;pts[24]=24;pts[25]=2;pts[26]=32;pts[27]=22;
        for (uint256 i = 0; i < 14; i++) {
            int256 x = pts[i*2]; int256 y = pts[i*2+1];
            RGB memory c = _lt(fl, 45, 100);
            _sp(buf, x, y, c);
            _sp(buf, x+1, y, _lt(c, 20, 100));
            if (y > 0) _sp(buf, x, y-1, _lt(c, 15, 100));
        }
    }

    function _floorKelp(uint24[] memory buf, Palette memory pal) private pure {
        // Simplified kelp: vertical strands with slight wave
        RGB memory fl = pal.floorCol;
        uint256[6] memory kxs = [uint256(2),6,10,30,35,39];
        for (uint256 ki = 0; ki < 6; ki++) {
            uint256 kx = kxs[ki];
            for (uint256 y = 0; y < H; y++) {
                // Simple wave: shift by ±1 based on y parity
                int256 wx = (y % 3 == 0) ? int256(1) : (y % 3 == 1) ? int256(0) : -1;
                int256 px = int256(kx) + wx;
                if (px >= 0 && px < int256(W)) {
                    _sp(buf, px, int256(y), _lt(fl, 10, 100));
                }
            }
        }
    }

    function _floorCoral(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory cc = RGB(138, 32, 16);
        int256[24] memory corals;
        corals[0]=4;corals[1]=48;corals[2]=4;corals[3]=10;
        corals[4]=8;corals[5]=44;corals[6]=3;corals[7]=8;
        corals[8]=36;corals[9]=48;corals[10]=3;corals[11]=9;
        corals[12]=33;corals[13]=44;corals[14]=4;corals[15]=10;
        corals[16]=18;corals[17]=50;corals[18]=5;corals[19]=5;
        corals[20]=22;corals[21]=50;corals[22]=5;corals[23]=5;
        for (uint256 i = 0; i < 6; i++) {
            int256 cx = corals[i*4]; int256 cy = corals[i*4+1];
            int256 rx = corals[i*4+2]; int256 h  = corals[i*4+3];
            for (int256 r = cy - h; r <= cy; r++) {
                if (r < 0 || r >= int256(H)) continue;
                // ellipse width at this height
                int256 rel = r - cy + h;
                int256 wid = rx * rel / h; // approximation
                for (int256 x = cx - wid; x <= cx + wid; x++) {
                    if (x < 0 || x >= int256(W)) continue;
                    uint256 fade = uint256((r - (cy - h)) * 50 / (h > 0 ? h : int256(1)));
                    _sp(buf, x, r, _dk(cc, fade < 50 ? fade : 50, 100));
                }
            }
        }
    }

    function _floorVent(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory fl = pal.floorCol;
        RGB memory hc = RGB(122, 36, 8);
        int256[6] memory vents; vents[0]=20;vents[1]=40;vents[2]=8;vents[3]=45;vents[4]=33;vents[5]=42;
        for (uint256 i = 0; i < 3; i++) {
            int256 vx = vents[i*2]; int256 vy = vents[i*2+1];
            for (int256 y = vy; y < int256(H); y++) {
                int256 s2 = (y - vy) / 2;
                for (int256 x = vx - s2; x <= vx + s2; x++) {
                    if (x < 0 || x >= int256(W)) continue;
                    uint256 t = uint256((y - vy) * 100 / (int256(H) - vy));
                    _sp(buf, x, y, _mix(fl, hc, t, 100));
                }
            }
        }
    }

    function _floorPlanks(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory pl = RGB(58, 40, 8);
        RGB memory nail = RGB(24, 20, 16);
        int256[15] memory planks;
        planks[0]=5;planks[1]=30;planks[2]=36;planks[3]=3;planks[4]=36;
        planks[5]=32;planks[6]=10;planks[7]=42;planks[8]=38;planks[9]=0;
        planks[10]=14;planks[11]=22;planks[12]=18;planks[13]=6;planks[14]=39;
        for (uint256 i = 0; i < 5; i++) {
            int256 x1 = planks[i*3]; int256 y1 = planks[i*3+1]; int256 x2 = planks[i*3+2];
            for (int256 x = x1; x <= x2; x++) {
                _sp(buf, x, y1, pl);
                _sp(buf, x, y1+1, _dk(pl, 20, 100));
            }
            _sp(buf, x1+2, y1, nail); _sp(buf, x2-2, y1, nail);
        }
    }

    function _floorStarfish(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory sf = RGB(208, 64, 24);
        int256[4] memory stars; stars[0]=5;stars[1]=47;stars[2]=34;stars[3]=44;
        for (uint256 i = 0; i < 2; i++) {
            int256 sx = stars[i*2]; int256 sy = stars[i*2+1];
            _sp(buf, sx, sy, sf);   _sp(buf, sx+1, sy, sf);
            _sp(buf, sx-1, sy, sf); _sp(buf, sx, sy-1, sf);
            _sp(buf, sx, sy+1, sf); _sp(buf, sx+2, sy+1, _dk(sf, 30, 100));
        }
    }

    function _floorRocks(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory fl = pal.floorCol;
        // Simple oval rocks
        int256[24] memory rocks;
        rocks[0]=5;rocks[1]=48;rocks[2]=4;rocks[3]=2;
        rocks[4]=16;rocks[5]=50;rocks[6]=5;rocks[7]=2;
        rocks[8]=35;rocks[9]=47;rocks[10]=4;rocks[11]=2;
        rocks[12]=3;rocks[13]=8;rocks[14]=3;rocks[15]=2;
        rocks[16]=37;rocks[17]=10;rocks[18]=4;rocks[19]=2;
        rocks[20]=22;rocks[21]=4;rocks[22]=3;rocks[23]=1;
        for (uint256 i = 0; i < 6; i++) {
            int256 cx = rocks[i*4]; int256 cy = rocks[i*4+1];
            int256 rx = rocks[i*4+2]; int256 ry = rocks[i*4+3];
            for (int256 y = cy - ry; y <= cy + ry; y++) {
                for (int256 x = cx - rx; x <= cx + rx; x++) {
                    if (x < 0 || x >= int256(W) || y < 0 || y >= int256(H)) continue;
                    // Oval check
                    int256 dx2 = (x - cx) * (x - cx) * 100 / (rx * rx + 1);
                    int256 dy2 = (y - cy) * (y - cy) * 100 / (ry * ry + 1);
                    if (dx2 + dy2 <= 100) {
                        _sp(buf, x, y, _dk(fl, 40, 100));
                    }
                }
            }
        }
    }

    // ─── Body shadow ──────────────────────────────────────────────────────────
    function _renderBodyShadow(uint24[] memory buf, Palette memory pal) private pure {
        // Darken floor pixels in elliptical region under body
        for (uint256 y = 17; y <= 49; y++) {
            for (uint256 x = 10; x <= 29; x++) {
                // Normalized distance (×100 to avoid floats)
                int256 dx = (int256(x) * 100 - 1950) * 100 / 1000; // (x-19.5)/10 *100
                int256 dy = (int256(y) * 100 - 3300) * 100 / 1700; // (y-33)/17 *100
                // dx²+dy² < 10000 (= 1.0 in fixed point)
                if (dx*dx/100 + dy*dy/100 < 10000) {
                    uint256 idx = y * W + x;
                    if (buf[idx] != TRANSPARENT) {
                        uint8 r = uint8(buf[idx] >> 16);
                        uint8 g = uint8(buf[idx] >> 8);
                        uint8 b = uint8(buf[idx]);
                        buf[idx] = (uint24(r > 20 ? r - 20 : 0) << 16)
                                 | (uint24(g > 20 ? g - 20 : 0) << 8)
                                 |  uint24(b > 20 ? b - 20 : 0);
                    }
                }
            }
        }
    }

    // ─── Legs ────────────────────────────────────────────────────────────────
    function _renderLegs(uint24[] memory buf, Palette memory pal) private pure {
        RGB memory legC = _dk(_shell(pal, 15, 2), 8, 100);
        // Left legs
        _ln(buf,12,24, 3,18, legC); _ln(buf,12,27, 1,24, legC);
        _ln(buf,12,30, 1,30, legC); _ln(buf,12,33, 3,36, legC);
        // Right legs
        _ln(buf,27,24,36,18, legC); _ln(buf,27,27,38,24, legC);
        _ln(buf,27,30,38,30, legC); _ln(buf,27,33,36,36, legC);
    }

    // ─── Tail fan ────────────────────────────────────────────────────────────
    function _renderTail(uint24[] memory buf, uint8 variant, Palette memory pal) private pure {
        int256 spread = variant == 1 ? int256(2) : int256(0);
        int256[10] memory fans;
        fans[0]=10-spread;fans[1]=51;fans[2]=15;fans[3]=51;fans[4]=20;
        fans[5]=52;fans[6]=25;fans[7]=51;fans[8]=30+spread;fans[9]=51;
        for (uint256 i = 0; i < 5; i++) {
            int256 cx = fans[i*2]; int256 cy = fans[i*2+1];
            // Oval uropod
            for (int256 dy2 = -2; dy2 <= 2; dy2++) {
                for (int256 dx2 = -3; dx2 <= 3; dx2++) {
                    // Simple oval: dx²/9 + dy²/4 ≤ 1 → dx²*4 + dy²*9 ≤ 36
                    if (dx2*dx2*4 + dy2*dy2*9 <= 36*2) {
                        _sp(buf, cx+dx2, cy+dy2, _shell(pal, cx+dx2 < 0 ? uint256(0) : uint256(cx+dx2), dy2 > 0 ? 2 : 0));
                    }
                }
            }
        }
        _fr(buf, 17, 49, 22, 50, _shell(pal, 20, 2));
    }

    // ─── Abdomen ─────────────────────────────────────────────────────────────
    function _renderAbdomen(uint24[] memory buf, Palette memory pal) private pure {
        for (uint256 i = 0; i < 5; i++) {
            uint256 y = 33 + i * 4;
            uint256 x1 = 15 + i; uint256 x2 = 24 - i;
            for (uint256 row = y; row <= y + 3; row++) {
                for (uint256 x = x1; x <= x2; x++) {
                    uint8 zone = row == y ? 1 : (row == y + 3 ? 2 : 0);
                    _sp(buf, int256(x), int256(row), _shell(pal, x, zone));
                }
            }
            if (i < 4) {
                for (uint256 x = x1; x <= x2; x++)
                    _sp(buf, int256(x), int256(y+4), _dk(_shell(pal, x, 0), 22, 100));
            }
            _sp(buf, int256(x1), int256(y+1), _dk(_shell(pal, x1, 0), 18, 100));
            _sp(buf, int256(x2), int256(y+1), _dk(_shell(pal, x2, 0), 18, 100));
        }
    }

    // ─── Carapace ────────────────────────────────────────────────────────────
    function _renderCarapace(uint24[] memory buf, Palette memory pal) private pure {
        // Oval cx=20,cy=25,rx=10,ry=8
        for (int256 y = 16; y <= 34; y++) {
            for (int256 x = 9; x <= 31; x++) {
                int256 nx100 = (x * 100 + 50 - 2000) * 100 / 1000; // (x+.5-20)/10 *100
                int256 ny100 = (y * 100 + 50 - 2500) * 100 / 800;  // (y+.5-25)/8 *100
                // Check if inside oval: nx²+ny² ≤ 10000
                if (nx100*nx100/100 + ny100*ny100/100 <= 10000) {
                    uint8 zone;
                    if (ny100 < -5000)      zone = 1; // highlight top
                    else if (ny100 > 4500)  zone = 2; // shadow bottom
                    else if (nx100 > 8000 || nx100 < -8000) zone = 3; // dark edges
                    else                   zone = 0;
                    _sp(buf, x, y, _shell(pal, x < 0 ? uint256(0) : uint256(x), zone));
                }
            }
        }
        // Center ridge
        for (uint256 y = 18; y <= 32; y++)
            _sp(buf, 20, int256(y), _dk(_shell(pal, 20, 0), 12, 100));
        // Bottom edge
        for (uint256 x = 15; x <= 24; x++)
            _sp(buf, int256(x), 32, _dk(_shell(pal, x, 0), 20, 100));
    }

    // ─── Head + rostrum ──────────────────────────────────────────────────────
    function _renderHead(uint24[] memory buf, Palette memory pal) private pure {
        // Oval cx=20,cy=18,rx=6,ry=4
        for (int256 y = 13; y <= 23; y++) {
            for (int256 x = 13; x <= 27; x++) {
                int256 nx100 = (x * 100 + 50 - 2000) * 100 / 600;
                int256 ny100 = (y * 100 + 50 - 1800) * 100 / 400;
                if (nx100*nx100/100 + ny100*ny100/100 <= 10000) {
                    uint8 zone = ny100 < -4000 ? 1 : (ny100 > 3000 ? 2 : 0);
                    _sp(buf, x, y, _shell(pal, x < 0 ? uint256(0) : uint256(x), zone));
                }
            }
        }
        // Rostrum pixels - (x, y, zone)
        _sp(buf,20,13,_shell(pal,20,0)); _sp(buf,19,14,_shell(pal,19,0));
        _sp(buf,20,14,_shell(pal,20,1)); _sp(buf,21,14,_shell(pal,21,0));
        _sp(buf,19,15,_shell(pal,19,0)); _sp(buf,20,15,_shell(pal,20,1));
        _sp(buf,21,15,_shell(pal,21,0)); _sp(buf,20,12,_shell(pal,20,1));
    }

    // ─── Chelipeds ───────────────────────────────────────────────────────────
    function _renderChelipeds(uint24[] memory buf, Palette memory pal) private pure {
        // Left
        _fr(buf, 12, 15, 15, 19, _shell(pal, 13, 0));
        for (int256 y = 15; y <= 19; y++) {
            _sp(buf, 12, y, _shell(pal, 12, 2));
            _sp(buf, 15, y, _shell(pal, 15, 2));
            _sp(buf, 13, y, _shell(pal, 13, y == 15 ? 1 : 0));
        }
        // Right
        _fr(buf, 24, 15, 27, 19, _shell(pal, 26, 0));
        for (int256 y = 15; y <= 19; y++) {
            _sp(buf, 27, y, _shell(pal, 27, 2));
            _sp(buf, 24, y, _shell(pal, 24, 2));
            _sp(buf, 26, y, _shell(pal, 26, y == 15 ? 1 : 0));
        }
    }

    // ─── Claws ───────────────────────────────────────────────────────────────
    function _renderClaws(uint24[] memory buf, uint8 claws, Palette memory pal) private pure {
        // Scale as fixed-point *100
        uint256[6] memory leftScale  = [uint256(100), 150,  70,  90, 200,  50];
        uint256[6] memory rightScale = [uint256(100),  70, 150,  90,  80, 100];
        uint256 ls = claws < 6 ? leftScale[claws]  : 100;
        uint256 rs = claws < 6 ? rightScale[claws] : 100;
        _drawClaw(buf, false, ls, pal); // left
        _drawClaw(buf, true,  rs, pal); // right
    }

    function _drawClaw(uint24[] memory buf, bool isR, uint256 scale100, Palette memory pal) private pure {
        int256 palmCX = isR ? int256(29) : int256(10);
        int256 palmCY = 10;
        uint256 palmW = scale100 * 6 / 100;
        if (palmW < 5) palmW = 5;
        uint256 palmH = scale100 * 2 / 100;
        if (palmH < 2) palmH = 2;

        int256 px1 = palmCX - int256(palmW / 2);
        int256 px2 = palmCX + int256(palmW / 2);
        int256 py1 = palmCY - int256(palmH / 2);
        int256 py2 = palmCY + int256(palmH / 2);

        int256 armSX = isR ? int256(25) : int256(14);
        _ln(buf, armSX, 16, palmCX, py2+1, _shell(pal, palmCX < 0 ? uint256(0) : uint256(palmCX), 2));
        _ln(buf, armSX, 15, palmCX, py2,   _shell(pal, palmCX < 0 ? uint256(0) : uint256(palmCX), 0));

        for (int256 y = py1; y <= py2; y++)
            for (int256 x = px1; x <= px2; x++)
                _sp(buf, x, y, _shell(pal, x < 0 ? uint256(0) : uint256(x), y == py1 ? 1 : (y == py2 ? 2 : 0)));

        int256 gapX = palmCX;
        uint256 fingerLen = scale100 * 6 / 100;
        if (fingerLen < 4) fingerLen = 4;

        int256 innerX1 = isR ? px1       : gapX + 1;
        int256 innerX2 = isR ? gapX - 1  : px2;
        int256 outerX1 = isR ? gapX + 1  : px1;
        int256 outerX2 = isR ? px2       : gapX - 1;

        _drawFinger(buf, pal, innerX1, innerX2, py1, fingerLen, isR ? false : true);
        _drawFinger(buf, pal, outerX1, outerX2, py1, fingerLen, isR ? true  : false);

        for (uint256 step = 0; step <= fingerLen; step++) {
            int256 fy = py1 - 1 - int256(step);
            if (fy < 0) break;
            _sp(buf, gapX, fy, _dk(_shell(pal, gapX < 0 ? uint256(0) : uint256(gapX), 2), 60, 100));
        }
        _sp(buf, px1, py1, _shell(pal, px1 < 0 ? uint256(0) : uint256(px1), 1));
        _sp(buf, px2, py1, _shell(pal, px2 < 0 ? uint256(0) : uint256(px2), 1));
        _sp(buf, gapX, py1, _dk(_shell(pal, gapX < 0 ? uint256(0) : uint256(gapX), 0), 15, 100));
    }

    function _drawFinger(
        uint24[] memory buf, Palette memory pal,
        int256 fx1, int256 fx2, int256 py1, uint256 fingerLen, bool taperInner
    ) private pure {
        int256 baseW = fx2 - fx1 + 1;
        if (baseW <= 0) return;
        for (uint256 step = 0; step <= fingerLen; step++) {
            int256 fy = py1 - 1 - int256(step);
            if (fy < 0) break;
            int256 taper = baseW * int256(fingerLen + 1 - step) / int256(fingerLen + 1);
            if (taper < 1) taper = 1;
            int256 lx = taperInner ? fx1 : fx2 - taper + 1;
            int256 rx = taperInner ? fx1 + taper - 1 : fx2;
            for (int256 x = lx; x <= rx; x++) {
                bool tip = step >= fingerLen - 1;
                bool top = step == 0;
                uint8 zone = tip ? 3 : (top ? 1 : (x == lx || x == rx ? 3 : 0));
                _sp(buf, x, fy, _shell(pal, x < 0 ? uint256(0) : uint256(x), zone));
            }
        }
    }

    // ─── Markings ────────────────────────────────────────────────────────────
    function _renderMarkings(uint24[] memory buf, uint8 marking, Palette memory pal) private pure {
        if (marking == 0) return;
        RGB memory mkC = _dk(_shell(pal, 20, 2), 18, 100);
        RGB memory irid = _lt(pal.base, 50, 100);

        if (marking == 1) { // Spotted
            _sp(buf,17,22,mkC);_sp(buf,21,25,mkC);_sp(buf,23,21,mkC);_sp(buf,16,28,mkC);
            _sp(buf,24,26,mkC);_sp(buf,19,21,mkC);_sp(buf,20,29,mkC);
        } else if (marking == 2) { // Striped
            uint256[3] memory srows = [uint256(22),26,30];
            for (uint256 si = 0; si < 3; si++) {
                uint256 sy = srows[si];
                for (uint256 x = 12; x <= 28; x++) {
                    int256 dx100 = (int256(x) - 20) * 10;
                    int256 dy100 = (int256(sy) - 25) * 10;
                    if (dx100*dx100 + dy100*dy100 <= 10000)
                        _sp(buf, int256(x), int256(sy), mkC);
                }
            }
        } else if (marking == 3) { // Iridescent
            for (uint256 i = 0; i < 16; i++) {
                uint256 x = 11 + i; uint256 y = 20 + i * 6 / 10;
                _sp(buf, int256(x), int256(y), _mix(_shell(pal, x, 0), irid, 55, 100));
            }
        } else if (marking == 4) { // Battle Scarred
            RGB memory dark = _dk(pal.shadow, 50, 100);
            _sp(buf,15,22,dark);_sp(buf,16,23,dark);_sp(buf,15,23,dark);_sp(buf,16,22,dark);
            _sp(buf,24,27,dark);_sp(buf,25,26,dark);_sp(buf,25,28,dark);_sp(buf,26,27,dark);
        } else if (marking == 5) { // Banded
            for (uint256 i = 0; i < 5; i++) {
                uint256 y = 33 + i * 4; uint256 x1 = 15 + i; uint256 x2 = 24 - i;
                for (uint256 x = x1; x <= x2; x++) _sp(buf, int256(x), int256(y), mkC);
            }
        } else if (marking == 6) { // Mottled
            { int256[14] memory mo; mo[0]=16;mo[1]=21;mo[2]=20;mo[3]=23;mo[4]=23;mo[5]=21;mo[6]=15;mo[7]=27;mo[8]=22;mo[9]=28;mo[10]=18;mo[11]=25;mo[12]=24;mo[13]=25;
            for (uint256 i = 0; i < 7; i++) {
                int256 x = mo[i*2]; int256 y = mo[i*2+1];
                _sp(buf,x,y,mkC); _sp(buf,x+1,y,mkC); _sp(buf,x,y+1,mkC);
            } }
        } else if (marking == 7) { // Chitin Sheen
            for (uint256 y = 19; y <= 31; y++) {
                for (uint256 x = 11; x <= 28; x++) {
                    if ((x + y) % 2 == 0) {
                        int256 dx100 = (int256(x) - 20) * 10;
                        int256 dy100 = (int256(y) - 25) * 10;
                        if (dx100*dx100 + dy100*dy100 <= 10000)
                            _sp(buf, int256(x), int256(y), _mix(_shell(pal, x, 0), irid, 38, 100));
                    }
                }
            }
        }
    }

    // ─── Antennae ────────────────────────────────────────────────────────────
    function _renderAntennae(uint24[] memory buf, bool broken, Palette memory pal) private pure {
        RGB memory antC = _dk(_shell(pal, 20, 2), 10, 100);
        _ln(buf, 18, 14, broken ? int256(12) : int256(6), broken ? int256(8) : int256(0), antC);
        _ln(buf, 22, 14, 31, 0, antC);
    }

    // ─── Eyes ────────────────────────────────────────────────────────────────
    function _renderEyes(uint24[] memory buf, uint8 eyes, uint8 scene, Palette memory pal) private pure {
        if (eyes == 3) { // Cyclops
            RGB memory iris = RGB(12, 8, 6);
            RGB memory rim  = RGB(28, 18, 10);
            for (int256 dy2 = -2; dy2 <= 2; dy2++) for (int256 dx2 = -2; dx2 <= 2; dx2++) {
                if (dx2*dx2 + dy2*dy2 <= 4) _sp(buf, 20+dx2, 17+dy2, dx2*dx2+dy2*dy2 <= 1 ? iris : rim);
            }
            _sp(buf, 19, 16, _lt(rim, 40, 100));
        } else if (eyes == 4) { // Void
            RGB memory v = RGB(4, 4, 4);
            int256[2] memory exs = [int256(16), 23];
            for (uint256 i = 0; i < 2; i++) {
                int256 ex = exs[i];
                _fr(buf, ex-1, 16, ex+1, 18, v);
                _sp(buf, ex-2, 17, _dk(_shell(pal, ex < 2 ? uint256(0) : uint256(ex-2), 2), 40, 100));
                _sp(buf, ex+2, 17, _dk(_shell(pal, uint256(ex+2), 2), 40, 100));
                _sp(buf, ex, 15, _dk(_shell(pal, ex < 0 ? uint256(0) : uint256(ex), 2), 35, 100));
                _sp(buf, ex, 19, _dk(_shell(pal, ex < 0 ? uint256(0) : uint256(ex), 2), 35, 100));
            }
        } else if (eyes == 5) { // Laser
            RGB memory LC = RGB(255, 40, 8);
            RGB memory LG = RGB(255, 136, 32);
            RGB memory fl = _sceneFloor(scene);
            int256[2] memory exs = [int256(16), 23];
            for (uint256 i = 0; i < 2; i++) {
                int256 ex = exs[i];
                _fr(buf, ex-1, 18, ex+1, 19, _dk(_shell(pal, ex < 0 ? uint256(0) : uint256(ex), 2), 10, 100));
                _fr(buf, ex-1, 16, ex+1, 18, LC);
                _sp(buf, ex, 16, _lt(LC, 40, 100));
                int256 glowOff = i == 0 ? int256(-1) : int256(1);
                for (uint256 yb = 0; yb <= 15; yb++) {
                    uint256 fade100 = yb * 100 / 15;
                    _sp(buf, ex, int256(15 - yb), _mix(LC, LG, fade100, 100));
                    _sp(buf, ex + glowOff, int256(15 - yb), _mix(LG, fl, 50 + fade100 * 40 / 100, 100));
                }
            }
        } else if (eyes == 6) { // Noggles
            RGB memory NF = RGB(32, 64, 224);
            RGB memory NB = RGB(8, 8, 24);
            _fr(buf,12,15,17,19,NF); _fr(buf,13,16,16,18,NB);
            _fr(buf,21,15,26,19,NF); _fr(buf,22,16,25,18,NB);
            _fr(buf,18,17,20,17,NF); _fr(buf,11,17,12,17,NF); _fr(buf,26,17,27,17,NF);
            _sp(buf,13,16,_lt(NB,25,100)); _sp(buf,22,16,_lt(NB,25,100));
        } else { // Standard, Glow Green, Glow Blue
            RGB memory gc = eyes == 1 ? RGB(48,224,96) : (eyes == 2 ? RGB(40,120,240) : RGB(0,0,0));
            bool glow = eyes == 1 || eyes == 2;
            RGB memory ic = glow ? gc : RGB(20, 12, 8);
            RGB memory fl = _sceneFloor(scene);
            int256[2] memory exs = [int256(16), 23];
            for (uint256 i = 0; i < 2; i++) {
                int256 ex = exs[i];
                _fr(buf, ex-1, 18, ex+1, 19, _dk(_shell(pal, ex < 0 ? uint256(0) : uint256(ex), 2), 10, 100));
                _fr(buf, ex-1, 16, ex+1, 18, ic);
                _sp(buf, ex - 1 + (i == 0 ? int256(1) : int256(0)), 16, _lt(ic, 42, 100));
                if (glow) {
                    RGB memory gd = _mix(fl, gc, 35, 100);
                    _sp(buf,ex-2,17,gd); _sp(buf,ex+2,17,gd);
                    _sp(buf,ex,15,gd); _sp(buf,ex,19,gd);
                    _sp(buf,ex-1,15,_mix(gd,fl,50,100));
                    _sp(buf,ex+1,15,_mix(gd,fl,50,100));
                }
            }
        }
    }

    // ─── Accessories ─────────────────────────────────────────────────────────
    function _renderAccessory(uint24[] memory buf, uint8 acc, Palette memory pal) private pure {
        RGB memory GOLD = RGB(212, 168, 32);
        RGB memory BLK  = RGB(20, 20, 20);
        RGB memory WHT  = RGB(232, 228, 220);
        RGB memory RED  = RGB(200, 40, 32);

        if (acc == 1) { // Pirate Hat
            _fr(buf,13,9,26,10,BLK); _fr(buf,15,6,24,9,BLK); _fr(buf,17,5,22,6,BLK);
            _sp(buf,19,7,WHT);_sp(buf,20,7,WHT);_sp(buf,19,8,WHT);_sp(buf,18,8,WHT);_sp(buf,21,8,WHT);
            for (uint256 x=15;x<=24;x++) _sp(buf,int256(x),9,_mix(BLK,WHT,14,100));
        } else if (acc == 2) { // Crown
            _fr(buf,16,10,23,11,GOLD);
            _sp(buf,17,9,GOLD);_sp(buf,22,9,GOLD);_sp(buf,15,9,GOLD);_sp(buf,24,9,GOLD);
            _sp(buf,19,8,GOLD);_sp(buf,20,8,GOLD);
            _sp(buf,19,10,RED);_sp(buf,21,10,RED);
            for (uint256 x=16;x<=23;x++) _sp(buf,int256(x),10,_lt(GOLD,18,100));
        } else if (acc == 3) { // Eye Patch
            _fr(buf,13,16,17,18,BLK);
            _ln(buf,18,16,22,14,BLK);
            _sp(buf,14,16,_mix(BLK,WHT,12,100));
        } else if (acc == 4) { // Barnacles
            RGB memory BC = RGB(176,168,136);
            { uint256[10] memory bpos; bpos[0]=18;bpos[1]=21;bpos[2]=22;bpos[3]=20;bpos[4]=16;bpos[5]=25;bpos[6]=24;bpos[7]=27;bpos[8]=20;bpos[9]=23;
            for (uint256 i=0;i<5;i++) {
                int256 bx=int256(bpos[i*2]); int256 by=int256(bpos[i*2+1]);
                _fr(buf,bx,by,bx+1,by+1,BC);
                _sp(buf,bx+1,by+1,_dk(BC,30,100));
                _sp(buf,bx,by,_lt(BC,12,100));
            } }
        } else if (acc == 5) { // Old Coin
            _sp(buf,7,10,_lt(GOLD,20,100)); _sp(buf,7,11,_mix(GOLD,RGB(200,160,0),60,100));
            _sp(buf,7,12,_dk(GOLD,15,100)); _sp(buf,6,10,_lt(GOLD,30,100));
        } else if (acc == 6) { // Admiral Hat
            _fr(buf,12,7,27,9,BLK); _fr(buf,15,5,24,7,BLK); _fr(buf,17,4,22,5,BLK);
            for (uint256 x=12;x<=27;x++) _sp(buf,int256(x),7,GOLD);
            for (uint256 x=15;x<=24;x++) _sp(buf,int256(x),5,_dk(GOLD,30,100));
            _sp(buf,13,6,RGB(232,224,208)); _sp(buf,12,5,RGB(240,234,224));
            _sp(buf,11,4,RGB(244,238,228)); _sp(buf,10,3,RGB(248,244,240));
        } else if (acc == 7) { // Pearl
            RGB memory P1 = RGB(215,210,205); RGB memory P2 = RGB(242,240,238);
            for (int256 dy2=-2;dy2<=2;dy2++) for (int256 dx2=-2;dx2<=2;dx2++) {
                if (dx2*dx2+dy2*dy2 <= 4) {
                    uint256 dist100 = uint256((dx2*dx2+dy2*dy2)*100/4);
                    _sp(buf,32+dx2,11+dy2, _mix(P2,P1,dist100 < 100 ? 65 + dist100*35/100 : 100,100));
                }
            }
            _sp(buf,31,10,RGB(248,246,244));
        } else if (acc == 8) { // Rainbow Puke
            RGB[7] memory RB;
            RB[0]=RGB(255,32,32); RB[1]=RGB(255,140,0);  RB[2]=RGB(255,224,32); RB[3]=RGB(32,208,32);
            RB[4]=RGB(32,144,255); RB[5]=RGB(160,32,255); RB[6]=RGB(255,64,204);
            for (uint256 step=0;step<12;step++) {
                int256 y2 = 11 - int256(step);
                if (y2 < 0) break;
                uint256 spread100 = step * 140;
                int256 lx = 20 - int256(spread100/100);
                int256 rx2 = 20 + int256(spread100/100);
                _sp(buf,lx,y2,RB[step%7]);
                if (lx-1 >= 0) _sp(buf,lx-1,y2,_mix(RB[step%7],RB[(step+1)%7],50,100));
                _sp(buf,rx2,y2,RB[(step+3)%7]);
                if (rx2+1 < int256(W)) _sp(buf,rx2+1,y2,_mix(RB[(step+3)%7],RB[(step+4)%7],50,100));
                if (step<6) _sp(buf,20,y2,RB[(step+1)%7]);
            }
            _sp(buf,18,12,RB[0]);_sp(buf,19,12,RB[1]);_sp(buf,20,11,RB[2]);
            _sp(buf,21,12,RB[3]);_sp(buf,22,12,RB[4]);
        } else if (acc == 9) { // Gold Chain
            RGB memory GD = RGB(160,120,16); RGB memory GL = RGB(240,204,80);
            for (uint256 x=12;x<=28;x++) {
                // chainY = 28 + sin((x-20)/8*π)*1.5 ≈ fixed point
                // We approximate sin with a lookup-free polynomial
                int256 t100 = (int256(x) - 20) * 100 / 8; // angle *100/π ≈ range ±250
                // sin approx: t - t³/6 for t in radians, but we just use a linear approx for the small range
                // Actually, let's use a simple triangle wave: max deviation ±1.5px
                int256 sy = 28;
                if (x < 20) sy = 28 + int256((20-x)*15/80);
                else        sy = 28 - int256((x-20)*15/80);
                bool isLink = (x % 3 == 0);
                _sp(buf,int256(x),sy, isLink ? GL : GOLD);
                _sp(buf,int256(x),sy+1, isLink ? GOLD : GD);
                if (x == 20) {
                    _sp(buf,20,sy+2,GL); _sp(buf,20,sy+3,GOLD);
                    _sp(buf,20,sy+4,_mix(GOLD,GL,60,100));
                    _sp(buf,20,sy+5,GOLD);
                }
            }
        } else if (acc == 10) { // Blush
            RGB memory BH = RGB(224, 80, 128);
            _sp(buf,13,23,_mix(BH,pal.floorCol,35,100)); _sp(buf,14,24,_mix(BH,pal.floorCol,35,100));
            _sp(buf,13,24,_mix(BH,pal.floorCol,35,100)); _sp(buf,14,23,_mix(BH,pal.floorCol,35,100));
            _sp(buf,12,24,_mix(BH,pal.floorCol,35,100)); _sp(buf,13,23,_mix(BH,pal.floorCol,20,100));
            _sp(buf,26,23,_mix(BH,pal.floorCol,35,100)); _sp(buf,27,24,_mix(BH,pal.floorCol,35,100));
            _sp(buf,26,24,_mix(BH,pal.floorCol,35,100)); _sp(buf,27,23,_mix(BH,pal.floorCol,35,100));
            _sp(buf,28,24,_mix(BH,pal.floorCol,35,100)); _sp(buf,27,23,_mix(BH,pal.floorCol,20,100));
        }
    }

    // ─── Buffer → SVG ────────────────────────────────────────────────────────
    function _bufToSVG(uint24[] memory buf) private pure returns (string memory) {
        bytes memory out = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" shape-rendering="crispEdges">'
        );

        for (uint256 y = 0; y < H; y++) {
            uint256 x = 0;
            while (x < W) {
                uint24 color = buf[y * W + x];
                if (color == TRANSPARENT) { x++; continue; }
                // Run-length encode same-color adjacent pixels
                uint256 run = 1;
                while (x + run < W && buf[y * W + x + run] == color) run++;
                // Emit rect
                out = abi.encodePacked(
                    out,
                    '<rect x="', (x * PX).toString(),
                    '" y="', (y * PX).toString(),
                    '" width="', (run * PX).toString(),
                    '" height="10" fill="#',
                    _hex3(RGB(uint8(color >> 16), uint8(color >> 8), uint8(color))),
                    '"/>'
                );
                x += run;
            }
        }
        out = abi.encodePacked(out, '</svg>');
        return string(out);
    }
}
