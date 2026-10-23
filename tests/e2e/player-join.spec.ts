import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, expectPlayers, joinRoom } from './fixtures/rooms.js';

test('host and two concurrent participants see the same live roster', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  await Promise.all(players.map((player, index) => joinRoom(player.page, code, ['Alice', 'Benoît'][index]!)));
  for (const actor of [host, ...players]) {
    await expectPlayers(actor.page, ['Alice', 'Benoît']);
    await expect(actor.page.getByTestId('room-code')).toHaveText(code);
    expect(await actor.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  for (const player of players) await expect(player.page.getByText('Vous', { exact: true })).toHaveCount(1);
  await expect(host.page.getByText('Vous', { exact: true })).toHaveCount(0);
  await host.page.screenshot({ path: testInfo.outputPath('host-with-players.png'), fullPage: true });
  await players[0]!.page.screenshot({ path: testInfo.outputPath('player-lobby.png'), fullPage: true });
  await closeRoom(host.page);
});

test('validates fields before admission and allows correction without duplicate players', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(1);
  const player = players[0]!.page;
  const code = await createRoom(host.page);
  await player.goto('/');
  await player.getByRole('link', { name: 'Rejoindre une room', exact: true }).click();
  await expect(player).toHaveURL(/\/join$/);
  const submit = player.getByRole('button', { name: 'Rejoindre la room', exact: true });
  await expect(submit).toBeEnabled();
  await player.screenshot({ path: testInfo.outputPath('player-join-form.png'), fullPage: true });
  await submit.click();
  await expect(player.getByLabel('Code de la room', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(player.getByLabel('Votre pseudo')).toHaveAttribute('aria-invalid', 'true');
  await player.getByLabel('Code de la room', { exact: true }).fill('AB1');
  await player.getByLabel('Votre pseudo').fill('Camille');
  await submit.click();
  await expect(player.getByText('Saisissez les 6 caractères du code affiché par l’hôte.')).toBeVisible();
  await expect(host.page.getByRole('heading', { name: 'Aucun joueur pour le moment' })).toBeVisible();
  await player.getByLabel('Code de la room', { exact: true }).fill(code.toLowerCase());
  await player.getByLabel('Votre pseudo').fill('   ');
  await submit.click();
  await expect(player.getByText('Saisissez un pseudo de 1 à 32 caractères.')).toBeVisible();
  await player.getByLabel('Votre pseudo').fill('  Camille  ');
  await submit.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expectPlayers(host.page, ['Camille']);
  await expectPlayers(player, ['Camille']);
  await expect(player.getByRole('heading', { level: 1 })).toHaveText('Bienvenue, Camille.');
  await expect(player.getByRole('button', { name: 'Rejoindre la room' })).toHaveCount(0);
  await closeRoom(host.page);
});

test('explains an absent room and accepts a corrected real room code', async ({ createActors }) => {
  const { host, players } = await createActors(1);
  const player = players[0]!.page;
  const code = await createRoom(host.page);
  await player.goto('/join');
  await player.getByLabel('Code de la room', { exact: true }).fill(code === 'ZZZZZZ' ? 'YYYYYY' : 'ZZZZZZ');
  await player.getByLabel('Votre pseudo').fill('Camille');
  await expect(player.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  await player.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
  await expect(player.getByRole('alert')).toHaveText('Cette room est introuvable. Vérifiez le code affiché par l’hôte.');
  await expect(player.getByTestId('room-code')).toHaveCount(0);
  await expect(host.page.getByRole('heading', { name: 'Aucun joueur pour le moment' })).toBeVisible();
  await player.getByLabel('Code de la room', { exact: true }).fill(code);
  await player.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
  await expectPlayers(host.page, ['Camille']);
  await expectPlayers(player, ['Camille']);
  await closeRoom(host.page);
});

test('keeps rosters isolated between two rooms and their participant contexts', async ({ createActors }) => {
  const first = await createActors(1), second = await createActors(1);
  const firstCode = await createRoom(first.host.page), secondCode = await createRoom(second.host.page);
  expect(firstCode).not.toBe(secondCode);
  await joinRoom(first.players[0]!.page, firstCode, 'Alice');
  await expectPlayers(first.host.page, ['Alice']);
  await expect(second.host.page.getByRole('heading', { name: 'Aucun joueur pour le moment' })).toBeVisible();
  await joinRoom(second.players[0]!.page, secondCode, 'Benoît');
  for (const actor of [first.host, ...first.players]) await expectPlayers(actor.page, ['Alice']);
  for (const actor of [second.host, ...second.players]) await expectPlayers(actor.page, ['Benoît']);
  await closeRoom(first.host.page);
  await expectPlayers(second.host.page, ['Benoît']);
  await closeRoom(second.host.page);
});
