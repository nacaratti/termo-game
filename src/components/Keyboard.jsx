import React from 'react';
import { keyboardRows } from '@/config/constants';
import { getKeyboardKeyColor } from '@/lib/gameLogic';

const Keyboard = ({ onKeyPress, usedLetters, isGameOver }) => (
  <div className="w-full px-1 mt-4" aria-label="Teclado virtual">
    {keyboardRows.map((row, rowIndex) => (
      <div key={rowIndex} className="flex justify-center gap-1 mb-1.5">
        {row.map((key) => {
          const isSpecial = key.length > 1;
          const colorClass = getKeyboardKeyColor(key, usedLetters);
          const isEnter = key === 'ENTER';

          return (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={isGameOver || usedLetters[key] === 'absent'}
              aria-label={key === 'BACKSPACE' ? 'Apagar' : key === 'ENTER' ? 'Enviar' : `Tecla ${key}`}
              className={`keyboard-key ${colorClass} ${
                isSpecial
                  ? 'flex-[1.6] text-xs font-bold'
                  : 'flex-1 text-sm font-semibold'
              } ${isEnter ? '!bg-white !text-black hover:!opacity-90' : ''}`}
            >
              {key === 'BACKSPACE' ? '⌫' : key}
            </button>
          );
        })}
      </div>
    ))}
  </div>
);

export default Keyboard;
