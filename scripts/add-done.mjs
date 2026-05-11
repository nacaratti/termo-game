// ============================================================
// Atalho para registrar uma feature concluida no kanban (done).
// Aparece automaticamente no "Registro de atualizacoes" da pagina /changelog.
//
// Uso:
//   node scripts/add-done.mjs "Titulo da feature" "Descricao opcional" [label]
//
// Exemplos:
//   node scripts/add-done.mjs "Novo modo escuro"
//   node scripts/add-done.mjs "Corrige bug do teclado" "" bug
//   node scripts/add-done.mjs "Melhora performance" "Reduzido bundle em 30%" optimization
//
// Labels validos: feature (default), bug, improvement, optimization, refactor, docs, test
// Use 'internal' para registrar mudancas que NAO devem aparecer publicamente.
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const [,, title, description = '', label = 'feature'] = process.argv;

if (!title) {
  console.error('Uso: node scripts/add-done.mjs "Titulo" ["Descricao"] [label]');
  process.exit(1);
}

const supabase = createClient(url, key);
const now = new Date().toISOString();

const { data, error } = await supabase
  .from('kanban_cards')
  .insert({
    title,
    description: description || null,
    status: 'done',
    priority: 1,
    labels: [label],
    created_by: 'admin',
    completed_at: now,
    updated_at: now,
  })
  .select()
  .single();

if (error) {
  console.error('Erro:', error.message);
  process.exit(1);
}

console.log(`✓ Card "${title}" registrado como concluido`);
console.log(`  Label: ${label} | ID: ${data.id}`);
if (label === 'internal') {
  console.log(`  (NAO aparecera na pagina publica /changelog)`);
}
