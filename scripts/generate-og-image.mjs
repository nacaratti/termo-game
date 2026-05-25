#!/usr/bin/env node
/**
 * Gera public/og-image.png (1200x630) usando Playwright.
 * Uso: node scripts/generate-og-image.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'public', 'og-image.png');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #16181d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
  }
  .container {
    display: flex;
    align-items: center;
    gap: 80px;
    padding: 0 60px;
  }
  .left {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .logo {
    font-size: 72px;
    font-weight: 900;
    color: #f0f0f0;
    letter-spacing: -2px;
    line-height: 1;
  }
  .tagline {
    font-size: 26px;
    color: #6a6d80;
    font-weight: 400;
    letter-spacing: 0.5px;
  }
  .url {
    font-size: 20px;
    color: #6aaa64;
    font-weight: 600;
    margin-top: 8px;
  }
  .board {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    flex-shrink: 0;
  }
  .tile {
    width: 72px;
    height: 72px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 800;
    color: #ffffff;
    text-transform: uppercase;
  }
  .tile.correct  { background: #6aaa64; }
  .tile.present  { background: #c9a84c; }
  .tile.absent   { background: #383b4a; color: #676a7a; }
  .tile.empty    { background: #22252f; border: 2px solid #2c2f3a; }
  .divider {
    width: 2px;
    height: 420px;
    background: #2c2f3a;
    flex-shrink: 0;
  }
</style>
</head>
<body>
<div class="container">
  <div class="left">
    <div class="logo">Kinto</div>
    <div class="tagline">Adivinhe a palavra em 6 tentativas</div>
    <div class="url">kinto.fun</div>
  </div>
  <div class="divider"></div>
  <div class="board">
    <!-- Linha 1: TERMO - todas corretas (simulando vitória) -->
    <div class="tile correct">T</div>
    <div class="tile correct">E</div>
    <div class="tile correct">R</div>
    <div class="tile correct">M</div>
    <div class="tile correct">O</div>
    <!-- Linha 2: TURCO -->
    <div class="tile correct">T</div>
    <div class="tile absent">U</div>
    <div class="tile present">R</div>
    <div class="tile absent">C</div>
    <div class="tile correct">O</div>
    <!-- Linha 3: TAPAS -->
    <div class="tile correct">T</div>
    <div class="tile absent">A</div>
    <div class="tile absent">P</div>
    <div class="tile absent">A</div>
    <div class="tile absent">S</div>
    <!-- Linha 4: vazia -->
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <!-- Linha 5: vazia -->
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <!-- Linha 6: vazia -->
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
    <div class="tile empty"></div>
  </div>
</div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'networkidle' });
const screenshot = await page.screenshot({ type: 'png', fullPage: false });
await browser.close();

writeFileSync(outputPath, screenshot);
console.log(`OG image gerada: ${outputPath} (${screenshot.length} bytes)`);
