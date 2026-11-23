import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Separator } from '@/components/primitives';
import { layout, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function Block({ width, height, round = radius.sm }: { width: DimensionValue; height: number; round?: number }) {
  const c = useTheme();
  return <View style={{ width, height, borderRadius: round, backgroundColor: c.secondary }} />;
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
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <Block width={140} height={42} round={radius.pill} />
        <Block width="90%" height={20} />
        <Block width="60%" height={20} />
        <View style={styles.row}><Block width={56} height={56} /><View style={styles.lines}><Block width="70%" height={16} /><Block width="40%" height={14} /></View></View>
      </View>
      {/* One group of five rows, matching the result's grouped sections. */}
      <View style={[styles.group, { backgroundColor: c.surface }]}>
        {[0, 1, 2, 3, 4].map(i => <View key={i}>{i > 0 ? <Separator /> : null}<View style={styles.section}><Block width="45%" height={18} /></View></View>)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: space.s6 },
  card: { padding: space.s4, gap: space.s3, borderRadius: radius.lg, borderCurve: 'continuous' },
  row: { flexDirection: 'row', gap: space.s3, alignItems: 'center' },
  lines: { flex: 1, gap: space.s2 },
  group: { borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  section: { minHeight: layout.row, justifyContent: 'center', paddingHorizontal: space.s4 },
});
