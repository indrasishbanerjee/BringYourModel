import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@byom/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
