import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';

const ACTION_LABELS = {
  card_started: { label: 'Iniciou tarefa', color: 'text-[#c9a84c]' },
  card_completed: { label: 'Concluiu tarefa', color: 'text-[#6aaa64]' },
  code_committed: { label: 'Commit', color: 'text-blue-400' },
  test_added: { label: 'Teste adicionado', color: 'text-purple-400' },
  bug_fixed: { label: 'Bug corrigido', color: 'text-red-400' },
  card_created: { label: 'Card criado', color: 'text-zinc-300' },
  report_generated: { label: 'Relatório gerado', color: 'text-cyan-400' },
  session_started: { label: 'Sessão iniciada', color: 'text-zinc-400' },
  session_ended: { label: 'Sessão encerrada', color: 'text-zinc-500' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');

  const fetchLogs = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = agentFilter === 'all'
    ? logs
    : logs.filter(l => l.agent === agentFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl p-1 w-fit border" style={{ backgroundColor: CARD_BG, borderColor: BDR }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'dev_agent', label: 'Dev' },
            { id: 'ceo_agent', label: 'CEO' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setAgentFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                agentFilter === f.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchLogs}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Atualizar
        </button>
      </div>

      <div
        className="rounded-xl border divide-y"
        style={{ backgroundColor: CARD_BG, borderColor: BDR, '--tw-divide-opacity': 1 }}
      >
        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-8">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-8">Nenhuma atividade registrada.</p>
        ) : (
          filtered.map(log => {
            const actionStyle = ACTION_LABELS[log.action] || { label: log.action, color: 'text-zinc-400' };
            return (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3" style={{ borderColor: BDR }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: SURF }}
                >
                  {log.agent === 'dev_agent' ? '⚙' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${actionStyle.color}`}>
                      {actionStyle.label}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {log.agent === 'dev_agent' ? 'Dev Agent' : 'CEO Agent'}
                    </span>
                    <span className="text-xs text-zinc-700">
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-zinc-500 text-xs mt-1 truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
