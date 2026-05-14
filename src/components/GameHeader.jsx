import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Settings2, X, Check, ScrollText, MessageCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

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

const InstructionsModal = ({ onClose, currentMode }) => (
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
        <li>Adivinhe a palavra oculta em <span className="text-white font-semibold">{currentMode.maxGuesses} tentativas</span>.</li>
        <li>A palavra tem exatamente <span className="text-white font-semibold">{currentMode.wordLength} letras</span>.</li>
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

const _TUTORIAL_KEY = '_kw';

const GameHeader = ({ allModes, currentMode, onModeChange }) => {
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(_TUTORIAL_KEY)) setShowInfo(true);
    } catch {
      setShowInfo(true);
    }
  }, []);
  const [showModes, setShowModes] = useState(false);
  const isMobile = useIsMobile();
  const gearRef = useRef(null);
  const modeMenuRef = useRef(null);

  useEffect(() => {
    if (!showModes || isMobile) return;
    const handler = (e) => {
      if (
        gearRef.current && !gearRef.current.contains(e.target) &&
        modeMenuRef.current && !modeMenuRef.current.contains(e.target)
      ) setShowModes(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModes, isMobile]);

  useEffect(() => {
    if (!showModes) return;
    const handler = (e) => { if (e.key === 'Escape') setShowModes(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModes]);

  const handleModeSelect = (mode) => {
    onModeChange(mode);
    setShowModes(false);
  };

  return (
    <>
      <header className="w-full border-b border-zinc-800/60" style={{ background: 'linear-gradient(to bottom, #1a1d27, #16181d)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto w-full px-3 py-3">

          {/* Esquerda: ajuda + changelog */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowInfo(true)}
              className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg"
              aria-label="Como jogar"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <a
              href="/changelog"
              className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg"
              aria-label="Novidades"
              title="Novidades"
            >
              <ScrollText className="w-5 h-5" />
            </a>
          </div>

          {/* Centro: título */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.25em] text-white uppercase select-none">
            Kinto
          </h1>

          {/* Direita: comentários + configurações de modo */}
          <div className="flex items-center gap-1 relative">
            <a
              href="/comments"
              className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg"
              aria-label="Comentários"
              title="Comentários"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
            <button
              ref={gearRef}
              onClick={() => setShowModes((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showModes}
              aria-label="Modo de jogo"
              className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg"
            >
              <motion.span
                animate={{ rotate: showModes ? 60 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex"
              >
                <Settings2 className="w-5 h-5" />
              </motion.span>
            </button>

            {/* Dropdown — desktop */}
            <AnimatePresence>
              {showModes && !isMobile && (
                <motion.div
                  ref={modeMenuRef}
                  role="menu"
                  className="absolute right-0 top-full mt-2 z-50 min-w-[190px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-4 pt-3 pb-1">
                    Modo de jogo
                  </p>
                  {allModes.map((mode) => (
                    <button
                      key={mode.id}
                      role="menuitem"
                      onClick={() => handleModeSelect(mode)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors last:rounded-b-xl ${
                        currentMode.id === mode.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-white'
                      }`}
                    >
                      <span className="flex flex-col">
                        <span className="font-semibold text-sm">{mode.label}</span>
                        <span className="text-xs text-zinc-500 mt-0.5">{mode.description}</span>
                      </span>
                      {currentMode.id === mode.id && (
                        <Check className="w-4 h-4 text-[#6aaa64] ml-4 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Bottom sheet — mobile */}
      <AnimatePresence>
        {showModes && isMobile && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-stretch justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowModes(false)}
          >
            <div className="absolute inset-0 bg-black/70" />
            <motion.div
              role="menu"
              className="relative bg-zinc-900 border-t border-zinc-700 rounded-t-2xl overflow-hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 text-center pt-2 pb-3">
                Modo de jogo
              </p>
              {allModes.map((mode) => (
                <button
                  key={mode.id}
                  role="menuitem"
                  onClick={() => handleModeSelect(mode)}
                  className={`w-full flex items-center justify-between px-6 py-4 text-left border-t border-zinc-800 transition-colors active:bg-zinc-800 ${
                    currentMode.id === mode.id
                      ? 'bg-zinc-800/60 text-white'
                      : 'text-zinc-400'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-base">{mode.label}</span>
                    <span className="text-sm text-zinc-500 mt-0.5">{mode.description}</span>
                  </span>
                  {currentMode.id === mode.id && (
                    <Check className="w-5 h-5 text-[#6aaa64]" />
                  )}
                </button>
              ))}
              <div className="pb-8" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de instruções */}
      <AnimatePresence>
        {showInfo && (
        <InstructionsModal
          onClose={() => {
            setShowInfo(false);
            try { localStorage.setItem(_TUTORIAL_KEY, '1'); } catch {}
          }}
          currentMode={currentMode}
        />
      )}
      </AnimatePresence>
    </>
  );
};

export default GameHeader;
