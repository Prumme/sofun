import { expect, request } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('Une baseURL locale est requise pour les tests E2E.');
  const client = await request.newContext({ baseURL });
  try {
    const health = await client.get('/api/health');
    await expect(health).toBeOK();
    expect(await health.json()).toEqual({ status: 'ok' });

    const frontend = await client.get('/');
    await expect(frontend).toBeOK();
    expect(frontend.headers()['content-type']).toContain('text/html');
    expect(await frontend.text()).toContain('<div id="root"></div>');
  } finally {
    await client.dispose();
  }
}
