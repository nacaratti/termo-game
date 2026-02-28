
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { WORD_LENGTH, MAX_GUESSES } from '@/config/constants';
import { checkGuess as evaluateGuess } from '@/lib/gameLogic';
import { getWordOfDay, getTodayDateStr } from '@/lib/wordOfDay';
import { saveGameResult, saveDailyResult } from '@/lib/stats';
import { saveCompletedGame, getCompletedGame } from '@/lib/gameState';
import { isValidGuess } from '@/lib/customWords';

export const useGameLogic = () => {
  const [solution, setSolution] = useState('');
  const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(null));
  const [currentGuess, setCurrentGuess] = useState(Array(WORD_LENGTH).fill(''));
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [activeInputCol, setActiveInputCol] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [usedLetters, setUsedLetters] = useState({});
  const [submittedGuessesInfo, setSubmittedGuessesInfo] = useState(Array(MAX_GUESSES).fill(null));
  // True quando o jogo é restaurado de uma sessão anterior (já jogou hoje)
  const [isRestored, setIsRestored] = useState(false);

  const { toast } = useToast();

  const applyNewSolution = useCallback((newSolution) => {
    setSolution(newSolution);
    setGuesses(Array(MAX_GUESSES).fill(null));
    setCurrentGuess(Array(WORD_LENGTH).fill(''));
    setCurrentAttempt(0);
    setActiveInputCol(0);
    setIsGameOver(false);
    setIsGameWon(false);
    setUsedLetters({});
    setSubmittedGuessesInfo(Array(MAX_GUESSES).fill(null));
    setIsRestored(false);
  }, []);

  const initializeGame = useCallback(() => {
    const today = getTodayDateStr();
    const saved = getCompletedGame(today);

    if (saved) {
      // Jogador já terminou o jogo hoje — restaura e bloqueia nova tentativa
      setSolution(saved.solution);
      setGuesses(saved.guesses);
      setCurrentGuess(Array(WORD_LENGTH).fill(''));
      setCurrentAttempt(saved.currentAttempt);
      setActiveInputCol(0);
      setIsGameOver(true);
      setIsGameWon(saved.isGameWon);
      setSubmittedGuessesInfo(saved.submittedGuessesInfo);
      setIsRestored(true);

      // Reconstrói as cores do teclado a partir das tentativas salvas
      const rebuilt = {};
      for (const row of (saved.submittedGuessesInfo || []).filter(Boolean)) {
        for (const { letter, status } of row) {
          if (status === 'correct') {
            rebuilt[letter] = 'correct';
          } else if (status === 'present' && rebuilt[letter] !== 'correct') {
            rebuilt[letter] = 'present';
          } else if (status === 'absent' && !rebuilt[letter]) {
            rebuilt[letter] = 'absent';
          }
        }
      }
      setUsedLetters(rebuilt);
    } else {
      applyNewSolution(getWordOfDay());
    }
  }, [applyNewSolution]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleTileFocus = (index) => {
    if (isGameOver || currentAttempt >= MAX_GUESSES) return;
    setActiveInputCol(index);
  };

  const processGuess = () => {
    const finalCurrentGuess = currentGuess.join('');
    if (finalCurrentGuess.length !== WORD_LENGTH) {
      toast({
        title: "Palavra incompleta",
        description: `A palavra deve ter ${WORD_LENGTH} letras.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (!isValidGuess(finalCurrentGuess)) {
      toast({
        title: "Palavra inválida",
        description: "Esta palavra não está no dicionário.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    const { newUsedLetters, isCorrect, guessEvaluation } = evaluateGuess(finalCurrentGuess, solution, usedLetters);

    const newGuesses = [...guesses];
    newGuesses[currentAttempt] = finalCurrentGuess;
    setGuesses(newGuesses);

    const newSubmittedInfo = [...submittedGuessesInfo];
    newSubmittedInfo[currentAttempt] = guessEvaluation;
    setSubmittedGuessesInfo(newSubmittedInfo);

    setUsedLetters(newUsedLetters);

    const today = getTodayDateStr();

    if (isCorrect) {
      setIsGameOver(true);
      setIsGameWon(true);
      saveGameResult(true, currentAttempt + 1);
      saveDailyResult(today, true, currentAttempt + 1);
      saveCompletedGame({
        dateStr: today,
        solution,
        guesses: newGuesses,
        submittedGuessesInfo: newSubmittedInfo,
        isGameWon: true,
        currentAttempt,
      });
      toast({
        title: "Parabéns!",
        description: "Você acertou a palavra!",
        className: "bg-green-500 border-green-400 text-white",
        duration: 4000,
      });
    } else if (currentAttempt + 1 >= MAX_GUESSES) {
      setIsGameOver(true);
      saveGameResult(false, MAX_GUESSES);
      saveDailyResult(today, false, MAX_GUESSES);
      saveCompletedGame({
        dateStr: today,
        solution,
        guesses: newGuesses,
        submittedGuessesInfo: newSubmittedInfo,
        isGameWon: false,
        currentAttempt,
      });
      toast({
        title: "Fim de jogo!",
        description: `A palavra era: ${solution}`,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      setCurrentAttempt(currentAttempt + 1);
      setCurrentGuess(Array(WORD_LENGTH).fill(''));
      setActiveInputCol(0);
    }
  };

  const handleKeyboardPress = (key) => {
    if (isGameOver) return;

    if (key === 'ENTER') {
      processGuess();
    } else if (key === 'BACKSPACE') {
      const newGuess = [...currentGuess];
      if (newGuess[activeInputCol] !== '') {
        newGuess[activeInputCol] = '';
        setCurrentGuess(newGuess);
      } else if (activeInputCol > 0) {
        newGuess[activeInputCol - 1] = '';
        setCurrentGuess(newGuess);
        setActiveInputCol(activeInputCol - 1);
      }
    } else if (/^[A-Z]$/.test(key.toUpperCase())) {
      if (activeInputCol < WORD_LENGTH) {
        const newGuess = [...currentGuess];
        newGuess[activeInputCol] = key.toUpperCase();
        setCurrentGuess(newGuess);
        if (activeInputCol < WORD_LENGTH - 1) {
          setActiveInputCol(activeInputCol + 1);
        }
      }
    }
  };

  return {
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
    initializeGame,
    handleTileFocus,
    processGuess,
    handleKeyboardPress,
    setActiveInputCol,
  };
};
