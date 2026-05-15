// ============================================================
// Lê o JSON de saída de `claude --output-format json` e grava
// uso de tokens + custo em agent_usage. Tolera saída malformada
// ou parcial — nunca quebra o fluxo do agente.
//
// Uso: node scripts/record-usage.mjs <agent> <output_file> [exit_code]
// Exemplo: node scripts/record-usage.mjs dev_agent C:\Temp\out.json 0
// ============================================================
import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const [,, agent, outputFile, exitCodeArg = '0'] = process.argv;

if (!agent || !outputFile) {
  console.error('Uso: node scripts/record-usage.mjs <agent> <output_file> [exit_code]');
  process.exit(1);
}

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error('[record-usage] Sem credenciais Supabase — pulando');
  process.exit(0); // não trava o agente por causa disso
}

const supabase = createClient(SUPA_URL, SUPA_KEY);
const exitCode = parseInt(exitCodeArg) || 0;

let parsed = null;
let raw = '';

try {
  if (existsSync(outputFile)) {
    raw = readFileSync(outputFile, 'utf8').trim();
  }
} catch (err) {
  console.warn('[record-usage] Falha ao ler arquivo:', err.message);
}

// `claude --output-format json` produz um único objeto JSON no stdout.
// Em modo --print, é a última linha não vazia. Tenta parsear robustamente:
function findJSONObject(text) {
  if (!text) return null;
  // Tentativa 1: texto inteiro
  try { return JSON.parse(text); } catch { /* */ }
  // Tentativa 2: última linha não vazia
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch { /* */ }
  }
  // Tentativa 3: do primeiro { até o último }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch { /* */ }
  }
  return null;
}

parsed = findJSONObject(raw);

const usage = parsed?.usage || {};
const row = {
  agent,
  session_id: parsed?.session_id || null,
  duration_ms: parsed?.duration_ms ?? null,
  input_tokens: usage.input_tokens ?? null,
  cache_creation_tokens: usage.cache_creation_input_tokens ?? null,
  cache_read_tokens: usage.cache_read_input_tokens ?? null,
  output_tokens: usage.output_tokens ?? null,
  total_cost_usd: parsed?.total_cost_usd ?? parsed?.cost_usd ?? null,
  num_turns: parsed?.num_turns ?? null,
  is_error: !!parsed?.is_error || exitCode !== 0,
  exit_code: exitCode,
};

const { error } = await supabase.from('agent_usage').insert(row);
if (error) {
  console.error('[record-usage] Falha ao gravar:', error.message);
  process.exit(0); // não bloqueia o fluxo
}

const tokensTotal = (row.input_tokens || 0) + (row.output_tokens || 0);
const costStr = row.total_cost_usd != null ? `$${row.total_cost_usd.toFixed(4)}` : 'n/a';
console.log(`[record-usage] ${agent}: ${tokensTotal} tokens, custo ${costStr}, exit ${exitCode}`);
