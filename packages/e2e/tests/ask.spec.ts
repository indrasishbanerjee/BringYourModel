import { test, expect } from '@playwright/test';

test.describe('Ask task smoke', () => {
  test('demo site summarize recipe is interactive', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Bring Your Model');

    await page.getByTestId('recipe-nav-summarize-article').click();
    await expect(page.locator('h2')).toContainText('Summarize article');

    const textarea = page.locator('#recipe-input');
    await textarea.fill('Explain bring-your-own-model in one sentence.');
    await expect(textarea).toHaveValue('Explain bring-your-own-model in one sentence.');

    await page.getByTestId('recipe-run').click();

    await page.waitForTimeout(3000);

    const output = page.locator(
      '[data-testid="stream-output"], .error-box, .code-block pre'
    ).first();
    await expect(output).toBeVisible();
  });

  test('extension availability banner resolves', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await expect(page.getByTestId('extension-banner')).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('text=/Extension detected|Extension not detected|Checking extension/i').first()
    ).toBeVisible();
  });
});
