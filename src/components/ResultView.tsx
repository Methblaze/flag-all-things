import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chevron, FlagSection } from '@/components/FlagSection';
import { AppText, Separator } from '@/components/primitives';
import { SummaryCard } from '@/components/SummaryCard';
import type { FlagReport, Product } from '@/domain/types';
import { CATEGORY_ORDER } from '@/engine/analyze';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

// Siblings glide when a section above them opens or closes (moving in place: ease-in-out).
const glide = LinearTransition.duration(motion.dur.base).easing(motion.ease.inOut);

/** Summary card, then the five sections, then the ingredients as printed. Shared by Product and Label.
 *  `reveal` fades the result in when it replaces a skeleton; a cached result paints at rest. */
export function ResultView({ product, report, status, reveal = false }: { product: Product; report: FlagReport; status?: string; reveal?: boolean }) {
  const c = useTheme();
  return (
    <Animated.View style={styles.stack} entering={reveal ? FadeIn.duration(motion.dur.base).easing(motion.ease.out) : undefined}>
      <SummaryCard product={product} report={report} status={status} reveal={reveal} />
      {report.verdict === 'unknown' ? (
        <Button label="Scan ingredient label" icon="camera"
          onPress={() => router.push({ pathname: '/label', params: product.barcode ? { barcode: product.barcode } : {} })} />
      ) : null}
      {/* One grouped list, like Settings: hairlines between rows, and the card itself glides as rows open. */}
      <Animated.View style={[styles.group, { backgroundColor: c.surface }]} layout={glide}>
        {CATEGORY_ORDER.map((cat, i) => (
          <Animated.View key={cat} layout={glide}>
            {i > 0 ? <Separator /> : null}
            <FlagSection category={cat} flags={report.flags.filter(f => f.category === cat)} missing={report.missing.includes(cat)} />
          </Animated.View>
        ))}
        {product.ingredientsText ? <Animated.View layout={glide}><Separator /><Ingredients text={product.ingredientsText} /></Animated.View> : null}
      </Animated.View>
    </Animated.View>
  );
}

function Ingredients({ text }: { text: string }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(o => !o)} style={({ pressed }) => [styles.header, pressed && { backgroundColor: c.canvas }]}>
        <AppText variant="section" style={styles.grow}>Ingredients</AppText>
        <Chevron open={open} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(motion.dur.base).easing(motion.ease.out)}>
          <AppText variant="ingredients" style={styles.body} selectable>{text}</AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.s6 },
  group: { borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  header: { minHeight: layout.row, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s4 },
  grow: { flex: 1 },
  body: { paddingHorizontal: space.s4, paddingBottom: space.s4 },
});
