import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import GameBoard from '@/components/GameBoard';
import Keyboard from '@/components/Keyboard';
import GameStatus from '@/components/GameStatus';
import GameHeader from '@/components/GameHeader';
import GameFooter from '@/components/GameFooter';
import { useGameLogic } from '@/hooks/useGameLogic';
import { WORD_LENGTH, MAX_GUESSES } from '@/config/constants';

const App = ({ wordLength = WORD_LENGTH, maxGuesses = MAX_GUESSES, showChallenge = true }) => {
  const {
    solution,
    currentGuess,
    currentAttempt,
    activeInputCol,
    isGameOver,
    isGameWon,
    isRestored,
    isLoading,
    usedLetters,
    submittedGuessesInfo,
    handleTileFocus,
    processGuess,
    handleKeyboardPress,
    setActiveInputCol,
  } = useGameLogic(wordLength, maxGuesses);

  const mainRef = useRef(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!isGameOver) return;
    const delay = isRestored ? 400 : 1650;
    const timer = setTimeout(() => setShowResult(true), delay);
    return () => clearTimeout(timer);
  }, [isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isGameOver) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        e.preventDefault(); processGuess();
      } else if (key === 'BACKSPACE') {
        e.preventDefault(); handleKeyboardPress('BACKSPACE');
      } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
        e.preventDefault(); handleKeyboardPress(key);
      } else if (key === 'ARROWLEFT' && activeInputCol > 0) {
        e.preventDefault(); setActiveInputCol(activeInputCol - 1);
      } else if (key === 'ARROWRIGHT' && activeInputCol < currentGuess.length - 1) {
        e.preventDefault(); setActiveInputCol(activeInputCol + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, processGuess, handleKeyboardPress, activeInputCol, currentGuess.length, setActiveInputCol]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100dvh', backgroundColor: '#16181d' }}>
        <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
      </div>
    );
  }


  return (
    <div
      ref={mainRef}
      className="flex flex-col"
      style={{ minHeight: '100dvh', backgroundColor: '#16181d' }}
      onClick={() => mainRef.current?.focus()}
    >
      <Toaster />
      <GameHeader />

      <main className="flex flex-col items-center justify-between flex-1 w-full max-w-lg mx-auto px-3 pt-4 pb-2">
        <GameBoard
          currentGuess={currentGuess}
          currentAttempt={currentAttempt}
          activeInputCol={activeInputCol}
          onTileFocus={handleTileFocus}
          submittedGuessesInfo={submittedGuessesInfo}
          isGameOver={isGameOver}
          wordLength={wordLength}
          maxGuesses={maxGuesses}
        />

        <div className="w-full">
          <Keyboard
            onKeyPress={handleKeyboardPress}
            usedLetters={usedLetters}
            isGameOver={isGameOver}
          />

          {isGameOver && !showResult && (
            <div className="flex flex-col items-center gap-1.5 mt-4">
              {isRestored && (
                <p className="text-zinc-600 text-xs text-center">
                  Você já jogou hoje. Volte amanhã para uma nova palavra.
                </p>
              )}
              <button
                onClick={() => setShowResult(true)}
                className="text-xs text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-4 py-2 rounded-lg transition-colors"
              >
                Ver resultado
              </button>
            </div>
          )}
        </div>
      </main>

      <GameFooter />

      {isGameOver && (
        <GameStatus
          isGameWon={isGameWon}
          solution={solution}
          currentAttempt={currentAttempt}
          submittedGuessesInfo={submittedGuessesInfo}
          isOpen={showResult}
          onClose={() => setShowResult(false)}
          maxGuesses={maxGuesses}
          showChallenge={showChallenge}
        />
      )}
    </div>
  );
};

export default App;
