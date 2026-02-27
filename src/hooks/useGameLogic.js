
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { WORD_LENGTH, MAX_GUESSES, wordList, VALID_WORDS_SET } from '@/config/constants';
import { getWordOfTheDay as fetchWordOfTheDay, getRandomWord, checkGuess as evaluateGuess } from '@/lib/gameLogic';

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
  }, []);

  const initializeGame = useCallback(() => {
    applyNewSolution(fetchWordOfTheDay(wordList));
  }, [applyNewSolution]);

  const resetGame = useCallback(() => {
    applyNewSolution(getRandomWord(wordList, solution));
  }, [applyNewSolution, solution]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleTileChange = (index, value) => {
    if (isGameOver || currentAttempt >= MAX_GUESSES) return;
    const newGuess = [...currentGuess];
    newGuess[index] = value.toUpperCase();
    setCurrentGuess(newGuess);
  };

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

    if (!VALID_WORDS_SET.has(finalCurrentGuess)) {
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


    if (isCorrect) {
      setIsGameOver(true);
      setIsGameWon(true);
      toast({
        title: "Parabéns!",
        description: "Você acertou a palavra!",
        className: "bg-green-500 border-green-400 text-white",
        duration: 4000,
      });
    } else if (currentAttempt + 1 >= MAX_GUESSES) {
      setIsGameOver(true);
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
    usedLetters,
    submittedGuessesInfo,
    initializeGame,
    resetGame,
    handleTileFocus,
    processGuess,
    handleKeyboardPress,
    setActiveInputCol
  };
};
