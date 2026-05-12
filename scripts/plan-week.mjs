// ============================================================
// CEO Agent: cria cards da semana com data agendada
//
// Uso:
//   node scripts/plan-week.mjs '[{...},{...}]'
//
// Cada objeto deve ter: title, description, priority, labels, scheduled_for
// scheduled_for em formato 'YYYY-MM-DD'
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const [,, jsonInput] = process.argv;
if (!jsonInput) {
  console.error('Uso: node scripts/plan-week.mjs \'[{...}, {...}]\'');
  process.exit(1);
}

let plan;
try {
  plan = JSON.parse(jsonInput);
  if (!Array.isArray(plan)) throw new Error('Esperado array');
} catch (err) {
  console.error('JSON inválido:', err.message);
  process.exit(1);
}

const supabase = createClient(url, key);

const cards = plan.map(c => ({
  title: c.title,
  description: c.description || null,
  status: 'todo',
  priority: c.priority ?? 1,
  labels: c.labels || [],
  scheduled_for: c.scheduled_for || null,
  created_by: 'ceo_agent',
  assigned_to: 'dev_agent',
}));

const { data, error } = await supabase
  .from('kanban_cards')
  .insert(cards)
  .select('id,title,scheduled_for,priority');

if (error) {
  console.error('Erro:', error.message);
  process.exit(1);
}

console.log(`✓ ${data.length} cards criados:`);
for (const c of data) {
  console.log(`  ${c.scheduled_for || '(sem data)'} | P${c.priority} | ${c.title}`);
}
