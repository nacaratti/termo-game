// Gera /public/og-image.png (1200x630) para Open Graph / WhatsApp preview
// Usa apenas zlib built-in — sem dependências extras.
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../public/og-image.png');

const W = 1200;
const H = 630;

// ── CRC32 (lookup table) ──────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG helpers ───────────────────────────────────────────────────────────
function u32be(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = u32be(d.length);
  const crcBuf = Buffer.concat([t, d]);
  return Buffer.concat([len, t, d, u32be(crc32(crcBuf))]);
}

// ── Colours (#rrggbb → [r,g,b]) ──────────────────────────────────────────
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const BG       = hex('#16181d'); // background
const CARD_BG  = hex('#1e2028'); // card surface
const GREEN    = hex('#6aaa64'); // correct
const YELLOW   = hex('#c9a84c'); // present
const GRAY     = hex('#383b4a'); // absent
const BORDER   = hex('#2c2f3a'); // border
const WHITE    = [255, 255, 255];

// ── Pixel buffer (RGBA, row-major) ────────────────────────────────────────
const px = new Uint8Array(W * H * 4);
function setPixel(x, y, [r,g,b], a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
}
function fillRect(x0, y0, w, h, color, a = 255) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      setPixel(x, y, color, a);
}
function strokeRect(x0, y0, w, h, color, thickness = 2) {
  fillRect(x0, y0, w, thickness, color);
  fillRect(x0, y0 + h - thickness, w, thickness, color);
  fillRect(x0, y0, thickness, h, color);
  fillRect(x0 + w - thickness, y0, thickness, h, color);
}
function roundRect(x0, y0, w, h, r, fill, stroke, strokeW = 2) {
  // Approximate with clipped rects
  fillRect(x0 + r, y0, w - 2*r, h, fill);
  fillRect(x0, y0 + r, r, h - 2*r, fill);
  fillRect(x0 + w - r, y0 + r, r, h - 2*r, fill);
  // corners (circle approx)
  for (let dy = 0; dy < r; dy++)
    for (let dx = 0; dx < r; dx++) {
      const dist = Math.sqrt((r-dx-0.5)**2 + (r-dy-0.5)**2);
      if (dist < r) {
        setPixel(x0 + dx,       y0 + dy,       fill);
        setPixel(x0 + w - 1 - dx, y0 + dy,     fill);
        setPixel(x0 + dx,       y0 + h - 1 - dy, fill);
        setPixel(x0 + w - 1 - dx, y0 + h - 1 - dy, fill);
      }
    }
  if (stroke) strokeRect(x0, y0, w, h, stroke, strokeW);
}

// 5×5 bitmap font (A-Z digits, basic punctuation)
const GLYPHS = {
  K:[[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  I:[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  N:[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  T:[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  O:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  D:[[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0]],
  H:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  E:[[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  P:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  A:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  L:[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  V:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  R:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  S:[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  U:[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  ' ':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
};

function drawText(str, startX, y, color, scale = 1) {
  let x = startX;
  for (const ch of str.toUpperCase()) {
    const g = GLYPHS[ch] || GLYPHS[' '];
    for (let row = 0; row < g.length; row++)
      for (let col = 0; col < g[row].length; col++)
        if (g[row][col])
          fillRect(x + col * scale, y + row * scale, scale, scale, color);
    x += (5 + 1) * scale;
  }
}

// ── Draw scene ────────────────────────────────────────────────────────────
// Background
fillRect(0, 0, W, H, BG);

// Subtle gradient-like band at top
fillRect(0, 0, W, 2, BORDER);

// Card panel (centered, slightly elevated look)
const cardX = 80, cardY = 60, cardW = W - 160, cardH = H - 120;
roundRect(cardX - 4, cardY - 4, cardW + 8, cardH + 8, 16, BORDER, null);
roundRect(cardX, cardY, cardW, cardH, 14, CARD_BG, null);

// ── Title "KINTO" big pixel text ──────────────────────────────────────────
const titleScale = 12;
const titleStr = 'KINTO';
const titleW = titleStr.length * 6 * titleScale;
const titleX = Math.floor((W - titleW) / 2);
drawText(titleStr, titleX, 105, WHITE, titleScale);

// Subtitle "Adivinhe a palavra" pixel text
const subScale = 4;
const subStr = 'ADIVINHE A PALAVRA';
const subW = subStr.length * 6 * subScale;
const subX = Math.floor((W - subW) / 2);
drawText(subStr, subX, 220, GRAY, subScale);

// ── Tile grid (6 rows × 5 cols) ──────────────────────────────────────────
const TILE = 80;
const GAP = 10;
const GRID_W = 5 * TILE + 4 * GAP;
const GRID_H = 6 * TILE + 5 * GAP;
const GRID_X = Math.floor((W - GRID_W) / 2);
const GRID_Y = 270;
const RADIUS = 10;

// Pattern: sample game board (5 cols × 6 rows)
// Each cell: 0=absent, 1=present, 2=correct, -1=empty
const board = [
  [0, 0, 1, 0, 0],
  [0, 2, 0, 1, 0],
  [2, 0, 0, 0, 2],
  [2, 2, 1, 0, 0],
  [2, 2, 2, 2, 0],
  [2, 2, 2, 2, 2],
];
const tileColors = [GRAY, YELLOW, GREEN];

for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 5; col++) {
    const tx = GRID_X + col * (TILE + GAP);
    const ty = GRID_Y + row * (TILE + GAP);
    const val = board[row][col];
    const fill = val === -1 ? CARD_BG : tileColors[val];
    roundRect(tx, ty, TILE, TILE, RADIUS, fill, val === -1 ? BORDER : fill, 2);
  }
}

// ── Encode PNG ────────────────────────────────────────────────────────────
const IHDR = Buffer.allocUnsafe(13);
IHDR.writeUInt32BE(W, 0);
IHDR.writeUInt32BE(H, 4);
IHDR[8] = 8;  // bit depth
IHDR[9] = 2;  // color type = RGB
IHDR[10] = 0; // compression
IHDR[11] = 0; // filter
IHDR[12] = 0; // interlace

// Build raw scanlines (filter byte 0 + RGB per pixel)
const rawLines = Buffer.allocUnsafe(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  rawLines[y * (1 + W * 3)] = 0; // filter type None
  for (let x = 0; x < W; x++) {
    const src = (y * W + x) * 4;
    const dst = y * (1 + W * 3) + 1 + x * 3;
    rawLines[dst]   = px[src];
    rawLines[dst+1] = px[src+1];
    rawLines[dst+2] = px[src+2];
  }
}

const compressed = deflateSync(rawLines, { level: 6 });

const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);
const png = Buffer.concat([
  PNG_SIG,
  chunk('IHDR', IHDR),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(OUT, png);
console.log(`✓ og-image.png gerada (${W}×${H}) → ${OUT}`);
