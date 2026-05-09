import React, { useState } from 'react';

const SURF = '#22252f';
const BDR2 = '#363a47';
const CARD_BG = '#1e2028';
const BDR = '#2c2f3a';

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Baixa', color: 'text-zinc-400' },
  { value: 1, label: 'Média', color: 'text-[#c9a84c]' },
  { value: 2, label: 'Alta', color: 'text-orange-400' },
  { value: 3, label: 'Urgente', color: 'text-red-400' },
];

const LABEL_OPTIONS = ['bug', 'feature', 'optimization', 'test', 'refactor', 'docs'];

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const CardForm = ({ card, onSave, onCancel }) => {
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [priority, setPriority] = useState(card?.priority ?? 0);
  const [labels, setLabels] = useState(card?.labels || []);
  const [status, setStatus] = useState(card?.status || 'backlog');
  const [saving, setSaving] = useState(false);

  const toggleLabel = (label) => {
    setLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), description: description.trim(), priority, labels, status });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4 border"
        style={{ backgroundColor: CARD_BG, borderColor: BDR }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white font-bold text-base">{card ? 'Editar Card' : 'Novo Card'}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Título</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-white outline-none border"
              style={{ backgroundColor: SURF, borderColor: BDR2 }}
              placeholder="Título do card"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-white outline-none border resize-none h-24"
              style={{ backgroundColor: SURF, borderColor: BDR2 }}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(parseInt(e.target.value))}
                className="w-full rounded-lg px-3 py-2.5 text-white outline-none border appearance-none"
                style={{ backgroundColor: SURF, borderColor: BDR2 }}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-white outline-none border appearance-none"
                style={{ backgroundColor: SURF, borderColor: BDR2 }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Labels</label>
            <div className="flex flex-wrap gap-2">
              {LABEL_OPTIONS.map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    labels.includes(label)
                      ? 'bg-white text-black border-white'
                      : 'text-zinc-400 border-zinc-600 hover:border-zinc-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-zinc-400 border transition-colors hover:text-white"
              style={{ borderColor: BDR2 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-white hover:bg-zinc-100 text-black transition-colors disabled:opacity-30"
            >
              {saving ? 'Salvando…' : card ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardForm;
