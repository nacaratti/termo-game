// ============================================================
// Dev Agent: busca o próximo card a fazer
// Prioridade:
//   1) Cards com scheduled_for <= hoje e status='todo' (priority DESC)
//   2) Se nenhum, qualquer card status='todo' (priority DESC)
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

// 1) Cards agendados para hoje ou antes
let { data, error } = await supabase
  .from('kanban_cards')
  .select('*')
  .eq('status', 'todo')
  .lte('scheduled_for', today)
  .order('priority', { ascending: false })
  .order('scheduled_for', { ascending: true })
  .limit(1);

if (error) { console.error(error.message); process.exit(1); }

// 2) Fallback: qualquer card todo sem agenda
if (!data || data.length === 0) {
  const res = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('status', 'todo')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  data = res.data;
}

if (!data || data.length === 0) {
  console.log('NO_CARDS');
  process.exit(0);
}

console.log(JSON.stringify(data[0], null, 2));
