-- ============================================================
-- Tabela de receita do projeto Kinto
-- Cada linha = uma entrada de receita de qualquer fonte
-- Total exibido publicamente em /changelog (sem detalhes)
-- ============================================================

create table revenue_entries (
  id uuid primary key default gen_random_uuid(),
  source text not null,                     -- 'ads' | 'donations' | 'premium' | 'sponsorship' | etc.
  amount numeric(10, 2) not null,           -- valor em BRL (R$)
  currency text not null default 'BRL',
  description text,                         -- detalhe interno (ex: "Pix de joão@email")
  earned_at date not null default current_date,
  created_at timestamptz default now()
);

create index revenue_entries_earned_at_idx on revenue_entries(earned_at desc);

-- RLS: leitura pública só do total (via função), inserção só com service_role
alter table revenue_entries enable row level security;

-- Permitir leitura pública (frontend soma os valores)
-- description NÃO é exposta no frontend, só amount/source/earned_at
create policy "revenue_public_read" on revenue_entries
  for select using (true);
