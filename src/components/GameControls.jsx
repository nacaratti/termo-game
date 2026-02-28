
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

const ExampleTile = ({ letter, status }) => {
  const colors = {
    correct: 'bg-green-600 border-green-500 text-white',
    present: 'bg-yellow-500 border-yellow-400 text-white',
    absent:  'bg-slate-500 border-slate-400 text-white opacity-70',
  };
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 border-2 rounded font-bold text-base ${colors[status]}`}>
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
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/70" />

    {/* Panel */}
    <motion.div
      className="relative w-full max-w-sm bg-slate-900 border border-primary/40 rounded-xl shadow-2xl p-6 text-slate-200"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-primary">Como jogar</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rules */}
      <ul className="space-y-2 text-sm mb-5 text-slate-300 list-disc list-inside">
        <li>Adivinhe a palavra oculta em <span className="text-primary font-semibold">6 tentativas</span>.</li>
        <li>A palavra tem exatamente <span className="text-primary font-semibold">5 letras</span>.</li>
        <li>Cada chute deve ser uma palavra válida do dicionário.</li>
        <li>Pressione <span className="text-primary font-semibold">ENTER</span> (direita) para confirmar e <span className="text-primary font-semibold">⌫</span> (esquerda) para apagar.</li>
        <li>Após enviar, as cores revelam o quanto você se aproximou.</li>
      </ul>

      <hr className="border-slate-700 mb-4" />

      {/* Examples */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Exemplos</p>

      <div className="space-y-4 text-sm">
        <div>
          <div className="flex gap-1 mb-1">
            <ExampleTile letter="T" status="correct" />
            <ExampleTile letter="E" status="absent" />
            <ExampleTile letter="M" status="absent" />
            <ExampleTile letter="P" status="absent" />
            <ExampleTile letter="O" status="absent" />
          </div>
          <p><span className="text-green-400 font-semibold">T</span> está na posição correta.</p>
        </div>

        <div>
          <div className="flex gap-1 mb-1">
            <ExampleTile letter="V" status="absent" />
            <ExampleTile letter="E" status="present" />
            <ExampleTile letter="R" status="absent" />
            <ExampleTile letter="D" status="absent" />
            <ExampleTile letter="E" status="absent" />
          </div>
          <p><span className="text-yellow-400 font-semibold">E</span> está na palavra, mas em outra posição.</p>
        </div>

        <div>
          <div className="flex gap-1 mb-1">
            <ExampleTile letter="F" status="absent" />
            <ExampleTile letter="O" status="absent" />
            <ExampleTile letter="R" status="absent" />
            <ExampleTile letter="T" status="absent" />
            <ExampleTile letter="E" status="absent" />
          </div>
          <p><span className="text-slate-400 font-semibold">F, O, R, T, E</span> não estão na palavra.</p>
        </div>
      </div>

      <hr className="border-slate-700 my-4" />
      <p className="text-xs text-slate-500 text-center">
        Uma nova palavra está disponível a cada dia. Você tem <span className="text-primary font-semibold">uma tentativa por dia</span> — use bem!
      </p>
    </motion.div>
  </motion.div>
);

const GameControls = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <>
      <div className="flex gap-2 mt-6">
        <Button
          onClick={() => setShowInstructions(true)}
          variant="outline"
          className="bg-card hover:bg-card/80 text-slate-300 border-primary/50"
          aria-label="Instruções"
        >
          <Info className="mr-1.5 sm:mr-2 h-4 w-4" /> Sobre
        </Button>
      </div>

      <AnimatePresence>
        {showInstructions && (
          <InstructionsModal onClose={() => setShowInstructions(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default GameControls;
