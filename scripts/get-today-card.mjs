// ============================================================
// Dev Agent: busca o próximo card a fazer HOJE.
// Prioridade:
//   1) Cards com scheduled_for = hoje e status='todo' (priority DESC),
//      EXCLUINDO cards com label 'needs-human' (ver AUTONOMY_POLICY.md)
//   2) Cards atrasados (scheduled_for < hoje) que não foram feitos
//   3) Backlog: cards SEM scheduled_for (reserva do CEO)
//
// NUNCA retorna cards agendados para dias futuros — o Dev respeita
// o cronograma definido pelo CEO Agent.
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

// 1) Cards agendados para HOJE (exatamente)
const { data: todayCards, error } = await supabase
  .from('kanban_cards')
  .select('*')
  .eq('status', 'todo')
  .eq('scheduled_for', today)
  .order('priority', { ascending: false });

if (error) { console.error(error.message); process.exit(1); }

let pick = (todayCards || []).find(isExecutable);

// 2) Cards atrasados (scheduled_for < hoje, não feitos)
if (!pick) {
  const { data: overdue } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('status', 'todo')
    .lt('scheduled_for', today)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true });
  pick = (overdue || []).find(isExecutable);
}

// 3) Backlog: cards SEM data agendada (reserva criada pelo CEO)
if (!pick) {
  const { data: backlog } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('status', 'todo')
    .is('scheduled_for', null)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });
  pick = (backlog || []).find(isExecutable);
}

if (!pick) {
  console.log('NO_CARDS');
  process.exit(0);
}

console.log(JSON.stringify(pick, null, 2));
