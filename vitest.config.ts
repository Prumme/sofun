import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: {
    '@party/contracts': fileURLToPath(new URL('./packages/contracts/src/index.ts', import.meta.url)),
    '@party/game-sdk': fileURLToPath(new URL('./packages/game-sdk/src/index.ts', import.meta.url)),
  } },
  esbuild: { tsconfigRaw: { compilerOptions: { experimentalDecorators: true } } },
  test: { include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'], testTimeout: 10000 },
});
