import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, expectPlayers, joinRoom } from './fixtures/rooms.js';

const prompt = 'Quelle est la plus grande planète du système solaire ?';

test('host launches a quiz, two participants answer concurrently and host reveals the scores', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  const alice = players[0]!.page, bob = players[1]!.page;
  const code = await createRoom(host.page);
  await expect(host.page.getByRole('button', { name: 'Lancer le quiz', exact: true })).toBeDisabled();
  await joinRoom(alice, code, 'Alice');
  await expect(host.page.getByRole('button', { name: 'Lancer le quiz', exact: true })).toBeDisabled();
  await joinRoom(bob, code, 'Benoît');
  await host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  for (const page of [host.page, alice, bob]) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(prompt);
    await expect(page.getByRole('status').filter({ hasText: '0 / 2 réponses reçues' })).toBeVisible();
    await expect(page.getByText('Bonne réponse', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Résultats de la question' })).toHaveCount(0);
  }
  await expect(alice.getByRole('button', { name: 'Révéler la réponse', exact: true })).toHaveCount(0);
  await expect(host.page.getByRole('button', { name: 'B Jupiter', exact: true })).toHaveCount(0);
  await host.page.screenshot({ path: testInfo.outputPath('quiz-host-question.png'), fullPage: true });
  await alice.screenshot({ path: testInfo.outputPath('quiz-player-question.png'), fullPage: true });
  await Promise.all([
    alice.getByRole('button', { name: 'B Jupiter', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); }),
    bob.getByRole('button', { name: 'C Mars', exact: true }).click(),
  ]);
  for (const page of [alice, bob]) {
    await expect(page.getByText('Réponse enregistrée. Attendez la révélation de l’hôte.')).toBeVisible();
    for (const button of await page.locator('.quiz-choices button').all()) await expect(button).toBeDisabled();
    await expect(page.locator('.quiz-choices button[aria-pressed=true]')).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await expect(alice.getByRole('button', { name: 'B Jupiter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(bob.getByRole('button', { name: 'C Mars', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(host.page.getByText('2 / 2 réponses reçues', { exact: true })).toBeVisible();
  await expect(host.page.getByText('Bonne réponse', { exact: true })).toHaveCount(0);
  await expect(host.page.getByRole('list', { name: 'Résultats de la question' })).toHaveCount(0);
  await host.page.getByRole('button', { name: 'Révéler la réponse', exact: true }).click();
  for (const page of [host.page, alice, bob]) {
    await expect(page.getByText('Bonne réponse', { exact: true })).toBeVisible();
    const results = page.getByRole('list', { name: 'Résultats de la question' });
    await expect(results.getByRole('listitem')).toHaveText(['AliceJupiter1 point', 'BenoîtMars0 point']);
    await expect(page.locator('.quiz-choices button')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await host.page.screenshot({ path: testInfo.outputPath('quiz-host-revealed.png'), fullPage: true });
  await alice.screenshot({ path: testInfo.outputPath('quiz-player-revealed.png'), fullPage: true });
  await closeRoom(host.page);
  for (const player of players) await expect(player.page.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
});

test('manual reveal does not require every answer and missing answers receive zero points', async ({ createActors }) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  await joinRoom(players[0]!.page, code, 'Alice');
  await joinRoom(players[1]!.page, code, 'Benoît');
  await host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).click();
  await players[0]!.page.getByRole('button', { name: 'B Jupiter', exact: true }).click();
  await expect(host.page.getByText('1 / 2 réponses reçues', { exact: true })).toBeVisible();
  await host.page.getByRole('button', { name: 'Révéler la réponse', exact: true }).click();
  for (const page of [host.page, ...players.map(player => player.page)]) {
    await expect(page.getByRole('list', { name: 'Résultats de la question' }).getByRole('listitem')).toHaveText(['AliceJupiter1 point', 'BenoîtSans réponse0 point']);
  }
  await expect(players[1]!.page.getByRole('button', { name: 'B Jupiter', exact: true })).toHaveCount(0);
  await closeRoom(host.page);
});

test('quiz launch and revelation leave another room in its own lobby', async ({ createActors }) => {
  const first = await createActors(2), second = await createActors(1);
  const code = await createRoom(first.host.page);
  const otherCode = await createRoom(second.host.page);
  for (const [index, player] of first.players.entries()) await joinRoom(player.page, code, `Joueur ${index}`);
  await joinRoom(second.players[0]!.page, otherCode, 'Camille');
  await first.host.page.getByRole('button', { name: 'Lancer le quiz', exact: true }).click();
  await first.host.page.getByRole('button', { name: 'Révéler la réponse', exact: true }).click();
  await expect(first.host.page.getByRole('heading', { name: 'Résultats de la question' })).toBeVisible();
  for (const page of [second.host.page, second.players[0]!.page]) {
    await expectPlayers(page, ['Camille']);
    await expect(page.getByRole('heading', { name: prompt })).toHaveCount(0);
    await expect(page.getByTestId('room-code')).toHaveText(otherCode);
  }
  await closeRoom(first.host.page);
  await closeRoom(second.host.page);
});
