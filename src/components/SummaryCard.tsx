import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/primitives';
import { SeverityIcon, VerdictPill } from '@/components/severity';
import type { FlagReport, Product, Severity } from '@/domain/types';
import { motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const COUNT_WORD: Record<Severity, [string, string]> = {
  danger: ['alert', 'alerts'], warning: ['warning', 'warnings'], info: ['note', 'notes'], good: ['good sign', 'good signs'],
};
const SOURCE_WORD = { off: 'From Open Food Facts', 'label-ai': 'Read from your photo', example: 'Example label' } as const;

export function relativeTime(ms: number, now = Date.now()): string {
  const min = Math.round((now - ms) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function SummaryCard({ product, report, status }: { product: Product; report: FlagReport; status?: string }) {
  const c = useTheme();
  const tint = report.verdict === 'avoid' ? c.danger.tint : c.surface;
  return (
    <Card style={{ ...styles.card, backgroundColor: tint }}>
      <View accessible accessibilityRole="header" style={styles.head}>
        <VerdictPill verdict={report.verdict} />
        <AppText testID="headline" variant="headline" balance>{report.headline}</AppText>
      </View>
      {report.flags.length ? (
        <View style={styles.counts}>
          {(Object.keys(COUNT_WORD) as Severity[]).filter(s => report.counts[s] > 0).map(s => (
            <View key={s} style={styles.count}>
              <SeverityIcon tone={s} size={16} />
              <AppText variant="tag" color={c[s].fg} tabular>{`${report.counts[s]} ${COUNT_WORD[s][report.counts[s] === 1 ? 0 : 1]}`}</AppText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[styles.meta, { borderTopColor: c.border }]}>
        {product.imageUrl ? (
          <Image source={product.imageUrl} style={[styles.thumb, { backgroundColor: c.neutral.tint }]} contentFit="cover"
            transition={motion.dur.base} accessibilityIgnoresInvertColors alt={product.name ?? 'Product photo'} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: c.neutral.tint }]}>
            <Feather name="package" size={22} color={c.muted} />
          </View>
        )}
        <View style={styles.metaText}>
          <AppText variant="bodyStrong">{product.name ?? 'Unnamed product'}</AppText>
          {product.brand ? <AppText variant="meta" color={c.muted}>{product.brand}</AppText> : null}
          <AppText variant="meta" color={c.muted}>{status ?? `${SOURCE_WORD[product.source]}, updated ${relativeTime(product.fetchedAt)}`}</AppText>
        </View>
      </View>
    </Card>
  );
}


const styles = StyleSheet.create({
  card: { padding: space.s4, gap: space.s3, borderRadius: radius.lg },
  head: { gap: space.s3 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s4, rowGap: space.s2 },
  count: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  meta: { flexDirection: 'row', gap: space.s3, alignItems: 'center', borderTopWidth: 1, paddingTop: space.s3 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  metaText: { flex: 1, minWidth: 0 },
});
