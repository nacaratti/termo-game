import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bot, Brain, AlertCircle, DollarSign } from 'lucide-react';

const CARD = '#1e2028';
const SURF = '#22252f';
const BDR  = '#2c2f3a';

const AGENT_META = {
  dev_agent: { label: 'Dev Agent', icon: Bot, color: 'text-blue-400 bg-blue-500/10' },
  ceo_agent: { label: 'CEO Agent', icon: Brain, color: 'text-purple-400 bg-purple-500/10' },
};

function fmtUSD(v) {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 });
}

function fmtBRL(v) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtTokens(v) {
  if (v == null) return '—';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return v.toString();
}

function fmtDuration(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// Estimativa USD→BRL conservadora — só para referência visual.
const USD_TO_BRL = 5.5;

const Stat = ({ label, value, sub, color = 'text-white' }) => (
  <div className="rounded-lg p-4 border" style={{ backgroundColor: SURF, borderColor: BDR }}>
    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
    {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
  </div>
);

const UsagePanel = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(30);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const since = new Date(Date.now() - windowDays * 86400_000).toISOString();
    supabase
      .from('agent_usage')
      .select('*')
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setRows(data || []);
        setLoading(false);
      });
  }, [windowDays]);

  const stats = useMemo(() => {
    const totalCost = rows.reduce((s, r) => s + (Number(r.total_cost_usd) || 0), 0);
    const totalIn = rows.reduce((s, r) => s + (r.input_tokens || 0), 0);
    const totalOut = rows.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const totalCacheRead = rows.reduce((s, r) => s + (r.cache_read_tokens || 0), 0);
    const sessionsByAgent = {};
    for (const r of rows) {
      if (!sessionsByAgent[r.agent]) sessionsByAgent[r.agent] = { sessions: 0, cost: 0, tokens: 0, errors: 0 };
      const s = sessionsByAgent[r.agent];
      s.sessions += 1;
      s.cost += Number(r.total_cost_usd) || 0;
      s.tokens += (r.input_tokens || 0) + (r.output_tokens || 0);
      if (r.is_error) s.errors += 1;
    }
    return { totalCost, totalIn, totalOut, totalCacheRead, sessionsByAgent };
  }, [rows]);

  if (loading) return <p className="text-zinc-600 text-sm text-center py-8">Carregando uso…</p>;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl p-6 border text-center" style={{ backgroundColor: CARD, borderColor: BDR }}>
        <p className="text-zinc-500 text-sm">Nenhum registro de uso ainda.</p>
        <p className="text-zinc-600 text-xs mt-2">Os tokens dos agentes serão registrados aqui após a próxima execução.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de janela */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl p-1 w-fit border" style={{ backgroundColor: CARD, borderColor: BDR }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                windowDays === d ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600">{rows.length} sessão{rows.length !== 1 ? 'es' : ''} registrada{rows.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Custo total"
          value={fmtUSD(stats.totalCost)}
          sub={`≈ ${fmtBRL(stats.totalCost * USD_TO_BRL)}`}
          color="text-[#c9a84c]"
        />
        <Stat
          label="Tokens entrada"
          value={fmtTokens(stats.totalIn)}
          sub={stats.totalCacheRead ? `${fmtTokens(stats.totalCacheRead)} via cache` : null}
          color="text-blue-400"
        />
        <Stat
          label="Tokens saída"
          value={fmtTokens(stats.totalOut)}
          color="text-[#6aaa64]"
        />
        <Stat
          label="Sessões"
          value={rows.length}
          sub={`Janela: ${windowDays} dias`}
        />
      </div>

      {/* Por agente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(stats.sessionsByAgent).map(([agent, s]) => {
          const meta = AGENT_META[agent] || { label: agent, icon: AlertCircle, color: 'text-zinc-400 bg-zinc-500/10' };
          const Icon = meta.icon;
          return (
            <div key={agent} className="rounded-xl p-4 border" style={{ backgroundColor: CARD, borderColor: BDR }}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm">{meta.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {s.sessions} sessão{s.sessions !== 1 ? 'es' : ''} · {fmtTokens(s.tokens)} tokens
                  </p>
                  <p className="text-zinc-300 text-sm mt-2 font-mono">
                    {fmtUSD(s.cost)} <span className="text-zinc-600 text-xs">({fmtBRL(s.cost * USD_TO_BRL)})</span>
                  </p>
                  {s.errors > 0 && (
                    <p className="text-red-400 text-xs mt-1">
                      {s.errors} sessão{s.errors !== 1 ? 'es' : ''} com erro
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de histórico */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: CARD, borderColor: BDR }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Data</th>
                <th className="text-left px-4 py-3 font-semibold">Agente</th>
                <th className="text-right px-4 py-3 font-semibold">Tokens (in/out)</th>
                <th className="text-right px-4 py-3 font-semibold">Custo</th>
                <th className="text-right px-4 py-3 font-semibold">Duração</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => {
                const meta = AGENT_META[r.agent] || { label: r.agent };
                const date = new Date(r.started_at).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <tr key={r.id} className="border-t" style={{ borderColor: BDR }}>
                    <td className="px-4 py-3 text-zinc-400">{date}</td>
                    <td className="px-4 py-3 text-white">{meta.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                      {fmtTokens(r.input_tokens)} / {fmtTokens(r.output_tokens)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {fmtUSD(r.total_cost_usd)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">{fmtDuration(r.duration_ms)}</td>
                    <td className="px-4 py-3 text-center">
                      {r.is_error || r.exit_code !== 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-red-400 bg-red-400/10">erro</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-[#6aaa64] bg-[#6aaa64]/10">ok</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 50 && (
          <p className="text-xs text-zinc-600 text-center py-3 border-t" style={{ borderColor: BDR }}>
            Mostrando 50 mais recentes de {rows.length}
          </p>
        )}
      </div>

      <p className="text-[10px] text-zinc-700 leading-relaxed">
        Custo em USD vem direto do Claude CLI. Conversão para BRL é estimativa baseada em USD 1 ≈ R$ {USD_TO_BRL}.
        Se você tem assinatura Pro/Max, esses valores são "teóricos" — você paga a assinatura, não os tokens.
      </p>
    </div>
  );
};

export default UsagePanel;
