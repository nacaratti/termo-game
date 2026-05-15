import { test, expect } from './fixtures.js';

// Não posta comentário real — só verifica que a UI está respondendo
// para visitantes não autenticados.

test('/comments mostra botao de login com Google', async ({ page }) => {
  await page.goto('/comments');
  await expect(page.getByRole('heading', { name: /comentários/i })).toBeVisible();
  // Botão de login deve estar visível para usuário não autenticado
  await expect(page.getByRole('button', { name: /entrar com google/i })).toBeVisible();
});
