import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type WebState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };
type Kind = 'primary' | 'secondary' | 'text';

export function usePressScale() {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { if (!reduced) scale.value = withSpring(motion.pressScale, motion.spring.press); },
    onPressOut: () => { scale.value = withSpring(1, motion.spring.press); },
  };
}


export function Button({
  label, onPress, kind = 'primary', loading = false, loadingLabel, disabled = false, helper, icon, testID, fullWidth = true,
}: {
  label: string; onPress: () => void; kind?: Kind; loading?: boolean; loadingLabel?: string; disabled?: boolean;
  helper?: string; icon?: ComponentProps<typeof Feather>['name']; testID?: string; fullWidth?: boolean;
}) {
  const c = useTheme();
  const press = usePressScale();
  const inactive = disabled || loading;
  const fg = kind === 'primary' ? c.onInk : c.ink;

  return (
    <View style={[{ gap: space.s2 }, fullWidth ? styles.full : styles.inline]}>
      <Animated.View style={press.style}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
          accessibilityState={{ disabled: inactive, busy: loading }}
          disabled={inactive}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={(s: WebState) => [
            styles.base,
            kind === 'primary' && { backgroundColor: c.ink },
            kind === 'secondary' && { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong },
            kind === 'text' && styles.text,
            s.hovered && !inactive && kind !== 'text' && { opacity: 0.92 },
            disabled && { opacity: 0.38 },
            Platform.OS === 'web' && ({ cursor: inactive ? 'not-allowed' : 'pointer' } as ViewStyle),
          ]}
        >
          {(s: WebState) => (
            <View style={styles.row}>
              {loading ? <ActivityIndicator color={fg} /> : icon ? <Feather name={icon} size={20} color={fg} /> : null}
              <AppText variant="bodyStrong" color={fg} style={kind === 'text' && (s.hovered || s.focused) && styles.underline}>
                {loading && loadingLabel ? loadingLabel : label}
              </AppText>
            </View>
          )}
        </Pressable>
      </Animated.View>
      {helper && disabled ? <AppText variant="meta" color={c.muted}>{helper}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  base: { minHeight: layout.control, borderRadius: radius.md, borderCurve: 'continuous', paddingHorizontal: space.s5, justifyContent: 'center' },
  text: { minHeight: layout.target, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s2 },
  underline: { textDecorationLine: 'underline' },
});
