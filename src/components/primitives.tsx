import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ColorValue, type TextProps, type ViewStyle } from 'react-native';

import { layout, radius, space, type, type TypeToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type AppTextProps = TextProps & { variant?: TypeToken; color?: ColorValue; tabular?: boolean; balance?: boolean };

export function AppText({ variant = 'body', color, tabular, balance, style, ...rest }: AppTextProps) {
  const c = useTheme();
  const { maxFontSizeMultiplier, ...t } = type[variant];
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[t, { color: color ?? c.ink }, tabular && { fontVariant: ['tabular-nums'] },
        balance && Platform.OS === 'web' && ({ textWrap: 'balance' } as object), style]}
      {...rest}
    />
  );
}

export function useGutter() {
  return useWindowDimensions().width >= layout.wideFrom ? layout.gutterWide : layout.gutterNarrow;
}

/** Canvas + the 600pt centred column (DESIGN.md §4). Every screen sits under a native header, so iOS owns the top and
 *  bottom insets (automatic): content scrolls under the glass bar with its edge effect, never under the clock. */
export function Screen({ children }: { children: ReactNode }) {
  const c = useTheme();
  const gutter = useGutter();
  const column: ViewStyle = { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: gutter, paddingTop: space.s4, paddingBottom: space.s8, gap: space.s6 };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.canvas }} contentContainerStyle={column} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface }, style]}>{children}</View>;
}

/** The hairline between rows of a group, inset to where the row's text starts (iOS inset-grouped separator). */
export function Separator({ inset = space.s4 }: { inset?: number }) {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, marginLeft: inset, backgroundColor: c.separator }} />;
}

const styles = StyleSheet.create({
  // No outline: a white group on the darker canvas is the iOS inset-grouped look (DESIGN.md §5).
  card: { borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
});
