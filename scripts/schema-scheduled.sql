-- ============================================================
-- Adiciona coluna scheduled_for para agendamento de cards
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

alter table kanban_cards
  add column if not exists scheduled_for date;

-- Index para o Dev Agent buscar cards do dia rapidamente
create index if not exists kanban_cards_scheduled_for_idx
  on kanban_cards(scheduled_for)
  where status in ('todo', 'in_progress');
