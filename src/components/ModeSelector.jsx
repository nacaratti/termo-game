import React from 'react';
import { motion } from 'framer-motion';

const ModeSelector = ({ modes, activeMode, onModeChange }) => {
  const activeIndex = modes.findIndex((m) => m.id === activeMode.id);

  return (
    <div className="flex items-center justify-center px-4 py-2">
      <div className="relative flex items-center bg-zinc-800/80 rounded-full p-0.5 border border-zinc-700/50">
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-full bg-white/10 border border-zinc-600/50"
          animate={{
            left: `${activeIndex * (100 / modes.length)}%`,
            width: `${100 / modes.length}%`,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ position: 'absolute', margin: 2 }}
        />

        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode)}
            className={`relative z-10 px-5 py-1.5 text-xs font-semibold rounded-full transition-colors min-w-[90px] min-h-[36px] ${
              activeMode.id === mode.id
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            aria-pressed={activeMode.id === mode.id}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
