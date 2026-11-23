import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

import { useScheme } from '@/theme/appearance';
import { highContrast, palettes, type ContrastToken } from '@/theme/tokens';

export type Theme = Omit<(typeof palettes)['light'], ContrastToken> & Record<ContrastToken, ColorValue>;

// On iOS the quiet tokens become dynamic colours that switch when Increase Contrast is on; the scheme is already chosen,
// so light and dark both hold this scheme's value. Other platforms use the plain palette.
const withContrast = (scheme: keyof typeof palettes): Theme => {
  const p = palettes[scheme];
  if (Platform.OS !== 'ios') return p;
  const hc = highContrast[scheme];
  const up = (k: ContrastToken) => DynamicColorIOS({ light: p[k], dark: p[k], highContrastLight: hc[k], highContrastDark: hc[k] });
  return { ...p, muted: up('muted'), borderStrong: up('borderStrong'), separator: up('separator'), border: up('border') };
};
const themes = { light: withContrast('light'), dark: withContrast('dark') };

export function useTheme(): Theme {
  return themes[useScheme()];
}
