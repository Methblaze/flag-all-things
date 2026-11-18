import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import { layout, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Back to where you came from; a deep link with no history goes to Scan, never an empty page (F8). */
export function BackBar() {
  const c = useTheme();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) back(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s2} style={styles.back}>
      <Feather name="chevron-left" size={24} color={c.ink} />
      <AppText variant="bodyStrong">Back</AppText>
    </Pressable>
  );
}

function Block({ width, height, round = radius.sm }: { width: DimensionValue; height: number; round?: number }) {
  const c = useTheme();
  return <View style={{ width, height, borderRadius: round, backgroundColor: c.neutral.tint }} />;
}

/** Same shapes and heights as the summary card and section headers, so nothing shifts on load (§4.6). */
export function ResultSkeleton() {
  const c = useTheme();
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => { if (!reduced) o.value = withRepeat(withTiming(0.55, { duration: 750, easing: Easing.linear }), -1, true); }, [reduced, o]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View accessibilityLabel="Loading product" accessibilityRole="progressbar" style={[styles.skeleton, pulse]}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Block width={140} height={42} round={radius.pill} />
        <Block width="90%" height={20} />
        <Block width="60%" height={20} />
        <View style={styles.row}><Block width={56} height={56} /><View style={styles.lines}><Block width="70%" height={16} /><Block width="40%" height={14} /></View></View>
      </View>
      {[0, 1, 2, 3, 4].map(i => <View key={i} style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}><Block width="45%" height={18} /></View>)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: space.s1, minHeight: layout.target, alignSelf: 'flex-start', marginLeft: -space.s2, paddingRight: space.s2 },
  skeleton: { gap: space.s3 },
  card: { padding: space.s4, gap: space.s3, borderRadius: radius.lg, borderWidth: 1 },
  row: { flexDirection: 'row', gap: space.s3, alignItems: 'center' },
  lines: { flex: 1, gap: space.s2 },
  section: { minHeight: layout.row, justifyContent: 'center', paddingHorizontal: space.s4, borderRadius: radius.md, borderWidth: 1 },
});
