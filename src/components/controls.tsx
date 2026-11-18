import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TRACK_W = 44;
const TRACK_H = 26;
const THUMB = 20;
const tick = () => { if (Platform.OS !== 'web') Haptics.selectionAsync(); };
type WebState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/** The whole row is the switch: 56pt target, label left, track right (Fitts). */
export function ToggleRow({ label, description, value, onChange, testID }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const x = useSharedValue(value ? TRACK_W - THUMB - 3 : 3);
  useEffect(() => {
    const to = value ? TRACK_W - THUMB - 3 : 3;
    x.value = reduced ? to : withTiming(to, { duration: motion.dur.fast, easing: motion.ease.inOut });
  }, [value, reduced, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => { tick(); onChange(!value); }}
      style={(s) => [styles.row, ((s as WebState).hovered || s.pressed) && { backgroundColor: c.canvas }]}
    >
      <View style={styles.grow}>
        <AppText>{label}</AppText>
        {description ? <AppText variant="meta" color={c.muted}>{description}</AppText> : null}
      </View>
      <View style={[styles.track, { backgroundColor: value ? c.ink : c.surface, borderColor: value ? c.ink : c.borderStrong }]}>
        <Animated.View style={[styles.thumb, { backgroundColor: value ? c.onInk : c.borderStrong }, thumb]} />
      </View>
    </Pressable>
  );
}

export function Segmented<T extends string>({ label, options, value, onChange, testID }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string }) {
  const c = useTheme();
  return (
    <View style={styles.segWrap}>
      <AppText variant="meta" color={c.muted}>{label}</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID} style={[styles.seg, { backgroundColor: c.canvas, borderColor: c.border }]}>
        {options.map(o => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              testID={testID ? `${testID}-${o.value}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => { if (!selected) { tick(); onChange(o.value); } }}
              style={(s) => [styles.segItem, selected && { backgroundColor: c.surface, borderColor: c.borderStrong, borderWidth: 1 }]}
            >
              <AppText variant={selected ? 'bodyStrong' : 'body'} color={selected ? c.ink : c.muted} numberOfLines={1}>{o.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: layout.row, flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingHorizontal: space.s4, paddingVertical: space.s2 },
  grow: { flex: 1, minWidth: 0 },
  track: { width: TRACK_W, height: TRACK_H, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.pill, position: 'absolute', left: 0 },
  segWrap: { gap: space.s2 },
  seg: { flexDirection: 'row', padding: space.s1, gap: space.s1, borderRadius: radius.md, borderWidth: 1 },
  segItem: { flex: 1, minHeight: layout.target, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: space.s2 },
});
