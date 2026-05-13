// Gera ícones PNG para o PWA usando apenas Node.js built-ins (sem deps).
import zlib from 'zlib';
import { writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '../public');

// CRC32 para chunks PNG
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makePNG(size, drawPixel) {
  const rowBytes = size * 3 + 1;
  const raw = Buffer.alloc(size * rowBytes);

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawPixel(x, y, size);
      const off = y * rowBytes + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, c]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // bit depth=8, color type=RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Ponto dentro de retângulo com cantos arredondados
function inRoundedRect(px, py, x, y, w, h, r) {
  const dx = Math.max(x + r - px, 0, px - (x + w - r));
  const dy = Math.max(y + r - py, 0, py - (y + h - r));
  return dx * dx + dy * dy <= r * r;
}

const BG     = [0x16, 0x18, 0x1d]; // #16181d
const GREEN  = [0x6a, 0xaa, 0x64]; // #6aaa64
const YELLOW = [0xc9, 0xa8, 0x4c]; // #c9a84c
const GRAY   = [0x38, 0x3b, 0x4a]; // #383b4a

function drawIcon(x, y, size) {
  const pad = Math.round(size * 0.125);       // 12.5% padding
  const gap = Math.round(size * 0.03125);     // 3.125% gap
  const tile = Math.floor((size - pad * 2 - gap) / 2);
  const r = Math.round(tile * 0.1);          // corner radius ≈ 10% of tile

  const tiles = [
    { color: GREEN,  tx: pad,          ty: pad },
    { color: YELLOW, tx: pad + tile + gap, ty: pad },
    { color: GRAY,   tx: pad,          ty: pad + tile + gap },
    { color: GREEN,  tx: pad + tile + gap, ty: pad + tile + gap },
  ];

  for (const { color, tx, ty } of tiles) {
    if (inRoundedRect(x, y, tx, ty, tile, tile, r)) return color;
  }
  return BG;
}

async function generate(size, filename) {
  const png = makePNG(size, drawIcon);
  await writeFile(resolve(PUBLIC, filename), png);
  console.log(`✓ ${filename} (${size}×${size})`);
}

await generate(192, 'icon-192.png');
await generate(512, 'icon-512.png');
console.log('Ícones PWA gerados em public/');
