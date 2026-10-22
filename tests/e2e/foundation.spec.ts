import { expect, test } from '@playwright/test';
test('design system and real server connection', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le jeu commenceavec vous.');
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  const cards = page.getByRole('button', { name: /MUSIQUE & SOUVENIRS/ });
  await cards.click(); await expect(cards).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Valider le pseudo' }).click();
  await expect(page.getByLabel('Votre pseudo')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Votre pseudo').fill('Camille');
  await page.getByRole('button', { name: 'Valider le pseudo' }).click();
  await expect(page.getByText('Parfait, Camille.')).toBeVisible();
  await page.getByRole('button', { name: 'Tester une action' }).click();
  await expect(page.getByRole('button', { name: 'Chargement…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'C’est prêt !' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('atelier.png'), fullPage: true });
});
test('recovers a real connection after network interruption', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur connecté');
  await context.setOffline(true);
  await expect(page.getByTestId('connection-status')).toHaveText('Connexion en cours', { timeout: 45000 });
  await context.setOffline(false);
  await expect(page.getByTestId('connection-status')).toHaveText('Serveur connecté', { timeout: 15000 });
});
test('keyboard focus, reduced motion and locally served fonts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  await page.keyboard.press('Enter');
  const button = page.getByRole('button', { name: 'Tester une action' });
  await button.focus(); await expect(button).toBeFocused();
  expect(await button.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  expect(await button.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await page.evaluate(() => [...document.fonts].some(font => font.family === 'Inter'))).toBe(true);
});
