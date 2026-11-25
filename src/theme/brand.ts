// The brand mark's geometry, in a 100×100 box: a canvas-white pole with a round knob and a lemon pennant, bitten at the fly, on a pine tile.
// Pure, so the app (BrandMark) and the icon script (scripts/brand-assets.mjs) draw the exact same shape.

export const MARK = {
  knob: { cx: 27, cy: 18, r: 4.5 },
  pole: { x: 24, y: 20, width: 6, height: 66, rx: 3 },
  flagStroke: 4, // stroked in its own colour with round joins, so the pennant's corners are soft
  restPhase: 2.4, // the still pose used for icons and Reduce Motion
  tileRadius: 22,
} as const;

/** The pennant's outline at a point in its wave. Sine-driven, so a loop has no seam; the edge at the pole never moves. */
export function flagPath(phase: number, amp = 9): string {
  'worklet';
  // The fly edge is 5 shorter than the hoist, so the cloth tapers like it's catching wind.
  const x0 = 30, x1 = 76, y0 = 22, h = 30, L = x1 - x0;
  const a1 = amp * (1 / 3) * Math.sin(phase - 1.9);
  const a2 = amp * (2 / 3) * Math.sin(phase - 3.8);
  const a3 = amp * Math.sin(phase - 5.7);
  return `M${x0} ${y0} C${x0 + L / 3} ${y0 + a1} ${x0 + (2 * L) / 3} ${y0 + a2} ${x1} ${y0 + a3} `
    + `L${x1} ${y0 + h - 5 + a3} C${x0 + (2 * L) / 3} ${y0 + h + a2} ${x0 + L / 3} ${y0 + h + a1} ${x0} ${y0 + h} Z`;
}

/** The bite out of the fly edge (the "Food" in Food-Flag): two tile-coloured circles drawn over the pennant,
 *  pinned to the fly corner so they ride the wave with it. */
export function bitePath(phase: number, amp = 9): string {
  'worklet';
  const top = 22 + amp * Math.sin(phase - 5.7); // the fly corner's y, as in flagPath
  const dot = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 `;
  // Deep enough to still read as a bite at the 28 pt header size.
  return dot(80, top + 7, 10.5) + dot(79.5, top + 19.5, 8.5);
}
