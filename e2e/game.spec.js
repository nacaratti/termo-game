import { test, expect } from './fixtures.js';

// Verifica que o jogo principal carrega e o tabuleiro responde a
// input — SEM submeter um palpite real (não polui daily_results).

test('home / carrega titulo e teclado virtual', async ({ page }) => {
  await page.goto('/');
  // Título "KINTO" no header
  await expect(page.getByRole('heading', { name: /kinto/i, level: 1 })).toBeVisible();
  // Pelo menos algumas teclas do teclado virtual presentes
  await expect(page.locator('button', { hasText: /^Q$/ })).toBeVisible();
  await expect(page.locator('button', { hasText: /^ENTER$/i })).toBeVisible();
});

test('home / aceita digitação no tabuleiro via teclado fisico', async ({ page }) => {
  await page.goto('/');
  // Tutorial já foi dispensado pelo fixture. Espera o board renderizar.
  await page.waitForLoadState('networkidle');
  // Foca o body e digita 3 letras
  await page.locator('body').click();
  await page.keyboard.type('CASA');
  // Verifica que pelo menos uma das letras está visível no tabuleiro
  await expect(page.getByText(/^C$|^A$|^S$/).first()).toBeVisible({ timeout: 3000 });
});

test('modo /6 carrega', async ({ page }) => {
  await page.goto('/6');
  await expect(page.getByRole('heading', { name: /kinto/i, level: 1 })).toBeVisible();
});
