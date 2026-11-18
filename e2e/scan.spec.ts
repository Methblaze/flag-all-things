import { expect, test } from '@playwright/test';

import { noHorizontalOverflow, stubOff } from './helpers';

// Headless Chromium has no camera: this is the manual-entry and examples path portfolio visitors get.
test.beforeEach(async ({ page }) => { await stubOff(page); await page.goto('/'); });

test('manual entry and examples are visible without a camera', async ({ page }) => {
  await expect(page.getByTestId('manual-entry')).toBeVisible();
  await expect(page.getByTestId('example-barcodes')).toBeVisible();
  await expect(page.getByText('Try a Danish example')).toBeVisible();
  await noHorizontalOverflow(page);
});

test('a bad check digit is caught inline and the text is kept', async ({ page }) => {
  await page.getByTestId('manual-entry').fill('5701234567890');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByText("That barcode doesn't add up. Check the last digit.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('manual-entry')).toHaveValue('5701234567890');
});

test('a store weighed-goods label points to the label scan', async ({ page }) => {
  await page.getByTestId('manual-entry').fill('2001234001502');
  await page.getByRole('button', { name: 'Look up' }).click();
  await expect(page.getByText("This is a store's own price label. Scan the ingredient label instead.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan ingredient label' })).toBeVisible();
});

test('Look up stays disabled below 8 digits', async ({ page }) => {
  await page.getByTestId('manual-entry').fill('5701');
  await expect(page.getByRole('button', { name: 'Look up' })).toBeDisabled();
});

test('an example chip opens its product', async ({ page }) => {
  await page.getByTestId('example-5701164710389').click();
  await expect(page).toHaveURL(/\/product\/5701164710389$/);
});

test('slash focuses the barcode field on desktop', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'keyboard shortcut is desktop-only');
  await expect(page.getByTestId('manual-entry')).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByTestId('manual-entry')).toBeFocused();
});
