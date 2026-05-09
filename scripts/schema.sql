-- ============================================================
-- Schema para o sistema de agentes autônomos do Kinto
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ============================================================

-- Cards do Kanban
create table kanban_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'backlog',
  priority int default 0,
  created_by text not null default 'admin',
  assigned_to text,
  labels text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

-- Log de atividades dos agentes
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  action text not null,
  details jsonb default '{}',
  card_id uuid references kanban_cards(id),
  created_at timestamptz default now()
);

-- Entradas do changelog público
create table changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  type text not null,
  status text not null default 'planned',
  card_id uuid references kanban_cards(id),
  created_at timestamptz default now(),
  published_at timestamptz
);

-- Relatórios semanais do CEO agent
create table agent_reports (
  id uuid primary key default gen_random_uuid(),
  agent text not null default 'ceo_agent',
  content text not null,
  decisions_needed jsonb default '[]',
  telegram_sent boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table kanban_cards enable row level security;
alter table activity_logs enable row level security;
alter table changelog_entries enable row level security;
alter table agent_reports enable row level security;

-- Leitura pública (anon key do frontend)
create policy "kanban_cards_public_read" on kanban_cards for select using (true);
create policy "activity_logs_public_read" on activity_logs for select using (true);
create policy "changelog_entries_public_read" on changelog_entries for select using (true);
create policy "agent_reports_public_read" on agent_reports for select using (true);

-- Escrita via service_role (agentes/scripts) — service_role bypassa RLS automaticamente
-- Para o admin autenticado, permitir escrita em kanban_cards
create policy "kanban_cards_auth_write" on kanban_cards for all using (auth.role() = 'authenticated');
create policy "activity_logs_auth_write" on activity_logs for insert with check (auth.role() = 'authenticated');
create policy "changelog_entries_auth_write" on changelog_entries for all using (auth.role() = 'authenticated');
