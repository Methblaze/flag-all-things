import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ResultSkeleton } from '@/components/chrome';
import { BackFallback } from '@/components/header';
import { AppText, Screen } from '@/components/primitives';
import { ResultView } from '@/components/ResultView';
import { relativeTime } from '@/components/SummaryCard';
import { analyze } from '@/engine/analyze';
import { usePrefs } from '@/hooks/usePrefs';
import { useProduct } from '@/hooks/useProduct';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const PROBLEMS = {
  busy: { title: 'Open Food Facts is busy', body: 'Try again in a minute.' },
  offline: { title: "You're offline", body: "This product isn't saved on your phone yet. Try again when you have signal." },
} as const;

export default function ProductScreen() {
  const c = useTheme();
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { prefs, loaded } = usePrefs();
  const { status, product, refreshing, refreshFailed, retry } = useProduct(barcode);
  const report = useMemo(() => (product ? analyze(product, prefs) : null), [product, prefs]);
  // Fade in only a result that replaces the skeleton; a cached one is at rest on first paint.
  const sawLoading = useRef(false);
  if (status === 'loading') sawLoading.current = true;

  const metaStatus = product && (refreshing ? 'Updating…'
    : refreshFailed === 'offline' ? `Offline. Saved ${relativeTime(product.fetchedAt)}`
    : refreshFailed === 'busy' ? `Couldn't refresh. Saved ${relativeTime(product.fetchedAt)}` : undefined);

  return (
    <Screen>
      <BackFallback />
      {/* The bar and the long-press back menu name the product once it is known. */}
      {product?.name ? <Stack.Screen options={{ title: product.name }} /> : null}
      {/* Never judge with default settings: wait for the user's own prefs (an allergy must not flash Good). */}
      {status === 'loading' || (status === 'ready' && !loaded) ? <ResultSkeleton /> : null}
      {status === 'ready' && loaded && product && report ? <ResultView product={product} report={report} status={metaStatus ?? undefined} reveal={sawLoading.current} /> : null}
      {status === 'not-found' ? (
        <View style={styles.problem}>
          <AppText variant="title" accessibilityRole="header">Not in Open Food Facts yet</AppText>
          <AppText color={c.muted}>Danish store brands are often missing. Photograph the ingredient list (varedeklaration) and we will read it.</AppText>
          <View style={styles.actions}>
            <Button label="Scan ingredient label" icon="camera" onPress={() => router.push({ pathname: '/label', params: { barcode } })} />
            <Button kind="secondary" label="Enter a different barcode" onPress={() => router.navigate('/')} />
          </View>
          <AppText variant="meta" color={c.muted} tabular>{`Barcode ${barcode}`}</AppText>
        </View>
      ) : null}
      {status === 'busy' || status === 'offline' ? (
        <View style={styles.problem}>
          <AppText variant="title" accessibilityRole="header">{PROBLEMS[status].title}</AppText>
          <AppText color={c.muted}>{PROBLEMS[status].body}</AppText>
          <Button label="Try again" icon="retry" onPress={retry} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  problem: { gap: space.s3 },
  actions: { gap: space.s2, marginTop: space.s2 },
});
