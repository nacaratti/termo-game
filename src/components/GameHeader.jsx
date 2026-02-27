
import React from 'react';
import { MAX_GUESSES } from '@/config/constants';

const GameHeader = () => (
  <header className="mb-6 sm:mb-8 text-center">
    <h1 className="text-4xl sm:text-5xl font-extrabold gradient-text animate-gradient-flow">Qual é a palavra?</h1>
    <p className="text-slate-400 text-sm sm:text-base">Adivinhe a palavra em {MAX_GUESSES} tentativas.</p>
  </header>
);

export default GameHeader;
