import { createRequire } from 'node:module';
import type { Locator } from '@playwright/test';
import type { QRCode } from 'jsqr';
import { test, expect } from './fixtures/actors.js';
import { closeRoom, createRoom, expectPlayers } from './fixtures/rooms.js';

// jsQR ships a callable UMD export; load it explicitly in this Node ESM test.
const jsQR = createRequire(import.meta.url)('jsqr') as (data: Uint8ClampedArray, width: number, height: number) => QRCode | null;

// DNS is resolved locally inside Chromium; no external service or real LAN IP is required.
const origin = 'http://party-games.test:3100';
test.use({ baseURL: origin, launchOptions: { args: ['--host-resolver-rules=MAP party-games.test 127.0.0.1', '--no-proxy-server'] } });

async function decodeQr(qr: Locator) {
  const pixels = await qr.evaluate(async element => {
    const svg = element as unknown as SVGSVGElement;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const styles = getComputedStyle(svg);
    for (const token of ['--qr-background', '--qr-foreground']) clone.style.setProperty(token, styles.getPropertyValue(token));
    const picture = new Image();
    picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    await picture.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 448; canvas.height = 448;
    const context = canvas.getContext('2d')!;
    context.drawImage(picture, 0, 0, 448, 448);
    return Array.from(context.getImageData(0, 0, 448, 448).data);
  });
  return jsQR(new Uint8ClampedArray(pixels), 448, 448);
}

test('QR decodes to the same public invitation and two independent phones join from it', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  const code = await createRoom(host.page);
  const link = host.page.getByRole('link', { name: 'Lien pour rejoindre la room', exact: true });
  const url = `${origin}/join?code=${code}`;
  await expect(link).toHaveAttribute('href', url);
  await expect(link).toHaveText(url);
  const qr = host.page.getByRole('img', { name: 'QR code pour rejoindre la room', exact: true });
  await expect(qr).toBeInViewport({ ratio: 1 });
  await expect(host.page.getByTestId('room-code')).toBeInViewport({ ratio: 1 });
  expect(await host.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const decoded = await decodeQr(qr);
  expect(decoded?.data).toBe(url);
  expect([...new URL(url).searchParams.keys()]).toEqual(['code']);
  await host.page.screenshot({ path: testInfo.outputPath('room-invitation.png'), fullPage: true });
  for (const [index, player] of players.entries()) {
    await player.page.goto(index === 0 ? decoded!.data : (await link.getAttribute('href'))!);
    await expect(player.page.getByLabel('Code de la room', { exact: true })).toHaveValue(code);
    await expect(player.page.getByLabel('Votre pseudo', { exact: true })).toHaveValue('');
    expect(await player.page.evaluate(() => sessionStorage.getItem('party-games.session'))).toBeNull();
    await player.page.getByLabel('Votre pseudo', { exact: true }).fill(['Alice', 'Benoît'][index]!);
    await expect(player.page.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
    await player.page.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
    await expect(player.page.getByTestId('room-code')).toHaveText(code);
  }
  for (const actor of [host, ...players]) await expectPlayers(actor.page, ['Alice', 'Benoît']);
  await closeRoom(host.page);
  await players[0]!.page.goto(url);
  await players[0]!.page.getByLabel('Votre pseudo', { exact: true }).fill('Camille');
  await players[0]!.page.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
  await expect(players[0]!.page.getByRole('alert')).toContainText('Cette room est introuvable');
});

test('invalid invitation codes are explained and remain editable without admitting a player', async ({ createActors }) => {
  const { host, players } = await createActors(1);
  const code = await createRoom(host.page);
  const player = players[0]!.page;
  for (const query of ['?code=ABC2345', '?code=%3Cscript%3E', '?code=ABC234&code=DEF234']) {
    await player.goto(`/join${query}`);
    await expect(player.getByRole('alert')).toHaveText('Le code du lien est invalide. Saisissez le code affiché par l’hôte.');
    await expect(player.getByLabel('Code de la room', { exact: true })).toHaveValue('');
  }
  await player.getByLabel('Code de la room', { exact: true }).fill(code);
  await player.getByLabel('Votre pseudo', { exact: true }).fill('Alice');
  await player.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
  await expectPlayers(host.page, ['Alice']);
  await closeRoom(host.page);
});

test('loopback access keeps manual entry and explains how to obtain a shareable address', async ({ page }) => {
  await page.goto('http://127.0.0.1:3100/');
  await expect(page.getByRole('button', { name: 'Créer une room', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Créer une room', exact: true }).click();
  await expect(page.getByTestId('room-code')).toHaveText(/^[A-Z2-9]{6}$/);
  await expect(page.getByRole('note')).toContainText('adresse réseau de cet ordinateur');
  await expect(page.getByRole('link', { name: 'Lien pour rejoindre la room', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'QR code pour rejoindre la room', exact: true })).toHaveCount(0);
  await closeRoom(page);
  await page.goto('http://127.0.0.1:3100/join');
  await expect(page.getByRole('note')).toContainText('adresse réseau de cet ordinateur');
  await expect(page.getByRole('img', { name: /QR code/ })).toHaveCount(0);
});


test('join page shares a scannable form, follows valid code edits and retains the host invitation', async ({ createActors }, testInfo) => {
  const { host, players } = await createActors(2);
  await host.page.goto('/join');
  const genericQr = host.page.getByRole('img', { name: 'QR code pour ouvrir le formulaire joueur', exact: true });
  await expect(genericQr).toBeVisible();
  const generic = await decodeQr(genericQr);
  expect(generic?.data).toBe(`${origin}/join`);
  await host.page.getByLabel('Votre pseudo', { exact: true }).fill('Ne pas partager');
  await host.page.getByLabel('Code de la room', { exact: true }).fill('ABC234');
  const roomQr = host.page.getByRole('img', { name: 'QR code pour rejoindre la room', exact: true });
  await expect(roomQr).toBeVisible();
  expect((await decodeQr(roomQr))?.data).toBe(`${origin}/join?code=ABC234`);
  await host.page.getByLabel('Code de la room', { exact: true }).fill('ABC');
  await expect(genericQr).toBeVisible();
  expect((await decodeQr(genericQr))?.data).toBe(`${origin}/join`);
  for (const player of players) {
    await player.page.goto(generic!.data);
    await expect(player.page.getByLabel('Code de la room', { exact: true })).toHaveValue('');
    await expect(player.page.getByLabel('Votre pseudo', { exact: true })).toHaveValue('');
    expect(await player.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(genericQr).toBeInViewport({ ratio: 1 });
  await host.page.screenshot({ path: testInfo.outputPath('join-form-qr.png'), fullPage: true });
  const code = await createRoom(host.page);
  await host.page.goto('/join');
  await expect(host.page.getByRole('heading', { name: 'Cet onglet est l’hôte.' })).toBeVisible();
  const invitation = await decodeQr(roomQr);
  expect(invitation?.data).toBe(`${origin}/join?code=${code}`);
  for (const [index, player] of players.entries()) {
    await player.page.goto(invitation!.data);
    await expect(player.page.getByLabel('Code de la room', { exact: true })).toHaveValue(code);
    await player.page.getByLabel('Votre pseudo', { exact: true }).fill(['Alice', 'Benoît'][index]!);
    await player.page.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
    await expectPlayers(player.page, index === 0 ? ['Alice'] : ['Alice', 'Benoît']);
  }
  await host.page.goto('/');
  await expectPlayers(host.page, ['Alice', 'Benoît']);
  await closeRoom(host.page);
});
