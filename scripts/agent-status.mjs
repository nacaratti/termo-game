import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data: cards } = await supabase
    .from('kanban_cards')
    .select('status')
    .then(r => r);

  const counts = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
  for (const c of cards || []) counts[c.status] = (counts[c.status] || 0) + 1;

  console.log('\n=== Kanban Status ===');
  for (const [status, count] of Object.entries(counts)) {
    console.log(`  ${status}: ${count}`);
  }

  const { data: logs } = await supabase
    .from('activity_logs')
    .select('agent, action, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== Recent Activity (last 10) ===');
  for (const log of logs || []) {
    const date = new Date(log.created_at).toLocaleString('pt-BR');
    console.log(`  [${date}] ${log.agent}: ${log.action}`);
  }

  const agents = ['dev_agent', 'ceo_agent'];
  console.log('\n=== Last Run ===');
  for (const agent of agents) {
    const { data } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('agent', agent)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const lastRun = data ? new Date(data.created_at).toLocaleString('pt-BR') : 'never';
    console.log(`  ${agent}: ${lastRun}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
