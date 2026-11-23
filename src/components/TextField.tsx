import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppText } from '@/components/primitives';
import { layout, radius, space, type } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Props = TextInputProps & { label: string; error?: string | null; trailing?: ReactNode; hint?: string };

/** Label above, 48pt input, 2pt ink focus border; error = danger border + icon + text (DESIGN.md §9). */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, Props>(function TextField({ label, error, trailing, hint, style, onFocus, onBlur, ...rest }, ref) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? c.danger.fg : focused ? c.ink : c.borderStrong;
  const { maxFontSizeMultiplier, ...body } = type.body;
  return (
    <View style={styles.wrap}>
      <AppText variant="meta" color={c.muted}>{label}</AppText>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            aria-invalid={!!error}
            placeholderTextColor={c.muted}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            onFocus={e => { setFocused(true); onFocus?.(e); }}
            onBlur={e => { setFocused(false); onBlur?.(e); }}
            style={[styles.input, body, { color: c.ink, backgroundColor: c.surface, borderColor, borderWidth: error || focused ? 2 : 1 },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as ViewStyle), style]}
            {...rest}
          />
          {hint && !focused ? (
            <View pointerEvents="none" style={[styles.hint, { borderColor: c.border }]}>
              <AppText variant="tag" color={c.muted}>{hint}</AppText>
            </View>
          ) : null}
        </View>
        {trailing}
      </View>
      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Icon name="danger" size={16} color={c.danger.fg} />
          <AppText variant="meta" color={c.danger.fg} style={styles.grow}>{error}</AppText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.s2 },
  row: { flexDirection: 'row', gap: space.s2, alignItems: 'center' },
  inputWrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
  input: { minHeight: layout.control, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: space.s3 },
  hint: { position: 'absolute', right: space.s3, borderWidth: 1, borderRadius: radius.sm / 2, borderCurve: 'continuous', paddingHorizontal: space.s2 - 2 },
  error: { flexDirection: 'row', gap: space.s2, alignItems: 'center' },
  grow: { flex: 1 },
});
