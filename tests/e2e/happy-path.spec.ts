import { test, expect } from '@playwright/test';

test.describe('Happy path', () => {
  test('user visits dashboard, adds a tracked URL, then opens settings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: /Add Tracked URL|Get Started/ }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Add Tracked Search' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Label (optional)').fill('Playwright Test Search');
    await dialog
      .getByLabel(/Paste eBay search URL/)
      .fill('https://www.ebay.com/sch/i.html?_nkw=lego+castle&_udlo=50&_udhi=300&LH_BIN=1');

    const submitButton = dialog.getByRole('button', { name: 'Start Tracking' });
    await expect(submitButton).toBeEnabled({ timeout: 5_000 });
    await submitButton.click();

    await expect(dialog).toBeHidden();

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: /eBay API/ })).toBeVisible();
  });
});