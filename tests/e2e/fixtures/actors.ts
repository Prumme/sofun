import { devices, test as base } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

export interface Actor {
  name: string;
  context: BrowserContext;
  page: Page;
}
export interface Actors {
  host: Actor;
  players: Actor[];
}
interface Fixtures {
  createActors: (playerCount?: number) => Promise<Actors>;
}

export const test = base.extend<Fixtures>({
  createActors: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    async function createActor(name: string, mobile: boolean): Promise<Actor> {
      const context = await browser.newContext({
        ...devices[mobile ? 'Pixel 7' : 'Desktop Chrome'],
        ...(baseURL ? { baseURL } : {}),
        storageState: { cookies: [], origins: [] },
      });
      contexts.push(context);
      return { name, context, page: await context.newPage() };
    }

    try {
      await use(async (playerCount = 2) => {
        if (!Number.isInteger(playerCount) || playerCount < 0) {
          throw new Error('Le nombre de participants doit être un entier positif ou nul.');
        }
        const host = await createActor('host', false);
        const players: Actor[] = [];
        for (let index = 0; index < playerCount; index++) {
          players.push(await createActor(`player-${index + 1}`, true));
        }
        return { host, players };
      });
    } finally {
      // Every context belongs to this test, including partially initialized groups.
      // Playwright records traces/screenshots for these contexts before closing them.
      await Promise.all(contexts.map(context => context.close()));
    }
  },
});

export { expect } from '@playwright/test';
