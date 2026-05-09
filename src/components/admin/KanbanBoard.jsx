import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import CardForm from './CardForm';

const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';
const BDR2 = '#363a47';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: '#6b7280' },
  { id: 'todo', label: 'To Do', color: '#c9a84c' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review', label: 'Review', color: '#a855f7' },
  { id: 'done', label: 'Done', color: '#6aaa64' },
];

const PRIORITY_BADGES = {
  0: { label: 'Low', cls: 'text-zinc-500 border-zinc-600' },
  1: { label: 'Mid', cls: 'text-[#c9a84c] border-[#c9a84c]/40' },
  2: { label: 'High', cls: 'text-orange-400 border-orange-400/40' },
  3: { label: 'Urgent', cls: 'text-red-400 border-red-400/40' },
};

const LABEL_COLORS = {
  bug: 'bg-red-500/20 text-red-400',
  feature: 'bg-[#6aaa64]/20 text-[#6aaa64]',
  optimization: 'bg-blue-500/20 text-blue-400',
  test: 'bg-purple-500/20 text-purple-400',
  refactor: 'bg-cyan-500/20 text-cyan-400',
  docs: 'bg-zinc-500/20 text-zinc-400',
};

const KanbanCard = ({ card, onMove, onEdit, onDelete }) => {
  const isMobile = useIsMobile();
  const colIdx = COLUMNS.findIndex(c => c.id === card.status);
  const priority = PRIORITY_BADGES[card.priority] || PRIORITY_BADGES[0];

  return (
    <div
      className="rounded-lg p-3 border transition-colors hover:border-[#4a4d5e] cursor-pointer group"
      style={{ backgroundColor: SURF, borderColor: BDR2 }}
      onClick={() => onEdit(card)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-white text-sm font-medium leading-snug flex-1">{card.title}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${priority.cls}`}>
          {priority.label}
        </span>
      </div>

      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(label => (
            <span
              key={label}
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${LABEL_COLORS[label] || 'bg-zinc-600/20 text-zinc-400'}`}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {card.assigned_to && (
        <p className="text-zinc-600 text-[10px]">→ {card.assigned_to}</p>
      )}

      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        {colIdx > 0 && (
          <button
            onClick={() => onMove(card.id, COLUMNS[colIdx - 1].id)}
            className="p-1 text-zinc-500 hover:text-white transition-colors rounded"
            title={`Mover para ${COLUMNS[colIdx - 1].label}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {colIdx < COLUMNS.length - 1 && (
          <button
            onClick={() => onMove(card.id, COLUMNS[colIdx + 1].id)}
            className="p-1 text-zinc-500 hover:text-white transition-colors rounded"
            title={`Mover para ${COLUMNS[colIdx + 1].label}`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onDelete(card.id)}
          className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const isMobile = useIsMobile();

  const fetchCards = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('kanban_cards')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    setCards(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
    const interval = setInterval(fetchCards, 30000);
    return () => clearInterval(interval);
  }, [fetchCards]);

  const handleMove = async (id, newStatus) => {
    setCards(prev => prev.map(c =>
      c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
    ));
    if (supabase) {
      const update = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'done') update.completed_at = new Date().toISOString();
      await supabase.from('kanban_cards').update(update).eq('id', id);
    }
  };

  const handleSave = async (data) => {
    if (!supabase) return;
    if (editingCard) {
      await supabase.from('kanban_cards')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editingCard.id);
    } else {
      await supabase.from('kanban_cards')
        .insert({ ...data, created_by: 'admin' });
    }
    setShowForm(false);
    setEditingCard(null);
    fetchCards();
  };

  const handleDelete = async (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
    if (supabase) {
      await supabase.from('kanban_cards').delete().eq('id', id);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setShowForm(true);
  };

  if (loading) return <p className="text-zinc-600 text-sm text-center py-8">Carregando…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500">{cards.length} card{cards.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setEditingCard(null); setShowForm(true); }}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo card
        </button>
      </div>

      {isMobile ? (
        <div className="space-y-6">
          {COLUMNS.map(col => {
            const colCards = cards.filter(c => c.status === col.id);
            return (
              <div key={col.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {col.label}
                  </p>
                  <span className="text-zinc-600 text-xs">{colCards.length}</span>
                </div>
                {colCards.length === 0 ? (
                  <p className="text-zinc-700 text-xs py-3 text-center">Vazio</p>
                ) : (
                  <div className="space-y-2">
                    {colCards.map(card => (
                      <KanbanCard
                        key={card.id}
                        card={card}
                        onMove={handleMove}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {COLUMNS.map(col => {
            const colCards = cards.filter(c => c.status === col.id);
            return (
              <div key={col.id} className="min-w-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
                    {col.label}
                  </p>
                  <span className="text-zinc-600 text-xs">{colCards.length}</span>
                </div>
                <div
                  className="rounded-xl p-2 min-h-[120px] space-y-2 border"
                  style={{ backgroundColor: CARD_BG, borderColor: BDR }}
                >
                  {colCards.length === 0 ? (
                    <p className="text-zinc-700 text-xs py-6 text-center">Vazio</p>
                  ) : (
                    colCards.map(card => (
                      <KanbanCard
                        key={card.id}
                        card={card}
                        onMove={handleMove}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <CardForm
          card={editingCard}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingCard(null); }}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
