import React from 'react';
import { keyboardRows } from '@/config/constants';
import { getKeyboardKeyColor } from '@/lib/gameLogic';

const KEY_STATUS_SUFFIX = {
  correct: ', correta',
  present: ', presente na palavra',
  absent: ', não está na palavra',
};

const getKeyAriaLabel = (key, usedLetters) => {
  if (key === 'BACKSPACE') return 'Apagar última letra';
  if (key === 'ENTER') return 'Enviar tentativa';
  const status = usedLetters[key];
  return `Letra ${key}${KEY_STATUS_SUFFIX[status] ?? ''}`;
};

const Keyboard = ({ onKeyPress, usedLetters, isGameOver }) => (
  <div className="w-full px-1 mt-4" role="group" aria-label="Teclado virtual">
    {keyboardRows.map((row, rowIndex) => (
      <div key={rowIndex} className="flex justify-center gap-1 mb-1.5">
        {row.map((key) => {
          const isSpecial = key.length > 1;
          const colorClass = getKeyboardKeyColor(key, usedLetters);
          const isAction = key === 'ENTER' || key === 'BACKSPACE';

          return (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              disabled={isGameOver}
              aria-label={getKeyAriaLabel(key, usedLetters)}
              className={`keyboard-key ${colorClass} ${
                isSpecial
                  ? 'flex-[1.6] text-xs font-bold'
                  : 'flex-1 text-sm font-semibold'
              } ${isAction ? '!bg-white !text-black hover:!opacity-90' : ''}`}
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
