import { test, expect } from '@playwright/test';

test.describe('Consent flow', () => {
  test('extension service worker loads with demo site', async ({ context, page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Bring Your Model');

    await page.waitForTimeout(1500);

    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test('unapproved ask surfaces permission messaging', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Bring Your Model');

    await page.locator('button:has-text("ask")').click();
    await page.locator('textarea').first().fill('What is BYOM?');
    await page.locator('button:has-text("Ask")').click();

    await expect(page.locator('text=/Permission denied|not approved|Please approve/i').first()).toBeVisible({
      timeout: 15000,
    });
  });
});
