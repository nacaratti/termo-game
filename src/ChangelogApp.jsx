import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Check, Bot, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import CommentsSection from '@/components/CommentsSection';
import GoalSection from '@/components/GoalSection';

const BG = '#16181d';
const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';

const LABEL_COLORS = {
  bug:          { bg: 'bg-red-500/15',       text: 'text-red-400',     border: 'border-red-500/30' },
  feature:      { bg: 'bg-[#6aaa64]/15',     text: 'text-[#6aaa64]',   border: 'border-[#6aaa64]/30' },
  optimization: { bg: 'bg-blue-500/15',      text: 'text-blue-400',    border: 'border-blue-500/30' },
  test:         { bg: 'bg-purple-500/15',    text: 'text-purple-400',  border: 'border-purple-500/30' },
  refactor:     { bg: 'bg-cyan-500/15',      text: 'text-cyan-400',    border: 'border-cyan-500/30' },
  docs:         { bg: 'bg-zinc-500/15',      text: 'text-zinc-400',    border: 'border-zinc-500/30' },
};

const PRIORITY_DOT = {
  0: 'bg-zinc-500',
  1: 'bg-[#c9a84c]',
  2: 'bg-orange-400',
  3: 'bg-red-400',
};

const BOARD_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     dotColor: 'bg-zinc-500',   statuses: ['backlog', 'todo'] },
  { id: 'in_progress', label: 'Em andamento', dotColor: 'bg-blue-500',  statuses: ['in_progress'] },
  { id: 'review',      label: 'Em revisão',  dotColor: 'bg-purple-500', statuses: ['review'] },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const BoardCard = ({ card }) => {
  const priorityDot = PRIORITY_DOT[card.priority] || PRIORITY_DOT[0];
  const mainLabel = card.labels?.[0];
  const labelStyle = mainLabel ? LABEL_COLORS[mainLabel] : null;

  return (
    <div
      className="rounded-lg p-3 border transition-colors hover:border-[#4a4d5e]"
      style={{ backgroundColor: SURF, borderColor: BDR }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${priorityDot}`} />
        {labelStyle && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${labelStyle.bg} ${labelStyle.text} ${labelStyle.border}`}>
            {mainLabel}
          </span>
        )}
      </div>
      <p className="text-white text-sm font-medium leading-snug">{card.title}</p>
      {card.description && (
        <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed line-clamp-2">{card.description}</p>
      )}
    </div>
  );
};

const DoneCard = ({ card }) => {
  const mainLabel = card.labels?.[0];
  const labelStyle = mainLabel ? LABEL_COLORS[mainLabel] : null;
  const date = new Date(card.completed_at || card.updated_at || card.created_at).toLocaleDateString('pt-BR');
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
          <p className="text-white text-sm font-medium">{card.title}</p>
          {labelStyle && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${labelStyle.bg} ${labelStyle.text} ${labelStyle.border}`}>
              {mainLabel}
            </span>
          )}
        </div>
        {card.description && (
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{card.description}</p>
        )}
      </div>
      <span className="text-zinc-600 text-xs shrink-0 mt-0.5">{date}</span>
    </div>
  );
};

const ChangelogApp = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from('kanban_cards')
      .select('id,title,description,status,priority,labels,created_by,assigned_to,created_at,updated_at,completed_at')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError(true); }
        else {
          // Filtra cards marcados como internal — não aparecem para usuários públicos
          const publicCards = (data || []).filter(c => !(c.labels || []).includes('internal'));
          setCards(publicCards);
        }
        setLoading(false);
      }, () => { setError(true); setLoading(false); });
  }, []);

  // Group cards by board column
  const columnData = {};
  for (const col of BOARD_COLUMNS) {
    columnData[col.id] = cards.filter(c => col.statuses.includes(c.status));
  }
  const done = cards.filter(c => c.status === 'done')
    .sort((a, b) => new Date(b.completed_at || b.updated_at) - new Date(a.completed_at || a.updated_at));
  const hasBoard = Object.values(columnData).some(arr => arr.length > 0);
  const hasContent = hasBoard || done.length > 0;

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
        <GoalSection />

        {/* Sobre os agentes */}
        <div
          className="rounded-xl p-5 sm:p-6 border mb-8"
          style={{ backgroundColor: CARD_BG, borderColor: BDR }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            Como funciona
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed mb-2">
            O <span className="font-semibold text-white">Kinto</span> é um experimento de desenvolvimento autônomo: o jogo é mantido e evoluído por dois agentes de inteligência artificial que trabalham de forma colaborativa, com supervisão humana mínima.
          </p>
          <p className="text-zinc-500 text-sm leading-relaxed mb-6">
            Os agentes leem as tarefas no quadro abaixo, implementam mudanças no código, escrevem testes e fazem deploy automaticamente. Você acompanha cada passo desta página.
          </p>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div
              className="flex gap-3 items-start p-4 rounded-lg border"
              style={{ backgroundColor: SURF, borderColor: BDR }}
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">Dev Agent</p>
                <p className="text-blue-400/80 text-[10px] font-medium uppercase tracking-wider mt-0.5">
                  Trabalha diariamente
                </p>
                <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                  Implementa novas funcionalidades, corrige bugs, escreve testes automatizados e otimiza o desempenho. Pega tarefas do quadro abaixo e movimenta os cards à medida que avança.
                </p>
              </div>
            </div>

            <div
              className="flex gap-3 items-start p-4 rounded-lg border"
              style={{ backgroundColor: SURF, borderColor: BDR }}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">CEO Agent</p>
                <p className="text-purple-400/80 text-[10px] font-medium uppercase tracking-wider mt-0.5">
                  Trabalha semanalmente
                </p>
                <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                  Analisa o estado do projeto, lê seus comentários e sugestões, propõe novas ideias e define o que entra no roadmap. Decisões maiores passam por aprovação humana.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t flex items-start gap-2" style={{ borderColor: BDR }}>
            <span className="text-zinc-600 text-xs leading-relaxed">
              💬 Sua opinião conta: comentários deixados abaixo são lidos pelo CEO Agent toda semana e podem virar melhorias reais no jogo.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 text-sm">Não foi possível carregar as atualizações.</p>
            <p className="text-zinc-600 text-xs mt-2">Verifique sua conexão e tente novamente.</p>
          </div>
        ) : !hasContent ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">Nenhuma atualização ainda.</p>
            <p className="text-zinc-600 text-xs mt-2">As novidades aparecerão aqui conforme o projeto evolui.</p>
          </div>
        ) : (
          <>
            {/* Kanban Board */}
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
                            items.map(card => <BoardCard key={card.id} card={card} />)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Registro de concluídos */}
            <div className="mb-10">
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
                  {done.map(card => <DoneCard key={card.id} card={card} />)}
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
