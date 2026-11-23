import { expect, test } from '@playwright/test';

import { noHorizontalOverflow } from './helpers';

test('tab bar shows Scan, History and Settings', async ({ page }) => {
  await page.goto('/');
  for (const [id, label] of [['tab-scan', 'Scan'], ['tab-history', 'History'], ['tab-settings', 'Settings']]) {
    await expect(page.getByTestId(id)).toContainText(label);
  }
});

test('allergen switch persists across reload', async ({ page }) => {
  await page.goto('/settings');
  const milk = page.getByTestId('pref-allergen-milk');
  await expect(milk).toHaveAttribute('aria-checked', 'false');
  await milk.click();
  await expect(milk).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByTestId('pref-allergen-milk')).toHaveAttribute('aria-checked', 'true');
  await noHorizontalOverflow(page);
});

test('API key save, mask and remove with undo', async ({ page }) => {
  await page.goto('/settings');
  await page.getByTestId('pref-api-key').fill('sk-ant-test-a1b2');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByText('Key saved')).toBeVisible();
  await expect(page.getByText('sk-ant-…a1b2')).toBeVisible();
  await expect(page.getByText('Stored only on this device')).toBeVisible();
  await page.getByRole('button', { name: 'Remove key' }).click();
  await expect(page.getByText('Key removed')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('sk-ant-…a1b2')).toBeVisible();
});

test('E-number alert accepts loose formats', async ({ page }) => {
  await page.goto('/settings');
  await page.getByTestId('pref-enumber-input').fill('e 250');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('E250 Sodium nitrite')).toBeVisible();
  await page.getByTestId('pref-enumber-input').fill('banana');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Use an E-number like E250')).toBeVisible();
});

test('Appearance overrides the system theme, survives a reload, and System hands back to the OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/settings');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(241, 238, 230)');
  await page.getByTestId('pref-appearance-dark').click();
  await expect(page.getByTestId('pref-appearance-dark')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(bg).toBe('rgb(18, 17, 14)');
  await page.reload();
  await expect(page.getByTestId('pref-appearance-dark')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(bg).toBe('rgb(18, 17, 14)');
  await page.getByTestId('pref-appearance-system').click();
  await expect.poll(bg).toBe('rgb(241, 238, 230)');
});
