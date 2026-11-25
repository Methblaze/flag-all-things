// Renders the brand mark (src/theme/brand.ts) to the app icon, adaptive icon, splash and favicon PNGs.
// Run: node scripts/brand-assets.mjs   (uses Playwright's Chromium, already a dev dependency)
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { MARK, bitePath, flagPath } from '../src/theme/brand.ts';

const INK = '#1F3D36', CANVAS = '#F6F4EE', LEMON = '#E2F56A'; // INK is the tile: brand pine

// The bite is a mask, not a tile-coloured patch, so it stays a hole on the transparent Android foreground and monochrome layers.
const mark = (scale, { pole = CANVAS, flag = LEMON } = {}) => {
  const { knob: k, pole: p, flagStroke, restPhase } = MARK;
  return `<g transform="translate(512 512) scale(${scale}) translate(-50 -50)">
    <circle cx="${k.cx}" cy="${k.cy}" r="${k.r}" fill="${pole}"/>
    <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${p.rx}" fill="${pole}"/>
    <mask id="bite"><rect x="0" y="0" width="100" height="100" fill="#fff"/><path d="${bitePath(restPhase)}" fill="#000"/></mask>
    <path d="${flagPath(restPhase)}" fill="${flag}" stroke="${flag}" stroke-width="${flagStroke}" stroke-linejoin="round" mask="url(#bite)"/>
  </g>`;
};
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;
const tile = (rounded) => `<rect width="1024" height="1024" rx="${rounded ? MARK.tileRadius * 10.24 : 0}" fill="${INK}"/>`;

const out = {
  'assets/images/icon.png': [svg(tile(false) + mark(7.2)), 1024],
  'assets/images/android-icon-background.png': [svg(tile(false)), 1024],
  'assets/images/android-icon-foreground.png': [svg(mark(5.4)), 1024],
  'assets/images/android-icon-monochrome.png': [svg(mark(5.4, { pole: '#fff', flag: '#fff' })), 1024],
  'assets/images/splash-icon.png': [svg(tile(true) + mark(7.2)), 1024],
  'assets/images/favicon.png': [svg(tile(true) + mark(7.2)), 48],
};
writeFileSync('assets/brand/mark.svg', svg(tile(true) + mark(7.2)));

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, [markup, size]] of Object.entries(out)) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`);
  await page.screenshot({ path: file, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
