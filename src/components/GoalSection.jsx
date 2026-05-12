import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, MessageSquare, Gamepad2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';

// Configuração da meta — alterar aqui se mudar deadline
const GOAL = {
  startDate: '2026-05-09',
  endDate: '2026-11-09',
  title: 'Tornar o Kinto rentável',
  description: 'Em 6 meses, transformar este projeto experimental em algo que gere receita própria — sem perder a essência aberta e divertida que tem hoje.',
};

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86400000);
}

const Metric = ({ icon: Icon, label, value, color }) => (
  <div
    className="rounded-lg p-3 flex items-center gap-3 border"
    style={{ backgroundColor: SURF, borderColor: BDR }}
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-white text-lg font-black leading-none">{value}</p>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">{label}</p>
    </div>
  </div>
);

const GoalSection = () => {
  const [stats, setStats] = useState({ games: 0, comments: 0, completed: 0 });

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from('daily_results').select('id', { count: 'exact', head: true }),
      supabase.from('daily_results_6').select('id', { count: 'exact', head: true }),
      supabase.from('user_comments').select('id', { count: 'exact', head: true }),
      supabase.from('kanban_cards').select('id', { count: 'exact', head: true }).eq('status', 'done'),
    ]).then(([g5, g6, c, d]) => {
      setStats({
        games: (g5.count || 0) + (g6.count || 0),
        comments: c.count || 0,
        completed: d.count || 0,
      });
    }).catch(() => {});
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const totalDays = daysBetween(GOAL.startDate, GOAL.endDate);
  const elapsedDays = Math.max(0, daysBetween(GOAL.startDate, today));
  const remainingDays = Math.max(0, daysBetween(today, GOAL.endDate));
  const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const endLabel = new Date(GOAL.endDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div
      className="rounded-xl border mb-8 overflow-hidden"
      style={{ backgroundColor: CARD_BG, borderColor: BDR }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-[#c9a84c]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#c9a84c] mb-1">
              Meta de 6 meses
            </p>
            <p className="text-white text-lg font-bold leading-tight">
              {GOAL.title}
            </p>
            <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
              {GOAL.description}
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div
          className="rounded-lg p-4 mb-4 border"
          style={{ backgroundColor: SURF, borderColor: BDR }}
        >
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-zinc-500 text-xs mb-1">Faltam</p>
              <p className="text-white text-3xl sm:text-4xl font-black leading-none">
                {remainingDays} <span className="text-base font-semibold text-zinc-400">dias</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs mb-1">Prazo</p>
              <p className="text-zinc-300 text-sm font-medium">{endLabel}</p>
            </div>
          </div>

          {/* Progress bar de tempo */}
          <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2c2f3a' }}>
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#c9a84c] to-[#6aaa64] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-600">
            <span>Dia {elapsedDays} de {totalDays}</span>
            <span>{Math.round(progress)}% do tempo</span>
          </div>
        </div>

        {/* Métricas */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
          Onde estamos
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={Gamepad2}
            label="Jogos jogados"
            value={stats.games.toLocaleString('pt-BR')}
            color="bg-[#6aaa64]/15 text-[#6aaa64]"
          />
          <Metric
            icon={MessageSquare}
            label="Comentários"
            value={stats.comments.toLocaleString('pt-BR')}
            color="bg-blue-500/15 text-blue-400"
          />
          <Metric
            icon={CheckCircle2}
            label="Atualizações"
            value={stats.completed.toLocaleString('pt-BR')}
            color="bg-purple-500/15 text-purple-400"
          />
        </div>

        <div className="mt-4 pt-3 border-t flex items-start gap-2" style={{ borderColor: BDR }}>
          <TrendingUp className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
          <p className="text-zinc-600 text-xs leading-relaxed">
            Acompanhe o progresso da jornada. O CEO Agent avalia esses números toda semana e ajusta as prioridades para nos aproximar da meta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalSection;
