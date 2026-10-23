import { test, expect } from './fixtures/actors.js';
import { createRoom, joinRoom, closeRoom, expectPlayers } from './fixtures/rooms.js';

test('host orbit follows twelve isolated connected players and disappears during a game', async ({ createActors }, testInfo) => {
  test.setTimeout(90_000);
  const { host, players } = await createActors(12);
  const code = await createRoom(host.page);
  for (const [index, player] of players.entries()) await joinRoom(player.page, code, `Joueur ${index + 1}`);
  await expect(host.page.getByTestId('orbit-phone')).toHaveCount(12);
  await expect(players[0]!.page.getByTestId('orbit-phone')).toHaveCount(0);
  await players[0]!.context.setOffline(true);
  await expect(host.page.getByTestId('orbit-phone')).toHaveCount(11);
  await expectPlayers(host.page, players.map((_, index) => `Joueur ${index + 1}`));
  await players[0]!.context.setOffline(false);
  await expect(host.page.getByTestId('orbit-phone')).toHaveCount(12);
  await host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).click();
  await expect(host.page.getByTestId('orbit-phone')).toHaveCount(0);
  const answer = players[0]!.page.getByRole('button', { name: 'B Jupiter', exact: true });
  await expect(answer).toBeVisible();
  await expect(answer).not.toContainText('Jupiter');
  const color = await answer.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(await players[0]!.page.locator('.symbol-choices').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
  await host.page.screenshot({ path: testInfo.outputPath('host-symbolic-quiz.png'), fullPage: true });
  await players[0]!.page.screenshot({ path: testInfo.outputPath('player-symbolic-quiz.png'), fullPage: true });
  await answer.click();
  await expect(answer).toHaveAttribute('aria-pressed', 'true');
  expect(await answer.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(color);
  await closeRoom(host.page);
});

test('workshop orbit samples remain static with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design');
  for (const count of [0, 1, 6, 12]) {
    await page.getByLabel('Téléphones de démonstration').selectOption(String(count));
    await expect(page.getByRole('region', { name: 'Lobby de démonstration' }).getByTestId('orbit-phone')).toHaveCount(count);
  }
  expect(await page.getByTestId('orbit-phone').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
