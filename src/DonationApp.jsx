import React, { useState } from 'react';
import { Copy, Check, Heart, ArrowLeft } from 'lucide-react';
import '@/index.css';

// Atualize com a sua chave Pix real
const PIX_KEY = import.meta.env.VITE_PIX_KEY || 'SEU_PIX_AQUI';

const DonationApp = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = PIX_KEY;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isPlaceholder = PIX_KEY === 'SEU_PIX_AQUI';

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
        <div className="max-w-sm mx-auto flex items-center gap-3">
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8 max-w-sm mx-auto w-full">

        {/* Ícone */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <Heart className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Obrigado pelo apoio!</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            O Kinto é gratuito e mantido por um projeto independente. Qualquer apoio
            ajuda a manter o servidor e evoluir o jogo.
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div
            className="w-52 h-52 rounded-2xl border border-zinc-700 flex items-center justify-center overflow-hidden"
            style={{ background: '#fff' }}
          >
            {isPlaceholder ? (
              <p className="text-zinc-400 text-xs text-center p-4 leading-relaxed" style={{ color: '#888' }}>
                QR Code Pix<br />Configure VITE_PIX_KEY
              </p>
            ) : (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(PIX_KEY)}&size=200x200&margin=1`}
                alt="QR Code Pix"
                width={200}
                height={200}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <p className="text-xs text-zinc-500 text-center">
            Escaneie com o app do seu banco
          </p>
        </div>

        {/* Copiar chave */}
        <div className="w-full flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 text-center">
            Chave Pix
          </p>
          <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
            <span className="flex-1 text-sm text-zinc-300 truncate font-mono">{PIX_KEY}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: copied ? 'var(--color-correct)' : '#3f4253',
                color: copied ? '#fff' : '#cbd5e1',
              }}
              aria-label="Copiar chave Pix"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Mensagem de gratidão */}
        <p className="text-xs text-zinc-600 text-center leading-relaxed">
          Cada apoio mantém o Kinto vivo e livre de anúncios.
        </p>
      </main>
    </div>
  );
};

export default DonationApp;
