// ============================================================
// Dev Agent: busca o próximo card a fazer.
// Prioridade:
//   1) Cards com scheduled_for <= hoje e status='todo' (priority DESC),
//      EXCLUINDO cards com label 'needs-human' (ver AUTONOMY_POLICY.md)
//   2) Se nenhum, qualquer card status='todo' executável (priority DESC)
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(url, key);
const today = new Date().toISOString().slice(0, 10);

const isExecutable = (card) => !(card?.labels || []).includes('needs-human');

// 1) Cards agendados para hoje ou antes
const { data: scheduled, error } = await supabase
  .from('kanban_cards')
  .select('*')
  .eq('status', 'todo')
  .lte('scheduled_for', today)
  .order('priority', { ascending: false })
  .order('scheduled_for', { ascending: true });

if (error) { console.error(error.message); process.exit(1); }

let pick = (scheduled || []).find(isExecutable);

// 2) Fallback: qualquer card todo executável
if (!pick) {
  const { data: any } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('status', 'todo')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });
  pick = (any || []).find(isExecutable);
}

if (!pick) {
  console.log('NO_CARDS');
  process.exit(0);
}

console.log(JSON.stringify(pick, null, 2));
