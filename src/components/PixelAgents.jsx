import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════════════════════
   PIXEL AGENTS — Multi-room pixel art office
   4 rooms: CEO Office, Dev Room, Meeting Room, Lounge
   PNG sprites from pixel-agents-hq/pixel-agents
   ═══════════════════════════════════════════════════════════════════════════════ */

const TILE = 16;
const ZOOM = 3;
const COLS = 30;
const ROWS = 20;
const W = COLS * TILE;
const H = ROWS * TILE;
const CHAR_W = 16;
const CHAR_H = 32;
const FRAMES_PER_ROW = 7;

// Directions & states
const DIR_DOWN = 0, DIR_UP = 1, DIR_RIGHT = 2, DIR_LEFT = 3;
const ST_TYPE = 0, ST_IDLE = 1, ST_WALK = 2;

// Timing
const WALK_SPEED = 40;
const TYPE_FRAME_DUR = 0.4;
const WALK_FRAME_DUR = 0.15;

// ─── Action labels ──────────────────────────────────────────────────────────
const ACTION_SHORT = {
  card_started: 'Iniciando tarefa…', card_completed: 'Tarefa concluída!',
  code_committed: 'Commit enviado', test_added: 'Escrevendo testes',
  bug_fixed: 'Bug corrigido!', card_created: 'Criou card',
  report_generated: 'Gerando relatório', session_started: 'Começando',
  session_ended: 'Finalizando',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── Asset helpers ──────────────────────────────────────────────────────────
const BASE = '/assets/pixel-agents/';
function loadImg(path) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = BASE + path;
  });
}

function extractFrame(img, fx, fy, fw, fh) {
  const c = document.createElement('canvas');
  c.width = fw; c.height = fh;
  c.getContext('2d').drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
  return c;
}

function flipH(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0);
  return c;
}

function extractCharFrames(img) {
  if (!img) return null;
  const frames = { down: [], up: [], right: [], left: [] };
  const dirs = ['down', 'up', 'right'];
  for (let di = 0; di < 3; di++) {
    for (let f = 0; f < FRAMES_PER_ROW; f++) {
      frames[dirs[di]].push(extractFrame(img, f * CHAR_W, di * CHAR_H, CHAR_W, CHAR_H));
    }
  }
  frames.left = frames.right.map(flipH);
  return frames;
}

// ─── Room layout ────────────────────────────────────────────────────────────
// Tile types: -1=wall, 0=void, 7=wood floor, 1=light floor, 4=tile floor
//
// Layout (30×20):
//   cols:  0  1-8  9  10-19  20  21-28  29
//   rows:
//   0:    [────── top wall ──────────────]
//   1-8:  [w] CEO [w] LOUNGE [w] MEETING[w]
//         door: col9 r4-5    col20 r4-5
//   9:    [w  wall  w] LOUNGE [wall wall w]
//   10-18:[w] DEV  [w] LOUNGE  LOUNGE   [w]
//         door: col9 r13-14
//   19:   [────── bottom wall ───────────]
//
// CEO & Dev have NO shared door (row 9 is solid wall on cols 0-9)
// Lounge is L-shaped: cols 10-19 full height + cols 20-28 below meeting

function buildTileMap() {
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      // Outer walls
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        row.push(-1); continue;
      }
      // CEO room: cols 1-8, rows 1-8, floor 5 (brick)
      if (r >= 1 && r <= 8 && c >= 1 && c <= 8) {
        row.push(5); continue;
      }
      // Dev room: cols 1-8, rows 10-18, floor 3 (tile grid)
      if (r >= 10 && r <= 18 && c >= 1 && c <= 8) {
        row.push(3); continue;
      }
      // Meeting room: cols 21-28, rows 1-8, floor 8 (dark checker)
      if (r >= 1 && r <= 8 && c >= 21 && c <= 28) {
        row.push(8); continue;
      }
      // Vertical wall col 9: separates CEO/Dev from Lounge
      if (c === 9) {
        // Doors: CEO→Lounge (rows 4-5), Dev→Lounge (rows 13-14)
        if ((r >= 4 && r <= 5) || (r >= 13 && r <= 14)) {
          row.push(6); continue; // door = lounge floor
        }
        row.push(-1); continue;
      }
      // Horizontal wall row 9, cols 0-9: solid between CEO/Dev (no door)
      if (r === 9 && c <= 9) {
        row.push(-1); continue;
      }
      // Meeting left wall: col 20, rows 1-8
      if (c === 20 && r >= 1 && r <= 8) {
        // Door at rows 4-5
        if (r >= 4 && r <= 5) { row.push(6); continue; }
        row.push(-1); continue;
      }
      // Meeting bottom wall: row 9, cols 20-28
      if (r === 9 && c >= 20 && c <= 28) {
        row.push(-1); continue;
      }
      // Lounge L-shape: cols 10-19 rows 1-18 + cols 20-28 rows 10-18
      if ((c >= 10 && c <= 19 && r >= 1 && r <= 18) ||
          (c >= 20 && c <= 28 && r >= 10 && r <= 18)) {
        row.push(6); continue; // lounge floor (brick variant)
      }
      // Everything else is wall
      row.push(-1);
    }
    map.push(row);
  }
  return map;
}

const TILE_MAP = buildTileMap();

// ─── Furniture definitions ──────────────────────────────────────────────────
// { key, col, row, dims: {w,h,fpW,fpH,bgTiles} }
const DIMS = {
  DESK_FRONT:      { w: 48, h: 32, fpW: 3, fpH: 2, bgTiles: 1 },
  PC_FRONT:        { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  CHAIR_BACK:      { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  CHAIR_FRONT:     { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  CHAIR_SIDE:      { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  BOOKSHELF:       { w: 32, h: 16, fpW: 2, fpH: 1, bgTiles: 0 },
  DOUBLE_BOOKSHELF:{ w: 32, h: 32, fpW: 2, fpH: 2, bgTiles: 0 },
  PLANT:           { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  LARGE_PLANT:     { w: 32, h: 48, fpW: 2, fpH: 3, bgTiles: 2 },
  PLANT_2:         { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  CLOCK:           { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  LARGE_PAINTING:  { w: 32, h: 32, fpW: 2, fpH: 2, bgTiles: 1 },
  SMALL_PAINTING:  { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  SMALL_PAINTING_2:{ w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  WHITEBOARD:      { w: 32, h: 32, fpW: 2, fpH: 2, bgTiles: 1 },
  SOFA_FRONT:      { w: 32, h: 16, fpW: 2, fpH: 1, bgTiles: 0 },
  SOFA_SIDE:       { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 0 },
  COFFEE_TABLE:    { w: 32, h: 32, fpW: 2, fpH: 2, bgTiles: 0 },
  TABLE_FRONT:     { w: 48, h: 64, fpW: 3, fpH: 4, bgTiles: 1 },
  HANGING_PLANT:   { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  COFFEE:          { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  CACTUS:          { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 1 },
  POT:             { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  WOODEN_CHAIR_SIDE: { w: 16, h: 32, fpW: 1, fpH: 2, bgTiles: 0 },
  CUSHIONED_BENCH: { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  SMALL_TABLE_FRONT: { w: 32, h: 32, fpW: 2, fpH: 2, bgTiles: 1 },
  BIN:             { w: 16, h: 16, fpW: 1, fpH: 1, bgTiles: 0 },
  SOFA_BACK:       { w: 32, h: 16, fpW: 2, fpH: 1, bgTiles: 0 },
};

const FURNITURE = [
  // ── CEO Office (cols 1-8, rows 1-8) ──
  { key: 'DESK_FRONT',  col: 3, row: 3 },   // desk cols 3-5, rows 3-4
  { key: 'PC_FRONT',    col: 4, row: 3 },    // PC on desk
  { key: 'CHAIR_BACK',  col: 4, row: 5 },    // chair behind desk
  { key: 'LARGE_PAINTING', col: 2, row: 0 }, // painting on top wall
  { key: 'BOOKSHELF',   col: 6, row: 0 },    // bookshelf on top wall
  { key: 'PLANT',       col: 1, row: 1 },    // plant in top-left corner
  { key: 'SMALL_TABLE_FRONT', col: 7, row: 7 }, // side table in corner
  { key: 'COFFEE',      col: 7, row: 7 },    // coffee ON the table
  { key: 'BIN',         col: 1, row: 7 },    // bin in bottom-left corner

  // ── Meeting Room (cols 21-28, rows 1-8) ──
  // TABLE_FRONT is 3×4 tiles → cols 23-25, rows 5-8 (bgTiles=1 so visual from row 4)
  { key: 'TABLE_FRONT', col: 23, row: 5 },
  { key: 'WHITEBOARD',  col: 24, row: 0 },   // whiteboard on top wall
  // Left chairs beside table (col 22, aligned with table rows 6 and 8)
  { key: 'WOODEN_CHAIR_SIDE', col: 22, row: 6 },
  { key: 'WOODEN_CHAIR_SIDE', col: 22, row: 8 },
  // Right chairs beside table (col 26, aligned with table rows 6 and 8)
  { key: 'CHAIR_SIDE',  col: 26, row: 6, mirror: true },
  { key: 'CHAIR_SIDE',  col: 26, row: 8, mirror: true },
  { key: 'CLOCK',       col: 28, row: 0 },   // clock on top wall, right corner
  { key: 'PLANT',       col: 21, row: 1 },   // plant in top-left corner of room

  // ── Dev Room (cols 1-8, rows 10-18) ──
  { key: 'DESK_FRONT',  col: 3, row: 12 },   // desk cols 3-5, rows 12-13
  { key: 'PC_FRONT',    col: 4, row: 12 },    // PC on desk
  { key: 'CHAIR_BACK',  col: 4, row: 14 },    // chair behind desk
  { key: 'DOUBLE_BOOKSHELF', col: 1, row: 9 }, // bookshelf on top wall
  { key: 'DOUBLE_BOOKSHELF', col: 4, row: 9 }, // bookshelf on top wall
  { key: 'CACTUS',      col: 8, row: 10 },    // cactus in corner, against right wall
  { key: 'SMALL_PAINTING_2', col: 7, row: 9 }, // painting on top wall
  { key: 'BIN',         col: 1, row: 17 },    // bin in bottom-left corner

  // ══════════════════════════════════════════════════════════════
  // Lounge L-shape (cols 10-19 rows 1-18 + cols 20-28 rows 10-18)
  // ══════════════════════════════════════════════════════════════

  // ── Upper lounge strip (cols 10-19, rows 1-8) ──
  // Sofa seating area 1: against left wall (col 10)
  { key: 'SOFA_FRONT',  col: 11, row: 1 },   // sofa against top wall
  { key: 'COFFEE_TABLE', col: 11, row: 3 },   // table in front of sofa
  { key: 'SOFA_FRONT',  col: 11, row: 5 },   // second sofa facing table

  // Coffee station against top wall (row 1)
  { key: 'SMALL_TABLE_FRONT', col: 16, row: 1 }, // support table on top wall
  { key: 'COFFEE',      col: 16, row: 1 },    // coffee ON table
  { key: 'COFFEE',      col: 17, row: 1 },    // second coffee ON table
  { key: 'POT',         col: 18, row: 1 },    // pot next to coffee

  // Decor on walls (upper strip)
  { key: 'SMALL_PAINTING', col: 14, row: 0 }, // painting on top wall
  { key: 'PLANT_2',     col: 10, row: 1 },    // plant in corner against left wall

  // ── Middle transition strip (cols 10-19, rows 9-10) ──
  { key: 'HANGING_PLANT', col: 10, row: 9 },  // on horizontal wall
  { key: 'HANGING_PLANT', col: 14, row: 9 },  // on horizontal wall
  { key: 'LARGE_PAINTING', col: 17, row: 9 }, // painting on horizontal wall

  // ── Lower lounge strip (cols 10-19, rows 11-18) ──
  { key: 'SOFA_FRONT',  col: 11, row: 11 },   // sofa against wall area
  { key: 'SMALL_TABLE_FRONT', col: 13, row: 11 }, // side table
  { key: 'PLANT',       col: 10, row: 17 },    // plant in bottom-left corner

  // ── Wide lounge area (cols 20-28, rows 10-18) ──
  // Seating cluster: sofas facing each other with coffee table
  { key: 'SOFA_FRONT',  col: 21, row: 12 },   // sofa top
  { key: 'COFFEE_TABLE', col: 21, row: 14 },   // coffee table between sofas
  { key: 'SOFA_FRONT',  col: 21, row: 16 },   // sofa bottom

  // Second seating area along right wall
  { key: 'CUSHIONED_BENCH', col: 27, row: 13 }, // bench against right wall
  { key: 'CUSHIONED_BENCH', col: 28, row: 13 }, // bench against right wall
  { key: 'SMALL_TABLE_FRONT', col: 27, row: 15 }, // table near benches
  { key: 'COFFEE',      col: 27, row: 15 },    // coffee ON table

  // Plants in corners (not middle!)
  { key: 'LARGE_PLANT', col: 27, row: 16 },   // plant in bottom-right corner
  { key: 'PLANT_2',     col: 20, row: 17 },   // plant in bottom-left of wide area
  { key: 'SMALL_PAINTING', col: 24, row: 9 }, // painting on top wall of wide area
];

// ─── Blocked tiles ──────────────────────────────────────────────────────────
const BLOCKED = new Set();
function blockRect(c, r, w, h) {
  for (let dr = 0; dr < h; dr++)
    for (let dc = 0; dc < w; dc++)
      BLOCKED.add(`${c + dc},${r + dr}`);
}
// CEO desk+chair+table
blockRect(3, 3, 3, 2); blockRect(4, 5, 1, 1); blockRect(7, 7, 2, 1);
// Meeting table + chairs (table cols 23-25 rows 5-8, chairs at 22 & 26)
blockRect(23, 5, 3, 4); blockRect(22, 5, 1, 1); blockRect(22, 7, 1, 1); blockRect(26, 5, 1, 1); blockRect(26, 7, 1, 1);
// Dev desk+chair
blockRect(3, 12, 3, 2); blockRect(4, 14, 1, 1);
// Bookshelves (on wall row 9)
blockRect(1, 9, 2, 2); blockRect(4, 9, 2, 2);
// Upper lounge: sofas + coffee table + coffee station
blockRect(11, 1, 2, 1); blockRect(11, 3, 2, 2); blockRect(11, 5, 2, 1);
blockRect(16, 1, 3, 1);
// Lower lounge strip: sofa + table
blockRect(11, 11, 2, 1); blockRect(13, 11, 2, 1);
// Wide lounge: sofa cluster + benches + table
blockRect(21, 12, 2, 1); blockRect(21, 14, 2, 2); blockRect(21, 16, 2, 1);
blockRect(27, 13, 2, 1); blockRect(27, 15, 2, 1);
// Large plant (corner)
blockRect(27, 17, 2, 2);

// Walkable tiles
const WALKABLE = {};
function getWalkable(room) {
  if (WALKABLE[room]) return WALKABLE[room];
  const tiles = [];
  let cMin, cMax, rMin, rMax;
  switch (room) {
    case 'ceo':     cMin=1; cMax=8; rMin=1; rMax=8; break;
    case 'meeting': cMin=21; cMax=28; rMin=1; rMax=8; break;
    case 'dev':     cMin=1; cMax=8; rMin=10; rMax=18; break;
    case 'lounge':  cMin=10; cMax=28; rMin=1; rMax=18; break;
    default:        cMin=1; cMax=28; rMin=1; rMax=18;
  }
  for (let r = rMin; r <= rMax; r++)
    for (let c = cMin; c <= cMax; c++)
      if (!BLOCKED.has(`${c},${r}`) && TILE_MAP[r]?.[c] >= 0)
        tiles.push({ col: c, row: r });
  WALKABLE[room] = tiles;
  return tiles;
}

// ─── Pathfinding ────────────────────────────────────────────────────────────
function isWalkable(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (TILE_MAP[row]?.[col] < 0) return false;
  if (BLOCKED.has(`${col},${row}`)) return false;
  return true;
}

function findPath(sc, sr, ec, er, extraUnblock) {
  if (sc === ec && sr === er) return [];
  const key = (c, r) => `${c},${r}`;
  const visited = new Set(); visited.add(key(sc, sr));
  const queue = [{ col: sc, row: sr, path: [] }];
  while (queue.length > 0) {
    const { col, row, path } = queue.shift();
    for (const [dc, dr] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nc = col + dc, nr = row + dr;
      const k = key(nc, nr);
      if (visited.has(k)) continue;
      // Allow walking through door tiles + target tile
      const isTarget = nc === ec && nr === er;
      const isUnblocked = extraUnblock && extraUnblock.has(k);
      if (!isTarget && !isUnblocked && !isWalkable(nc, nr)) continue;
      // Also check basic bounds + not wall
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (TILE_MAP[nr]?.[nc] < 0 && !isTarget && !isUnblocked) continue;
      visited.add(k);
      const newPath = [...path, { col: nc, row: nr }];
      if (isTarget) return newPath;
      queue.push({ col: nc, row: nr, path: newPath });
    }
  }
  return [];
}

function dirBetween(fc, fr, tc, tr) {
  const dc = tc - fc, dr = tr - fr;
  if (dc > 0) return DIR_RIGHT;
  if (dc < 0) return DIR_LEFT;
  if (dr > 0) return DIR_DOWN;
  return DIR_UP;
}

function tileCenter(c, r) {
  return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
}

// ─── Is it Friday? (Brasília timezone) ──────────────────────────────────────
function isFridayBrasilia() {
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brt.getDay() === 5;
}

// ─── Room labels ────────────────────────────────────────────────────────────
const ROOM_LABELS = [
  { text: 'CEO', x: 5, y: 1, color: '#a78bfa' },
  { text: 'Reunião', x: 25, y: 1, color: '#60a5fa' },
  { text: 'Dev', x: 5, y: 10, color: '#60a5fa' },
  { text: 'Lounge', x: 15, y: 10, color: '#6aaa64' },
];

// ─── Component ──────────────────────────────────────────────────────────────
const PixelAgents = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [activities, setActivities] = useState({ dev: null, ceo: null });

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('activity_logs')
      .select('agent, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!data) return;
        setActivities({
          dev: data.find(d => d.agent === 'dev_agent') || null,
          ceo: data.find(d => d.agent === 'ceo_agent') || null,
        });
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    let rafId = null;
    let destroyed = false;
    let debugMode = false;
    let hoverTile = null; // { col, row }

    (async () => {
      // Load characters (Dev=char_0, CEO=char_1)
      const [charDevImg, charCeoImg] = await Promise.all([
        loadImg('characters/char_0.png'),
        loadImg('characters/char_1.png'),
      ]);

      // Load all floors (0-8)
      const floorPromises = [];
      for (let i = 0; i <= 8; i++) floorPromises.push(loadImg(`floors/floor_${i}.png`));
      const floorArr = await Promise.all(floorPromises);
      const floorImgs = {};
      floorArr.forEach((img, i) => { floorImgs[i] = img; });

      // Load furniture PNGs
      const furnitureImgs = {};
      const toLoad = [
        ['DESK_FRONT', 'furniture/DESK/DESK_FRONT.png'],
        ['PC_FRONT_1', 'furniture/PC/PC_FRONT_ON_1.png'],
        ['PC_FRONT_2', 'furniture/PC/PC_FRONT_ON_2.png'],
        ['PC_FRONT_3', 'furniture/PC/PC_FRONT_ON_3.png'],
        ['CHAIR_BACK', 'furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png'],
        ['CHAIR_FRONT', 'furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png'],
        ['CHAIR_SIDE', 'furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png'],
        ['BOOKSHELF', 'furniture/BOOKSHELF/BOOKSHELF.png'],
        ['DOUBLE_BOOKSHELF', 'furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png'],
        ['PLANT', 'furniture/PLANT/PLANT.png'],
        ['PLANT_2', 'furniture/PLANT_2/PLANT_2.png'],
        ['LARGE_PLANT', 'furniture/LARGE_PLANT/LARGE_PLANT.png'],
        ['CLOCK', 'furniture/CLOCK/CLOCK.png'],
        ['LARGE_PAINTING', 'furniture/LARGE_PAINTING/LARGE_PAINTING.png'],
        ['SMALL_PAINTING', 'furniture/SMALL_PAINTING/SMALL_PAINTING.png'],
        ['SMALL_PAINTING_2', 'furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png'],
        ['WHITEBOARD', 'furniture/WHITEBOARD/WHITEBOARD.png'],
        ['SOFA_FRONT', 'furniture/SOFA/SOFA_FRONT.png'],
        ['SOFA_SIDE', 'furniture/SOFA/SOFA_SIDE.png'],
        ['COFFEE_TABLE', 'furniture/COFFEE_TABLE/COFFEE_TABLE.png'],
        ['TABLE_FRONT', 'furniture/TABLE_FRONT/TABLE_FRONT.png'],
        ['HANGING_PLANT', 'furniture/HANGING_PLANT/HANGING_PLANT.png'],
        ['COFFEE', 'furniture/COFFEE/COFFEE.png'],
        ['CACTUS', 'furniture/CACTUS/CACTUS.png'],
        ['POT', 'furniture/POT/POT.png'],
        ['WOODEN_CHAIR_SIDE', 'furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png'],
        ['CUSHIONED_BENCH', 'furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png'],
        ['SMALL_TABLE_FRONT', 'furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png'],
        ['BIN', 'furniture/BIN/BIN.png'],
        ['SOFA_BACK', 'furniture/SOFA/SOFA_BACK.png'],
      ];
      const loaded = await Promise.all(toLoad.map(([,p]) => loadImg(p)));
      toLoad.forEach(([k], i) => { furnitureImgs[k] = loaded[i]; });

      if (destroyed) return;

      // Extract character frames
      const devFrames = extractCharFrames(charDevImg);
      const ceoFrames = extractCharFrames(charCeoImg);

      // ── Seats ──────────────────────────────────
      const SEATS = {
        ceo:  { col: 4, row: 5, dir: DIR_UP, room: 'ceo' },
        dev:  { col: 4, row: 14, dir: DIR_UP, room: 'dev' },
        // Meeting seats
        meetCeo: { col: 26, row: 7, dir: DIR_LEFT, room: 'meeting' },
        meetDev: { col: 22, row: 7, dir: DIR_RIGHT, room: 'meeting' },
      };

      const isFriday = isFridayBrasilia();

      // Create characters
      function makeChar(frames, seat) {
        const c = tileCenter(seat.col, seat.row);
        return {
          frames,
          state: ST_TYPE, dir: seat.dir,
          x: c.x, y: c.y,
          tileCol: seat.col, tileRow: seat.row,
          seat, homeSeat: seat,
          path: [], moveProgress: 0,
          frame: 0, frameTimer: 0,
          wanderTimer: 4 + Math.random() * 6,
          wanderCount: 0,
          seatTimer: 5 + Math.random() * 8,
          bubbleText: '', bubbleTime: '', bubbleTimer: 0,
          meetingMode: false,
        };
      }

      const chars = [
        { key: 'ceo', ch: makeChar(ceoFrames, SEATS.ceo) },
        { key: 'dev', ch: makeChar(devFrames, SEATS.dev) },
      ];

      // Set initial bubbles
      const devAct = activities.dev;
      const ceoAct = activities.ceo;
      if (ceoAct) {
        chars[0].ch.bubbleText = ACTION_SHORT[ceoAct.action] || 'Analisando…';
        chars[0].ch.bubbleTime = timeAgo(ceoAct.created_at);
        chars[0].ch.bubbleTimer = 5;
      }
      if (devAct) {
        chars[1].ch.bubbleText = ACTION_SHORT[devAct.action] || 'Trabalhando…';
        chars[1].ch.bubbleTime = timeAgo(devAct.created_at);
        chars[1].ch.bubbleTimer = 5;
      }

      // Friday meeting schedule
      let meetingTriggered = false;
      let meetingTimer = isFriday ? 8 : -1; // Start meeting after 8s on Fridays

      // ── Get sprite ─────────────────────────────
      function getSprite(ch) {
        if (!ch.frames) return null;
        const dirName = ['down', 'up', 'right', 'left'][ch.dir];
        const frames = ch.frames[dirName];
        if (!frames) return null;
        if (ch.state === ST_TYPE) return frames[3 + (ch.frame % 2)];
        if (ch.state === ST_WALK) {
          const cycle = [0, 1, 2, 1];
          return frames[cycle[ch.frame % 4]];
        }
        return frames[1]; // idle
      }

      // ── Update character ───────────────────────
      function updateChar(charObj, dt) {
        const ch = charObj.ch;
        ch.frameTimer += dt;
        ch.bubbleTimer = Math.max(0, ch.bubbleTimer - dt);

        if (ch.state === ST_TYPE) {
          if (ch.frameTimer >= TYPE_FRAME_DUR) {
            ch.frameTimer -= TYPE_FRAME_DUR;
            ch.frame = (ch.frame + 1) % 2;
          }
          ch.seatTimer -= dt;
          if (ch.seatTimer <= 0) {
            ch.state = ST_IDLE;
            ch.frame = 0; ch.frameTimer = 0;
            ch.wanderTimer = 2 + Math.random() * 3;
            ch.wanderCount = 0;
            ch.dir = DIR_DOWN;
          }
        } else if (ch.state === ST_IDLE) {
          ch.frame = 0;
          ch.wanderTimer -= dt;
          if (ch.wanderTimer <= 0) {
            const wanderLimit = 2 + Math.floor(Math.random() * 2);
            if (ch.wanderCount >= wanderLimit) {
              // Return to seat
              const unblock = new Set();
              unblock.add(`${ch.seat.col},${ch.seat.row}`);
              const path = findPath(ch.tileCol, ch.tileRow, ch.seat.col, ch.seat.row, unblock);
              if (path.length > 0) {
                ch.path = path; ch.moveProgress = 0;
                ch.state = ST_WALK; ch.frame = 0; ch.frameTimer = 0;
                return;
              }
            }
            // Wander in current room area or across rooms
            const allWalkable = getWalkable('all');
            const target = allWalkable[Math.floor(Math.random() * allWalkable.length)];
            const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row);
            if (path.length > 0 && path.length < 25) {
              ch.path = path; ch.moveProgress = 0;
              ch.state = ST_WALK; ch.frame = 0; ch.frameTimer = 0;
              ch.wanderCount++;
            }
            ch.wanderTimer = 2 + Math.random() * 4;
          }
        } else if (ch.state === ST_WALK) {
          if (ch.frameTimer >= WALK_FRAME_DUR) {
            ch.frameTimer -= WALK_FRAME_DUR;
            ch.frame = (ch.frame + 1) % 4;
          }
          if (ch.path.length === 0) {
            const center = tileCenter(ch.tileCol, ch.tileRow);
            ch.x = center.x; ch.y = center.y;
            if (ch.tileCol === ch.seat.col && ch.tileRow === ch.seat.row) {
              ch.state = ST_TYPE;
              ch.dir = ch.seat.dir;
              ch.frame = 0; ch.frameTimer = 0;
              ch.seatTimer = 5 + Math.random() * 10;
              ch.wanderCount = 0;
              // Bubble on sit
              if (ch.meetingMode) {
                ch.bubbleText = 'Reunião semanal';
                ch.bubbleTime = '';
                ch.bubbleTimer = 4;
              } else {
                const act = charObj.key === 'ceo' ? ceoAct : devAct;
                if (act) {
                  ch.bubbleText = ACTION_SHORT[act.action] || 'Trabalhando…';
                  ch.bubbleTime = timeAgo(act.created_at);
                  ch.bubbleTimer = 3;
                }
              }
            } else {
              ch.state = ST_IDLE;
              ch.wanderTimer = 2 + Math.random() * 3;
            }
            ch.frame = 0; ch.frameTimer = 0;
            return;
          }
          const next = ch.path[0];
          ch.dir = dirBetween(ch.tileCol, ch.tileRow, next.col, next.row);
          ch.moveProgress += (WALK_SPEED / TILE) * dt;
          const from = tileCenter(ch.tileCol, ch.tileRow);
          const to = tileCenter(next.col, next.row);
          const t = Math.min(ch.moveProgress, 1);
          ch.x = from.x + (to.x - from.x) * t;
          ch.y = from.y + (to.y - from.y) * t;
          if (ch.moveProgress >= 1) {
            ch.tileCol = next.col; ch.tileRow = next.row;
            ch.x = to.x; ch.y = to.y;
            ch.path.shift(); ch.moveProgress = 0;
          }
        }
      }

      // ── Trigger meeting ────────────────────────
      function triggerMeeting() {
        const meetSeats = [SEATS.meetCeo, SEATS.meetDev];
        chars.forEach((charObj, i) => {
          const ch = charObj.ch;
          ch.meetingMode = true;
          ch.seat = meetSeats[i];
          const unblock = new Set();
          unblock.add(`${ch.seat.col},${ch.seat.row}`);
          const path = findPath(ch.tileCol, ch.tileRow, ch.seat.col, ch.seat.row, unblock);
          if (path.length > 0) {
            ch.path = path; ch.moveProgress = 0;
            ch.state = ST_WALK; ch.frame = 0; ch.frameTimer = 0;
          }
          ch.bubbleText = 'Indo pra reunião…';
          ch.bubbleTime = '';
          ch.bubbleTimer = 3;
        });
      }

      // ── Pre-render floor ───────────────────────
      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = W; floorCanvas.height = H;
      const floorCtx = floorCanvas.getContext('2d');
      const wallColor = '#1e2230';
      const wallTrim = '#2a2e42';

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = TILE_MAP[r][c];
          if (tile < 0) {
            floorCtx.fillStyle = wallColor;
            floorCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
            // Trim on bottom wall edges
            if (r + 1 < ROWS && TILE_MAP[r + 1]?.[c] >= 0) {
              floorCtx.fillStyle = wallTrim;
              floorCtx.fillRect(c * TILE, r * TILE + TILE - 2, TILE, 2);
            }
          } else {
            const fImg = floorImgs[tile];
            if (fImg) {
              floorCtx.drawImage(fImg, c * TILE, r * TILE, TILE, TILE);
            } else {
              floorCtx.fillStyle = '#4a4030';
              floorCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
            }
          }
        }
      }

      // ── Resize ─────────────────────────────────
      const resize = () => {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const displayW = rect.width;
        const displayH = displayW * H / W;
        canvas.width = W * ZOOM * dpr;
        canvas.height = H * ZOOM * dpr;
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
      };
      resize();
      window.addEventListener('resize', resize);

      const ctx = canvas.getContext('2d');
      let lastTime = 0;
      let pcAnimTimer = 0;

      // ── Draw loop ──────────────────────────────
      const draw = (timestamp) => {
        if (destroyed) return;
        const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
        lastTime = timestamp;
        pcAnimTimer += dt;

        // Meeting trigger on Friday
        if (meetingTimer > 0) {
          meetingTimer -= dt;
          if (meetingTimer <= 0 && !meetingTriggered) {
            meetingTriggered = true;
            triggerMeeting();
          }
        }

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(ZOOM * dpr, 0, 0, ZOOM * dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;

        // Floor
        ctx.drawImage(floorCanvas, 0, 0);

        // Room labels
        ctx.globalAlpha = 0.25;
        for (const label of ROOM_LABELS) {
          ctx.font = 'bold 5px monospace';
          ctx.fillStyle = label.color;
          const tw = ctx.measureText(label.text).width;
          ctx.fillText(label.text, label.x * TILE - tw / 2, label.y * TILE + 6);
        }
        ctx.globalAlpha = 1;

        // ── Build z-sorted drawables ─────────────
        const drawables = [];

        // Furniture
        for (const f of FURNITURE) {
          const dims = DIMS[f.key];
          if (!dims) continue;
          let img;
          if (f.key === 'PC_FRONT') {
            const fi = Math.floor(pcAnimTimer / 0.5) % 3;
            img = furnitureImgs[`PC_FRONT_${fi + 1}`];
          } else {
            img = furnitureImgs[f.key];
          }
          if (!img) continue;

          const px = f.col * TILE;
          const py = (f.row + 1) * TILE - dims.h;
          const zY = (f.row + dims.fpH - dims.bgTiles) * TILE;
          const mirrored = f.mirror;

          drawables.push({
            zY,
            draw: () => {
              if (mirrored) {
                ctx.save();
                ctx.translate(px + dims.w, py);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                ctx.restore();
              } else {
                ctx.drawImage(img, px, py);
              }
            },
          });
        }

        // Characters
        for (const charObj of chars) {
          const ch = charObj.ch;
          updateChar(charObj, dt);
          const sprite = getSprite(ch);
          if (!sprite) continue;
          const sittingOff = ch.state === ST_TYPE ? 4 : 0;
          const drawX = Math.round(ch.x - CHAR_W / 2);
          const drawY = Math.round(ch.y + sittingOff - CHAR_H);
          const zY = ch.y + TILE / 2 + 2;
          drawables.push({
            zY,
            draw: () => ctx.drawImage(sprite, drawX, drawY),
          });
        }

        // Z-sort and draw
        drawables.sort((a, b) => a.zY - b.zY);
        for (const d of drawables) d.draw();

        // ── Speech bubbles ───────────────────────
        for (const charObj of chars) {
          const ch = charObj.ch;
          if (ch.bubbleTimer <= 0 || !ch.bubbleText) continue;
          const alpha = Math.min(1, ch.bubbleTimer / 0.5);
          ctx.globalAlpha = alpha;
          const bx = Math.round(ch.x);
          const sOff = ch.state === ST_TYPE ? 4 : 0;
          const by = Math.round(ch.y + sOff - CHAR_H - 4);
          ctx.font = '4px monospace';
          const tw = Math.min(ctx.measureText(ch.bubbleText).width + 6, 70);
          const bh = ch.bubbleTime ? 12 : 8;
          const bLeft = bx - tw / 2;
          ctx.fillStyle = '#22252fee';
          ctx.fillRect(bLeft, by - bh, tw, bh);
          ctx.strokeStyle = '#3a3e50';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(bLeft, by - bh, tw, bh);
          ctx.fillStyle = '#22252fee';
          ctx.fillRect(bx - 1, by, 3, 2);
          ctx.fillStyle = '#e8e8e8';
          ctx.font = '4px monospace';
          ctx.fillText(ch.bubbleText, bLeft + 3, by - bh + 5, tw - 6);
          if (ch.bubbleTime) {
            ctx.fillStyle = '#777';
            ctx.font = '3px monospace';
            ctx.fillText(ch.bubbleTime, bLeft + 3, by - bh + 10);
          }
          ctx.globalAlpha = 1;
        }

        // ── Character labels ─────────────────────
        const labels = ['CEO', 'Dev'];
        const labelColors = ['#a78bfa', '#60a5fa'];
        chars.forEach((charObj, i) => {
          const ch = charObj.ch;
          const label = labels[i];
          const lx = Math.round(ch.x);
          const ly = Math.round(ch.y + (ch.state === ST_TYPE ? 4 : 0) + 4);
          ctx.font = 'bold 4px monospace';
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(lx - tw / 2 - 2, ly - 3, tw + 4, 7);
          ctx.fillStyle = labelColors[i];
          ctx.fillText(label, lx - tw / 2, ly + 1);
        });

        // ── Music notes in lounge ────────────────
        const notePhase = (pcAnimTimer * 0.5) % 1;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#6aaa64';
        ctx.font = '5px serif';
        const noteX = 22 * TILE + Math.sin(pcAnimTimer * 1.5) * 4;
        const noteY = 15 * TILE - notePhase * 8;
        ctx.fillText('♪', noteX, noteY);
        ctx.fillText('♫', noteX + 10, noteY - 4 + Math.sin(pcAnimTimer * 2) * 2);
        ctx.globalAlpha = 1;

        // ── Debug grid overlay ──────────────────
        if (debugMode) {
          ctx.globalAlpha = 0.15;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 0.5;
          for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(W, r * TILE); ctx.stroke();
          }
          for (let c = 0; c <= COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, H); ctx.stroke();
          }
          ctx.globalAlpha = 0.3;
          ctx.font = '3px monospace';
          ctx.fillStyle = '#fff';
          // Show coordinates every 2 tiles
          for (let r = 0; r < ROWS; r += 2) {
            for (let c = 0; c < COLS; c += 2) {
              ctx.fillText(`${c},${r}`, c * TILE + 1, r * TILE + 4);
            }
          }
          // Blocked tiles
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#f44';
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (BLOCKED.has(`${c},${r}`)) {
                ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
              }
            }
          }
          // Hovered tile highlight
          if (hoverTile) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#0ff';
            ctx.fillRect(hoverTile.col * TILE, hoverTile.row * TILE, TILE, TILE);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 4px monospace';
            const label = `col:${hoverTile.col} row:${hoverTile.row}`;
            const tileType = TILE_MAP[hoverTile.row]?.[hoverTile.col];
            const info = `${label} (${tileType < 0 ? 'wall' : `floor:${tileType}`}${BLOCKED.has(`${hoverTile.col},${hoverTile.row}`) ? ' BLOCKED' : ''})`;
            ctx.fillText(info, 2, H - 3);
          }
          ctx.globalAlpha = 1;
        }

        rafId = requestAnimationFrame(draw);
      };

      rafId = requestAnimationFrame(draw);

      // ── Debug mode: double-click toggle ─────
      const onDblClick = () => { debugMode = !debugMode; };
      const onMouseMove = (e) => {
        if (!debugMode) { hoverTile = null; return; }
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        hoverTile = { col: Math.floor(mx / TILE), row: Math.floor(my / TILE) };
      };
      const onMouseLeave = () => { hoverTile = null; };
      canvas.addEventListener('dblclick', onDblClick);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseleave', onMouseLeave);

      canvas._cleanup = () => {
        destroyed = true;
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('dblclick', onDblClick);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseleave', onMouseLeave);
        if (rafId) cancelAnimationFrame(rafId);
      };
    })();

    return () => { if (canvas._cleanup) canvas._cleanup(); };
  }, [activities]);

  return (
    <div ref={containerRef} className="w-full mb-5 rounded-lg overflow-hidden border"
      style={{ borderColor: '#2c2f3a' }}>
      <canvas ref={canvasRef} className="w-full block"
        style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

export default PixelAgents;
