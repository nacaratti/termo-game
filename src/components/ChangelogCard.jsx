import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_STYLES = {
  feature:     { label: 'Feature',     bg: 'bg-[#6aaa64]/15', text: 'text-[#6aaa64]', border: 'border-[#6aaa64]/30' },
  fix:         { label: 'Correção',    bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30'   },
  improvement: { label: 'Melhoria',    bg: 'bg-[#c9a84c]/15', text: 'text-[#c9a84c]', border: 'border-[#c9a84c]/30' },
  internal:    { label: 'Interno',     bg: 'bg-zinc-500/15',   text: 'text-zinc-400',   border: 'border-zinc-500/30'  },
};

const STATUS_ICONS = {
  done:        '✓',
  in_progress: '◉',
  planned:     '○',
};

const ChangelogCard = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const style = TYPE_STYLES[entry.type] || TYPE_STYLES.internal;
  const date = new Date(entry.published_at || entry.created_at).toLocaleDateString('pt-BR');
  const hasLongDescription = entry.description && entry.description.length > 120;
  const displayDescription = expanded || !hasLongDescription
    ? entry.description
    : entry.description.slice(0, 120) + '…';

  return (
    <div className="rounded-xl p-4 border border-[#2c2f3a] bg-[#1e2028] transition-colors hover:border-[#363a47]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
              {style.label}
            </span>
            <span className="text-zinc-600 text-xs">{date}</span>
            <span className="text-zinc-600 text-xs" title={entry.status}>
              {STATUS_ICONS[entry.status]}
            </span>
          </div>
          <h3 className="text-white font-semibold text-sm mb-1">{entry.title}</h3>
          {entry.description && (
            <p className="text-zinc-400 text-sm leading-relaxed">{displayDescription}</p>
          )}
        </div>
        {hasLongDescription && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-zinc-500 hover:text-white transition-colors mt-1 shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChangelogCard;
