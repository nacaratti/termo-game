
import React from 'react';
import { Button } from '@/components/ui/button';
import { keyboardRows } from '@/config/constants';
import { getKeyboardKeyColor } from '@/lib/gameLogic';

const Keyboard = ({ onKeyPress, usedLetters, isGameOver }) => {
  return (
    <div className="w-full mt-6" aria-label="Teclado virtual">
      {keyboardRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 my-1">
          {row.map((key) => (
            <Button
              key={key}
              onClick={() => onKeyPress(key)}
              variant="outline"
              size={key.length > 1 ? 'lg' : 'icon'}
              className={`keyboard-key
                ${key.length > 1 ? 'px-2.5 py-2 text-xs sm:px-3 sm:text-sm' : 'w-8 h-10 sm:w-10 sm:h-12 text-base sm:text-lg'}
                ${getKeyboardKeyColor(key, usedLetters)}
                border-slate-500 text-white
              `}
              disabled={isGameOver || usedLetters[key] === 'absent'}
              aria-label={key === 'BACKSPACE' ? 'Apagar' : (key === 'ENTER' ? 'Enviar' : `Tecla ${key}`)}
            >
              {key === 'BACKSPACE' ? '⌫' : key}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
