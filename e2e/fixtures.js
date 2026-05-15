import { test as base, expect } from '@playwright/test';

/**
 * Test fixture customizada: prepara o navegador antes de cada teste:
 * - Marca o tutorial como já visto (não abre modal automático)
 * - Marca como jogo já salvo nada — usuário fresh
 *
 * Use `test` deste arquivo em vez do importado direto do @playwright/test.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Roda ANTES de qualquer page.goto: marca o tutorial como visto
    // para que o modal "Como jogar" não bloqueie cliques.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('_kw', '1');
      } catch {
        /* ignore */
      }
    });
    await use(page);
  },
});

export { expect };
