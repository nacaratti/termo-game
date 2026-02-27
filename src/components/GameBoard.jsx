import React from 'react';
import { motion } from 'framer-motion';
import { WORD_LENGTH, MAX_GUESSES } from '@/config/constants';
import { getTileStyling } from '@/lib/gameLogic';

const Tile = React.forwardRef(({ letter, status, hasFocus, isSubmitted, delay, onClick }, ref) => {
  const tileStyling = getTileStyling(status, hasFocus);

  const animation = isSubmitted
    ? { scale: [1, 1.05, 1], opacity: 1 }
    : { scale: hasFocus ? 1.03 : 1, opacity: 1 };
  const transition = isSubmitted
    ? { duration: 0.4, delay: delay, ease: "easeInOut" }
    : { type: 'spring', stiffness: 400, damping: 25 };

  return (
    <motion.div
      ref={ref}
      className={`relative flex items-center justify-center tile ${tileStyling}`}
      initial={{ scale: 0.9, opacity: 0.7 }}
      animate={animation}
      transition={transition}
      tabIndex={0}
      onClick={onClick}
      onFocus={onClick}
      role="gridcell"
    >
      {letter}
      {hasFocus && !isSubmitted && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          layoutId="underline"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  );
});

const GameBoardRow = ({
  guessData,
  currentGuess,
  rowIndex,
  currentAttempt,
  activeInputCol,
  onTileFocus,
  isSubmittedRow
}) => {
  const isCurrentActiveRow = rowIndex === currentAttempt;

  return (
    <div className="grid grid-cols-5 gap-1.5" role="row">
      {Array(WORD_LENGTH)
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
}) => {
  return (
    <div
      className="grid gap-1.5 mb-6"
      role="grid"
      aria-label="Tabuleiro do jogo"
    >
      {Array(MAX_GUESSES).fill(0).map((_, rowIndex) => (
        <GameBoardRow
          key={rowIndex}
          guessData={submittedGuessesInfo[rowIndex]}
          currentGuess={currentGuess}
          rowIndex={rowIndex}
          currentAttempt={currentAttempt}
          activeInputCol={activeInputCol}
          onTileFocus={onTileFocus}
          isSubmittedRow={rowIndex < currentAttempt || (rowIndex === currentAttempt && isGameOver)}
        />
      ))}
    </div>
  );
};

export default GameBoard;
