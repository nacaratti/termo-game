import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ChangelogCard from '@/components/ChangelogCard';

const BG = '#16181d';

const ChangelogApp = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from('changelog_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEntries(data || []);
        setLoading(false);
      });
  }, []);

  const grouped = {
    done: entries.filter(e => e.status === 'done'),
    in_progress: entries.filter(e => e.status === 'in_progress'),
    planned: entries.filter(e => e.status === 'planned'),
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);

  const sections = filter === 'all'
    ? [
        { key: 'in_progress', label: 'Em andamento', items: grouped.in_progress },
        { key: 'done', label: 'Concluído', items: grouped.done },
        { key: 'planned', label: 'Planejado', items: grouped.planned },
      ]
    : [{ key: filter, label: '', items: filtered }];

  return (
    <div className="min-h-dvh text-white" style={{ backgroundColor: BG }}>
      <header className="sticky top-0 z-10 border-b border-zinc-800/60" style={{ background: 'linear-gradient(to bottom, #1a1d27, #16181d)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao jogo</span>
          </a>
          <h1 className="font-black tracking-[0.2em] text-white text-lg uppercase">Evolução</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex gap-1 rounded-xl p-1 w-fit border mb-6 bg-[#1e2028] border-[#2c2f3a]">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'in_progress', label: 'Em andamento' },
            { id: 'done', label: 'Concluído' },
            { id: 'planned', label: 'Planejado' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">Nenhuma atualização ainda.</p>
            <p className="text-zinc-600 text-xs mt-2">As novidades aparecerão aqui conforme o projeto evolui.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(({ key, label, items }) => {
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  {label && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">{label}</p>
                  )}
                  <div className="space-y-3">
                    {items.map(entry => (
                      <ChangelogCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 pt-6 border-t border-zinc-800/60 text-center">
          <p className="text-zinc-600 text-xs">
            Desenvolvido por agentes de IA autônomos
          </p>
        </div>
      </main>
    </div>
  );
};

export default ChangelogApp;
