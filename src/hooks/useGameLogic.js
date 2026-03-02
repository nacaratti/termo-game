
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { WORD_LENGTH, MAX_GUESSES } from '@/config/constants';
import { checkGuess as evaluateGuess } from '@/lib/gameLogic';
import { initWordOfDay, getTodayDateStr } from '@/lib/wordOfDay';
import { saveGameResult, saveDailyResult } from '@/lib/stats';
import { saveGameProgress, saveCompletedGame, getSavedGame } from '@/lib/gameState';
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
  const [isLoading, setIsLoading] = useState(true);

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

  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    const today = getTodayDateStr();
    const currentWord = await initWordOfDay();
    const saved = getSavedGame(today, currentWord);

    if (saved) {
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

      setSolution(saved.solution);
      setGuesses(saved.guesses);
      setCurrentGuess(Array(WORD_LENGTH).fill(''));
      setSubmittedGuessesInfo(saved.submittedGuessesInfo);
      setUsedLetters(rebuilt);
      setActiveInputCol(0);

      if (saved.isGameOver) {
        // Jogo terminado — restaura e bloqueia
        setCurrentAttempt(saved.currentAttempt);
        setIsGameOver(true);
        setIsGameWon(saved.isGameWon);
        setIsRestored(true);
      } else {
        // Jogo em andamento — restaura tentativas mas permite continuar
        setCurrentAttempt(saved.currentAttempt + 1);
        setIsGameOver(false);
        setIsGameWon(false);
        setIsRestored(false);
      }
    } else {
      applyNewSolution(currentWord);
    }
    setIsLoading(false);
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
      saveDailyResult(today, solution, true, currentAttempt + 1);
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
      saveDailyResult(today, solution, false, MAX_GUESSES);
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
      // Salva progresso para restaurar ao recarregar a página
      saveGameProgress({
        dateStr: today,
        solution,
        guesses: newGuesses,
        submittedGuessesInfo: newSubmittedInfo,
        currentAttempt,
      });
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
    isLoading,
    usedLetters,
    submittedGuessesInfo,
    initializeGame,
    handleTileFocus,
    processGuess,
    handleKeyboardPress,
    setActiveInputCol,
  };
};
