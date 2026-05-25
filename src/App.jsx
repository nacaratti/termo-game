import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Toaster } from '@/components/ui/toaster';
import GameBoard from '@/components/GameBoard';
import Keyboard from '@/components/Keyboard';
import GameStatus from '@/components/GameStatus';
import GameHeader from '@/components/GameHeader';
import GameFooter from '@/components/GameFooter';
import { useGameLogic } from '@/hooks/useGameLogic';
import { getModeByPath } from '@/config/gameModes';
import { useTheme } from '@/hooks/useTheme';
import { getStreak } from '@/lib/streak';
import Confetti from '@/components/Confetti';
import { useHardMode } from '@/hooks/useHardMode';

const App = ({ initialMode, allModes }) => {
  const { theme, setTheme, themes } = useTheme();
  const { hardMode, setHardMode } = useHardMode();
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [streak] = useState(() => getStreak());
  const [showConfetti, setShowConfetti] = useState(false);
  const { wordLength, maxGuesses } = currentMode;

  const handleModeChange = useCallback((newMode) => {
    if (newMode.id === currentMode.id) return;
    window.history.pushState({}, '', newMode.path);
    document.title = newMode.id === 'classic' ? 'Kinto' : `Kinto · ${newMode.label}`;
    setCurrentMode(newMode);
  }, [currentMode.id]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentMode(getModeByPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    shakingRow,
  } = useGameLogic(wordLength, maxGuesses, hardMode);

  const mainRef = useRef(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setShowResult(false);
  }, [currentMode.id]);

  useEffect(() => {
    if (!isGameOver) return;
    if (isGameWon && !isRestored) setShowConfetti(true);
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
      <div className="flex items-center justify-center" style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={mainRef}
      className="flex flex-col"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)' }}
      onClick={() => mainRef.current?.focus()}
    >
      <Toaster />
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <GameHeader
        allModes={allModes}
        currentMode={currentMode}
        onModeChange={handleModeChange}
        theme={theme}
        setTheme={setTheme}
        themes={themes}
        hardMode={hardMode}
        setHardMode={setHardMode}
      />

      {/* Banner de streak — visível apenas se streak >= 2 e jogo não concluído */}
      {streak >= 2 && !isGameOver && (
        <div className="w-full max-w-lg mx-auto px-3 pt-2">
          <div className="flex items-center justify-center gap-2 rounded-lg py-1.5 px-3 text-xs theme-badge-present border">
            <span>🔥</span>
            <span className="theme-text-present font-semibold">
              Você está em uma sequência de {streak} {streak === 1 ? 'dia' : 'dias'}! Jogue para manter.
            </span>
          </div>
        </div>
      )}

      <main className="flex flex-col items-center justify-between flex-1 w-full max-w-lg mx-auto px-3 pt-3 pb-2">
        <GameBoard
          currentGuess={currentGuess}
          currentAttempt={currentAttempt}
          activeInputCol={activeInputCol}
          onTileFocus={handleTileFocus}
          submittedGuessesInfo={submittedGuessesInfo}
          isGameOver={isGameOver}
          wordLength={wordLength}
          maxGuesses={maxGuesses}
          shakingRow={shakingRow}
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
          currentMode={currentMode}
          hardMode={hardMode}
        />
      )}
    </div>
  );
};

export default App;
