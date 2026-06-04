import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveExtensionPath(): string {
  const outputDir = path.resolve(__dirname, '../extension/.output');
  for (const dir of ['chrome-mv3-dev', 'chrome-mv3']) {
    const candidate = path.join(outputDir, dir);
    if (fs.existsSync(path.join(candidate, 'manifest.json'))) {
      return candidate;
    }
  }
  return path.join(outputDir, 'chrome-mv3-dev');
}

const extensionPath = resolveExtensionPath();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            `--load-extension=${extensionPath}`,
            `--disable-extensions-except=${extensionPath}`,
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm --filter @byom/demo-site dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
