import React, { useState, useEffect } from 'react';
import { Copy, Check, Coffee, ArrowLeft, ChevronRight, Send, Loader2, Users } from 'lucide-react';
import { submitSupporter, getApprovedSupporters, hasSubmittedSupporter } from '@/lib/supporters';
import '@/index.css';

const PIX_KEY = '7d0f4d7b-d0d4-456e-8e72-971e17761cea';
const PIX_EMV = '00020126580014BR.GOV.BCB.PIX01367d0f4d7b-d0d4-456e-8e72-971e17761cea52040000530398654045.005802BR5921Davi Pontes Nacaratti6009SAO PAULO621405102qRr4nmf4k63047090';
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(PIX_EMV)}&size=200x200&margin=1`;

const BADGES = { coffee: '☕', star: '⭐', heart: '💜', trophy: '🏆' };

const SURF = '#22252f';
const BDR2 = '#363a47';

// ─── Formulário "Já fez seu Pix?" ────────────────────────────────────────────
const ClaimForm = ({ onSubmitted }) => {
  const already = hasSubmittedSupporter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(already ? 'done' : 'idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus('loading');
    const result = await submitSupporter({ name, message });
    if (result.ok) {
      setStatus('done');
      onSubmitted?.();
    } else {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-amber-900/30 bg-amber-900/10 px-4 py-3 text-center">
        <p className="text-sm text-amber-400/80">Obrigado pelo apoio! ☕</p>
        <p className="text-xs text-zinc-500 mt-1">Seu nome aparecerá no mural após aprovação.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <Send className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Já fez seu Pix? Deixe seu nome no mural!</span>
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="border-t border-zinc-700 px-4 pb-4 pt-3 flex flex-col gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value.slice(0, 40))}
            placeholder="Seu nome *"
            required
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 border outline-none focus:border-zinc-500 transition-colors"
            style={{ backgroundColor: SURF, borderColor: BDR2 }}
          />
          <input
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 100))}
            placeholder="Uma mensagem curta (opcional)"
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 border outline-none focus:border-zinc-500 transition-colors"
            style={{ backgroundColor: SURF, borderColor: BDR2 }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-600">{name.length}/40</span>
            {status === 'error' && <span className="text-xs text-red-400">Erro ao enviar. Tente novamente.</span>}
            <button
              type="submit"
              disabled={!name.trim() || status === 'loading'}
              className="flex items-center gap-1.5 text-sm font-semibold text-black bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-30"
            >
              {status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Mural de Apoiadores ─────────────────────────────────────────────────────
const SupporterWall = ({ supporters }) => {
  if (supporters.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-zinc-600 text-sm">Seja o primeiro a apoiar o Kinto!</p>
        <p className="text-zinc-700 text-xs mt-1">Faça um Pix e deixe seu nome no mural.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <Users className="w-4 h-4 text-amber-500/60" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Mural de Apoiadores · {supporters.length}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {supporters.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              i < 3
                ? 'bg-amber-900/20 border border-amber-700/30 text-amber-200'
                : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-300'
            }`}
            title={s.message || undefined}
          >
            <span>{BADGES[s.badge] || '☕'}</span>
            <span className="font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Página principal ────────────────────────────────────────────────────────
const DonationApp = () => {
  const [copied, setCopied] = useState(false);
  const [supporters, setSupporters] = useState([]);

  useEffect(() => {
    getApprovedSupporters(50).then(setSupporters);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PIX_EMV);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = PIX_EMV;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: '#e8eaf0', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <header
        className="w-full border-b border-zinc-800/60 px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, var(--color-header-bg-start), var(--color-bg))' }}
      >
        <div className="max-w-md mx-auto flex items-center gap-3">
          <a
            href="/"
            className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg"
            aria-label="Voltar ao jogo"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="text-lg font-bold tracking-wide text-white">Apoie o Kinto</h1>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex flex-col items-center px-4 py-10 gap-8 max-w-md mx-auto w-full">

        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-900/20 border border-amber-800/30 flex items-center justify-center">
            <Coffee className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Me pague um cafezinho?</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            O Kinto é gratuito e feito com carinho. Um cafezinho ajuda a manter tudo funcionando ☕
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div
            className="w-52 h-52 rounded-2xl border border-zinc-700 flex items-center justify-center overflow-hidden"
            style={{ background: '#fff' }}
          >
            <img
              src={QR_URL}
              alt="QR Code Pix"
              width={200}
              height={200}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-xs text-zinc-500 text-center">
            Escaneie com o app do seu banco · R$ 5,00
          </p>
        </div>

        {/* Copiar código Pix */}
        <div className="w-full flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 text-center">
            Pix Copia e Cola
          </p>
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
            <span className="flex-1 text-xs text-zinc-400 truncate font-mono">{PIX_KEY}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              style={{
                backgroundColor: copied ? '#b45309' : '#3f4253',
                color: copied ? '#fff' : '#cbd5e1',
              }}
              aria-label="Copiar código Pix"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Claim form */}
        <ClaimForm onSubmitted={() => getApprovedSupporters(50).then(setSupporters)} />

        {/* Mural */}
        <SupporterWall supporters={supporters} />

        {/* Rodapé */}
        <p className="text-xs text-zinc-600 text-center leading-relaxed">
          Cada apoio mantém o Kinto vivo e livre de anúncios.
        </p>
      </main>
    </div>
  );
};

export default DonationApp;
