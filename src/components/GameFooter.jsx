import React from 'react';

const GameFooter = () => (
  <footer className="py-4 text-center flex items-center justify-center gap-4">
    <p className="text-xs text-zinc-700 tracking-wide">
      &copy; {new Date().getFullYear()} Kinto
    </p>
    <a
      href="/apoie"
      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
    >
      Apoiar ♥
    </a>
  </footer>
);

export default GameFooter;
