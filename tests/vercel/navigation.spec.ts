import { test, expect } from '@playwright/test';

// Exercise the production browser bundle, not Vite's development router.
// Read-only: no accounts, reservations, emails or payments are created.
test('client links, dynamic detail, login, back and reload work in the compiled app', async ({ page }) => {
  const routerErrors: string[] = [];
  page.on('pageerror', error => routerErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /\[vinext\]|is not a function/.test(message.text())) {
      routerErrors.push(message.text());
    }
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Ingresar', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Términos y condiciones', exact: true }).click();
  await expect(page).toHaveURL(/\/terminos$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Términos');
  await page.getByRole('link', { name: '← Volver a LaRutica' }).click();
  await expect(page.getByRole('heading', { name: '¿A dónde vamos?', exact: true })).toBeVisible();

  const service = page.locator('article h3 a[href^="/experiencias/"]').first();
  await service.waitFor();
  const detail = await service.getAttribute('href');
  await service.click();
  await expect(page).toHaveURL(new RegExp(`${detail}$`));
  await expect(page.getByRole('heading', { name: 'Antes de reservar', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Antes de reservar', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Registrarse', exact: true }).click();
  await expect(page).toHaveURL(/\/register/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
  expect(routerErrors).toEqual([]);
});
