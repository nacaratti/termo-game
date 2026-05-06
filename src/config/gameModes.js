export const GAME_MODES = [
  {
    id: 'classic',
    path: '/',
    wordLength: 5,
    maxGuesses: 6,
    label: '5 Letras',
    description: 'Clássico · 6 tentativas',
  },
  {
    id: 'extended',
    path: '/6',
    wordLength: 6,
    maxGuesses: 7,
    label: '6 Letras',
    description: 'Desafio · 7 tentativas',
  },
];

export const getModeByPath = (pathname) => {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return GAME_MODES.find((m) => m.path === normalized) || GAME_MODES[0];
};
