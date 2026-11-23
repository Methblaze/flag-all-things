// Hallmark · v2.0.0 · shape: app screen · system: DESIGN.md (locked, no theme dealt) · genre: modern-minimal · signature: the verdict card, read in two seconds in the aisle
// critique: quiet canvas, ink actions, colour reserved for severity; risk is blandness, answered by a large verdict and real product data.
// waive 64 (mono labels): no mono face used. waive F15 (hero/sections): app scope, no hero.
// Every value below is transcribed from DESIGN.md §2–§8. Screens import from here; no raw hex, font size or spacing number elsewhere.
import { Easing } from 'react-native-reanimated';

const severity = (fg: string, tint: string, solid: string, onSolid: string) => ({ fg, tint, solid, onSolid });

const light = {
  // Canvas is one step darker than surface (1.16:1, iOS grouped is 1.12:1), so white groups read without an outline.
  canvas: '#F1EEE6', surface: '#FFFFFF', ink: '#16181D', muted: '#4F5562',
  // separator: the hairline between rows of a group, inset to the text (1.57:1 on surface; iOS's is 1.71:1).
  separator: '#D4CEC0', border: '#E2DDD0', borderStrong: '#8C9099', onInk: '#FFFFFF', scrim: 'rgba(16,17,19,0.6)',
  onScrim: '#FFFFFF',
  // Brand (palette C, ink + lemon): sand carries structure, lemon is a rare highlight. Lemon is ~1.2:1 on white,
  // so it is only ever a fill behind onTertiary content or a mark on dark camera, never text or a line on light.
  secondary: '#ECE7DA', onSecondary: '#4A4436', tertiary: '#E2F56A', onTertiary: '#16181D',
  danger: severity('#B42318', '#FDECEA', '#B42318', '#FFFFFF'),
  warning: severity('#8A4A00', '#FFF4DC', '#E59A1A', '#16181D'),
  info: severity('#1F5BB5', '#EAF2FD', '#1F5BB5', '#FFFFFF'),
  good: severity('#1B7340', '#E8F5EC', '#1B7340', '#FFFFFF'),
  neutral: severity('#4F5562', '#EEEEEA', '#4F5562', '#FFFFFF'),
  shadow: 'rgba(16,17,19,0.12)',
};

export type Palette = typeof light;

const dark: Palette = {
  canvas: '#12110E', surface: '#1C1B17', ink: '#F1F1EE', muted: '#ABA696',
  separator: '#3D3A32', border: '#2E2C26', borderStrong: '#6F6B60', onInk: '#16181D', scrim: 'rgba(0,0,0,0.6)',
  onScrim: '#FFFFFF',
  secondary: '#28261F', onSecondary: '#D8D1BE', tertiary: '#D7EC5A', onTertiary: '#16181D',
  danger: severity('#FF8F85', '#3A1916', '#FF8F85', '#16181D'),
  warning: severity('#F5B851', '#35260B', '#F5B851', '#16181D'),
  info: severity('#8DB8FF', '#16243A', '#8DB8FF', '#16181D'),
  good: severity('#6FD394', '#11291B', '#6FD394', '#16181D'),
  neutral: severity('#A7ACB6', '#24262B', '#A7ACB6', '#16181D'),
  shadow: 'rgba(0,0,0,0)',
};

export const palettes = { light, dark };

// iOS Increase Contrast (DESIGN.md §2.1c): the quiet tokens step up; everything else already clears AA comfortably.
// muted ≥ 8.7:1 on canvas, borderStrong ≥ 5.2:1, separator ~3:1 on surface, in both themes.
export type ContrastToken = 'muted' | 'borderStrong' | 'separator' | 'border';
export const highContrast: Record<keyof typeof palettes, Record<ContrastToken, string>> = {
  light: { muted: '#3D424D', borderStrong: '#5F636C', separator: '#9A9384', border: '#B9B2A3' },
  dark: { muted: '#CFC9B9', borderStrong: '#9C978A', separator: '#6A6559', border: '#5A564C' },
};

export const fonts = {
  heading: 'Figtree_700Bold',
  headingSemi: 'Figtree_600SemiBold',
  body: 'NotoSans_400Regular',
  bodyStrong: 'NotoSans_600SemiBold',
};

// tabular-nums: honoured by Noto Sans on web (OpenType tnum); verify on iOS/Android in Task 15 device pass.
export const type = {
  display: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34, maxFontSizeMultiplier: 1.6 },
  title: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, maxFontSizeMultiplier: 1.6 },
  headline: { fontFamily: fonts.headingSemi, fontSize: 18, lineHeight: 24, maxFontSizeMultiplier: 2 },
  section: { fontFamily: fonts.headingSemi, fontSize: 17, lineHeight: 22, maxFontSizeMultiplier: 2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, maxFontSizeMultiplier: 2 },
  bodyStrong: { fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 24, maxFontSizeMultiplier: 2 },
  meta: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, maxFontSizeMultiplier: 2 },
  tag: { fontFamily: fonts.bodyStrong, fontSize: 13, lineHeight: 16, maxFontSizeMultiplier: 2 },
  ingredients: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, maxFontSizeMultiplier: 2 },
} as const;
export type TypeToken = keyof typeof type;

export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40, s12: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const layout = { maxWidth: 600, gutterNarrow: space.s4, gutterWide: space.s5, wideFrom: 414, target: 44, row: 56, control: 48 } as const;
export const z = { content: 0, sticky: 10, tabBar: 20, banner: 30, toast: 50 } as const;

export const motion = {
  dur: { instant: 100, fast: 150, base: 200, slow: 300 },
  // pop: damping ratio ~0.56, a ~10% overshoot for small playful objects (chips, tab pill, verdict icon); never on text blocks.
  spring: { press: { damping: 20, stiffness: 400 }, layout: { damping: 26, stiffness: 260 }, pop: { damping: 22, stiffness: 380 } },
  pressScale: 0.97,
  // Strong custom curves (Emil Kowalski / Charles Liu): built-in eases are too weak to read as a decision.
  ease: { out: Easing.bezier(0.23, 1, 0.32, 1), inOut: Easing.bezier(0.77, 0, 0.175, 1), in: Easing.bezier(0.55, 0, 1, 0.45) },
  enter: 250,
  exit: 180,
  shake: [-10, 10, -6, 6, -3, 0],
} as const;
