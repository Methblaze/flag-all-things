import { expect, test } from '@playwright/test';
import { join } from 'node:path';

import { noHorizontalOverflow } from './helpers';

test('without a key, a chosen photo gives an example result that is not saved', async ({ page }) => {
  await page.goto('/label?barcode=5701234567899');
  await expect(page.getByText('Photograph the ingredient list and nutrition table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Read label' })).toHaveCount(0);

  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('label-pick').click();
  await (await chooser).setFiles(join(__dirname, 'fixtures/label.jpg'));

  await page.getByRole('button', { name: 'Read label' }).click();
  await expect(page.getByText('Example result — add your key in Settings to read real labels')).toBeVisible();
  await expect(page.getByTestId('verdict')).toBeVisible();

  const history = await page.evaluate(() => localStorage.getItem('fat:history:v1'));
  expect(history ?? '').not.toContain('5701234567899');
  await noHorizontalOverflow(page);
});

test('cancelling the picker changes nothing', async ({ page }) => {
  await page.goto('/label');
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('label-pick').click();
  await (await chooser).setFiles([]);
  await expect(page.getByRole('button', { name: 'Read label' })).toHaveCount(0);
});
