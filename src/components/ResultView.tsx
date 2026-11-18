import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chevron, FlagSection } from '@/components/FlagSection';
import { AppText, Card } from '@/components/primitives';
import { SummaryCard } from '@/components/SummaryCard';
import type { FlagReport, Product } from '@/domain/types';
import { CATEGORY_ORDER } from '@/engine/analyze';
import { layout, motion, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

// Siblings glide when a section above them opens or closes (moving in place: ease-in-out).
const glide = LinearTransition.duration(motion.dur.base).easing(motion.ease.inOut);

/** Summary card, then the five sections, then the ingredients as printed. Shared by Product and Label.
 *  `reveal` fades the result in when it replaces a skeleton; a cached result paints at rest. */
export function ResultView({ product, report, status, reveal = false }: { product: Product; report: FlagReport; status?: string; reveal?: boolean }) {
  return (
    <Animated.View style={styles.stack} entering={reveal ? FadeIn.duration(motion.dur.base).easing(motion.ease.out) : undefined}>
      <SummaryCard product={product} report={report} status={status} />
      {report.verdict === 'unknown' ? (
        <Button label="Scan ingredient label" icon="camera"
          onPress={() => router.push({ pathname: '/label', params: product.barcode ? { barcode: product.barcode } : {} })} />
      ) : null}
      <Animated.View style={styles.sections} layout={glide}>
        {CATEGORY_ORDER.map(cat => (
          <Animated.View key={cat} layout={glide}>
            <FlagSection category={cat} flags={report.flags.filter(f => f.category === cat)} missing={report.missing.includes(cat)} />
          </Animated.View>
        ))}
      </Animated.View>
      {product.ingredientsText ? <Animated.View layout={glide}><Ingredients text={product.ingredientsText} /></Animated.View> : null}
    </Animated.View>
  );
}

function Ingredients({ text }: { text: string }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(o => !o)} style={({ pressed }) => [styles.header, pressed && { backgroundColor: c.canvas }]}>
        <AppText variant="section" style={styles.grow}>Ingredients</AppText>
        <Chevron open={open} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(motion.dur.base).easing(motion.ease.out)}>
          <AppText variant="ingredients" style={styles.body} selectable>{text}</AppText>
        </Animated.View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.s6 },
  sections: { gap: space.s3 },
  header: { minHeight: layout.row, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s4 },
  grow: { flex: 1 },
  body: { paddingHorizontal: space.s4, paddingBottom: space.s4 },
});
