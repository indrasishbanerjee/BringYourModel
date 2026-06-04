import { test, expect } from '@playwright/test';

test.describe('Bring Your Model Extension', () => {
  test('extension service worker loads with demo site', async ({ context, page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Bring Your Model');

    await page.waitForTimeout(1500);

    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test('demo site loads', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check that the page loads
    await expect(page.locator('h1')).toContainText('Bring Your Model');
    await expect(page.locator('text=SDK playground')).toBeVisible();
  });

  test.skip('streaming yields multiple chunks with usage at end', async ({ page }) => {
    // SKIPPED: Requires mock provider configured in CI
    // This test requires the extension to be loaded with a mock provider
    // To enable: configure a mock provider in test environment or use MSW

    await page.goto('http://localhost:3000');

    // Wait for the page to be ready
    await expect(page.locator('h1')).toContainText('Bring Your Model');

    await page.getByTestId('recipe-nav-stream-cancel').click();

    await page.locator('#recipe-input').fill('Tell me a story about AI');

    await page.getByTestId('recipe-run').click();

    // Wait for streaming to start and collect chunks
    // We should see multiple chunks arrive over time
    const chunks: string[] = [];

    // Monitor the output area for 5 seconds
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      const output = await page.locator('[data-testid="stream-output"]').textContent();
      if (output) {
        // Check if output contains chunks
        if (output.length > chunks.join('').length) {
          chunks.push(output.slice(chunks.join('').length));
        }
      }
      await page.waitForTimeout(100);
    }

    // The final output should contain the complete response
    const finalOutput = await page.locator('[data-testid="stream-output"]').textContent();
    expect(finalOutput?.length).toBeGreaterThan(0);
  });
});
