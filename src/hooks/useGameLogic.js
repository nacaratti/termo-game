
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { WORD_LENGTH, MAX_GUESSES } from '@/config/constants';
import { checkGuess as evaluateGuess } from '@/lib/gameLogic';
import { validateHardModeGuess } from '@/hooks/useHardMode';
import { initWordOfDay, getTodayDateStr } from '@/lib/wordOfDay';
import { initWordOfDay6 } from '@/lib/wordOfDay6';
import { saveGameResult, saveDailyResult } from '@/lib/stats';
import { saveDailyResult6 } from '@/lib/stats6';
import { saveGameProgress, saveCompletedGame, getSavedGame } from '@/lib/gameState';
import { saveGameProgress6, saveCompletedGame6, getSavedGame6 } from '@/lib/gameState6';
import { trackEvent } from '@/lib/analytics';

export const useGameLogic = (wordLength = WORD_LENGTH, maxGuesses = MAX_GUESSES, hardMode = false) => {
  const is6 = wordLength === 6;
  const getWordFn       = is6 ? initWordOfDay6    : initWordOfDay;
  const saveProgressFn  = is6 ? saveGameProgress6 : saveGameProgress;
  const saveCompletedFn = is6 ? saveCompletedGame6 : saveCompletedGame;
  const getSavedFn      = is6 ? getSavedGame6     : getSavedGame;

  const validateRef = useRef(null);

  const [solution, setSolution] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [guesses, setGuesses] = useState(Array(maxGuesses).fill(null));
  const [currentGuess, setCurrentGuess] = useState(Array(wordLength).fill(''));
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [activeInputCol, setActiveInputCol] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [usedLetters, setUsedLetters] = useState({});
  const [submittedGuessesInfo, setSubmittedGuessesInfo] = useState(Array(maxGuesses).fill(null));
  const [isRestored, setIsRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shakingRow, setShakingRow] = useState(null);
  const shakeTimerRef = useRef(null);

  const { toast } = useToast();

  const triggerShake = useCallback((row) => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    setShakingRow(null); // reset before setting to allow re-triggering the same row
    requestAnimationFrame(() => {
      setShakingRow(row);
      shakeTimerRef.current = setTimeout(() => setShakingRow(null), 600);
    });
  }, []);

  const applyNewSolution = useCallback((newSolution) => {
    setSolution(newSolution);
    setGuesses(Array(maxGuesses).fill(null));
    setCurrentGuess(Array(wordLength).fill(''));
    setCurrentAttempt(0);
    setActiveInputCol(0);
    setIsGameOver(false);
    setIsGameWon(false);
    setUsedLetters({});
    setSubmittedGuessesInfo(Array(maxGuesses).fill(null));
    setIsRestored(false);
  }, [maxGuesses, wordLength]);

  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    validateRef.current = null;
    const today = getTodayDateStr();
    const loadValidation = is6
      ? import('@/lib/customWords6').then(m => { validateRef.current = m.isValidGuess6; })
      : import('@/lib/customWords').then(m => { validateRef.current = m.isValidGuess; });
    const [currentWord] = await Promise.all([getWordFn(), loadValidation]);
    setGameDate(today);

    const saved = getSavedFn(today, currentWord);

    if (saved) {
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
      setCurrentGuess(Array(wordLength).fill(''));
      setSubmittedGuessesInfo(saved.submittedGuessesInfo);
      setUsedLetters(rebuilt);
      setActiveInputCol(0);

      if (saved.isGameOver) {
        setCurrentAttempt(saved.currentAttempt);
        setIsGameOver(true);
        setIsGameWon(saved.isGameWon);
        setIsRestored(true);
      } else {
        setCurrentAttempt(saved.currentAttempt + 1);
        setIsGameOver(false);
        setIsGameWon(false);
        setIsRestored(false);
      }
    } else {
      applyNewSolution(currentWord);
      trackEvent('jogo_iniciado', { modo: wordLength === 6 ? '6letras' : '5letras' });
    }
    setIsLoading(false);
  }, [applyNewSolution, wordLength]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Detecta mudança de data quando o usuário volta para a aba (após meia-noite).
  // Sem isso, o jogo continuaria com a palavra de ontem mas salvaria como se fosse hoje.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = getTodayDateStr();
      if (gameDate && now !== gameDate) {
        // Data mudou desde que o jogo iniciou — recarrega tudo
        initializeGame();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [gameDate, initializeGame]);

  const handleTileFocus = (index) => {
    if (isGameOver || currentAttempt >= maxGuesses) return;
    setActiveInputCol(index);
  };

  const processGuess = () => {
    const finalCurrentGuess = currentGuess.join('');
    if (finalCurrentGuess.length !== wordLength) {
      triggerShake(currentAttempt);
      toast({
        title: "Palavra incompleta",
        description: `A palavra deve ter ${wordLength} letras.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (validateRef.current && !validateRef.current(finalCurrentGuess)) {
      triggerShake(currentAttempt);
      toast({
        title: "Palavra inválida",
        description: "Esta palavra não está no dicionário.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (hardMode && currentAttempt > 0) {
      const hm = validateHardModeGuess(finalCurrentGuess, submittedGuessesInfo);
      if (!hm.valid) {
        triggerShake(currentAttempt);
        toast({
          title: "Modo difícil",
          description: hm.message,
          variant: "destructive",
          duration: 2500,
        });
        return;
      }
    }

    // Guard contra travessia de meia-noite: se a data mudou desde o início do
    // jogo, a palavra em memória é de ontem mas estaríamos salvando como hoje.
    // Em vez disso, recarrega o jogo com a palavra correta de hoje.
    const nowDate = getTodayDateStr();
    if (gameDate && nowDate !== gameDate) {
      toast({
        title: "Nova palavra disponível",
        description: "Carregando o jogo de hoje…",
        duration: 2500,
      });
      initializeGame();
      return;
    }

    trackEvent('tentativa_correta', { tentativa: currentAttempt + 1, modo: wordLength === 6 ? '6letras' : '5letras' });

    const { newUsedLetters, isCorrect, guessEvaluation } = evaluateGuess(finalCurrentGuess, solution, usedLetters, wordLength);

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
      if (is6) {
        saveDailyResult6(today, solution, true, currentAttempt + 1);
      } else {
        saveGameResult(true, currentAttempt + 1);
        saveDailyResult(today, solution, true, currentAttempt + 1);
      }
      saveCompletedFn({
        dateStr: today,
        solution,
        guesses: newGuesses,
        submittedGuessesInfo: newSubmittedInfo,
        isGameWon: true,
        currentAttempt,
      });
      trackEvent('jogo_concluido', { vitoria: true, tentativas: currentAttempt + 1, modo: is6 ? '6letras' : '5letras' });
      toast({
        title: "Parabéns!",
        description: "Você acertou a palavra!",
        className: "bg-green-500 border-green-400 text-white",
        duration: 4000,
      });
    } else if (currentAttempt + 1 >= maxGuesses) {
      setIsGameOver(true);
      if (is6) {
        saveDailyResult6(today, solution, false, maxGuesses);
      } else {
        saveGameResult(false, maxGuesses);
        saveDailyResult(today, solution, false, maxGuesses);
      }
      saveCompletedFn({
        dateStr: today,
        solution,
        guesses: newGuesses,
        submittedGuessesInfo: newSubmittedInfo,
        isGameWon: false,
        currentAttempt,
      });
      trackEvent('jogo_concluido', { vitoria: false, tentativas: maxGuesses, modo: is6 ? '6letras' : '5letras' });
      toast({
        title: "Fim de jogo!",
        description: `A palavra era: ${solution}`,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      saveProgressFn({
        dateStr: today,
        solution,
        guesses: newGuesses,
        submittedGuessesInfo: newSubmittedInfo,
        currentAttempt,
      });
      setCurrentAttempt(currentAttempt + 1);
      setCurrentGuess(Array(wordLength).fill(''));
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
      if (activeInputCol < wordLength) {
        const newGuess = [...currentGuess];
        newGuess[activeInputCol] = key.toUpperCase();
        setCurrentGuess(newGuess);
        if (activeInputCol < wordLength - 1) {
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
    shakingRow,
    initializeGame,
    handleTileFocus,
    processGuess,
    handleKeyboardPress,
    setActiveInputCol,
  };
};
