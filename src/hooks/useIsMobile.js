import { useState, useEffect } from 'react';

/**
 * Retorna true enquanto a largura da janela estiver abaixo do breakpoint (px).
 * Usa matchMedia para atualizar reativamente sem polling.
 */
export const useIsMobile = (breakpoint = 640) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
};
