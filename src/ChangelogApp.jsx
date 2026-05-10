import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Check, Bot, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import CommentsSection from '@/components/CommentsSection';

const BG = '#16181d';
const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';

const TYPE_STYLES = {
  feature:     { label: 'Feature',  bg: 'bg-[#6aaa64]/15', text: 'text-[#6aaa64]', border: 'border-[#6aaa64]/30' },
  fix:         { label: 'Correção', bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30'   },
  improvement: { label: 'Melhoria', bg: 'bg-[#c9a84c]/15', text: 'text-[#c9a84c]', border: 'border-[#c9a84c]/30' },
  internal:    { label: 'Interno',  bg: 'bg-zinc-500/15',   text: 'text-zinc-400',   border: 'border-zinc-500/30'  },
};

const BOARD_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',       dotColor: 'bg-zinc-500' },
  { id: 'in_progress', label: 'In Progress',   dotColor: 'bg-blue-500' },
  { id: 'review',      label: 'Review',        dotColor: 'bg-purple-500' },
];

const BoardCard = ({ entry }) => {
  const style = TYPE_STYLES[entry.type] || TYPE_STYLES.internal;
  return (
    <div
      className="rounded-lg p-3 border transition-colors hover:border-[#4a4d5e]"
      style={{ backgroundColor: SURF, borderColor: BDR }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {style.label}
        </span>
      </div>
      <p className="text-white text-sm font-medium leading-snug">{entry.title}</p>
      {entry.description && (
        <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed line-clamp-2">{entry.description}</p>
      )}
    </div>
  );
};

const DoneCard = ({ entry }) => {
  const style = TYPE_STYLES[entry.type] || TYPE_STYLES.internal;
  const date = new Date(entry.published_at || entry.created_at).toLocaleDateString('pt-BR');
  return (
    <div
      className="flex items-start gap-3 py-3.5 border-b last:border-b-0"
      style={{ borderColor: BDR }}
    >
      <div className="w-5 h-5 rounded-full bg-[#6aaa64]/20 flex items-center justify-center shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-[#6aaa64]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white text-sm font-medium">{entry.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
            {style.label}
          </span>
        </div>
        {entry.description && (
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{entry.description}</p>
        )}
      </div>
      <span className="text-zinc-600 text-xs shrink-0 mt-0.5">{date}</span>
    </div>
  );
};

const ChangelogApp = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

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

  const columnData = {
    backlog: entries.filter(e => e.status === 'planned'),
    in_progress: entries.filter(e => e.status === 'in_progress'),
    review: entries.filter(e => e.status === 'review'),
  };
  const done = entries.filter(e => e.status === 'done');
  const hasBoard = Object.values(columnData).some(arr => arr.length > 0);

  return (
    <div className="min-h-dvh text-white" style={{ backgroundColor: BG }}>
      <header className="sticky top-0 z-10 border-b border-zinc-800/60" style={{ background: 'linear-gradient(to bottom, #1a1d27, #16181d)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao jogo</span>
          </a>
          <h1 className="font-black tracking-[0.2em] text-white text-lg uppercase">Evolução</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Sobre os agentes */}
        <div
          className="rounded-xl p-5 border mb-8"
          style={{ backgroundColor: CARD_BG, borderColor: BDR }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            Como funciona
          </p>
          <p className="text-zinc-400 text-sm leading-relaxed mb-5">
            Este projeto é mantido e evoluído de forma autônoma por dois agentes de inteligência artificial que trabalham diariamente no código, corrigindo bugs, implementando melhorias e planejando o futuro do jogo.
          </p>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Dev Agent</p>
                <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                  Desenvolvedor full-stack. Implementa features, corrige bugs, escreve testes e otimiza o código todos os dias.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">CEO Agent</p>
                <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                  Product manager. Analisa o projeto semanalmente, propõe novas ideias e define prioridades no roadmap.
                </p>
              </div>
            </div>
          </div>
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
          <>
            {/* Kanban Board — 3 colunas */}
            {hasBoard && (
              <div className="mb-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                  Roadmap
                </p>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {BOARD_COLUMNS.map(col => {
                    const items = columnData[col.id] || [];
                    return (
                      <div key={col.id}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            {col.label}
                          </p>
                          {items.length > 0 && (
                            <span className="text-zinc-600 text-xs">{items.length}</span>
                          )}
                        </div>
                        <div
                          className="rounded-xl p-3 min-h-[100px] space-y-2 border"
                          style={{ backgroundColor: CARD_BG, borderColor: BDR }}
                        >
                          {items.length === 0 ? (
                            <p className="text-zinc-700 text-xs py-8 text-center">—</p>
                          ) : (
                            items.map(entry => <BoardCard key={entry.id} entry={entry} />)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Registro de concluídos */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#6aaa64]" />
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Registro de atualizações
                </p>
                {done.length > 0 && (
                  <span className="text-zinc-600 text-xs">{done.length}</span>
                )}
              </div>

              {done.length === 0 ? (
                <div
                  className="rounded-xl p-6 border text-center"
                  style={{ backgroundColor: CARD_BG, borderColor: BDR }}
                >
                  <p className="text-zinc-600 text-xs">Nenhuma atualização concluída ainda.</p>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 border"
                  style={{ backgroundColor: CARD_BG, borderColor: BDR }}
                >
                  {done.map(entry => (
                    <DoneCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <CommentsSection />

        <div className="mt-16 pb-6" />
      </main>
    </div>
  );
};

export default ChangelogApp;
