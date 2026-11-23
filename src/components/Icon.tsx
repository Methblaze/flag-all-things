import { Feather } from '@expo/vector-icons';
import { SymbolView, type AndroidSymbol, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

type Glyph = { sf: SFSymbol; md: AndroidSymbol; web: ComponentProps<typeof Feather>['name'] };

/** Every icon in the app, by meaning: SF Symbols on iOS, Material Symbols on Android, Feather on web (DESIGN.md §6).
 *  Severity glyphs are filled: they are status marks, and the fill keeps the shape readable at 16 pt. */
const ICONS = {
  camera: { sf: 'camera', md: 'photo_camera', web: 'camera' },
  photo: { sf: 'photo.on.rectangle', md: 'image', web: 'image' },
  scan: { sf: 'barcode.viewfinder', md: 'barcode_scanner', web: 'maximize' },
  torchOn: { sf: 'flashlight.on.fill', md: 'flashlight_on', web: 'zap' },
  torchOff: { sf: 'flashlight.off.fill', md: 'flashlight_off', web: 'zap-off' },
  retry: { sf: 'arrow.counterclockwise', md: 'refresh', web: 'rotate-ccw' },
  close: { sf: 'xmark', md: 'close', web: 'x' },
  trash: { sf: 'trash', md: 'delete', web: 'trash-2' },
  check: { sf: 'checkmark', md: 'check', web: 'check' },
  plus: { sf: 'plus', md: 'add', web: 'plus' },
  external: { sf: 'arrow.up.right', md: 'open_in_new', web: 'external-link' },
  chevronDown: { sf: 'chevron.down', md: 'expand_more', web: 'chevron-down' },
  package: { sf: 'shippingbox', md: 'inventory_2', web: 'package' },
  danger: { sf: 'exclamationmark.octagon.fill', md: 'report', web: 'alert-octagon' },
  warning: { sf: 'exclamationmark.triangle.fill', md: 'warning', web: 'alert-triangle' },
  info: { sf: 'info.circle.fill', md: 'info', web: 'info' },
  good: { sf: 'checkmark.circle.fill', md: 'check_circle', web: 'check-circle' },
  unknown: { sf: 'questionmark.circle.fill', md: 'help', web: 'help-circle' },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof ICONS;

/** `weight` matches the text beside it: regular next to body, semibold next to bold labels (iOS only; Android draws regular).
 *  An icon is hidden from screen readers unless it carries meaning on its own (`label`). */
export function Icon({ name, size = 20, color, weight = 'regular', label }: { name: IconName; size?: number; color: ColorValue; weight?: SymbolWeight; label?: string }) {
  const g = ICONS[name];
  const a11y = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <SymbolView name={{ ios: g.sf, android: g.md }} size={size} tintColor={color} weight={weight} {...a11y}
      fallback={<Feather name={g.web} size={size} color={color as string} accessibilityLabel={label} aria-hidden={!label} />} />
  );
}
