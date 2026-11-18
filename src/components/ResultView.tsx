import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FlagSection } from '@/components/FlagSection';
import { AppText, Card } from '@/components/primitives';
import { SummaryCard } from '@/components/SummaryCard';
import type { FlagReport, Product } from '@/domain/types';
import { CATEGORY_ORDER } from '@/engine/analyze';
import { layout, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Summary card, then the five sections, then the ingredients as printed. Shared by Product and Label. */
export function ResultView({ product, report, status }: { product: Product; report: FlagReport; status?: string }) {
  return (
    <>
      <SummaryCard product={product} report={report} status={status} />
      {report.verdict === 'unknown' ? (
        <Button label="Scan ingredient label" icon="camera"
          onPress={() => router.push({ pathname: '/label', params: product.barcode ? { barcode: product.barcode } : {} })} />
      ) : null}
      <View style={styles.sections}>
        {CATEGORY_ORDER.map(cat => (
          <FlagSection key={cat} category={cat} flags={report.flags.filter(f => f.category === cat)} missing={report.missing.includes(cat)} />
        ))}
      </View>
      {product.ingredientsText ? <Ingredients text={product.ingredientsText} /> : null}
    </>
  );
}

function Ingredients({ text }: { text: string }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(o => !o)} style={styles.header}>
        <AppText variant="section" style={styles.grow}>Ingredients</AppText>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={22} color={c.ink} />
      </Pressable>
      {open ? <AppText variant="ingredients" style={styles.body} selectable>{text}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  sections: { gap: space.s3 },
  header: { minHeight: layout.row, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s4 },
  grow: { flex: 1 },
  body: { paddingHorizontal: space.s4, paddingBottom: space.s4 },
});
