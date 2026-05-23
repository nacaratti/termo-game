import React from 'react';

const GameFooter = () => (
  <footer className="py-4 text-center flex items-center justify-center gap-4 flex-wrap">
    <p className="text-xs text-zinc-700 tracking-wide">
      &copy; {new Date().getFullYear()} Kinto
    </p>
    <a
      href="/apoie"
      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
    >
      Apoiar ♥
    </a>
    <a
      href="/changelog"
      className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800 hover:border-zinc-700 rounded-full px-2.5 py-0.5"
      title="Mantido por agentes de IA"
    >
      <span>🤖</span>
      <span>Mantido por IA</span>
    </a>
  </footer>
);

export default GameFooter;
