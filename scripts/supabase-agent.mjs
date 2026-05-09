import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

// ─── Kanban Cards ────────────────────────────────────────────────────────────

export async function getNextCard() {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('status', 'todo')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getCards(status) {
  const query = supabase.from('kanban_cards').select('*').order('priority', { ascending: false });
  if (status) query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCard({ title, description, priority = 0, labels = [], created_by = 'admin' }) {
  const { data, error } = await supabase
    .from('kanban_cards')
    .insert({ title, description, priority, labels, created_by })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function moveCard(id, newStatus) {
  const update = { status: newStatus, updated_at: new Date().toISOString() };
  if (newStatus === 'done') update.completed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('kanban_cards')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCard(id, fields) {
  const { data, error } = await supabase
    .from('kanban_cards')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCard(id) {
  const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
  if (error) throw error;
}

// ─── Activity Logs ───────────────────────────────────────────────────────────

export async function logActivity({ agent, action, details = {}, card_id = null }) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({ agent, action, details, card_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentLogs(limit = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ─── Changelog ───────────────────────────────────────────────────────────────

export async function createChangelog({ title, description, type, card_id = null }) {
  const { data, error } = await supabase
    .from('changelog_entries')
    .insert({ title, description, type, card_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateChangelog(id, fields) {
  const { data, error } = await supabase
    .from('changelog_entries')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getChangelog() {
  const { data, error } = await supabase
    .from('changelog_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function saveReport({ content, decisions_needed = [] }) {
  const { data, error } = await supabase
    .from('agent_reports')
    .insert({ agent: 'ceo_agent', content, decisions_needed })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const commands = {
  async getNext() {
    const card = await getNextCard();
    console.log(card ? JSON.stringify(card, null, 2) : 'No cards with status=todo');
  },
  async cards(status) {
    const cards = await getCards(status);
    console.log(JSON.stringify(cards, null, 2));
  },
  async createCard(title, description, priority = '0') {
    const card = await createCard({ title, description, priority: parseInt(priority) });
    console.log('Created:', JSON.stringify(card, null, 2));
  },
  async move(id, status) {
    const card = await moveCard(id, status);
    console.log('Moved:', JSON.stringify(card, null, 2));
  },
  async log(agent, action, details = '{}') {
    const entry = await logActivity({ agent, action, details: JSON.parse(details) });
    console.log('Logged:', JSON.stringify(entry, null, 2));
  },
  async logs(limit = '50') {
    const logs = await getRecentLogs(parseInt(limit));
    console.log(JSON.stringify(logs, null, 2));
  },
  async changelog(title, description, type) {
    const entry = await createChangelog({ title, description, type });
    console.log('Created:', JSON.stringify(entry, null, 2));
  },
};

const [,, cmd, ...args] = process.argv;

if (cmd && commands[cmd]) {
  commands[cmd](...args).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
} else if (cmd) {
  console.error(`Unknown command: ${cmd}`);
  console.error('Available:', Object.keys(commands).join(', '));
  process.exit(1);
}
