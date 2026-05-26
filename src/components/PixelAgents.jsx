import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ═══════════════════════════════════════════════════════════════════════════════
   PIXEL AGENTS — Multi-room pixel art office
   4 rooms: CEO Office, Dev Room, Meeting Room, Lounge
   PNG sprites from pixel-agents-hq/pixel-agents
   ═══════════════════════════════════════════════════════════════════════════════ */

const TILE = 16;
const ZOOM = 3;
const COLS = 28;
const ROWS = 17;
const W = COLS * TILE;
const H = ROWS * TILE;
const CHAR_W = 16;
const CHAR_H = 32;
const FRAMES_PER_ROW = 7;

// Directions & states
const DIR_DOWN = 0, DIR_UP = 1, DIR_RIGHT = 2, DIR_LEFT = 3;
const ST_TYPE = 0, ST_IDLE = 1, ST_WALK = 2;

// Goal types for NPC Simulation
const GOAL_WORK = 'work';
const GOAL_COFFEE = 'coffee';
const GOAL_REST = 'rest';
const GOAL_PLANT = 'plant';
const GOAL_WHITEBOARD = 'whiteboard';
const GOAL_MEETING = 'meeting';

// Timing constants
const WALK_SPEED = 20; // Slower walking speed
const TYPE_FRAME_DUR = 0.4;
const WALK_FRAME_DUR = 0.20; // Slower walking animation frames

const BASE = '/assets/pixel-agents/';
const LOUNGE_FLOOR = 4; // Grid tile pattern with warm orange tint

// ─── Word Wrap for Canvas Speech Bubbles ─────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// ─── Bubble Path and Rounded Rect for Canvas Speech Bubbles ───────────────────
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBubblePath(ctx, x, y, w, h, radius, px, py) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  
  // Bottom pointer at px, py (py is pointer tip, px is pointer center)
  // Arrow width is 12px (from px - 6 to px + 6), height is 6px (from y + h to py)
  ctx.lineTo(Math.min(x + w - radius, px + 6), y + h);
  ctx.lineTo(px, py);
  ctx.lineTo(Math.max(x + radius, px - 6), y + h);
  
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ─── Check if today is Friday in Brasília Timezone ────────────────────────────
function isFridayBrasilia() {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long'
    });
    return formatter.format(new Date()) === 'Friday';
  } catch (e) {
    return new Date().getDay() === 5;
  }
}

// ─── Dialog Generation from Kanban Cards ─────────────────────────────────────
function getNPCBubbleText(agentKey, goal, cards) {
  const inProgress = cards.filter(c => c.status === 'in_progress');
  const todo = cards.filter(c => c.status === 'todo' || c.status === 'backlog');

  const randEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (goal === GOAL_WORK) {
    if (agentKey === 'dev') {
      if (inProgress.length > 0 && Math.random() < 0.6) {
        const c = randEl(inProgress);
        return randEl([
          `Codando o card: "${c.title}"`,
          `Arrumando bugs em "${c.title}"...`,
          `Quase finalizando "${c.title}"!`
        ]);
      }
      if (todo.length > 0 && Math.random() < 0.4) {
        const c = randEl(todo);
        return `Analisando requisitos de "${c.title}".`;
      }
      return randEl([
        "Refatorando algumas funções...",
        "Escrevendo testes unitários.",
        "Acho que o build passou!",
        "Limpando o console.log do código...",
        "Commitando alterações de performance."
      ]);
    } else { // ceo
      if (todo.length > 0 && Math.random() < 0.6) {
        const c = randEl(todo);
        return randEl([
          `Priorizando "${c.title}" no backlog.`,
          `Esse card "${c.title}" vai ajudar na receita.`
        ]);
      }
      return randEl([
        "Analisando métricas de acesso diário...",
        "Revisando o planejamento financeiro.",
        "Planejando o próximo sprint...",
        "Lendo o feedback dos usuários de hoje.",
        "A meta é tornar o Kinto rentável!"
      ]);
    }
  }

  if (goal === GOAL_COFFEE) {
    if (agentKey === 'dev') {
      return randEl([
        "Mais cafeína, por favor!",
        "Sem café, sem código.",
        "Preparando um café bem forte...",
        "Esse café está cheiroso!"
      ]);
    } else {
      return randEl([
        "Uma pausa para o café do CEO.",
        "Café ajuda a clarear as ideias.",
        "Hora de um cafezinho expresso."
      ]);
    }
  }

  if (goal === GOAL_REST) {
    if (agentKey === 'dev') {
      return randEl([
        "Cinco minutinhos de descanso...",
        "Que sofá aconchegante.",
        "Vou cochilar um pouquinho... zZz"
      ]);
    } else {
      return randEl([
        "Lendo relatórios no celular...",
        "Bela sala de convivência.",
        "Uma pausa estratégica para descansar."
      ]);
    }
  }

  if (goal === GOAL_PLANT) {
    if (agentKey === 'dev') {
      return randEl([
        "Regando as plantinhas...",
        "Elas deixam o escritório mais vivo.",
        "Um pouco de água para você!"
      ]);
    } else {
      return randEl([
        "Inspecionando a vegetação local.",
        "O escritório está bem verde hoje.",
        "Essa planta está crescendo rápido."
      ]);
    }
  }

  if (goal === GOAL_WHITEBOARD) {
    if (agentKey === 'dev') {
      return randEl([
        "Esboçando a arquitetura do banco...",
        "Vejamos o fluxo de requisições.",
        "Aqui vai um diagrama de blocos..."
      ]);
    } else {
      return randEl([
        "Escrevendo metas na lousa...",
        "Roadmap de 6 meses no quadro.",
        "Metas semanais desenhadas!"
      ]);
    }
  }

  return null;
}

// ─── Asset helpers ──────────────────────────────────────────────────────────
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

// ─── Room layout builder ────────────────────────────────────────────────────
function buildTileMap(loungeFloorId) {
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      // Outer boundaries
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        row.push(-1); continue;
      }
      
      // Top wall (row 1)
      if (r === 1) {
        row.push(-1); continue;
      }
      
      // CEO Room: cols 1-8, rows 2-7, floor 5 (brick)
      if (r >= 2 && r <= 7 && c >= 1 && c <= 8) {
        row.push(5); continue;
      }
      
      // Dev Room: cols 1-8, rows 9-15, floor 3 (tile grid)
      if (r >= 9 && r <= 15 && c >= 1 && c <= 8) {
        row.push(3); continue;
      }
      
      // Meeting Room: cols 19-25, rows 2-7, floor 8 (dark checker)
      if (r >= 2 && r <= 7 && c >= 19 && c <= 25) {
        row.push(8); continue;
      }
      
      // Vertical wall col 9: separates CEO/Dev from Lounge
      if (c === 9) {
        // Doors: CEO→Lounge (row 4), Dev→Lounge (row 12)
        if (r === 4 || r === 12) {
          row.push(loungeFloorId); continue;
        }
        row.push(-1); continue;
      }
      
      // Horizontal wall row 8, cols 0-9: separates CEO from Dev Room
      if (r === 8 && c <= 9) {
        row.push(-1); continue;
      }
      
      // Meeting left wall: col 18, rows 2-7
      if (c === 18 && r >= 2 && r <= 7) {
        // Door at row 4
        if (r === 4) {
          row.push(loungeFloorId); continue;
        }
        row.push(-1); continue;
      }
      
      // Meeting bottom wall: row 8, cols 18-27
      if (r === 8 && c >= 18 && c <= 27) {
        row.push(-1); continue;
      }
      
      // Lounge L-shape: cols 10-17 rows 2-15 + cols 18-26 rows 9-15
      if ((c >= 10 && c <= 17 && r >= 2 && r <= 15) ||
          (c >= 18 && c <= 26 && r >= 9 && r <= 15)) {
        row.push(loungeFloorId); continue;
      }
      
      // Everything else is wall
      row.push(-1);
    }
    map.push(row);
  }
  return map;
}

// ─── Furniture definitions ──────────────────────────────────────────────────
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
  // ── CEO Office (cols 1-8, rows 2-7) ──
  { key: 'DESK_FRONT',  col: 3, row: 4 },
  { key: 'PC_FRONT',    col: 4, row: 4 },
  { key: 'CHAIR_BACK',  col: 4, row: 6 },
  { key: 'LARGE_PAINTING', col: 2, row: 1 },
  { key: 'BOOKSHELF',   col: 6, row: 1 },
  { key: 'PLANT',       col: 1, row: 2 },
  { key: 'SMALL_TABLE_FRONT', col: 7, row: 6 },
  { key: 'COFFEE',      col: 7, row: 6 },
  { key: 'BIN',         col: 8, row: 5 },

  // ── Meeting Room (cols 19-25, rows 2-7) ──
  { key: 'TABLE_FRONT', col: 21, row: 5 },
  { key: 'WHITEBOARD',  col: 22, row: 1 },
  { key: 'CHAIR_SIDE',  col: 20, row: 3 },
  { key: 'CHAIR_SIDE',  col: 20, row: 4 },
  { key: 'CHAIR_SIDE',  col: 24, row: 3, mirror: true },
  { key: 'CHAIR_SIDE',  col: 24, row: 4, mirror: true },
  { key: 'CLOCK',       col: 25, row: 1 },
  { key: 'PLANT',       col: 19, row: 2 },

  // ── Dev Room (cols 1-8, rows 9-15) ──
  { key: 'DESK_FRONT',  col: 3, row: 11 },
  { key: 'PC_FRONT',    col: 4, row: 11 },
  { key: 'CHAIR_BACK',  col: 4, row: 13 },
  { key: 'DOUBLE_BOOKSHELF', col: 1, row: 9 },
  { key: 'DOUBLE_BOOKSHELF', col: 4, row: 9 },
  { key: 'CACTUS',      col: 8, row: 10 },
  { key: 'SMALL_PAINTING_2', col: 7, row: 9 },
  { key: 'BIN',         col: 8, row: 15 },

  // ── Lounge L-shape (cols 10-17 rows 2-15 + cols 18-26 rows 9-15) ──
  { key: 'SOFA_FRONT',  col: 11, row: 2 },
  { key: 'COFFEE_TABLE', col: 11, row: 4 },
  { key: 'SOFA_FRONT',  col: 11, row: 6 },
  { key: 'DESK_FRONT',  col: 15, row: 2 }, // Coffee station support table (covers 15, 16, 17)
  { key: 'COFFEE',      col: 15, row: 2 },
  { key: 'COFFEE',      col: 16, row: 2 },
  { key: 'SMALL_PAINTING', col: 14, row: 1 },
  { key: 'PLANT_2',     col: 10, row: 2 },

  { key: 'SOFA_FRONT',  col: 11, row: 10 },
  { key: 'SMALL_TABLE_FRONT', col: 13, row: 10 },
  { key: 'PLANT',       col: 10, row: 14 },


  { key: 'SOFA_FRONT',  col: 19, row: 10 },
  { key: 'COFFEE_TABLE', col: 19, row: 12 },
  { key: 'SOFA_FRONT',  col: 19, row: 14 },

  { key: 'LARGE_PLANT', col: 25, row: 11 },

  { key: 'CUSHIONED_BENCH', col: 25, row: 14 },
  { key: 'CUSHIONED_BENCH', col: 26, row: 14 },
  { key: 'SMALL_TABLE_FRONT', col: 25, row: 15 },
  { key: 'COFFEE',      col: 25, row: 15 },
  { key: 'SMALL_PAINTING', col: 22, row: 9 },
];

// ─── Blocked tiles (Dynamically populated based on furniture footprints) ─────
const BLOCKED = new Set();
function blockRect(c, r, w, h) {
  for (let dr = 0; dr < h; dr++)
    for (let dc = 0; dc < w; dc++)
      BLOCKED.add(`${c + dc},${r + dr}`);
}

 // Automatically block tiles where furniture objects are placed
 for (const f of FURNITURE) {
   const dims = DIMS[f.key];
   if (!dims) continue;
 
   const isWallDecor = ['LARGE_PAINTING', 'SMALL_PAINTING', 'SMALL_PAINTING_2', 'CLOCK', 'WHITEBOARD', 'HANGING_PLANT'].includes(f.key);
   const isTableItem = ['COFFEE', 'POT'].includes(f.key);
 
   if (!isWallDecor && !isTableItem) {
     if (f.key === 'TABLE_FRONT') {
       // TABLE_FRONT is drawn shifted up by 3 tiles relative to its anchor row.
       // We block rows f.row - 3 to f.row to match the visual position.
       blockRect(f.col, f.row - 3, dims.fpW, dims.fpH);
     } else {
       blockRect(f.col, f.row, dims.fpW, dims.fpH);
     }
   }
 }

// Pathfinding Helpers
function isTileWalkable(col, row, tileMap) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (tileMap[row]?.[col] < 0) return false;
  if (BLOCKED.has(`${col},${row}`)) return false;
  return true;
}

function findPath(sc, sr, ec, er, tileMap, extraUnblock) {
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
      const isTarget = nc === ec && nr === er;
      const isUnblocked = extraUnblock && extraUnblock.has(k);
      if (!isTarget && !isUnblocked && !isTileWalkable(nc, nr, tileMap)) continue;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (tileMap[nr]?.[nc] < 0 && !isTarget && !isUnblocked) continue;
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

// Dynamic dialogue generator from Kanban cards
function generateDynamicMeetingDialog(cards) {
  const todo = (cards || []).filter(c => c.status === 'todo' || c.status === 'backlog');
  const inProgress = (cards || []).filter(c => c.status === 'in_progress');
  
  const randEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const steps = [];

  // Step 1: Greeting
  steps.push({
    speaker: 'ceo',
    text: randEl([
      "Olá! Vamos fazer um alinhamento rápido sobre as tarefas?",
      "Oi! Tem um tempinho para passar os cards do Kanban?",
      "Olá! Vamos alinhar o progresso das demandas?"
    ])
  });

  steps.push({
    speaker: 'dev',
    text: randEl([
      "Opa! Vamos sim. O que temos pendente?",
      "Claro! Vamos dar uma olhada no quadro.",
      "Com certeza! Vamos repassar o andamento."
    ])
  });

  // Step 2: Discuss In Progress card (if any)
  if (inProgress.length > 0) {
    const c = randEl(inProgress);
    steps.push({
      speaker: 'ceo',
      text: randEl([
        `Como está o andamento de "${c.title}"?`,
        `Estou acompanhando o card "${c.title}". Algum impedimento?`,
        `Consegue finalizar "${c.title}" hoje?`
      ])
    });

    steps.push({
      speaker: 'dev',
      text: randEl([
        `Estou focado em terminar o card: "${c.title}". Quase lá!`,
        `Sem impedimentos em "${c.title}", logo mais entra em code review.`,
        `Tive alguns desafios em "${c.title}", mas já estou resolvendo.`
      ])
    });
  } else {
    steps.push({
      speaker: 'ceo',
      text: "Notei que não temos nenhum card marcado como 'Em Andamento' no momento."
    });
    steps.push({
      speaker: 'dev',
      text: "Verdade, vou puxar a próxima tarefa do backlog agora mesmo."
    });
  }

  // Step 3: Discuss Todo/Backlog card (if any)
  if (todo.length > 0) {
    const c = randEl(todo);
    steps.push({
      speaker: 'ceo',
      text: randEl([
        `E sobre "${c.title}"? É uma prioridade alta para o projeto.`,
        `Temos também "${c.title}" no backlog. Podemos focar nele a seguir?`,
        `Não se esqueça de "${c.title}", é bem importante para a entrega.`
      ])
    });

    steps.push({
      speaker: 'dev',
      text: randEl([
        `Certo! Assim que liberar o card atual, vou pegar "${c.title}".`,
        `Entendido, vou iniciar "${c.title}" na sequência.`,
        `Vou analisar os requisitos de "${c.title}" hoje à tarde.`
      ])
    });
  }

  // Step 4: Closing
  steps.push({
    speaker: 'ceo',
    text: randEl([
      "Excelente! Bom trabalho. Vamos manter o foco.",
      "Perfeito, qualquer dúvida me avisa no chat.",
      "Ótimo alinhamento! Reunião encerrada."
    ])
  });

  steps.push({
    speaker: 'dev',
    text: randEl([
      "Valeu! Vou voltar para o código.",
      "Show! Qualquer novidade eu aviso.",
      "Beleza, bom trabalho para nós!"
    ])
  });

  return steps;
}

const ROOM_LABELS = [
  { text: 'CEO', x: 4.5, y: 2.5, color: '#a78bfa' },
  { text: 'Reunião', x: 22, y: 2.5, color: '#60a5fa' },
  { text: 'Dev', x: 4.5, y: 9.5, color: '#60a5fa' },
  { text: 'Lounge', x: 14, y: 9.5, color: '#6aaa64' },
];

const PixelAgents = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // States
  const [loading, setLoading] = useState(true);
  const [kanbanCards, setKanbanCards] = useState([]);

  // Mutable refs for rendering loop
  const cardsRef = useRef([]);
  const charsRef = useRef(null);

  // Load kanban cards on mount
  useEffect(() => {
    if (!supabase) {
      setKanbanCards([]);
      return;
    }
    supabase
      .from('kanban_cards')
      .select('title, status')
      .then(({ data }) => {
        if (data) {
          setKanbanCards(data);
          cardsRef.current = data;
        }
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let rafId = null;
    let destroyed = false;
    let debugMode = false;
    let hoverTile = null;

    const TILE_MAP = buildTileMap(LOUNGE_FLOOR);

    const SEATS = {
      ceo:  { col: 4, row: 6, dir: DIR_UP, room: 'ceo' },
      dev:  { col: 4, row: 13, dir: DIR_UP, room: 'dev' },
      meetCeo: { col: 24, row: 4, dir: DIR_LEFT, room: 'meeting' },
      meetDev: { col: 20, row: 4, dir: DIR_RIGHT, room: 'meeting' },
    };

    (async () => {
      setLoading(true);

      // Load characters
      const [charDevImg, charCeoImg] = await Promise.all([
        loadImg('characters/char_0.png'),
        loadImg('characters/char_1.png'),
      ]);

      // Load floor sprites (0-8)
      const floorPromises = [];
      for (let i = 0; i <= 8; i++) floorPromises.push(loadImg(`floors/floor_${i}.png`));
      const floorArr = await Promise.all(floorPromises);
      const floorImgs = {};
      floorArr.forEach((img, i) => { floorImgs[i] = img; });

      // Load furniture sprites
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
      setLoading(false);

      const devFrames = extractCharFrames(charDevImg);
      const ceoFrames = extractCharFrames(charCeoImg);

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
          currentGoal: GOAL_WORK,
          goalTarget: seat,
          goalActionTimer: 18 + Math.random() * 15,
          bubbleText: '', bubbleTimer: 0,
          meetingMode: false,
        };
      }

      // Initialize character list if not present
      if (!charsRef.current) {
        charsRef.current = [
          { key: 'ceo', ch: makeChar(ceoFrames, SEATS.ceo) },
          { key: 'dev', ch: makeChar(devFrames, SEATS.dev) },
        ];
      } else {
        charsRef.current[0].ch.frames = ceoFrames;
        charsRef.current[1].ch.frames = devFrames;
      }

      const chars = charsRef.current;

      const isFriday = isFridayBrasilia();

      // ─── Meeting schedule ──────────────────────────────────────────────────
      let activeMeetingSteps = [];
      let meetingTimer = isFriday
        ? 25 + Math.random() * 20        // Friday: 25-45s
        : 240 + Math.random() * 120;     // Other days: 4-6 minutes

      // ─── Goal Decider for NPC Simulator ────────────────────────────────────
      function chooseNewGoal(charObj) {
        const ch = charObj.ch;
        const key = charObj.key;
        if (ch.meetingMode) return;

        const rand = Math.random();
        let nextGoal = GOAL_WORK;
        let target = ch.homeSeat;

        if (key === 'dev') {
          if (rand < 0.45) {
            nextGoal = GOAL_WORK;
            target = SEATS.dev;
          } else if (rand < 0.65) {
            nextGoal = GOAL_COFFEE;
            // Target is a tile in front of the coffee table (row 3), not on it (row 2)
            target = { col: 15 + Math.floor(Math.random() * 3), row: 3 };
          } else if (rand < 0.85) {
            nextGoal = GOAL_REST;
            const sofas = [{ col: 11, row: 2 }, { col: 11, row: 6 }, { col: 11, row: 10 }, { col: 19, row: 10 }];
            target = sofas[Math.floor(Math.random() * sofas.length)];
          } else {
            nextGoal = GOAL_PLANT;
            const plantTargets = [
              { col: 2, row: 2, dir: DIR_LEFT },    // CEO room plant
              { col: 11, row: 14, dir: DIR_LEFT },  // Lounge bottom-left plant
              { col: 24, row: 11, dir: DIR_RIGHT }  // Lounge bottom-right large plant (row 11)
            ];
            const choice = plantTargets[Math.floor(Math.random() * plantTargets.length)];
            target = { col: choice.col, row: choice.row, faceDir: choice.dir };
          }
        } else { // ceo
          if (rand < 0.50) {
            nextGoal = GOAL_WORK;
            target = SEATS.ceo;
          } else if (rand < 0.65) {
            nextGoal = GOAL_COFFEE;
            target = { col: 15 + Math.floor(Math.random() * 3), row: 3 };
          } else if (rand < 0.85) {
            nextGoal = GOAL_REST;
            const sofas = [{ col: 11, row: 2 }, { col: 19, row: 10 }];
            target = sofas[Math.floor(Math.random() * sofas.length)];
          } else {
            nextGoal = GOAL_PLANT;
            const plantTargets = [
              { col: 2, row: 2, dir: DIR_LEFT },    // CEO Room plant
              { col: 24, row: 11, dir: DIR_RIGHT }  // Lounge bottom-right large plant (row 11)
            ];
            const choice = plantTargets[Math.floor(Math.random() * plantTargets.length)];
            target = { col: choice.col, row: choice.row, faceDir: choice.dir };
          }
        }

        ch.currentGoal = nextGoal;
        ch.goalTarget = target;

        const unblock = new Set();
        unblock.add(`${target.col},${target.row}`);
        const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, TILE_MAP, unblock);
        if (path.length > 0) {
          ch.path = path;
          ch.moveProgress = 0;
          ch.state = ST_WALK;
        } else {
          ch.state = ST_IDLE;
          ch.goalActionTimer = 3;
        }
      }

      function onArriveAtTarget(charObj) {
        const ch = charObj.ch;
        const key = charObj.key;
        ch.moveProgress = 0;
        ch.path = [];

        if (ch.currentGoal === GOAL_WORK) {
          ch.state = ST_TYPE;
          ch.dir = ch.seat.dir;
          ch.goalActionTimer = 18 + Math.random() * 15;
        } else {
          ch.state = ST_IDLE;
          if (ch.currentGoal === GOAL_REST) {
            ch.dir = DIR_DOWN;
            ch.goalActionTimer = 15 + Math.random() * 15;
          } else if (ch.currentGoal === GOAL_COFFEE) {
            ch.dir = DIR_UP; // face the coffee counter
            ch.goalActionTimer = 10 + Math.random() * 10;
          } else if (ch.currentGoal === GOAL_PLANT) {
            ch.dir = ch.goalTarget.faceDir !== undefined ? ch.goalTarget.faceDir : DIR_UP;
            ch.goalActionTimer = 8 + Math.random() * 10;
          } else if (ch.currentGoal === GOAL_WHITEBOARD) {
            ch.dir = DIR_UP;
            ch.goalActionTimer = 12 + Math.random() * 12;
          } else if (ch.currentGoal === GOAL_MEETING) {
            ch.dir = ch.seat.dir;
            ch.goalActionTimer = 999;
          }
        }

        const msg = getNPCBubbleText(key, ch.currentGoal, cardsRef.current);
        if (msg) {
          ch.bubbleText = msg;
          ch.bubbleTimer = 6.5;
        }
      }

      function triggerMeeting() {
        if (meetingActive) return;
        meetingActive = true;
        meetingStep = 0;
        meetingStepTimer = 3.0;

        activeMeetingSteps = generateDynamicMeetingDialog(cardsRef.current);

        chars.forEach((charObj, i) => {
          const ch = charObj.ch;
          ch.meetingMode = true;
          ch.currentGoal = GOAL_MEETING;
          ch.seat = i === 0 ? SEATS.meetCeo : SEATS.meetDev;
          ch.goalTarget = ch.seat;

          const unblock = new Set();
          unblock.add(`${ch.seat.col},${ch.seat.row}`);
          const path = findPath(ch.tileCol, ch.tileRow, ch.seat.col, ch.seat.row, TILE_MAP, unblock);
          if (path.length > 0) {
            ch.path = path;
            ch.moveProgress = 0;
            ch.state = ST_WALK;
          } else {
            ch.state = ST_IDLE;
            ch.dir = ch.seat.dir;
          }
          ch.bubbleText = "Indo alinhar no quadro...";
          ch.bubbleTimer = 4.5;
        });
      }

      // ─── Character state machine updater ───────────────────────────────────
      function updateChar(charObj, dt) {
        const ch = charObj.ch;
        ch.frameTimer += dt;
        ch.bubbleTimer = Math.max(0, ch.bubbleTimer - dt);

        if (ch.state === ST_TYPE) {
          if (ch.frameTimer >= TYPE_FRAME_DUR) {
            ch.frameTimer -= TYPE_FRAME_DUR;
            ch.frame = (ch.frame + 1) % 2;
          }
          ch.goalActionTimer -= dt;
          if (ch.goalActionTimer <= 0) {
            ch.state = ST_IDLE;
            ch.goalActionTimer = 3 + Math.random() * 4;
            ch.currentGoal = 'thinking';
          }
        } else if (ch.state === ST_IDLE) {
          ch.frame = 0;
          if (ch.currentGoal === GOAL_MEETING) {
            return;
          }
          ch.goalActionTimer -= dt;
          if (ch.goalActionTimer <= 0) {
            if (ch.currentGoal === 'thinking') {
              chooseNewGoal(charObj);
            } else {
              ch.state = ST_IDLE;
              ch.goalActionTimer = 3 + Math.random() * 4;
              ch.currentGoal = 'thinking';
            }
          }
        } else if (ch.state === ST_WALK) {
          if (ch.frameTimer >= WALK_FRAME_DUR) {
            ch.frameTimer -= WALK_FRAME_DUR;
            ch.frame = (ch.frame + 1) % 4;
          }
          if (ch.path.length === 0) {
            const center = tileCenter(ch.tileCol, ch.tileRow);
            ch.x = center.x; ch.y = center.y;
            onArriveAtTarget(charObj);
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

      // ─── Meeting controller ────────────────────────────────────────────────
      let meetingActive = false;
      let meetingStep = 0;
      let meetingStepTimer = 0;

      function updateMeeting(dt) {
        if (!meetingActive) return;

        const devArrived = chars[1].ch.tileCol === SEATS.meetDev.col && chars[1].ch.tileRow === SEATS.meetDev.row && chars[1].ch.state !== ST_WALK;
        const ceoArrived = chars[0].ch.tileCol === SEATS.meetCeo.col && chars[0].ch.tileRow === SEATS.meetCeo.row && chars[0].ch.state !== ST_WALK;

        if (!devArrived || !ceoArrived) {
          return;
        }

        meetingStepTimer -= dt;
        if (meetingStepTimer <= 0) {
          if (meetingStep < activeMeetingSteps.length) {
            const step = activeMeetingSteps[meetingStep];
            const char = chars.find(c => c.key === step.speaker).ch;

            char.bubbleText = step.text;
            char.bubbleTimer = 6.0;

            meetingStep++;
            meetingStepTimer = 6.3;
          } else {
            meetingActive = false;
            chars.forEach(c => {
              c.ch.meetingMode = false;
              c.ch.bubbleText = "Reunião finalizada! Bom trabalho.";
              c.ch.bubbleTimer = 4.5;
              c.ch.state = ST_IDLE;
              c.ch.goalActionTimer = 4 + Math.random() * 3;
              c.ch.currentGoal = 'thinking';
            });
            // Reset meeting timer for the next sync meeting
            meetingTimer = isFriday
              ? 90 + Math.random() * 60         // Friday: 1.5 to 2.5 minutes
              : 600 + Math.random() * 240;      // Other days: 10 to 14 minutes
          }
        }
      }

      // ─── Lounge Spontaneous Chat Controller ────────────────────────────────
      let loungeChatActive = false;
      let loungeChatSteps = [];
      let loungeChatStep = 0;
      let loungeChatStepTimer = 0;
      let loungeChatCooldown = 30; // initial cooldown of 30 seconds

      function triggerLoungeChat(c1, c2) {
        if (loungeChatActive || meetingActive) return;

        const cards = cardsRef.current || [];
        const inProgress = cards.filter(c => c.status === 'in_progress');
        const done = cards.filter(c => c.status === 'done');
        const randEl = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

        const dialogues = [];
        const type = Math.random();

        if (type < 0.35 && inProgress.length > 0) {
          const c = randEl(inProgress);
          dialogues.push({ speaker: 'ceo', text: `Oi! Vi que você está focado em "${c.title}". Como vai isso?` });
          dialogues.push({ speaker: 'dev', text: `Oi! Está evoluindo bem. Estou finalizando os últimos ajustes.` });
          dialogues.push({ speaker: 'ceo', text: `Excelente, bom trabalho!` });
        } else if (type < 0.60 && done.length > 0) {
          const c = randEl(done);
          dialogues.push({ speaker: 'ceo', text: `Valeu por entregar "${c.title}"! Ficou ótimo.` });
          dialogues.push({ speaker: 'dev', text: `De nada! Foi bem gratificante resolver os desafios dele.` });
          dialogues.push({ speaker: 'ceo', text: `Ficou show. Ajuda demais na nossa meta.` });
        } else if (Math.random() < 0.5) {
          dialogues.push({ speaker: 'dev', text: `Dando uma pausa rápida no Lounge para esticar as pernas.` });
          dialogues.push({ speaker: 'ceo', text: `Isso aí, descansar um pouco limpa a mente para codar.` });
          dialogues.push({ speaker: 'dev', text: `Com certeza. Mais um gole de café e volto pro terminal!` });
        } else {
          dialogues.push({ speaker: 'ceo', text: `Tudo certo por aqui na área de convivência?` });
          dialogues.push({ speaker: 'dev', text: `Tudo ótimo! O café está no ponto e o ambiente bem tranquilo.` });
          dialogues.push({ speaker: 'ceo', text: `Muito bom, aproveite a pausa!` });
        }

        loungeChatActive = true;
        loungeChatSteps = dialogues;
        loungeChatStep = 0;
        loungeChatStepTimer = 0.1; // start immediately

        // Snap to tile centers before facing each other
        const snap1 = tileCenter(c1.tileCol, c1.tileRow);
        c1.x = snap1.x; c1.y = snap1.y;
        const snap2 = tileCenter(c2.tileCol, c2.tileRow);
        c2.x = snap2.x; c2.y = snap2.y;

        // Make characters face each other
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          c1.dir = dx > 0 ? DIR_RIGHT : DIR_LEFT;
          c2.dir = dx > 0 ? DIR_LEFT : DIR_RIGHT;
        } else {
          c1.dir = dy > 0 ? DIR_DOWN : DIR_UP;
          c2.dir = dy > 0 ? DIR_UP : DIR_DOWN;
        }

        // Put them in temporary idle mode during chat
        c1.state = ST_IDLE;
        c1.goalActionTimer = 18;
        c1.path = [];
        c1.moveProgress = 0;

        c2.state = ST_IDLE;
        c2.goalActionTimer = 18;
        c2.path = [];
        c2.moveProgress = 0;
      }

      function updateLoungeChat(dt) {
        if (!loungeChatActive) {
          if (loungeChatCooldown > 0) {
            loungeChatCooldown -= dt;
          } else {
            const c0 = chars[0].ch;
            const c1 = chars[1].ch;

            const tile0 = TILE_MAP[c0.tileRow]?.[c0.tileCol];
            const tile1 = TILE_MAP[c1.tileRow]?.[c1.tileCol];
            if (tile0 === LOUNGE_FLOOR && tile1 === LOUNGE_FLOOR) {
              const dist = Math.abs(c0.tileCol - c1.tileCol) + Math.abs(c0.tileRow - c1.tileRow);
              if (dist <= 3 && !c0.meetingMode && !c1.meetingMode) {
                triggerLoungeChat(c0, c1);
              }
            }
          }
          return;
        }

        loungeChatStepTimer -= dt;
        if (loungeChatStepTimer <= 0) {
          if (loungeChatStep < loungeChatSteps.length) {
            const step = loungeChatSteps[loungeChatStep];
            const char = chars.find(c => c.key === step.speaker).ch;

            char.bubbleText = step.text;
            char.bubbleTimer = 5.0;

            loungeChatStep++;
            loungeChatStepTimer = 5.3;
          } else {
            loungeChatActive = false;
            loungeChatCooldown = 50 + Math.random() * 40; // 50s to 90s cooldown

            chars.forEach(c => {
              c.ch.state = ST_IDLE;
              c.ch.goalActionTimer = 2 + Math.random() * 2;
              c.ch.currentGoal = 'thinking';
            });
          }
        }
      }

      // ─── Pre-render floor ──────────────────────────────────────────────────
      const floorCanvas = document.createElement('canvas');
      floorCanvas.width = W; floorCanvas.height = H;
      const floorCtx = floorCanvas.getContext('2d');
      const wallColor = '#1e2230';
      const wallTrim = '#2a2e42';

      // Temporary canvas for tinting floor tiles
      const tileTempCanvas = document.createElement('canvas');
      tileTempCanvas.width = TILE;
      tileTempCanvas.height = TILE;
      const tileTempCtx = tileTempCanvas.getContext('2d');

      function drawTintedTile(img, x, y, tintColor) {
        if (!img) return;
        tileTempCtx.clearRect(0, 0, TILE, TILE);
        tileTempCtx.drawImage(img, 0, 0, TILE, TILE);
        if (tintColor) {
          tileTempCtx.globalCompositeOperation = 'multiply';
          tileTempCtx.fillStyle = tintColor;
          tileTempCtx.fillRect(0, 0, TILE, TILE);
          tileTempCtx.globalCompositeOperation = 'source-over';
        }
        floorCtx.drawImage(tileTempCanvas, x, y);
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = TILE_MAP[r][c];
          if (tile < 0) {
            floorCtx.fillStyle = wallColor;
            floorCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
            if (r + 1 < ROWS && TILE_MAP[r + 1]?.[c] >= 0) {
              floorCtx.fillStyle = wallTrim;
              floorCtx.fillRect(c * TILE, r * TILE + TILE - 2, TILE, 2);
            }
          } else {
            const fImg = floorImgs[tile];
            let tint = null;
            if (tile === 5) {
              tint = '#b06e5b'; // CEO Room: Terracotta Brick
            } else if (tile === 3) {
              tint = '#5e7c91'; // Dev Room: Tech Slate Blue
            } else if (tile === 8) {
              tint = '#4e5668'; // Meeting Room: Classic Slate Checkers
            } else if (tile === LOUNGE_FLOOR) {
              tint = '#e0984a'; // Lounge Room: Warm Golden-Orange Oakwood
            }
            drawTintedTile(fImg, c * TILE, r * TILE, tint);
          }
        }
      }

      // ─── Canvas Resize ─────────────────────────────────────────────────────
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

      // ─── Draw & Update loop ────────────────────────────────────────────────
      const draw = (timestamp) => {
        if (destroyed) return;
        const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0.016;
        lastTime = timestamp;
        pcAnimTimer += dt;

        // Meeting trigger (periodic sync alignment)
        if (meetingTimer > 0 && !meetingActive) {
          meetingTimer -= dt;
          if (meetingTimer <= 0) {
            triggerMeeting();
          }
        }

        updateMeeting(dt);
        updateLoungeChat(dt);
        for (const charObj of chars) {
          updateChar(charObj, dt);
        }

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(ZOOM * dpr, 0, 0, ZOOM * dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;

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

        // Build Z-Sorted Drawables
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

        drawables.sort((a, b) => a.zY - b.zY);
        for (const d of drawables) d.draw();

        // Speech bubbles & status labels (rendered in high resolution screen space)
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;

        for (const charObj of chars) {
          const ch = charObj.ch;
          if (ch.bubbleTimer <= 0 || !ch.bubbleText) continue;
          
          const alpha = Math.min(1, ch.bubbleTimer / 0.5);
          ctx.globalAlpha = alpha;

          // Convert coordinates to screen space (multiplied by ZOOM)
          const bx = ch.x * ZOOM;
          const sOff = ch.state === ST_TYPE ? 4 : 0;
          const by = (ch.y + sOff - CHAR_H - 1) * ZOOM; // Y position right above head

          ctx.font = '500 16.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
          const maxBubbleWidth = 260; // maximum width in CSS pixels
          const lines = wrapText(ctx, ch.bubbleText, maxBubbleWidth);

          let maxLineWidth = 0;
          for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
          }

          const paddingX = 16;
          const paddingY = 12;
          const tw = maxLineWidth + paddingX * 2;
          const lineHeight = 22;
          const bh = lines.length * lineHeight + paddingY * 2 - 4;
          
          let bLeft = bx - tw / 2;
          // Clamp to screen boundaries (with 10px margin)
          const minLeft = 10;
          const maxLeft = W * ZOOM - tw - 10;
          if (bLeft < minLeft) bLeft = minLeft;
          if (bLeft > maxLeft) bLeft = maxLeft;

          // Clamping bTop to screen boundaries
          let bTop = by - bh - 8; // 8px for pointer height
          if (bTop < 10) bTop = 10;

          // Draw the bubble background with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;

          ctx.fillStyle = '#1e2230'; // Dark elegant background matching office theme
          drawBubblePath(ctx, bLeft, bTop, tw, bh, 6, bx, by);
          ctx.fill();

          // Reset shadow for stroke and text
          ctx.shadowColor = 'transparent';

          ctx.strokeStyle = '#4a4e60';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw text
          ctx.fillStyle = '#f1f5f9';
          ctx.textBaseline = 'top';
          lines.forEach((line, index) => {
            ctx.fillText(line, bLeft + paddingX, bTop + paddingY + lineHeight * index);
          });
        }

        ctx.globalAlpha = 1;

        // Character status labels
        const labels = ['CEO', 'Dev'];
        const labelColors = ['#c0a2ff', '#7cb6ff']; // Soft nice pastel colors
        chars.forEach((charObj, i) => {
          const ch = charObj.ch;
          const label = labels[i];
          
          // Position relative to characters feet (bottom of character sprite)
          const lx = ch.x * ZOOM;
          const ly = (ch.y + (ch.state === ST_TYPE ? 4 : 0) + 3) * ZOOM;
          
          ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
          const tw = ctx.measureText(label).width;
          
          const rw = tw + 10;
          const rh = 18;
          const rx = lx - rw / 2;
          const ry = ly;

          // Capsule background
          ctx.fillStyle = 'rgba(28, 30, 36, 0.85)';
          drawRoundedRect(ctx, rx, ry, rw, rh, 5);
          ctx.fill();
          
          // Capsule border
          ctx.strokeStyle = 'rgba(74, 78, 96, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Capsule text
          ctx.fillStyle = labelColors[i];
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lx - tw / 2, ry + rh / 2);
        });

        ctx.restore();

        // Lounge background music notes effect
        const notePhase = (pcAnimTimer * 0.5) % 1;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#6aaa64';
        ctx.font = '5px serif';
        const noteX = 22 * TILE + Math.sin(pcAnimTimer * 1.5) * 4;
        const noteY = 15 * TILE - notePhase * 8;
        ctx.fillText('♪', noteX, noteY);
        ctx.fillText('♫', noteX + 10, noteY - 4 + Math.sin(pcAnimTimer * 2) * 2);
        ctx.globalAlpha = 1;

        // Debug mode overlays
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
          for (let r = 0; r < ROWS; r += 2) {
            for (let c = 0; c < COLS; c += 2) {
              ctx.fillText(`${c},${r}`, c * TILE + 1, r * TILE + 4);
            }
          }
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#f44';
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (BLOCKED.has(`${c},${r}`)) {
                ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
              }
            }
          }
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

      function getSprite(ch) {
        if (!ch.frames) return null;
        const dirName = ['down', 'up', 'right', 'left'][ch.dir];
        const frames = ch.frames[dirName];
        if (!frames) return null;
        if (ch.state === ST_TYPE) {
          if (ch.dir === DIR_UP) {
            return frames[1]; // Face back (de costas) when sitting/typing at the desk
          }
          return frames[3 + (ch.frame % 2)];
        }
        if (ch.state === ST_WALK) {
          const cycle = [0, 1, 2, 1];
          return frames[cycle[ch.frame % 4]];
        }
        return frames[1];
      }

      rafId = requestAnimationFrame(draw);

      // Event Listeners for Debug Tooltips
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
  }, []);

  return (
    <div ref={containerRef} className="w-full mb-5 rounded-lg overflow-hidden border relative"
      style={{ borderColor: '#2c2f3a' }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 z-20 gap-3">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs font-mono">Carregando escritório...</p>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full block" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
};

export default PixelAgents;
