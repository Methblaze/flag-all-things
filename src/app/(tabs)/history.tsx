import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { AppText, useGutter } from '@/components/primitives';
import { SeverityIcon, VERDICT } from '@/components/severity';
import { relativeTime } from '@/components/SummaryCard';
import { useToast } from '@/components/Toast';
import type { ScanHistoryItem } from '@/domain/types';
import { loadHistory, removeScan, restoreScan } from '@/services/storage';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const isWeb = Platform.OS === 'web';
// Remaining rows close the gap, and a restored row opens one: moving in place, ease-in-out.
const reflow = LinearTransition.duration(motion.dur.base).easing(motion.ease.inOut);

export default function HistoryScreen() {
  const c = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const [items, setItems] = useState<ScanHistoryItem[] | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    loadHistory().then(h => { if (live) setItems(h); });
    return () => { live = false; };
  }, []));

  const remove = (item: ScanHistoryItem) => {
    setItems(list => list?.filter(i => i.id !== item.id) ?? null); // optimistic
    removeScan(item.id).catch(() => loadHistory().then(setItems));
    toast({ message: 'Removed', actionLabel: 'Undo', onAction: () => { restoreScan(item).then(setItems).catch(() => toast({ message: "Couldn't restore" })); } });
  };

  // Local read is < 50 ms; render nothing rather than flash a skeleton (§4.10).
  if (items === null) return <View style={{ flex: 1, backgroundColor: c.canvas }} />;

  return (
    <Animated.FlatList
      itemLayoutAnimation={reflow}
      style={{ flex: 1, backgroundColor: c.canvas }}
      contentContainerStyle={[styles.column, { paddingTop: insets.top + space.s4, paddingHorizontal: gutter }]}
      data={items}
      keyExtractor={i => i.id}
      ListHeaderComponent={<AppText variant="title" accessibilityRole="header" style={styles.title}>History</AppText>}
      ItemSeparatorComponent={() => <View style={{ height: space.s2 }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather name="clock" size={28} color={c.muted} />
          <AppText variant="headline">No scans yet</AppText>
          <AppText color={c.muted}>Products you scan are saved here, so you can check them again offline.</AppText>
          <Button label="Scan a product" icon="maximize" onPress={() => router.navigate('/')} />
        </View>
      }
      renderItem={({ item }) => <Row item={item} onDelete={() => remove(item)} />}
    />
  );
}

function Row({ item, onDelete }: { item: ScanHistoryItem; onDelete: () => void }) {
  const c = useTheme();
  const { product } = item;
  const v = VERDICT[item.verdict];
  const name = product.name ?? 'Unnamed product';

  const row = (
    <View
      testID={`history-row-${item.id}`}
      style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
      accessibilityActions={[{ name: 'delete', label: 'Remove from history' }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'delete') onDelete(); }}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${name}, ${v.word}, ${relativeTime(item.scannedAt)}`}
        onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode: item.id } })}
        style={({ pressed }) => [styles.rowMain, pressed && { backgroundColor: c.canvas }]}
      >
        {product.imageUrl ? (
          <Image source={product.imageUrl} style={[styles.thumb, { backgroundColor: c.secondary }]} contentFit="cover" transition={motion.dur.base} alt="" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: c.secondary }]}><Feather name="package" size={20} color={c.muted} /></View>
        )}
        <View style={styles.text}>
          <AppText numberOfLines={2}>{name}</AppText>
          {product.brand ? <AppText variant="meta" color={c.muted} numberOfLines={1}>{product.brand}</AppText> : null}
          <View style={styles.verdict}>
            <SeverityIcon tone={v.tone} size={16} />
            <AppText variant="tag" color={c[v.tone].fg}>{v.word}</AppText>
            <AppText variant="meta" color={c.muted} tabular>{relativeTime(item.scannedAt)}</AppText>
          </View>
        </View>
      </Pressable>
      {isWeb ? (
        <Pressable testID={`delete-${item.id}`} accessibilityRole="button" accessibilityLabel={`Remove ${name} from history`} onPress={onDelete} style={styles.delete}>
          <Feather name="x" size={20} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    // Leaves faster than it came, with a fade; the list's reflow closes the gap.
    <Animated.View exiting={FadeOut.duration(motion.dur.fast).easing(motion.ease.in)}>
      {isWeb ? row : (
        // Swipe left past 40pt (or flick) to delete. Undo sits in the toast, so there is no confirm step.
        <ReanimatedSwipeable
          rightThreshold={40}
          overshootRight={false}
          onSwipeableOpen={onDelete}
          renderRightActions={() => (
            <View style={[styles.swipeAction, { backgroundColor: c.ink }]}>
              <Feather name="trash-2" size={20} color={c.onInk} />
              <AppText variant="bodyStrong" color={c.onInk}>Delete</AppText>
            </View>
          )}
        >
          {row}
        </ReanimatedSwipeable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingBottom: space.s8 },
  title: { marginBottom: space.s4 },
  empty: { gap: space.s3, alignItems: 'flex-start', paddingTop: space.s4 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', minHeight: 64, overflow: 'hidden' },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.s3, padding: space.s3 },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.s1, flexWrap: 'wrap', columnGap: space.s2 },
  swipeAction: { flexDirection: 'row', alignItems: 'center', gap: space.s2, paddingHorizontal: space.s5, marginLeft: space.s2, borderRadius: radius.md },
  delete: { width: layout.target, height: layout.target, alignItems: 'center', justifyContent: 'center', marginRight: space.s1 },
});
