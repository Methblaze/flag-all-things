import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { AppText, Separator } from '@/components/primitives';
import { SeverityIcon } from '@/components/severity';
import type { Flag, FlagCategory, Severity } from '@/domain/types';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export const SECTION_NAMES: Record<FlagCategory, string> = {
  allergens: 'Allergens & traces', diet: 'Diet & ethics', additives: 'Additives', nutrition: 'Nutrition', processing: 'Processing',
};
const ORDER: Severity[] = ['danger', 'warning', 'info', 'good'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summary(flags: Flag[]): string {
  const d = flags.filter(f => f.severity === 'danger').length;
  const w = flags.filter(f => f.severity === 'warning').length;
  if (d) return plural(d, 'alert', 'alerts');
  if (w) return plural(w, 'warning', 'warnings');
  return plural(flags.length, 'note', 'notes');
}

export function FlagSection({ category, flags, missing }: { category: FlagCategory; flags: Flag[]; missing: boolean }) {
  const c = useTheme();
  const worst = ORDER.find(s => flags.some(f => f.severity === s));
  const [open, setOpen] = useState(worst === 'danger' || worst === 'warning');
  const expandable = flags.length > 0;
  const label = missing ? 'Not on record' : expandable ? summary(flags) : 'Nothing flagged';

  return (
    <View>
      <Pressable
        testID={`section-${category}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: !expandable }}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        onPress={() => setOpen(o => !o)}
        style={({ pressed }) => [styles.header, pressed && { backgroundColor: c.canvas }]}
      >
        <View style={styles.headLeft}>
          <AppText testID={`section-name-${category}`} variant="section">{SECTION_NAMES[category]}</AppText>
          <View style={styles.headMeta}>
            {/* A clean section gets a quiet tick, not the Unknown "?" it once shared with "Not on record". */}
            {worst ? <SeverityIcon tone={worst} size={16} /> : missing ? <SeverityIcon tone="neutral" size={16} /> : <Icon name="check" size={14} color={c.muted} />}
            <AppText variant="meta" color={c.muted}>{label}</AppText>
          </View>
        </View>
        {expandable ? <Chevron open={open} /> : null}
      </Pressable>
      {open && expandable ? (
        // Rows arrive with the section in one piece (no stagger inside a moving container).
        <Animated.View entering={FadeIn.duration(motion.dur.base).easing(motion.ease.out)} exiting={FadeOut.duration(motion.dur.fast)}>
          {flags.map(f => <FlagRow key={f.id} flag={f} />)}
        </Animated.View>
      ) : null}
    </View>
  );
}

function FlagRow({ flag }: { flag: Flag }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      {/* Inset to the flag's text, past its icon. */}
      <Separator inset={space.s4 + 20 + space.s3} />
      <Pressable testID={`flag-${flag.id}`} accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open}
        onPress={() => setOpen(o => !o)} style={({ pressed }) => [styles.rowHead, pressed && { backgroundColor: c.canvas }]}>
        <SeverityIcon tone={flag.severity} />
        <View style={styles.grow}>
          <AppText>{flag.title}</AppText>
          {flag.personal && flag.severity === 'danger' ? (
            <View style={[styles.tag, { backgroundColor: c.danger.tint }]}><AppText variant="tag" color={c.danger.fg}>Your alert</AppText></View>
          ) : null}
        </View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(motion.dur.base).easing(motion.ease.out)} exiting={FadeOut.duration(motion.dur.fast)} style={styles.detail}>
          <AppText color={c.muted}>{flag.detail}</AppText>
          {flag.source ? (
            <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(flag.source!.url)} style={styles.link}>
              <AppText variant="meta" style={styles.underline}>{`Source: ${flag.source.label}`}</AppText>
              <Icon name="external" size={14} color={c.ink} />
            </Pressable>
          ) : null}
          {flag.personal ? (
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/settings')} style={styles.link}>
              <AppText variant="meta" style={styles.underline}>Change alerts</AppText>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

/** One icon that turns, rather than two icons swapping: the turn says open/closed. */
export function Chevron({ open }: { open: boolean }) {
  const c = useTheme();
  const turn = useSharedValue(open ? 180 : 0);
  useEffect(() => { turn.value = withTiming(open ? 180 : 0, { duration: motion.dur.base, easing: motion.ease.inOut }); }, [open, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return <Animated.View style={style}><Icon name="chevronDown" size={18} color={c.ink} weight="semibold" /></Animated.View>;
}

const styles = StyleSheet.create({
  header: { minHeight: layout.row, flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingHorizontal: space.s4, paddingVertical: space.s3 },
  headLeft: { flex: 1, gap: space.s1 },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  rowHead: { minHeight: 52, flexDirection: 'row', gap: space.s3, paddingHorizontal: space.s4, paddingVertical: space.s3, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0, gap: space.s1 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: space.s2, paddingVertical: 2, borderRadius: radius.sm },
  detail: { paddingLeft: space.s4 + 20 + space.s3, paddingRight: space.s4, paddingBottom: space.s3, gap: space.s2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.s1, minHeight: layout.target, alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
});
