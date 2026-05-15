import { test, expect } from './fixtures.js';

test('/changelog carrega e mostra meta de 6 meses', async ({ page }) => {
  await page.goto('/changelog');
  // Cabeçalho da página
  await expect(page.getByRole('heading', { name: /evolução/i })).toBeVisible();
  // Seção "Meta de 6 meses"
  await expect(page.getByText(/meta de 6 meses/i)).toBeVisible();
  // Contagem regressiva — verifica que algum número de dias está visível
  await expect(page.locator('text=/\\d+\\s*dias?/i').first()).toBeVisible();
});

test('/changelog tem link para voltar ao jogo', async ({ page }) => {
  await page.goto('/changelog');
  const back = page.getByRole('link', { name: /voltar ao jogo/i });
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute('href', '/');
});
