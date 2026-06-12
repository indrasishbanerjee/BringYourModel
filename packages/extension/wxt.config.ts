import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/auto-icons'],
  extensionApi: 'chrome',
  manifest: {
    name: 'BYOM Wallet',
    description: 'User-owned AI access layer for the browser. Connect your own AI providers and let approved websites use them securely.',
    version: '1.0.0',
    homepage_url: 'https://bringyourmodel.com',
    permissions: [
      'storage',
      'alarms',
      'tabs',
    ],
    host_permissions: [
      '<all_urls>',
    ],
    web_accessible_resources: [
      {
        resources: ['bridge-main.js', 'consent.html'],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_title: 'BYOM Wallet',
    },
  },
  vite: ({ mode }) => ({
    plugins: [react()],
    build: {
      target: 'es2022',
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  }),
});
