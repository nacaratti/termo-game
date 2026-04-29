import React from 'react';
import { WORD_LENGTH, MAX_GUESSES } from '@/config/constants';
import { getTileStyling } from '@/lib/gameLogic';

const Tile = React.forwardRef(({ letter, status, hasFocus, isSubmitted, delay, onClick }, ref) => {
  const tileStyling = getTileStyling(status, hasFocus, !!letter);

  return (
    <div
      ref={ref}
      className={`tile ${tileStyling}`}
      style={isSubmitted ? { animationDelay: `${delay}s` } : undefined}
      tabIndex={0}
      onClick={onClick}
      onFocus={onClick}
      role="gridcell"
      aria-label={letter || 'vazio'}
    >
      {letter}
    </div>
  );
});

const GameBoardRow = ({
  guessData,
  currentGuess,
  rowIndex,
  currentAttempt,
  activeInputCol,
  onTileFocus,
  isSubmittedRow,
  wordLength,
}) => {
  const isCurrentActiveRow = rowIndex === currentAttempt;
  const colClass = wordLength === 6 ? 'grid-cols-6' : 'grid-cols-5';

  return (
    <div className={`grid ${colClass} gap-1.5`} role="row">
      {Array(wordLength)
        .fill(0)
        .map((_, colIndex) => {
          const hasFocus = isCurrentActiveRow && activeInputCol === colIndex;
          let letterToDisplay = '';
          let tileStatus = null;

          if (isSubmittedRow && guessData) {
            letterToDisplay = guessData[colIndex]?.letter || '';
            tileStatus = guessData[colIndex]?.status || null;
          } else if (isCurrentActiveRow) {
            letterToDisplay = currentGuess[colIndex] || '';
          }

          return (
            <Tile
              key={colIndex}
              letter={letterToDisplay}
              status={tileStatus}
              hasFocus={hasFocus}
              isSubmitted={isSubmittedRow}
              delay={colIndex * 0.1}
              onClick={() => {
                if (isCurrentActiveRow) {
                  onTileFocus(colIndex);
                }
              }}
            />
          );
        })}
    </div>
  );
};

const GameBoard = ({
  currentGuess,
  currentAttempt,
  activeInputCol,
  onTileFocus,
  submittedGuessesInfo,
  isGameOver,
  wordLength = WORD_LENGTH,
  maxGuesses = MAX_GUESSES,
}) => {
  return (
    <div
      className={`grid gap-1.5 mb-6${wordLength === 6 ? ' board-6' : ''}`}
      role="grid"
      aria-label="Tabuleiro do jogo"
    >
      {Array(maxGuesses).fill(0).map((_, rowIndex) => (
        <GameBoardRow
          key={rowIndex}
          guessData={submittedGuessesInfo[rowIndex]}
          currentGuess={currentGuess}
          rowIndex={rowIndex}
          currentAttempt={currentAttempt}
          activeInputCol={activeInputCol}
          onTileFocus={onTileFocus}
          isSubmittedRow={rowIndex < currentAttempt || (rowIndex === currentAttempt && isGameOver)}
          wordLength={wordLength}
        />
      ))}
    </div>
  );
};

export default GameBoard;
