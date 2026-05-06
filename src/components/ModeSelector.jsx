import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

const ModeSelector = ({ modes, activeMode, onModeChange }) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Fecha ao clicar fora (só desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isMobile]);

  // Fecha no Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (mode) => {
    onModeChange(mode);
    setOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 border border-zinc-700/50 rounded-full transition-colors"
        >
          {activeMode.label}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
        </button>

        {/* Dropdown — desktop */}
        <AnimatePresence>
          {open && !isMobile && (
            <motion.div
              ref={menuRef}
              role="menu"
              className="absolute left-1/2 top-full mt-2 z-50 min-w-[180px] -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  role="menuitem"
                  onClick={() => handleSelect(mode)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${
                    activeMode.id === mode.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-white'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-sm">{mode.label}</span>
                    <span className="text-xs text-zinc-500 mt-0.5">{mode.description}</span>
                  </span>
                  {activeMode.id === mode.id && (
                    <Check className="w-4 h-4 text-[#6aaa64] ml-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom sheet — mobile */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-stretch justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
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
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  role="menuitem"
                  onClick={() => handleSelect(mode)}
                  className={`w-full flex items-center justify-between px-6 py-4 text-left border-t border-zinc-800 transition-colors active:bg-zinc-800 ${
                    activeMode.id === mode.id
                      ? 'bg-zinc-800/60 text-white'
                      : 'text-zinc-400'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-base">{mode.label}</span>
                    <span className="text-sm text-zinc-500 mt-0.5">{mode.description}</span>
                  </span>
                  {activeMode.id === mode.id && (
                    <Check className="w-5 h-5 text-[#6aaa64]" />
                  )}
                </button>
              ))}
              <div className="pb-8" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ModeSelector;
