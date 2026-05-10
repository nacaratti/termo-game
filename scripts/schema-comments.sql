-- ============================================================
-- Tabela de comentários públicos (Google OAuth)
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

create table user_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_name text not null,
  user_avatar text,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz default now()
);

create index user_comments_created_at_idx on user_comments(created_at desc);

-- RLS
alter table user_comments enable row level security;

-- Qualquer pessoa pode ler comentários
create policy "user_comments_public_read" on user_comments
  for select using (true);

-- Apenas usuários autenticados podem inserir, e só com seu próprio user_id
create policy "user_comments_auth_insert" on user_comments
  for insert with check (auth.uid() = user_id);

-- Usuário pode deletar apenas seus próprios comentários
create policy "user_comments_own_delete" on user_comments
  for delete using (auth.uid() = user_id);
