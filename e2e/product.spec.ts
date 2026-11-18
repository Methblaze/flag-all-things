import { expect, test } from '@playwright/test';

import { noHorizontalOverflow, stubOff } from './helpers';

const SECTIONS = ['Allergens & traces', 'Diet & ethics', 'Additives', 'Nutrition', 'Processing'];

test('a found product shows verdict, headline and sections in order', async ({ page }) => {
  await stubOff(page);
  await page.goto('/product/5701164710389');
  await expect(page.getByTestId('verdict')).toContainText('Good');
  await expect(page.getByTestId('headline')).toBeInViewport();
  const names = await page.locator('[data-testid^="section-name-"]').allTextContents();
  expect(names).toEqual(SECTIONS);
  await noHorizontalOverflow(page);
});

test('sections expand and flags show their source', async ({ page }) => {
  await stubOff(page);
  await page.goto('/product/5704000502391');
  const additives = page.getByTestId('section-additives');
  const before = await additives.getAttribute('aria-expanded');
  await additives.click();
  await expect(additives).toHaveAttribute('aria-expanded', before === 'true' ? 'false' : 'true');
  if (before === 'true') await additives.click();
  await page.getByTestId('flag-additive:e200').click();
  await expect(page.getByRole('link', { name: /Source:/ })).toBeVisible();
});

test('not found offers the label scan', async ({ page }) => {
  await stubOff(page, { '5701234567899': 404 });
  await page.goto('/product/5701234567899');
  await expect(page.getByText('Not in Open Food Facts yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter a different barcode' })).toBeVisible();
  await page.getByRole('button', { name: 'Scan ingredient label' }).click();
  await expect(page).toHaveURL(/\/label\?barcode=5701234567899$/);
});

test('busy shows a retry', async ({ page }) => {
  await stubOff(page, { '5701234567899': 429 });
  await page.goto('/product/5701234567899');
  await expect(page.getByText('Open Food Facts is busy')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('a milk alert turns whole milk into Avoid', async ({ page }) => {
  await stubOff(page);
  await page.addInitScript(() => localStorage.setItem('fat:prefs:v1', JSON.stringify({ allergens: ['milk'] })));
  await page.goto('/product/5700426101019');
  await expect(page.getByTestId('verdict')).toContainText('Avoid');
  await expect(page.getByTestId('headline')).toHaveText('Contains milk — on your alert list');
});

test('a name-only record is Unknown and offers the label scan', async ({ page }) => {
  await stubOff(page, { '5700000000001': 'partial-name-only' });
  await page.goto('/product/5700000000001');
  await expect(page.getByTestId('verdict')).toContainText('Unknown');
  await expect(page.getByRole('button', { name: 'Scan ingredient label' })).toBeVisible();
  await expect(page.getByText('Not on record').first()).toBeVisible();
});
