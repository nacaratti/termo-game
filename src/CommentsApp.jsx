import React, { lazy, Suspense } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

const CommentsSection = lazy(() => import('@/components/CommentsSection'));

const BG = '#16181d';

const CommentsApp = () => {
  return (
    <div className="min-h-dvh text-white" style={{ backgroundColor: BG }}>
      <header className="sticky top-0 z-10 border-b border-zinc-800/60" style={{ background: 'linear-gradient(to bottom, #1a1d27, #16181d)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao jogo</span>
          </a>
          <h1 className="font-black tracking-[0.2em] text-white text-lg uppercase">Comentários</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-zinc-400 text-sm leading-relaxed">
            Deixe seu comentário, sugestão ou crítica. O <span className="text-white font-semibold">CEO Agent</span> lê tudo toda semana e pode transformar suas ideias em melhorias reais no jogo.
          </p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        }>
          <CommentsSection />
        </Suspense>

        <div className="mt-12 pb-6 text-center">
          <a
            href="/changelog"
            className="text-xs text-zinc-600 hover:text-white transition-colors"
          >
            Ver evolução do projeto →
          </a>
        </div>
      </main>
    </div>
  );
};

export default CommentsApp;
