import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/primitives';
import { SeverityIcon } from '@/components/severity';
import type { Flag, FlagCategory, Severity } from '@/domain/types';
import { layout, radius, space } from '@/theme/tokens';
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
    <Card>
      <Pressable
        testID={`section-${category}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: !expandable }}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        onPress={() => setOpen(o => !o)}
        style={styles.header}
      >
        <View style={styles.headLeft}>
          <AppText testID={`section-name-${category}`} variant="section">{SECTION_NAMES[category]}</AppText>
          <View style={styles.headMeta}>
            {worst ? <SeverityIcon tone={worst} size={16} /> : <SeverityIcon tone="neutral" size={16} />}
            <AppText variant="meta" color={c.muted}>{label}</AppText>
          </View>
        </View>
        {expandable ? <Feather name={open ? 'chevron-up' : 'chevron-down'} size={22} color={c.ink} /> : null}
      </Pressable>
      {open && expandable ? flags.map(f => <FlagRow key={f.id} flag={f} />) : null}
    </Card>
  );
}

function FlagRow({ flag }: { flag: Flag }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.row, { borderTopColor: c.border }]}>
      <Pressable testID={`flag-${flag.id}`} accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open}
        onPress={() => setOpen(o => !o)} style={styles.rowHead}>
        <SeverityIcon tone={flag.severity} />
        <View style={styles.grow}>
          <AppText>{flag.title}</AppText>
          {flag.personal && flag.severity === 'danger' ? (
            <View style={[styles.tag, { backgroundColor: c.danger.tint }]}><AppText variant="tag" color={c.danger.fg}>Your alert</AppText></View>
          ) : null}
        </View>
      </Pressable>
      {open ? (
        <View style={styles.detail}>
          <AppText color={c.muted}>{flag.detail}</AppText>
          {flag.source ? (
            <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(flag.source!.url)} style={styles.link}>
              <AppText variant="meta" style={styles.underline}>{`Source: ${flag.source.label}`}</AppText>
              <Feather name="external-link" size={14} color={c.ink} />
            </Pressable>
          ) : null}
          {flag.personal ? (
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/settings')} style={styles.link}>
              <AppText variant="meta" style={styles.underline}>Change alerts</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: layout.row, flexDirection: 'row', alignItems: 'center', gap: space.s3, paddingHorizontal: space.s4, paddingVertical: space.s3 },
  headLeft: { flex: 1, gap: space.s1 },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  row: { borderTopWidth: 1 },
  rowHead: { minHeight: 52, flexDirection: 'row', gap: space.s3, paddingHorizontal: space.s4, paddingVertical: space.s3, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0, gap: space.s1 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: space.s2, paddingVertical: 2, borderRadius: radius.sm },
  detail: { paddingLeft: space.s4 + 20 + space.s3, paddingRight: space.s4, paddingBottom: space.s3, gap: space.s2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.s1, minHeight: layout.target, alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
});
