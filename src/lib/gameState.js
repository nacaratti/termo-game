import { createGameState } from './gameStateFactory';

const { saveGameProgress, saveCompletedGame, getSavedGame, getCompletedGame } = createGameState('_p3q');

export { saveGameProgress, saveCompletedGame, getSavedGame, getCompletedGame };
