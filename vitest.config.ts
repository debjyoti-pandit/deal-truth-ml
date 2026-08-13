import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'markdown-as-string',
      transform(code, id) {
        if (id.endsWith('.md')) {
          return { code: `export default ${JSON.stringify(code)};`, map: null };
        }
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: process.env.RUN_MODEL_TESTS === '1' ? [] : ['test/live/**'],
    testTimeout: 30_000,
  },
});
