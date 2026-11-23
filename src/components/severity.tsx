import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Severity, Verdict } from '@/domain/types';
import { popIn } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { AppText } from '@/components/primitives';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Tone = Severity | 'neutral';

// Colour is never alone: every severity has an icon shape and a word (interaction spec §5).
export const SEVERITY: Record<Tone, { icon: IconName; word: string }> = {
  danger: { icon: 'danger', word: 'Your alert' },
  warning: { icon: 'warning', word: 'Warning' },
  info: { icon: 'info', word: 'Note' },
  good: { icon: 'good', word: 'Good' },
  neutral: { icon: 'unknown', word: 'Unknown' },
};

export const VERDICT: Record<Verdict, { word: string; tone: Tone }> = {
  avoid: { word: 'Avoid', tone: 'danger' },
  caution: { word: 'Caution', tone: 'warning' },
  ok: { word: 'OK', tone: 'info' },
  good: { word: 'Good', tone: 'good' },
  unknown: { word: 'Unknown', tone: 'neutral' },
};

export function SeverityIcon({ tone, size = 20 }: { tone: Tone; size?: number }) {
  const c = useTheme();
  return <Icon name={SEVERITY[tone].icon} size={size} color={c[tone].fg} label={SEVERITY[tone].word} />;
}

// The phone says the verdict too: Avoid errors, Caution warns, Good succeeds; OK and Unknown stay quiet (interaction spec §7).
const VERDICT_HAPTIC: Partial<Record<Verdict, Haptics.NotificationFeedbackType>> = {
  avoid: Haptics.NotificationFeedbackType.Error,
  caution: Haptics.NotificationFeedbackType.Warning,
  good: Haptics.NotificationFeedbackType.Success,
};
// Storyboard: 0ms pill scales 0.9 → 1 on the pop spring; 80ms its icon pops 0.3 → 1. The answer lands, then its symbol.
const PILL_IN = popIn(0.9);
const ICON_IN = popIn(0.3, 80);

/** `reveal` pops the pill in when a fresh result replaces the skeleton; a cached one paints at rest. */
export function VerdictPill({ verdict, reveal = false }: { verdict: Verdict; reveal?: boolean }) {
  const c = useTheme();
  const { word, tone } = VERDICT[verdict];
  useEffect(() => {
    const feel = VERDICT_HAPTIC[verdict];
    if (feel && Platform.OS !== 'web') Haptics.notificationAsync(feel);
  }, [verdict]);
  return (
    <Animated.View testID="verdict" entering={reveal ? PILL_IN : undefined} style={[styles.pill, { backgroundColor: c[tone].solid }]}>
      <Animated.View entering={reveal ? ICON_IN : undefined}><Icon name={SEVERITY[tone].icon} size={24} color={c[tone].onSolid} weight="bold" /></Animated.View>
      <AppText variant="display" color={c[tone].onSolid}>{word}</AppText>
    </Animated.View>
  );
}

export function Banner({ tone, children, testID }: { tone: Tone; children: ReactNode; testID?: string }) {
  const c = useTheme();
  return (
    <View testID={testID} accessibilityRole="alert" style={[styles.banner, { backgroundColor: c[tone].tint }]}>
      <SeverityIcon tone={tone} />
      <View style={styles.bannerBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.s2, paddingVertical: space.s1, paddingHorizontal: space.s4, borderRadius: radius.pill },
  banner: { flexDirection: 'row', gap: space.s3, padding: space.s3, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'flex-start' },
  bannerBody: { flex: 1, gap: space.s1 },
});
