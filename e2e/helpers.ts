import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, '../src/services/__fixtures__/off', `${name}.json`), 'utf8'));

/** Serve OFF lookups from saved fixtures: never the live API. Codes mapped to 404 or 429 return that status. */
export async function stubOff(page: Page, map: Record<string, string | 404 | 429> = {}) {
  await page.route(/openfoodfacts\.org\/api\//, async route => {
    const code = /product\/(\d+)/.exec(route.request().url())?.[1] ?? '';
    const entry = map[code] ?? code;
    if (entry === 404 || entry === 429) return route.fulfill({ status: entry, json: { status: 'failure' } });
    try { return await route.fulfill({ status: 200, json: fixture(String(entry)) }); } catch { return route.fulfill({ status: 404, json: { status: 'failure' } }); }
  });
}

export async function noHorizontalOverflow(page: Page) {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}
