import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function createRoom(page: Page): Promise<string> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Créer une room' })).toBeEnabled();
  await page.getByRole('button', { name: 'Créer une room' }).click();
  const code = page.getByTestId('room-code');
  await expect(code).toHaveText(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  return (await code.textContent())!;
}

export async function joinRoom(page: Page, code: string, name: string) {
  await page.goto('/join');
  await page.getByLabel('Code de la room', { exact: true }).fill(code);
  await page.getByLabel('Votre pseudo', { exact: true }).fill(name);
  await expect(page.getByRole('button', { name: 'Rejoindre la room', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Rejoindre la room', exact: true }).click();
  await expect(page.getByTestId('room-code')).toHaveText(code.toUpperCase());
}

export async function expectPlayers(page: Page, names: string[]) {
  const list = page.getByRole('list', { name: 'Joueurs dans la room' });
  await expect(list).toBeVisible();
  await expect(list.getByTestId('player-name')).toHaveCount(names.length);
  expect((await list.getByTestId('player-name').allTextContents()).sort()).toEqual([...names].sort());
}
