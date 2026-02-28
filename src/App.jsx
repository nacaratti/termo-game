
import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import GameBoard from '@/components/GameBoard';
import Keyboard from '@/components/Keyboard';
import GameStatus from '@/components/GameStatus';
import GameHeader from '@/components/GameHeader';
import GameControls from '@/components/GameControls';
import GameFooter from '@/components/GameFooter';
import { useGameLogic } from '@/hooks/useGameLogic';

const App = () => {
  const {
    solution,
    guesses,
    currentGuess,
    currentAttempt,
    activeInputCol,
    isGameOver,
    isGameWon,
    isRestored,
    usedLetters,
    submittedGuessesInfo,
    handleTileFocus,
    processGuess,
    handleKeyboardPress,
    setActiveInputCol,
  } = useGameLogic();
  
  const mainContainerRef = useRef(null);
  const [showResult, setShowResult] = useState(false);

  // Abre o popup após o fim do jogo.
  // Jogo novo: delay de 1.6s para esperar a animação dos tiles.
  // Jogo restaurado (já jogou hoje): delay curto de 400ms.
  useEffect(() => {
    if (!isGameOver) return;
    const delay = isRestored ? 400 : 1600;
    const timer = setTimeout(() => setShowResult(true), delay);
    return () => clearTimeout(timer);
  }, [isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mainContainerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isGameOver) return;

      const key = event.key.toUpperCase();
      if (key === 'ENTER') {
        event.preventDefault();
        processGuess();
      } else if (key === 'BACKSPACE') {
        event.preventDefault();
        handleKeyboardPress('BACKSPACE');
      } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
        event.preventDefault();
        handleKeyboardPress(key);
      } else if (key === 'ARROWLEFT') {
        event.preventDefault();
        if (activeInputCol > 0) setActiveInputCol(activeInputCol - 1);
      } else if (key === 'ARROWRIGHT') {
        event.preventDefault();
        if (activeInputCol < currentGuess.length -1 ) setActiveInputCol(activeInputCol + 1);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isGameOver, processGuess, handleKeyboardPress, activeInputCol, currentGuess.length, setActiveInputCol]);


  return (
    <div 
      ref={mainContainerRef}
      tabIndex={-1} 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-black to-emerald-900 text-foreground p-3 sm:p-4 outline-none"
      onClick={() => mainContainerRef.current?.focus()}
    >
      <Toaster />
      <GameHeader />

      <main className="flex flex-col items-center w-full max-w-xs sm:max-w-md">
        <GameBoard
          currentGuess={currentGuess}
          currentAttempt={currentAttempt}
          activeInputCol={activeInputCol}
          onTileFocus={handleTileFocus}
          submittedGuessesInfo={submittedGuessesInfo}
          isGameOver={isGameOver}
        />

        {isGameOver && (
          <GameStatus
            isGameWon={isGameWon}
            solution={solution}
            currentAttempt={currentAttempt}
            submittedGuessesInfo={submittedGuessesInfo}
            isOpen={showResult}
            onClose={() => setShowResult(false)}
          />
        )}
        
        <Keyboard
          onKeyPress={handleKeyboardPress}
          usedLetters={usedLetters}
          isGameOver={isGameOver}
        />

        {isGameOver && !showResult && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {isRestored && (
              <p className="text-slate-500 text-xs text-center">
                Você já jogou hoje. Volte amanhã para uma nova palavra.
              </p>
            )}
            <button
              onClick={() => setShowResult(true)}
              className="text-sm text-slate-400 hover:text-primary border border-slate-700 hover:border-primary px-4 py-1.5 rounded-lg transition-colors"
            >
              Ver resultado
            </button>
          </div>
        )}

        <GameControls />
      </main>
      
      <GameFooter />
    </div>
  );
};

export default App;
