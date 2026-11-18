import { expect, test, type Page } from '@playwright/test';

import { noHorizontalOverflow, stubOff } from './helpers';

async function scanTwo(page: Page) {
  await stubOff(page);
  await page.goto('/product/5701164710389');
  await expect(page.getByTestId('verdict')).toBeVisible();
  await page.goto('/product/5741000109151');
  await expect(page.getByTestId('verdict')).toBeVisible();
}

test('empty history explains itself and offers a scan', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByText('No scans yet')).toBeVisible();
  await page.getByRole('button', { name: 'Scan a product' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('scans are listed newest first with their verdict', async ({ page }) => {
  await scanTwo(page);
  await page.goto('/history');
  const rows = page.locator('[data-testid^="history-row-"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute('data-testid', 'history-row-5741000109151');
  await expect(rows.nth(0)).toContainText('Caution');
  await expect(rows.nth(1)).toContainText('Good');
  await noHorizontalOverflow(page);
});

test('delete shows an undo toast that restores the row in place', async ({ page }) => {
  await scanTwo(page);
  await page.goto('/history');
  await page.getByTestId('delete-5741000109151').click();
  await expect(page.getByTestId('history-row-5741000109151')).toHaveCount(0);
  await expect(page.getByText('Removed')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('[data-testid^="history-row-"]').nth(0)).toHaveAttribute('data-testid', 'history-row-5741000109151');
});

test('a saved product opens offline from the cache', async ({ page }) => {
  await scanTwo(page);
  await page.unroute(/openfoodfacts\.org\/api\//);
  await page.route(/openfoodfacts\.org\/api\//, route => route.abort());
  await page.goto('/history');
  await page.getByTestId('history-row-5701164710389').click();
  await expect(page).toHaveURL(/\/product\/5701164710389$/);
  await expect(page.getByTestId('verdict')).toContainText('Good');
});
