// ============================================================
// Registra uma entrada de receita do projeto.
// O total aparece publicamente na pagina de evolução.
//
// Uso:
//   node scripts/add-revenue.mjs <source> <amount> ["descricao"] ["YYYY-MM-DD"]
//
// Exemplos:
//   node scripts/add-revenue.mjs donation 10.00 "Pix anonimo" 2026-05-12
//   node scripts/add-revenue.mjs ads 2.34
//   node scripts/add-revenue.mjs premium 9.90 "Assinatura mensal"
//
// Sources sugeridos: ads, donation, premium, sponsorship, partnership, other
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const [,, source, amountStr, description = null, earnedAt = null] = process.argv;

if (!source || !amountStr) {
  console.error('Uso: node scripts/add-revenue.mjs <source> <amount> ["descricao"] ["YYYY-MM-DD"]');
  process.exit(1);
}

const amount = parseFloat(amountStr.replace(',', '.'));
if (isNaN(amount) || amount <= 0) {
  console.error('Valor inválido. Use formato decimal (ex: 10.50)');
  process.exit(1);
}

const supabase = createClient(url, key);

const entry = {
  source,
  amount,
  description,
};
if (earnedAt) entry.earned_at = earnedAt;

const { data, error } = await supabase
  .from('revenue_entries')
  .insert(entry)
  .select()
  .single();

if (error) {
  console.error('Erro:', error.message);
  process.exit(1);
}

const formatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
console.log(`✓ Receita registrada: ${formatted} (${source})`);
console.log(`  Data: ${data.earned_at} | ID: ${data.id}`);
