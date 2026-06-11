import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Don't process CSS imports (e.g. the app-shell reset) in unit tests.
    css: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['{packages,plugins,apps}/**/*.{test,smoke}.{ts,tsx}'],
  },
});
