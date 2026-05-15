// ============================================================
// Calcula o north-star metric da semana e grava em weekly_focus.
// Roda antes do CEO Agent (encadeado no run-ceo-agent.bat) para
// que o CEO encontre o número pronto.
//
// North-star atual: "Receita por 1000 sessões" (RP1K).
// Fallback se ainda não há sessões medidas: usa DAU médio.
//
// O CEO Agent pode ajustar o foco_text e o north_star_target via
// supabase-agent (setWeeklyFocus) durante sua sessão semanal.
//
// Uso manual: node scripts/compute-north-star.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

function weekStartISO(date = new Date()) {
  // Segunda-feira como início da semana (ISO).
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();             // 0=dom, 1=seg, ..., 6=sab
  const delta = (day + 6) % 7;            // dias desde a última segunda
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

async function getWeekSessions(weekStart) {
  const { data, error } = await supabase
    .from('product_metrics')
    .select('sessions, active_users')
    .gte('metric_date', weekStart);
  if (error) throw error;
  let sessions = 0, dauSum = 0, dauDays = 0;
  for (const r of data || []) {
    if (r.sessions) sessions += r.sessions;
    if (r.active_users != null) { dauSum += r.active_users; dauDays += 1; }
  }
  return { sessions, dauAvg: dauDays ? dauSum / dauDays : null };
}

async function getWeekRevenue(weekStart) {
  const { data, error } = await supabase
    .from('revenue_entries')
    .select('amount')
    .gte('earned_at', weekStart);
  if (error) throw error;
  return (data || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

async function main() {
  const week = weekStartISO();
  const [{ sessions, dauAvg }, revenue] = await Promise.all([
    getWeekSessions(week),
    getWeekRevenue(week),
  ]);

  let metric, value;
  if (sessions > 0) {
    metric = 'Receita por 1000 sessões';
    value = Number(((revenue / sessions) * 1000).toFixed(2));
  } else if (dauAvg != null) {
    metric = 'Usuários ativos diários (média)';
    value = Number(dauAvg.toFixed(0));
  } else {
    // Sem dados de tráfego ainda — usa cards concluídos como proxy de velocidade
    metric = 'Cards entregues na semana';
    const { count } = await supabase
      .from('kanban_cards')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', week);
    value = count || 0;
  }

  // Upsert weekly_focus por week_start
  const { data: existing } = await supabase
    .from('weekly_focus')
    .select('id, focus_text, north_star_target')
    .eq('week_start', week)
    .maybeSingle();

  const row = {
    week_start: week,
    focus_text: existing?.focus_text || 'Validar produto e crescer base de usuários',
    north_star_name: metric,
    north_star_value: value,
    north_star_target: existing?.north_star_target || null,
  };

  if (existing) {
    await supabase
      .from('weekly_focus')
      .update({
        north_star_name: row.north_star_name,
        north_star_value: row.north_star_value,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('weekly_focus').insert(row);
  }

  console.log('[north-star]', JSON.stringify(row, null, 2));
}

main().catch(err => {
  console.error('[north-star] Erro:', err.message);
  process.exit(1);
});
