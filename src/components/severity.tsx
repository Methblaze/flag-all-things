import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Severity, Verdict } from '@/domain/types';
import { AppText } from '@/components/primitives';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Tone = Severity | 'neutral';
type IconName = ComponentProps<typeof Feather>['name'];

// Colour is never alone: every severity has an icon shape and a word (interaction spec §5).
export const SEVERITY: Record<Tone, { icon: IconName; word: string }> = {
  danger: { icon: 'alert-octagon', word: 'Your alert' },
  warning: { icon: 'alert-triangle', word: 'Warning' },
  info: { icon: 'info', word: 'Note' },
  good: { icon: 'check-circle', word: 'Good' },
  neutral: { icon: 'help-circle', word: 'Unknown' },
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
  return <Feather name={SEVERITY[tone].icon} size={size} color={c[tone].fg} accessibilityLabel={SEVERITY[tone].word} />;
}

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const c = useTheme();
  const { word, tone } = VERDICT[verdict];
  return (
    <View testID="verdict" style={[styles.pill, { backgroundColor: c[tone].solid }]}>
      <Feather name={SEVERITY[tone].icon} size={24} color={c[tone].onSolid} />
      <AppText variant="display" color={c[tone].onSolid}>{word}</AppText>
    </View>
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
