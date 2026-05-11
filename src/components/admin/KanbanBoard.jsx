import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar, User, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import CardForm from './CardForm';

const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';
const BDR2 = '#363a47';

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     color: '#6b7280' },
  { id: 'todo',        label: 'To Do',       color: '#c9a84c' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review',      label: 'Review',      color: '#a855f7' },
  { id: 'done',        label: 'Done',        color: '#6aaa64' },
];

const PRIORITY_BADGES = {
  0: { label: 'Baixa',   cls: 'text-zinc-400 border-zinc-600/40 bg-zinc-600/10', dot: 'bg-zinc-500' },
  1: { label: 'Média',   cls: 'text-[#c9a84c] border-[#c9a84c]/40 bg-[#c9a84c]/10', dot: 'bg-[#c9a84c]' },
  2: { label: 'Alta',    cls: 'text-orange-400 border-orange-400/40 bg-orange-400/10', dot: 'bg-orange-400' },
  3: { label: 'Urgente', cls: 'text-red-400 border-red-400/40 bg-red-400/10', dot: 'bg-red-400' },
};

const LABEL_COLORS = {
  bug:          'bg-red-500/15 text-red-400 border-red-500/30',
  feature:      'bg-[#6aaa64]/15 text-[#6aaa64] border-[#6aaa64]/30',
  optimization: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  test:         'bg-purple-500/15 text-purple-400 border-purple-500/30',
  refactor:     'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  docs:         'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const AGENT_BADGE = {
  dev_agent: { label: '⚙ Dev', cls: 'text-blue-400 bg-blue-500/10' },
  ceo_agent: { label: '📋 CEO', cls: 'text-purple-400 bg-purple-500/10' },
  admin:     { label: '👤 Admin', cls: 'text-zinc-400 bg-zinc-500/10' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const KanbanCard = ({ card, onMove, onEdit, onDelete, onDragStart, onDragEnd, isDragging }) => {
  const isMobile = useIsMobile();
  const colIdx = COLUMNS.findIndex(c => c.id === card.status);
  const priority = PRIORITY_BADGES[card.priority] || PRIORITY_BADGES[0];
  const agentInfo = AGENT_BADGE[card.created_by] || AGENT_BADGE.admin;

  return (
    <div
      draggable={!isMobile}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('cardId', card.id);
        onDragStart?.(card.id);
      }}
      onDragEnd={onDragEnd}
      className={`rounded-lg border transition-all group select-none ${
        isDragging ? 'opacity-40 scale-95' : 'hover:border-[#5a5d72] hover:shadow-lg'
      } ${!isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ backgroundColor: SURF, borderColor: BDR2 }}
      onClick={(e) => {
        // Avoid triggering edit while dragging
        if (e.detail === 1) onEdit(card);
      }}
    >
      {/* Top: priority indicator bar */}
      <div className={`h-1 rounded-t-lg ${priority.dot}`} />

      <div className="p-3 space-y-2">
        {/* Title + priority badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-white text-sm font-semibold leading-snug flex-1">{card.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 font-semibold ${priority.cls}`}>
            {priority.label}
          </span>
        </div>

        {/* Description preview */}
        {card.description && (
          <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map(label => (
              <span
                key={label}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border ${LABEL_COLORS[label] || 'bg-zinc-600/20 text-zinc-400 border-zinc-600/40'}`}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Footer: created_by, assigned_to, date */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t" style={{ borderColor: BDR }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${agentInfo.cls} font-medium`}>
              {agentInfo.label}
            </span>
            {card.assigned_to && card.assigned_to !== card.created_by && (
              <span className="text-zinc-600 text-[10px] truncate">→ {card.assigned_to}</span>
            )}
          </div>
          <span className="text-zinc-600 text-[10px] shrink-0">
            {timeAgo(card.updated_at || card.created_at)}
          </span>
        </div>

        {/* Actions: move buttons (mobile) + delete (always) */}
        <div className="flex items-center gap-1 pt-1" onClick={e => e.stopPropagation()}>
          {isMobile && (
            <>
              {colIdx > 0 && (
                <button
                  onClick={() => onMove(card.id, COLUMNS[colIdx - 1].id)}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition-colors"
                  title={`Mover para ${COLUMNS[colIdx - 1].label}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {colIdx < COLUMNS.length - 1 && (
                <button
                  onClick={() => onMove(card.id, COLUMNS[colIdx + 1].id)}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition-colors"
                  title={`Mover para ${COLUMNS[colIdx + 1].label}`}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            className={`p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors ${
              !isMobile ? 'opacity-0 group-hover:opacity-100' : ''
            }`}
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
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
    if (!confirm('Excluir este card?')) return;
    setCards(prev => prev.filter(c => c.id !== id));
    if (supabase) {
      await supabase.from('kanban_cards').delete().eq('id', id);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setShowForm(true);
  };

  const handleDrop = (colId, e) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    setDragOverCol(null);
    setDraggingId(null);
    if (cardId) {
      const card = cards.find(c => c.id === cardId);
      if (card && card.status !== colId) handleMove(cardId, colId);
    }
  };

  if (loading) return <p className="text-zinc-600 text-sm text-center py-8">Carregando…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-zinc-500">{cards.length} card{cards.length !== 1 ? 's' : ''} no total</p>
          {!isMobile && (
            <p className="text-[10px] text-zinc-700 mt-0.5">Arraste os cards entre as colunas</p>
          )}
        </div>
        <button
          onClick={() => { setEditingCard(null); setShowForm(true); }}
          className="flex items-center gap-1.5 text-sm font-semibold text-black bg-white hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
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
                  <p className="text-zinc-700 text-xs py-3 text-center border border-dashed rounded-lg" style={{ borderColor: BDR }}>
                    Vazio
                  </p>
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
        <div className="pb-2">
          <div className="grid grid-cols-5 gap-3">
            {COLUMNS.map(col => {
              const colCards = cards.filter(c => c.status === col.id);
              const isOver = dragOverCol === col.id;
              return (
                <div key={col.id} className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      {col.label}
                    </p>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: SURF, color: '#a1a1aa' }}
                    >
                      {colCards.length}
                    </span>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => handleDrop(col.id, e)}
                    className={`rounded-xl p-2 flex-1 min-h-[200px] space-y-2 border-2 transition-colors ${
                      isOver ? 'border-dashed' : ''
                    }`}
                    style={{
                      backgroundColor: CARD_BG,
                      borderColor: isOver ? col.color : BDR,
                    }}
                  >
                    {colCards.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-8">
                        <p className="text-zinc-700 text-xs">Solte cards aqui</p>
                      </div>
                    ) : (
                      colCards.map(card => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          onMove={handleMove}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onDragStart={setDraggingId}
                          onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                          isDragging={draggingId === card.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
