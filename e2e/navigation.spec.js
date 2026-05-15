import { test, expect } from './fixtures.js';

test('header tem link para /comments', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /comentários/i });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/comments');
});

test('header tem link para /changelog', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /novidades/i });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/changelog');
});

test('/admin carrega tela de login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /kinto/i, level: 1 })).toBeVisible();
});
