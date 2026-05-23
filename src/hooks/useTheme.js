import { useState, useEffect } from 'react';

const THEME_KEY = '_kt';

export const THEMES = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Tema escuro clássico',
    preview: '#16181d',
  },
  {
    id: 'pastel',
    label: 'Pastel escuro',
    description: 'Tons suaves azulados',
    preview: '#1e2330',
  },
];

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'default';
    } catch {
      return 'default';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = (id) => {
    setThemeState(id);
    try { localStorage.setItem(THEME_KEY, id); } catch {}
  };

  return { theme, setTheme, themes: THEMES };
}
