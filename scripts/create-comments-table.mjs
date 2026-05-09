/**
 * Cria a tabela player_comments no Supabase via REST API.
 * Requer SUPABASE_SERVICE_ROLE_KEY com permissão de DDL.
 *
 * Uso: node scripts/create-comments-table.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

// Tenta inserir uma linha de teste para ver se a tabela existe
const { error: checkError } = await supabase
  .from('player_comments')
  .select('id')
  .limit(1);

if (!checkError) {
  console.log('Tabela player_comments já existe.');
  process.exit(0);
}

if (checkError.code !== '42P01') {
  // Erro inesperado
  console.error('Erro ao verificar tabela:', checkError.message);
  console.log('\nSQL para criar manualmente no Supabase Dashboard:');
  printSQL();
  process.exit(1);
}

console.log('Tabela não existe. Criando via pg_query...');

// Tenta criar via RPC exec_sql (se disponível)
const createSQL = `
CREATE TABLE IF NOT EXISTS player_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  word TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT '5',
  comment TEXT NOT NULL CHECK (char_length(comment) <= 300),
  won BOOLEAN,
  attempts INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE player_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public insert comments" ON player_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "public read comments" ON player_comments
  FOR SELECT USING (true);
`;

const { error: rpcError } = await supabase.rpc('exec_sql', { sql: createSQL });

if (rpcError) {
  console.error('Não foi possível criar via RPC. Crie manualmente com o SQL abaixo:');
  printSQL();
  process.exit(1);
}

console.log('Tabela player_comments criada com sucesso!');

function printSQL() {
  console.log(`
-- Execute este SQL no Supabase Dashboard > SQL Editor:

CREATE TABLE IF NOT EXISTS player_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  word TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT '5',
  comment TEXT NOT NULL CHECK (char_length(comment) <= 300),
  won BOOLEAN,
  attempts INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE player_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert comments" ON player_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public read comments" ON player_comments
  FOR SELECT USING (true);
`);
}
