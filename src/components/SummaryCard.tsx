import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
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

export function SummaryCard({ product, report, status, reveal = false }: { product: Product; report: FlagReport; status?: string; reveal?: boolean }) {
  const c = useTheme();
  const tint = report.verdict === 'avoid' ? c.danger.tint : c.surface;
  return (
    <Card style={{ ...styles.card, backgroundColor: tint }}>
      <View accessible accessibilityRole="header" style={styles.head}>
        <VerdictPill verdict={report.verdict} reveal={reveal} />
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
        <ProductThumb uri={product.imageUrl} size={56} alt={product.name ?? 'Product photo'} />
        <View style={styles.metaText}>
          <AppText variant="bodyStrong">{product.name ?? 'Unnamed product'}</AppText>
          {product.brand ? <AppText variant="meta" color={c.muted}>{product.brand}</AppText> : null}
          <AppText variant="meta" color={c.muted}>{status ?? `${SOURCE_WORD[product.source]}, updated ${relativeTime(product.fetchedAt)}`}</AppText>
        </View>
      </View>
    </Card>
  );
}

/** Product photo, with the package glyph when there is no URL or the photo fails to load (never an empty box). */
export function ProductThumb({ uri, size, alt }: { uri: string | null; size: number; alt: string }) {
  const c = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const box = { width: size, height: size, borderRadius: radius.sm, backgroundColor: c.secondary };
  return uri && uri !== failed ? (
    <Image source={uri} style={box} contentFit="cover" transition={motion.dur.base} accessibilityIgnoresInvertColors alt={alt} onError={() => setFailed(uri)} />
  ) : (
    <View style={[box, styles.thumbEmpty]}><Icon name="package" size={Math.round(size * 0.4)} color={c.muted} /></View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.s4, gap: space.s3, borderRadius: radius.lg },
  head: { gap: space.s3 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s4, rowGap: space.s2 },
  count: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  meta: { flexDirection: 'row', gap: space.s3, alignItems: 'center', borderTopWidth: 1, paddingTop: space.s3 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  metaText: { flex: 1, minWidth: 0 },
});
