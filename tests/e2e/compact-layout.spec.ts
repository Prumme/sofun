import { test, expect } from './fixtures/actors.js';
import { createRoom, joinRoom, openCatalogue, closeRoom } from './fixtures/rooms.js';
import type { Page } from '@playwright/test';

async function fits(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth <= innerWidth + 1,
    vertical: document.documentElement.scrollHeight <= innerHeight + 1,
  }))).toEqual({ horizontal: true, vertical: true });
}

test('host invitation and twelve participants fit a laptop; catalogue has its own screen', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(12);
  await host.page.setViewportSize({ width: 1366, height: 768 });
  await createRoom(host.page);
  const code = (await host.page.getByTestId('room-code').textContent())!;
  const left = host.page.locator('.host-participants');
  const right = host.page.locator('.host-invitation-card');
  const orbit = host.page.locator('.host-participants .connected-orbit-scene');
  const roster = host.page.getByRole('region', { name: 'Participants', exact: true });
  const bounds = await Promise.all([left, right, orbit, roster].map(locator => locator.boundingBox()));
  expect(bounds.every(Boolean)).toBe(true);
  expect(bounds[0]!.x + bounds[0]!.width).toBeLessThan(bounds[1]!.x);
  expect(Math.abs(bounds[2]!.x + bounds[2]!.width / 2 - bounds[3]!.x - bounds[3]!.width / 2)).toBeLessThan(2);
  await fits(host.page);
  await host.page.screenshot({ path: testInfo.outputPath('compact-lobby-empty.png') });
  for (const [index, player] of players.entries()) await joinRoom(player.page, code, `Joueur ${index + 1}`);
  await expect(host.page.getByTestId('player-name')).toHaveCount(12);
  await fits(host.page);
  await expect(host.page.getByRole('heading', { name: 'Choisissez votre jeu', exact: true })).toHaveCount(0);
  await host.page.screenshot({ path: testInfo.outputPath('compact-lobby.png') });
  await openCatalogue(host.page);
  await expect(host.page.getByRole('img', { name: 'QR code pour rejoindre la room', exact: true })).toHaveCount(0);
  await host.page.getByRole('button', { name: 'Retour aux participants', exact: true }).click();
  await expect(host.page.getByTestId('room-code')).toHaveText(code);
  await closeRoom(host.page);
});

test('mobile admission and active answer fit a short phone; input text prevents focus auto zoom', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(3);
  const phone = players[0]!.page;
  await phone.setViewportSize({ width: 375, height: 667 });
  const code = await createRoom(host.page);
  await phone.goto('/join');
  await fits(phone);
  const viewport = await phone.locator('meta[name=viewport]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  expect(viewport).not.toContain('maximum-scale=1');
  await phone.screenshot({ path: testInfo.outputPath('compact-admission.png') });
  for (const [index, player] of players.entries()) await joinRoom(player.page, code, ['Alice', 'Benoît', 'Camille'][index]!);
  await openCatalogue(host.page);
  await host.page.getByRole('button', { name: 'Le menteur', exact: true }).click();
  await host.page.getByRole('button', { name: 'Lancer Le menteur', exact: true }).click();
  const input = phone.getByLabel('Votre invention', { exact: true });
  await expect(input).toBeVisible();
  expect(await input.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  await fits(phone);
  await expect(phone.getByRole('list', { name: 'Scores de la manche', exact: true })).toHaveCount(0);
  await input.fill('Une invention suffisamment plausible');
  await phone.getByRole('button', { name: 'Envoyer l’invention', exact: true }).click();
  await expect(phone.getByRole('status').filter({ hasText: 'Invention enregistrée' })).toBeVisible();
  await fits(phone);
  await phone.screenshot({ path: testInfo.outputPath('compact-writing.png') });
  await closeRoom(host.page);
});
