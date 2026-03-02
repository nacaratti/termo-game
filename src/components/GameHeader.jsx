import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

const ExampleTile = ({ letter, status }) => {
  const cls = {
    correct: 'bg-[#6aaa64] border-[#6aaa64] text-white',
    present: 'bg-[#c9a84c] border-[#c9a84c] text-white',
    absent:  'bg-[#383b4a] border-[#383b4a] text-[#676a7a]',
  }[status];
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 border-2 font-bold text-sm ${cls}`}
      style={{ borderRadius: 3 }}>
      {letter}
    </span>
  );
};

const InstructionsModal = ({ onClose }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <div className="absolute inset-0 bg-black/80" />
    <motion.div
      className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 text-zinc-200"
      initial={{ scale: 0.94, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold tracking-widest text-white uppercase">Como jogar</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Fechar">
          <X className="w-5 h-5" />
        </button>
      </div>

      <ul className="space-y-2 text-sm mb-5 text-zinc-400 list-disc list-inside leading-relaxed">
        <li>Adivinhe a palavra oculta em <span className="text-white font-semibold">6 tentativas</span>.</li>
        <li>A palavra tem exatamente <span className="text-white font-semibold">5 letras</span>.</li>
        <li>Cada chute deve ser uma palavra válida do dicionário.</li>
        <li>Use <span className="text-white font-semibold">ENTER</span> (direita) para confirmar e <span className="text-white font-semibold">⌫</span> (esquerda) para apagar.</li>
      </ul>

      <div className="border-t border-zinc-800 pt-4 mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Exemplos</p>
        <div className="space-y-4 text-sm">
          <div>
            <div className="flex gap-1.5 mb-1.5">
              <ExampleTile letter="T" status="correct" />
              <ExampleTile letter="E" status="absent" />
              <ExampleTile letter="M" status="absent" />
              <ExampleTile letter="P" status="absent" />
              <ExampleTile letter="O" status="absent" />
            </div>
            <p className="text-zinc-400"><span className="text-[#6aaa64] font-semibold">T</span> está na posição correta.</p>
          </div>
          <div>
            <div className="flex gap-1.5 mb-1.5">
              <ExampleTile letter="V" status="absent" />
              <ExampleTile letter="E" status="present" />
              <ExampleTile letter="R" status="absent" />
              <ExampleTile letter="D" status="absent" />
              <ExampleTile letter="E" status="absent" />
            </div>
            <p className="text-zinc-400"><span className="text-[#c9a84c] font-semibold">E</span> está na palavra, mas em outra posição.</p>
          </div>
          <div>
            <div className="flex gap-1.5 mb-1.5">
              <ExampleTile letter="F" status="absent" />
              <ExampleTile letter="O" status="absent" />
              <ExampleTile letter="R" status="absent" />
              <ExampleTile letter="T" status="absent" />
              <ExampleTile letter="E" status="absent" />
            </div>
            <p className="text-zinc-400"><span className="text-zinc-500 font-semibold">F, O, R, T, E</span> não estão na palavra.</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Uma nova palavra todos os dias. <span className="text-white font-semibold">Uma tentativa por dia</span> — use bem!
      </p>
    </motion.div>
  </motion.div>
);

const GameHeader = () => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <header className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="w-9" />
        <h1 className="text-4xl font-black tracking-[0.3em] text-white uppercase select-none">
          Pentada
        </h1>
        <button
          onClick={() => setShowInfo(true)}
          className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg"
          aria-label="Como jogar"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      <AnimatePresence>
        {showInfo && <InstructionsModal onClose={() => setShowInfo(false)} />}
      </AnimatePresence>
    </>
  );
};

export default GameHeader;
