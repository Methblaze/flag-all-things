import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions, type TextProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, space, type, type TypeToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type AppTextProps = TextProps & { variant?: TypeToken; color?: string; tabular?: boolean; balance?: boolean };

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

/** Canvas + safe-area insets + the 600pt centred column (DESIGN.md §4). */
export function Screen({ children, scroll = true, top = true, contentStyle }: { children: ReactNode; scroll?: boolean; top?: boolean; contentStyle?: ViewStyle }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const column: ViewStyle = { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: gutter, paddingTop: top ? insets.top + space.s4 : space.s4, paddingBottom: space.s8, gap: space.s6 };
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: c.canvas }} contentContainerStyle={[column, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <View style={[column, styles.fill, contentStyle]}>{children}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
});
