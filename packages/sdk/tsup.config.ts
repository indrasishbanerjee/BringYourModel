import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'byom.iife.min': 'src/index.ts',
    openai: 'src/openai.ts',
    'prompt-api': 'src/prompt-api.ts',
  },
  format: ['esm', 'cjs', 'iife'],
  globalName: 'byom',
  dts: { resolve: true },
  sourcemap: true,
  clean: true,
  splitting: false,
  bundle: true,
  minify: true,
  platform: 'browser',
  target: 'es2022',
  outDir: 'dist',
});